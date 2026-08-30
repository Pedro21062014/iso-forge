import { colors, bold, dim, cursor } from './ansi.js';

/**
 * Barra de progresso adaptativa.
 * Em máquinas com pouca RAM o passo é mais lento (fator maior) e um aviso
 * aparece logo abaixo da barra indicando lentidão — mantendo estabilidade.
 */
export class ProgressBar {
  constructor({ total = 100, label = '', warn = '', speedFactor = 1, logger = null } = {}) {
    this.total = total;
    this.current = 0;
    this.label = label || '';
    this.warn = warn || '';
    this.speedFactor = speedFactor || 1;
    this.width = 34;
    this.lastPct = -1;
    this.lastText = '';
    this.logger = logger || null;
    this.done = false;
  }

  _render() {
    const pct = Math.min(100, Math.round((this.current / this.total) * 100));
    const filled = Math.round((pct / 100) * this.width);
    const bar =
      colors.cyan('█'.repeat(filled)) +
      colors.gray('░'.repeat(this.width - filled));

    const pctTxt = colors.white(bold(`${pct}%`));
    const lbl = this.label ? `${colors.purple(bold(this.label))} ` : '';

    const lines = [];
    lines.push(`\r ${lbl}${bar}  ${pctTxt}  ·  ${dim(colors.gray(`${this.current}/${this.total}`))}`);
    // Reposiciona para desenhar a linha de aviso abaixo da barra
    const warnLine = this.warn && this.speedFactor > 1
      ? colors.yellow(dim(this.warn))
      : '';
    return { barLine: lines[0], warnLine };
  }

  /** Atualiza e desenha. Se um logger estiver presente, usa o rodapé; senão imprimimos inline. */
  update(current, total) {
    if (total !== undefined) this.total = total;
    this.current = Math.min(current, this.total);
    const { barLine, warnLine } = this._render();

    // Se tiver logger com rodapé, aproveitamos ele
    if (this.logger) {
      this.logger.setFooter([barLine, warnLine].filter(Boolean));
    } else {
      process.stdout.write('\r\x1b[2K' + barLine);
      if (warnLine) process.stdout.write('\n       ' + warnLine);
    }
    // pausa proporcional ao fator de velocidade (lento em pouca RAM)
    return this._delayForSpeed();
  }

  _delayForSpeed() {
    // base do delay por unidade, escalado pelo fator de velocidade
    const base = 70; // ms
    return base * this.speedFactor;
  }

  /** Enquanto o processo roda, chamamos tick() de tempos em tempos. */
  tick(step = 1, extraLabel = '') {
    this.current = Math.min(this.total, this.current + step);
    if (extraLabel) this.label = extraLabel;
    this.update(this.current);
  }

  /** Espera passiva, respeitando o fator de velocidade do hardware. */
  async idle(ms) {
    const effective = ms * this.speedFactor;
    return new Promise((r) => setTimeout(r, effective));
  }

  finish(finalLabel = '') {
    if (this.done) return;
    this.done = true;
    if (this.logger) this.logger.setFooter([this._render().barLine, this._render().warnLine].filter(Boolean));
    else process.stdout.write('\n');
  }

  clear() {
    if (this.logger) this.logger.clearFooter();
    else process.stdout.write('\r\x1b[2K');
  }
}
