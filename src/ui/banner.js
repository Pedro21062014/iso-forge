import { colors, bold, dim } from './ansi.js';

export const LOGO = `
 ██╗███████╗ ██████╗      ███████╗ ██████╗ ██████╗  ██████╗ ███████╗
 ██║██╔════╝██╔═══██╗     ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
 ██║███████╗██║   ██║█████╗███████╗██║   ██║██████╔╝██║  ███╗█████╗
 ██║╚════██║██║   ██║╚════╝╚════██║██║   ██║██╔══██╗██║   ██║██╔══╝
 ██║███████║╚██████╔╝      ███████║╚██████╔╝██║  ██║╚██████╔╝███████╗
 ╚═╝╚══════╝ ╚═════╝       ╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
`;

export const WELCOME = `${colors.purple(LOGO)}
${bold(colors.white('>>>  Crie a sua própria distribuição Linux  <<<'))}
${colors.gray(dim('Monte, personalize e gere a sua ISO — direto do terminal.'))}
`;

export const HELP = `
${colors.cyan(bold('Comandos:'))}
  ●  iso-forge          → inicia o assistente interativo de criação
  ●  iso-forge gui      → modo com mais detalhes/backup
  ●  iso-forge --help   → esta ajuda

${colors.cyan(bold('Dica:'))} execute em um terminal Linux/Windows (WSL) para melhor experiência.
`;
