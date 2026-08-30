/** Presets e catálogos de opções para a personalização da ISO. */

export const BASE_DISTROS = [
  { value: 'ubuntu', label: 'Ubuntu', desc: 'Base estável e popular. Suporte a drivers e grande repositório.', family: 'Debian' },
  { value: 'debian', label: 'Debian', desc: 'Extremamente estável. Controle total, base pura.', family: 'Debian' },
  { value: 'arch', label: 'Arch Linux', desc: 'Rolling release, transparente e minimalista (PKGBUILD).', family: 'Arch' },
  { value: 'fedora', label: 'Fedora', desc: 'Moderno e jovem, com tecnologias recentes.', family: 'RPM' },
  { value: 'opensuse', label: 'openSUSE', desc: 'Tumbleweed/Leap. Ferramenta de construção de imagens (KIWI).', family: 'RPM' },
  { value: 'void', label: 'Void Linux', desc: 'Independente, init runit, leve e rápido.', family: 'Independente' },
  { value: 'alpine', label: 'Alpine', desc: 'Muito leve, musl, ótimo para builds pequenos.', family: 'Independente' },
  { value: 'mint', label: 'Linux Mint', desc: 'Amigável e voltado ao desktop, base Ubuntu.', family: 'Debian' },
  { value: 'endeavouros', label: 'EndeavourOS', desc: 'Arch com instalação amigável.', family: 'Arch' },
  { value: 'gentoo', label: 'Gentoo', desc: 'Source-based, altamente configurável (PORTAGE).', family: 'Independente' },
  { value: 'nixos', label: 'NixOS', desc: 'Configuração declarativa e reproduzível.', family: 'Nix' },
  { value: 'manjaro', label: 'Manjaro', desc: 'Arch com estabilidade e facilidade.', family: 'Arch' },
];

export const EDITIONS = [
  { value: 'lite', label: 'ISO Lite', desc: 'Mínima e enxuta — apenas o essencial + apps escolhidos. Menor tamanho.', weight: 1 },
  { value: 'leve', label: 'ISO Leve', desc: 'Equilibrada: desktop completo com apps básicos. Boa para PCs modestos.', weight: 2 },
  { value: 'core', label: 'ISO Core (normal)', desc: 'Edição padrão e completa, com ferramentas de desenvolvimento e utilitários.', weight: 3 },
];

export const DESKTOPS = [
  { value: 'kde', label: 'KDE Plasma', desc: 'Moderno, bonito e altamente customizável. Mais pesado.' },
  { value: 'gnome', label: 'GNOME', desc: 'Simples, produtivo, foco em fluxo de trabalho.' },
  { value: 'xfce', label: 'XFCE', desc: 'Leve e estável. Ótimo para máquinas modestas.' },
  { value: 'mate', label: 'MATE', desc: 'Continuação clássica do GNOME 2. Leve e familiar.' },
  { value: 'cinnamon', label: 'Cinnamon', desc: 'De fácil uso, moderno e leve (padrão do Mint).' },
  { value: 'lxqt', label: 'LXQt', desc: 'Ultra leve. Pensado para hardware antigo.' },
  { value: 'budgie', label: 'Budgie', desc: 'Elegante e simples, baseado em GNOME.' },
  { value: 'cosmic', label: 'COSMIC (System76)', desc: 'Novo e inovador, escrito em Rust.' },
  { value: 'sway', label: 'Sway (WM)', desc: 'Wayland, i3-like, minimalista e rápido.' },
  { value: 'i3', label: 'i3 (WM)', desc: 'Tiling window manager clássico, leve e minimalista.' },
];

export const GLOBAL_THEMES = [
  { value: 'adwaita-dark', label: 'Adwaita Dark', desc: 'Sombrio, limpo e neutro.' },
  { value: 'adwaita-light', label: 'Adwaita Light', desc: 'Claro, simples e moderno.' },
  { value: 'breeze-dark', label: 'Breeze Dark', desc: 'Tema padrão do KDE, azulado e escuro.' },
  { value: 'dracula', label: 'Dracula', desc: 'Esquema de cores icônico (roxo/cinza escuro).' },
  { value: 'catppuccin', label: 'Catppuccin', desc: 'Paleta suave e pastel, muito popular.' },
  { value: 'gruvbox', label: 'Gruvbox', desc: 'Estética retrô, tons terrosos.' },
  { value: 'tokyo-night', label: 'Tokyo Night', desc: 'Noturno com acentos vibrantes.' },
  { value: 'nord', label: 'Nord', desc: 'Tons de gelo e azul, minimalista.' },
  { value: 'nordic', label: 'Nordic', desc: 'Variação escura baseada no Nord.' },
  { value: 'arc-dark', label: 'Arc Dark', desc: 'Flat, moderno e azulado.' },
  { value: 'pop-dark', label: 'Pop!_OS Dark', desc: 'Escuro com acentos laranja.' },
  { value: 'matcha', label: 'Matcha', desc: 'Verde suave, foco e calma.' },
];

export const WALLPAPERS = [
  { value: 'mountains', label: 'Montanhas (natural)', desc: 'Paisagem serena com gradiente.' },
  { value: 'abstract-gradient', label: 'Gradiente abstrato', desc: 'Cores fluidas e modernas.' },
  { value: 'minimal-lines', label: 'Linhas minimalistas', desc: 'Limpo e geométrico.' },
  { value: 'space-nebula', label: 'Nebulosa espacial', desc: 'Profundidade cósmica.' },
  { value: 'dark-waves', label: 'Ondas escuras', desc: 'Sutil e elegante.' },
  { value: 'nature-forest', label: 'Floresta', desc: 'Verde e natureza.' },
  { value: 'cyber-city', label: 'Cidade cyberpunk', desc: 'Neon e futurista.' },
  { value: 'flat-icons', label: 'Ícones flat', desc: 'Geométrico e direto.' },
];

export const LOCKSCREEN_STYLES = [
  { value: 'blur', label: 'Blur (desfoque do fundo)', desc: 'Fundo desfocado com relógio grande.' },
  { value: 'cards', label: 'Cartões (widgets)', desc: 'Relógio, clima e notícias em cartões.' },
  { value: 'minimal', label: 'Minimalista', desc: 'Apenas relógio e campo de senha.' },
  { value: 'clock-center', label: 'Relógio central', desc: 'Grande e centralizado.' },
  { value: 'date-modern', label: 'Moderno com data', desc: 'Data e hora estilizadas.' },
  { value: 'wave', label: 'Onda animada', desc: 'Fundo com elemento animado sutil.' },
];

export const BOOT_THEMES = [
  { value: 'grub-classic', label: 'GRUB clássico', desc: 'Texto e padrão imutável.' },
  { value: 'grub-modern', label: 'GRUB moderno', desc: 'Visual com imagem de fundo e tipografia.' },
  { value: 'grub-breeze', label: 'GRUB Breeze', desc: 'Estilo KDE.' },
  { value: 'grub-simple', label: 'GRUB simples', desc: 'Minimalista, sem adornos.' },
  { value: 'plymouth-default', label: 'Plymouth padrão', desc: 'Splash com spinner padrão.' },
  { value: 'plymouth-rings', label: 'Plymouth Rings', desc: 'Anéis cadenciados.' },
  { value: 'plymouth-soft', label: 'Plymouth Soft', desc: 'Splash suave com fade.' },
];

export const CUSTOM_APPS = [
  { value: 'firefox', label: 'Firefox', desc: 'Navegador web' },
  { value: 'chromium', label: 'Chromium', desc: 'Navegador web' },
  { value: 'brave', label: 'Brave', desc: 'Navegador com privacidade' },
  { value: 'vlc', label: 'VLC', desc: 'Player multimídia' },
  { value: 'libreoffice', label: 'LibreOffice', desc: 'Suíte de escritório' },
  { value: 'gimp', label: 'GIMP', desc: 'Editor de imagens' },
  { value: 'blender', label: 'Blender', desc: 'Modelagem 3D' },
  { value: 'code', label: 'VS Code', desc: 'Editor de código' },
  { value: 'neovim', label: 'Neovim', desc: 'Editor minimalista' },
  { value: 'obs-studio', label: 'OBS Studio', desc: 'Gravação/streaming' },
  { value: 'telegram', label: 'Telegram', desc: 'Mensagens' },
  { value: 'discord', label: 'Discord', desc: 'Comunidade' },
  { value: 'spotify', label: 'Spotify', desc: 'Música' },
  { value: 'steam', label: 'Steam', desc: 'Jogos' },
  { value: 'gnome-terminal', label: 'Terminal', desc: 'Emulador de terminal' },
  { value: 'htop', label: 'htop', desc: 'Monitor de processos' },
  { value: 'docker', label: 'Docker', desc: 'Contêineres' },
  { value: 'git', label: 'Git', desc: 'Controle de versão' },
  { value: 'nodejs', label: 'Node.js', desc: 'Runtime JS' },
  { value: 'python3', label: 'Python 3', desc: 'Runtime Python' },
  { value: 'gnome-software', label: 'Central de Apps', desc: 'Loja de aplicativos' },
  { value: 'timeshift', label: 'Timeshift', desc: 'Backup do sistema' },
];

export const KERNELS = [
  { value: 'lts', label: 'Kernel LTS', desc: 'Longo suporte, máximo de estabilidade.' },
  { value: 'default', label: 'Kernel padrão', desc: 'Equilíbrio entre estabilidade e novos recursos.' },
  { value: 'zen', label: 'Kernel Zen', desc: 'Otimizado para uso no desktop e jogos.' },
  { value: 'hardened', label: 'Kernel Hardened', desc: 'Foco em segurança.' },
  { value: 'rt', label: 'Kernel RT', desc: 'Tempo real (baixa latência).' },
];

export const LOCALES = [
  { value: 'pt_BR', label: 'Português (Brasil)' },
  { value: 'pt_PT', label: 'Português (Portugal)' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'es_ES', label: 'Español' },
  { value: 'fr_FR', label: 'Français' },
  { value: 'de_DE', label: 'Deutsch' },
  { value: 'it_IT', label: 'Italiano' },
];

export const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'America/Noronha', label: 'Fernando de Noronha' },
  { value: 'America/Manaus', label: 'Manaus' },
  { value: 'America/Lima', label: 'Lima' },
  { value: 'America/Bogota', label: 'Bogotá' },
  { value: 'Europe/Lisbon', label: 'Lisboa' },
  { value: 'Europe/Madrid', label: 'Madrid' },
  { value: 'Europe/London', label: 'Londres' },
  { value: 'America/New_York', label: 'Nova York' },
  { value: 'Asia/Tokyo', label: 'Tóquio' },
];

export const COMPRESSION = [
  { value: 'gzip', label: 'gzip (compatível)', desc: 'Mais compatível, menor compressão.' },
  { value: 'xz', label: 'xz (melhor)', desc: 'Alta compressão, build mais lento.' },
  { value: 'zstd', label: 'zstd (rápido)', desc: 'Muito rápido e boa compressão.' },
  { value: 'lzo', label: 'lzo (rápido)', desc: 'Veloz, menor compressão.' },
];
