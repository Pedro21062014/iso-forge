import { cursor, colors, bold, dim } from './ansi.js';

/**
 * Logger que mantém uma "faixa" reservada no rodapé para a barra de progresso.
 * Os logs são impressos acima; a barra/permanece fixa embaixo.
 */
export class Logger {
  constructor({ silent = false } = {}) {
    this.silent = silent;
    this.footerLines = [];
    this.raw = false;
    this._footerPrinted = false;
    this._footerVisible = false;
  }

  _resetCursor() {
    if (this.silent || this.raw) return;
    if (!this._footerPrinted) return;
    // move o cursor para cima das linhas reservadas do rodapé
    const n = this.footerLines.length;
    if (n > 0) process.stdout.write(cursor.up(n) + cursor.clearBelow());
  }

  _drawFooter() {
    if (this.silent || this.raw) return;
    if (!this._footerPrinted) {
      process.stdout.write(cursor.save());
      this._footerPrinted = true;
    } else {
      process.stdout.write(cursor.restore() + cursor.clearBelow());
    }
    let buf = '';
    for (const line of this.footerLines) {
      buf += line + '\n';
    }
    this._footerVisible = true;
    process.stdout.write(buf);
  }

  /** Atualiza o conteúdo do rodapé (barra de progresso + avisos). */
  setFooter(lines) {
    if (this.silent) return;
    this.raw = false;
    this.footerLines = lines;
    this._drawFooter();
  }

  /** Remove o rodapé e deixa o terminal limpo. */
  clearFooter() {
    if (this.silent) return;
    this._resetCursor();
    if (this._footerPrinted) process.stdout.write(cursor.restore() + cursor.clearBelow());
    this.footerLines = [];
    this.footerPrinted = false;
    this._footerVisible = false;
  }

  _write(text) {
    if (this.silent) return;
    this._resetCursor();
    process.stdout.write(text + '\n');
    // redesenha o rodapé (se houver) logo após a linha de log
    if (this._footerPrinted && this._footerVisible && this.footerLines.length) {
      this._drawFooter();
    }
  }

  /** Imprime log normal. Prefixo de canal: [info/web/...]. */
  log(msg, channel = 'info') {
    const ch = channel ? `${colors.gray(`[${channel}]`)} ` : '';
    this._write(`${ch}${msg}`);
  }

  section(title) {
    this._write('\n' + colors.purple(bold('▸ ' + title)) + '\n');
  }

  step(msg) {
    this._write(`   ${colors.cyan('•')} ${msg}`);
  }

  ok(msg) {
    this._write(`   ${colors.green('✔')} ${msg}`);
  }

  warn(msg) {
    this._write(`   ${colors.yellow('⚠')} ${msg}`);
  }

  err(msg) {
    this._write(`   ${colors.red('✖')} ${msg}`);
  }

  rawLine(text) {
    this._write(text);
  }

  blank() {
    this._write('');
  }
}
