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
  { value: 'system', label: 'Padrão do sistema', desc: 'Usa o desktop padrão da base escolhida (recomendado).' },
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
  { value: 'system', label: 'Padrão do sistema', desc: 'Usa o tema padrão da base/desktop escolhido (recomendado).' },
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
  { value: 'system', label: 'Padrão do sistema', desc: 'Mantém o wallpaper padrão da base (não adiciona nada).', colorA: [70, 120, 180], colorB: [20, 30, 50] },
  { value: 'mountains', label: 'Montanhas (natural)', desc: 'Paisagem serena com gradiente.', colorA: [98, 130, 190], colorB: [30, 40, 70] },
  { value: 'abstract-gradient', label: 'Gradiente abstrato', desc: 'Cores fluidas e modernas.', colorA: [255, 100, 120], colorB: [80, 40, 160] },
  { value: 'minimal-lines', label: 'Linhas minimalistas', desc: 'Limpo e geométrico.', colorA: [40, 45, 60], colorB: [10, 12, 22] },
  { value: 'space-nebula', label: 'Nebulosa espacial', desc: 'Profundidade cósmica.', colorA: [120, 60, 180], colorB: [10, 10, 40] },
  { value: 'dark-waves', label: 'Ondas escuras', desc: 'Sutil e elegante.', colorA: [30, 34, 45], colorB: [8, 10, 16] },
  { value: 'nature-forest', label: 'Floresta', desc: 'Verde e natureza.', colorA: [90, 160, 90], colorB: [20, 60, 30] },
  { value: 'cyber-city', label: 'Cidade cyberpunk', desc: 'Neon e futurista.', colorA: [0, 200, 220], colorB: [180, 0, 120] },
  { value: 'flat-icons', label: 'Ícones flat', desc: 'Geométrico e direto.', colorA: [70, 140, 200], colorB: [30, 60, 120] },
  { value: 'sunset', label: 'Pôr do sol', desc: 'Tons quentes de nascer do sol.', colorA: [255, 150, 60], colorB: [200, 40, 80] },
  { value: 'ocean-deep', label: 'Oceano profundo', desc: 'Azuis do fundo do mar.', colorA: [0, 140, 160], colorB: [0, 20, 60] },
  { value: 'aurora', label: 'Aurora boreal', desc: 'Verde e lilás no céu.', colorA: [60, 220, 160], colorB: [120, 60, 180] },
  { value: 'monochrome', label: 'Monocromático', desc: 'Preto, branco e cinza.', colorA: [120, 120, 120], colorB: [20, 20, 20] },
  { value: 'amoled-dark', label: 'AMOLED escuro', desc: 'Fundo totalmente preto, ultra baixo consumo.', colorA: [20, 20, 20], colorB: [0, 0, 0] },
];

export const LOCKSCREEN_STYLES = [
  { value: 'system', label: 'Padrão do sistema', desc: 'Usa a tela de bloqueio padrão do desktop escolhido.' },
  { value: 'blur', label: 'Blur (desfoque do fundo)', desc: 'Fundo desfocado com relógio grande.' },
  { value: 'cards', label: 'Cartões (widgets)', desc: 'Relógio, clima e notícias em cartões.' },
  { value: 'minimal', label: 'Minimalista', desc: 'Apenas relógio e campo de senha.' },
  { value: 'clock-center', label: 'Relógio central', desc: 'Grande e centralizado.' },
  { value: 'date-modern', label: 'Moderno com data', desc: 'Data e hora estilizadas.' },
  { value: 'wave', label: 'Onda animada', desc: 'Fundo com elemento animado sutil.' },
];

export const BOOT_THEMES = [
  { value: 'system', label: 'Padrão do sistema', desc: 'Usa o tema de boot padrão da base.' },
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
  { value: 'system', label: 'Padrão do sistema', desc: 'Usa o kernel padrão da base escolhida (recomendado e mais estável).' },
  { value: 'lts', label: 'Kernel LTS', desc: 'Longo suporte, máximo de estabilidade.' },
  { value: 'default', label: 'Kernel padrão', desc: 'Equilíbrio entre estabilidade e novos recursos.' },
  { value: 'zen', label: 'Kernel Zen', desc: 'Otimizado para uso no desktop e jogos.' },
  { value: 'hardened', label: 'Kernel Hardened', desc: 'Foco em segurança.' },
  { value: 'rt', label: 'Kernel RT', desc: 'Tempo real (baixa latência).' },
];

export const LOCALES = [
  { value: 'system', label: 'Padrão do sistema', desc: 'Usa o idioma/locale padrão da base. Podemos detectar o seu depois.' },
  { value: 'pt_BR', label: 'Português (Brasil)' },
  { value: 'pt_PT', label: 'Português (Portugal)' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'es_ES', label: 'Español' },
  { value: 'fr_FR', label: 'Français' },
  { value: 'de_DE', label: 'Deutsch' },
  { value: 'it_IT', label: 'Italiano' },
];

export const TIMEZONES = [
  { value: 'system', label: 'Padrão do sistema (auto)', desc: 'Detecta e usa o fuso horário da máquina atual (recomendado).' },
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
  { value: 'system', label: 'Padrão do sistema', desc: 'Usa a compressão padrão do squashfs (deixa a ferramenta decidir).' },
  { value: 'gzip', label: 'gzip (compatível)', desc: 'Mais compatível, menor compressão.' },
  { value: 'xz', label: 'xz (melhor)', desc: 'Alta compressão, build mais lento.' },
  { value: 'zstd', label: 'zstd (rápido)', desc: 'Muito rápido e boa compressão.' },
  { value: 'lzo', label: 'lzo (rápido)', desc: 'Veloz, menor compressão.' },
];
/** Mapeamento de pacotes REAIS por base de distribuição.
 * Cada base tem seu próprio gerenciador/nome de pacote. Isso permite que o
 * bootstrap instale o desktop e os apps selecionados de verdade.
 */

// Pacotes do ambiente de desktop por base (família Debian/Ubuntu/Mint).
export const DESKTOP_PKGS = {
  debian: {
    kde: ['kde-plasma-desktop', 'plasma-workspace', 'sddm'],
    gnome: ['gnome', 'gnome-shell', 'gdm3'],
    xfce: ['xfce4', 'xfce4-goodies', 'lightdm'],
    mate: ['mate-desktop-environment', 'mate-desktop-environment-extras', 'lightdm'],
    cinnamon: ['cinnamon', 'lightdm'],
    lxqt: ['lxqt', 'sddm'],
    budgie: ['budgie-desktop', 'budgie-core', 'lightdm'],
    cosmic: ['cosmic-desktop', 'systemd-boot'],
    sway: ['sway', 'waybar', 'wofi'],
    i3: ['i3-wm', 'i3status', 'i3lock', 'dmenu'],
  },
  ubuntu: {
    kde: ['kubuntu-desktop'],
    gnome: ['ubuntu-desktop'],
    xfce: ['xubuntu-desktop'],
    mate: ['ubuntu-mate-desktop'],
    cinnamon: ['cinnamon-desktop-environment', 'lightdm'],
    lxqt: ['lubuntu-desktop'],
    budgie: ['budgie-desktop', 'budgie-core'],
    cosmic: ['cosmic-desktop'],
    sway: ['sway', 'waybar', 'wofi'],
    i3: ['i3-wm', 'i3status', 'i3lock', 'dmenu'],
  },
  mint: {
    cinnamon: ['mint-meta-cinnamon'],
    mate: ['mint-meta-mate'],
    xfce: ['mint-meta-xfce'],
    kde: ['kde-plasma-desktop'],
    gnome: ['gnome', 'gnome-shell', 'gdm3'],
  },
  // famílias RPM e outras — usam grupos/pacotes equivalentes
  fedora: {
    kde: ['@kde-desktop-environment'],
    gnome: ['@gnome-desktop-environment'],
    xfce: ['@xfce-desktop-environment'],
    mate: ['@mate-desktop-environment'],
    cinnamon: ['@cinnamon-desktop-environment'],
    lxqt: ['@lxqt-desktop-environment'],
    sway: ['sway', 'waybar'],
    i3: ['i3', 'i3status', 'dmenu'],
  },
  opensuse: {
    kde: ['patterns-kde-kde_plasma'],
    gnome: ['patterns-gnome-gnome'],
    xfce: ['patterns-xfce-xfce'],
    mate: ['patterns-mate-mate'],
    sway: ['sway', 'waybar'],
    i3: ['i3', 'i3status'],
  },
  arch: {
    kde: ['plasma-meta', 'sddm'],
    gnome: ['gnome', 'gdm'],
    xfce: ['xfce4', 'xfce4-goodies', 'lightdm-gtk-greeter'],
    mate: ['mate', 'mate-extra', 'lightdm'],
    cinnamon: ['cinnamon', 'lightdm'],
    lxqt: ['lxqt', 'sddm'],
    sway: ['sway', 'waybar', 'wofi'],
    i3: ['i3-wm', 'i3status', 'i3lock', 'dmenu'],
  },
};

/** Desktop padrão de cada base, usado quando o usuário escolhe "Padrão do sistema". */
export const DEFAULT_DESKTOP_BY_BASE = {
  debian: 'xfce', ubuntu: 'gnome', mint: 'cinnamon',
  arch: 'kde', manjaro: 'kde', endeavouros: 'xfce',
  fedora: 'gnome', opensuse: 'kde', void: 'xfce', alpine: 'xfce', gentoo: 'kde', nixos: 'gnome',
};

/** Tema global padrão de cada base. */
export const DEFAULT_THEME_BY_BASE = {
  debian: 'adwaita-dark', ubuntu: 'adwaita-dark', mint: 'adwaita-light',
  arch: 'arc-dark', fedora: 'adwaita-dark', opensuse: 'breeze-dark',
  void: 'nordic', alpine: 'nordic', gentoo: 'dracula', nixos: 'nord',
};

// Apps escolhidos no assistente -> pacote real, por base.
export const APP_PKGS = {
  debian: {
    firefox: ['firefox-esr'], chromium: ['chromium'], brave: ['brave-browser'],
    vlc: ['vlc'], libreoffice: ['libreoffice'], gimp: ['gimp'], blender: ['blender'],
    code: ['code'], neovim: ['neovim'], 'obs-studio': ['obs-studio'],
    telegram: ['telegram-desktop'], discord: ['discord'], spotify: ['spotify'],
    steam: ['steam'], 'gnome-terminal': ['gnome-terminal'], htop: ['htop'],
    docker: ['docker.io'], git: ['git'], nodejs: ['nodejs', 'npm'], python3: ['python3', 'python3-pip'],
    'gnome-software': ['gnome-software'], timeshift: ['timeshift'],
  },
  ubuntu: {
    firefox: ['firefox'], chromium: ['chromium-browser'], brave: ['brave-browser'],
    vlc: ['vlc'], libreoffice: ['libreoffice'], gimp: ['gimp'], blender: ['blender'],
    code: ['code'], neovim: ['neovim'], 'obs-studio': ['obs-studio'],
    telegram: ['telegram-desktop'], discord: ['discord'], spotify: ['spotify'],
    steam: ['steam'], 'gnome-terminal': ['gnome-terminal'], htop: ['htop'],
    docker: ['docker.io'], git: ['git'], nodejs: ['nodejs', 'npm'], python3: ['python3', 'python3-pip'],
    'gnome-software': ['gnome-software'], timeshift: ['timeshift'],
  },
  arch: {
    firefox: ['firefox'], chromium: ['chromium'], vlc: ['vlc'], libreoffice: ['libreoffice-still'],
    gimp: ['gimp'], blender: ['blender'], code: ['code'], neovim: ['neovim'],
    'obs-studio': ['obs-studio'], telegram: ['telegram-desktop'], discord: ['discord'],
    spotify: ['spotify'], steam: ['steam'], 'gnome-terminal': ['gnome-terminal'],
    htop: ['htop'], docker: ['docker'], git: ['git'], nodejs: ['nodejs', 'npm'],
    python3: ['python', 'python-pip'], 'gnome-software': ['gnome-software'], timeshift: ['timeshift'],
  },
  fedora: {
    firefox: ['firefox'], chromium: ['chromium'], vlc: ['vlc'], libreoffice: ['libreoffice'],
    gimp: ['gimp'], blender: ['blender'], neovim: ['neovim'], 'obs-studio': ['obs-studio'],
    telegram: ['telegram-desktop'], spotify: ['spotify'], steam: ['steam'],
    'gnome-terminal': ['gnome-terminal'], htop: ['htop'], docker: ['docker'],
    git: ['git'], nodejs: ['nodejs', 'npm'], python3: ['python3', 'pip'],
    'gnome-software': ['gnome-software'],
  },
  opensuse: {
    vlc: ['vlc'], libreoffice: ['libreoffice'], gimp: ['gimp'], blender: ['blender'],
    neovim: ['neovim'], htop: ['htop'], git: ['git'], nodejs: ['nodejs'],
    python3: ['python3'], 'gnome-terminal': ['gnome-terminal'],
  },
};

/** Nome do pacote de KERNEL por base.
 *  ATENÇÃO: o nome difere entre bases — linux-image-amd64 (Debian) NÃO existe no
 *  Ubuntu (que usa linux-image-generic). Incluir o nome errado faz o debootstrap
 *  abortar ("Couldn't find these debs"). */
export const KERNEL_PKGS = {
  debian: ['linux-image-amd64'],
  ubuntu: ['linux-image-generic'],
  mint: ['linux-image-generic'],
  arch: ['linux'],
  fedora: ['kernel'],
  opensuse: ['kernel-default'],
};

export const GRUB_PKGS = {
  debian: ['grub-pc-bin', 'grub-efi-amd64-bin', 'grub2-common'],
  ubuntu: ['grub-pc-bin', 'grub-efi-amd64-bin', 'grub2-common'],
  mint: ['grub-pc-bin', 'grub-efi-amd64-bin', 'grub2-common'],
  arch: ['grub', 'efibootmgr'],
  fedora: ['grub2', 'grub2-efi', 'efibootmgr'],
  opensuse: ['grub2', 'grub2-efi', 'efibootmgr'],
};

/** Pacotes universais que EXISTEM na componente main em todas as bases Debian-like
 *  e que podem ir com segurança no --include do debootstrap.
 *  NÃO coloque aqui kernel/grub/build-essential: o nome difere por base e o
 *  --include só enxerga a componente main, o que torna o bootstrap frágil.
 *  Esses pacotes são instalados depois via chroot (installPackages). */
export const DEBOOTSTRAP_INCLUDE_SAFE = [
  'locales', 'tzdata', 'systemd', 'initramfs-tools',
  'squashfs-tools', 'rsync', 'apt-utils', 'dbus', 'ca-certificates', 'dirmngr',
];

export const DEFAULT_BASE_PKGS = {
  debian: ['systemd', 'locales', 'tzdata', 'bash', 'coreutils', 'initramfs-tools', 'linux-image-amd64', 'grub-pc-bin', 'grub-efi-amd64-bin', 'squashfs-tools', 'xorg-server', 'mesa-utils'],
  ubuntu: ['systemd', 'locales', 'tzdata', 'bash', 'coreutils', 'initramfs-tools', 'linux-image-generic', 'grub-pc-bin', 'grub-efi-amd64-bin', 'squashfs-tools', 'xorg-server', 'mesa-utils'],
  mint: ['systemd', 'locales', 'tzdata', 'bash', 'coreutils', 'initramfs-tools', 'linux-image-generic', 'grub-pc-bin', 'grub-efi-amd64-bin', 'squashfs-tools'],
  arch: ['base', 'linux', 'linux-firmware', 'grub', 'efibootmgr', 'squashfs-tools', 'xorg-server', 'mesa'],
};
