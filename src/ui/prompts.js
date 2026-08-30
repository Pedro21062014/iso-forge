import readline from 'node:readline';
import { colors, bold, dim, cursor } from './ansi.js';

/**
 * Sistema de prompts interativos sem dependências externas.
 * Usa modo raw para navegação com setas.
 */

const UP = '\u001b[A';
const DOWN = '\u001b[B';
const LEFT = '\u001b[D';
const RIGHT = '\u001b[C';
const ENTER = '\r';
const SPACE = ' ';
const ESC = '\u001b';
const BACKSPACE = '\u007f';
const CTRL_C = '\u0003';

const hideCursor = () => process.stdout.write('\x1b[?25l');
const showCursor = () => process.stdout.write('\x1b[?25h');

const getRowText = (item, active) => {
  let row = '';
  row += `${colors.gray('❯ ')} `;
  row += active ? colors.white(bold(item.label)) : item.label;
  if (item.desc) {
    row += `  ${colors.gray(dim('— ' + item.desc))}`;
  }
  return row;
};

const getMultiRowText = (item, active, isSel) => {
  let row = '';
  row += isSel ? `${colors.green('✔')} ` : `${colors.gray('○')} `;
  if (active) row += colors.cyan('> ');
  row += active ? colors.white(bold(item.label)) : item.label;
  if (item.desc) row += `  ${colors.gray(dim('— ' + item.desc))}`;
  return row;
};

const redraw = (lines, clearExtra = 1) => {
  // volta para cima, limpa e redesenha
  process.stdout.write(`\x1b[2K\x1b[${clearExtra}A\x1b[J`);
  let out = '';
  for (const l of lines) out += l + '\n';
  process.stdout.write(out);
  hideCursor();
};

/** Núcleo de navegação com setas (suporta multi). */
function arrowList({ items, title, multi = false }) {
  let idx = 0;
  const sel = new Set();

  const buildLines = () => {
    const lines = [];
    if (title) lines.push(colors.purple(bold('◈ ' + title)));
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      lines.push(multi ? getMultiRowText(it, i === idx, sel.has(i)) : getRowText(it, i === idx));
    }
    lines.push('');
    if (multi) {
      lines.push(dim(colors.gray('↑/↓ navegar • espaço marcar • Enter confirmar • q cancelar')));
    } else {
      lines.push(dim(colors.gray('↑/↓ navegar • Enter escolher • Esc cancelar')));
    }
    return lines;
  };

  return new Promise((resolve) => {
    let firstDraw = true;
    const print = () => {
      const lines = buildLines();
      if (firstDraw) {
        let out = '';
        for (const l of lines) out += l + '\n';
        process.stdout.write(out);
        firstDraw = false;
      } else {
        redraw(lines, lines.length + 1);
      }
    };
    print();

    const finish = (val) => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      showCursor();
      resolve(val);
    };

    // Buffer de sequência de escape (ESCAPE + [...). Uma tecla de seta chega como
    // ESC seguido de '[' e uma letra. Se os bytes vierem separados, pegamos o ESC
    // sozinho e NÃO cancelamos imediatamente: aguardamos ver o que vem a seguir.
    let escBuf = '';
    let escTimer = null;
    const endOfSeq = (s) => !!/[a-zA-Z~]$/.test(s);

    const onData = (chunk) => {
      const k = chunk.toString();

      // Estamos no meio de uma sequência de escape?
      if (escBuf) {
        escBuf += k;
        if (endOfSeq(escBuf)) {
          const s = escBuf;
          escBuf = '';
          if (s === UP) idx = (idx - 1 + items.length) % items.length;
          else if (s === DOWN) idx = (idx + 1) % items.length;
          print();
        }
        return;
      }

      // Sequência de seta completa chegando em um único chunk
      if (k === UP || k === 'k') { clearTimeout(escTimer); idx = (idx - 1 + items.length) % items.length; print(); return; }
      if (k === DOWN || k === 'j') { clearTimeout(escTimer); idx = (idx + 1) % items.length; print(); return; }

      // Começou uma sequência de escape (seta em partes, ou ESC puro)?
      if (k !== UP && k !== DOWN && (k === ESC || (k.startsWith(ESC) && k.length > 1))) {
        if (k === ESC) {
          // pode ser uma seta chegando em 2 partes; espera 60ms antes de cancelar
          escBuf = ESC;
          if (escTimer) clearTimeout(escTimer);
          escTimer = setTimeout(() => { if (escBuf === ESC) { escBuf = ''; finish(null); } }, 60);
          return;
        }
        // sequência completa em um chunk
        escBuf = k;
        if (endOfSeq(k)) escBuf = '';
        return;
      }

      if (k === CTRL_C) { process.exit(130); }
      if (multi && k === SPACE) {
        if (sel.has(idx)) sel.delete(idx); else sel.add(idx);
        print();
        return;
      }
      if (multi && k === 'q') { finish(null); return; }
      if (k === ENTER) {
        if (multi) finish([...sel].map((i) => items[i].value));
        else finish(items[idx].value);
      }
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

export async function select(items, { title = '' } = {}) {
  return arrowList({ items, title, multi: false });
}

export async function multiselect(items, { title = '' } = {}) {
  const r = await arrowList({ items, title, multi: true });
  return r || [];
}

export function confirmItem({ title = '', initial = true } = {}) {
  return arrowList({
    title,
    multi: false,
    items: [
      { value: true, label: 'Sim', desc: '' },
      { value: false, label: 'Não', desc: '' },
    ],
  }).then((r) => (r === null ? initial : r));
}

export function inputPage({ title = '', placeholder = '', defaultValue = '', validate } = {}) {
  return new Promise((resolve) => {
    let value = defaultValue;
    let errPending = false;

    const fieldText = () =>
      value.length ? colors.white(value) : dim(placeholder || 'digite aqui...');

    // Redesenha o bloco (título + campo [+ erro]) SEM duplicá-lo:
    // primeiro sobe até a linha do título e limpa tudo abaixo, depois imprime de novo.
    const render = (repaint = false) => {
      const titleLines = title ? title.split('\n') : [];
      hideCursor();
      if (repaint) {
        process.stdout.write(`\x1b[${titleLines.length}A\x1b[J`);
      }
      let out = '';
      for (const t of titleLines) out += colors.purple(bold('◈ ' + t)) + '\n';
      out += '   ' + fieldText();
      if (errPending) out += '\n   ' + colors.red('Entrada inválida. Tente novamente.');
      process.stdout.write(out);
      // reposiciona o cursor no fim do campo (após o texto digitado)
      if (errPending) process.stdout.write('\x1b[1A'); // da linha de erro volta ao campo
      process.stdout.write(`\x1b[${4 + value.length}G`);
      showCursor();
    };
    render(false);

    const finish = (val) => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      showCursor();
      resolve(val);
    };

    const onData = (chunk) => {
      const k = chunk.toString();

      // Apenas ESC puro = cancelar; sequências ESC[... (setas) são ignoradas
      if (k === ESC) { finish(value); return; }
      if (k.startsWith(ESC)) return;
      if (k === CTRL_C) { process.exit(130); }

      // ENTER (ou quebra de linha no fim do paste) = submeter
      if (k === ENTER || k === '\n') {
        if (validate && !validate(value)) {
          errPending = true;
          render(true);
          return;
        }
        finish(value);
        return;
      }

      // Colar ou digitação: o chunk pode conter vários caracteres de uma vez.
      // Preserva os imprimíveis e trata backspace (inclusive em sequências).
      let changed = false;
      for (const ch of k) {
        if (ch === '\x7f' || ch === '\b') { value = value.slice(0, -1); changed = true; }
        else if (ch >= ' ' && ch !== '\x7f' && ch !== '\r' && ch !== '\n') { value += ch; changed = true; }
      }
      if (changed) { errPending = false; render(true); }
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}
