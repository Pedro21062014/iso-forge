/** Helpers de escape ANSI para controle do terminal. */

export const esc = (code) => `\x1b[${code}m`;
export const reset = () => esc(0);
export const bold = (s) => `${esc(1)}${s}${reset()}`;
export const dim = (s) => `${esc(2)}${s}${reset()}`;
export const italic = (s) => `${esc(3)}${s}${reset()}`;
export const underline = (s) => `${esc(4)}${s}${reset()}`;

// helpers de cor simples (256 cores)
export const color = (code) => (s) => `\x1b[38;5;${code}m${s}${reset()}`;

export const colors = {
  red: color(9),
  green: color(10),
  yellow: color(11),
  blue: color(33),
  magenta: color(13),
  cyan: color(14),
  orange: color(208),
  gray: color(245),
  white: color(15),
  purple: color(141),
};

export const cursor = {
  hide: () => '\x1b[?25l',
  show: () => '\x1b[?25h',
  up: (n) => `\x1b[${n}A`,
  down: (n) => `\x1b[${n}B`,
  col: (n) => `\x1b[${n}G`,
  clearLine: () => '\x1b[2K',
  clearBelow: () => '\x1b[J',
  save: () => '\x1b[s',
  restore: () => '\x1b[u',
};

export const clear = () => '\x1b[2J\x1b[H';

export const box = (title, lines, opts = {}) => {
  const w = opts.width || 64;
  const pad = ' '.repeat(2);
  let out = '';
  const border = opts.color || colors.cyan;
  const top = border('╭' + '─'.repeat(w) + '╮');
  out += top + '\n';
  if (title) {
    const titleRow = border('│') + bold(colorPicker(title))(` ${title}`) + ' '.repeat(Math.max(0, w - title.length - 1)) + border('│');
    out += titleRow + '\n';
  }
  for (const line of lines) {
    const content = ` ${line}`;
    out += border('│') + content + ' '.repeat(Math.max(0, w - content.length)) + border('│') + '\n';
  }
  out += border('╰' + '─'.repeat(w) + '╯');
  return out;
};

const colorPicker = (text) => {
  if (/iso|forge|logo|boot/i.test(text)) return colors.purple;
  if (/warn|atencao|aviso|mais lento/i.test(text)) return colors.yellow;
  if (/erro|fail/i.test(text)) return colors.red;
  if (/sucesso|ok|pronto/i.test(text)) return colors.green;
  return colors.cyan;
};

export const truncate = (s, n) => (s.length > n ? s.slice(0, n - 3) + '...' : s);
