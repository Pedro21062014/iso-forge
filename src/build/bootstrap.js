import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Bootstrap REAL de sistema base.
 * Baixa e instala a distribuição selecionada num diretório rootfs.
 * Debian/Ubuntu/Mint -> debootstrap + apt. Arch -> pacstrap. Fedora -> dnf --installroot.
 */

export function detectBootstrap() {
  return {
    debootstrap: hasTool('debootstrap'),
    pacstrap: hasTool('pacstrap'),
    dnf: hasTool('dnf'),
    rexec: hasTool('chroot'),
  };
}

function hasTool(t) {
  try { execSync(`command -v ${t} 2>/dev/null`, { stdio: 'ignore', timeout: 5000 }); return true; } catch { return false; }
}

/** Mapeia base -> ferramenta de bootstrap utilizável na máquina atual. */
export const BOOTSTRAP_TOOL = {
  debian: 'debootstrap', ubuntu: 'debootstrap', mint: 'debootstrap',
  arch: 'pacstrap', manjaro: 'pacstrap', endeavouros: 'pacstrap',
  fedora: 'dnf', opensuse: 'dnf',
};

/**
 * Pacotes de ferramentas de build necessários, por gerenciador de pacotes do
 * HOST. Usado pelo iso-forge para instalar automaticamente (com a permissão
 * do usuário) o que faltar: debootstrap, squashfs, grub e xorriso.
 */
export const BUILD_TOOL_PKGS_BY_PM = {
  apt: { cmd: 'sudo apt-get update && sudo apt-get install -y', pkgs: 'debootstrap squashfs-tools grub-pc-bin grub-efi-amd64-bin xorriso' },
  'apt-get': { cmd: 'sudo apt-get update && sudo apt-get install -y', pkgs: 'debootstrap squashfs-tools grub-pc-bin grub-efi-amd64-bin xorriso' },
  pacman: { cmd: 'sudo pacman -S --noconfirm', pkgs: 'debootstrap squashfs-tools grub libisoburn' },
  dnf: { cmd: 'sudo dnf install -y', pkgs: 'debootstrap squashfs-tools grub2 xorriso' },
  yum: { cmd: 'sudo yum install -y', pkgs: 'debootstrap squashfs-tools grub2 xorriso' },
  zypper: { cmd: 'sudo zypper install -y', pkgs: 'debootstrap squashfs-tools grub2 xorriso' },
  apk: { cmd: 'sudo apk add', pkgs: 'debootstrap squashfs-tools xorriso' },
  emerge: { cmd: 'sudo emerge --ask=y', pkgs: 'debootstrap squashfs-tools xorriso' },
};

export const DEBIAN_SUITE = {
  debian: 'bookworm', ubuntu: 'noble', mint: 'virginia',
};

export const DEBIAN_MIRROR = {
  debian: 'https://deb.debian.org/debian',
  ubuntu: 'https://archive.ubuntu.com/ubuntu/',
  mint: 'https://packages.linuxmint.com/',
};

/**
 * Cria um rootfs real a partir da base escolhida.
 * Retorna o caminho do rootfs.
 */
export async function bootstrapBase({ base, arch, targetRoot, includePkgs = [], logger, addWeight, pbar, sys }) {
  const tool = BOOTSTRAP_TOOL[base];
  if (!tool) throw new Error(`Sem bootstrap automático para a base "${base}". Instale debootstrap/pacstrap/dnf.`);

  fs.mkdirSync(targetRoot, { recursive: true });

  if (tool === 'debootstrap') {
    return bootstrapDebian({ base, arch, targetRoot, includePkgs, logger, pbar, sys });
  }
  if (tool === 'pacstrap') {
    return bootstrapArch({ base, arch, targetRoot, includePkgs, logger, pbar, sys });
  }
  if (tool === 'dnf') {
    return bootstrapDnf({ base, arch, targetRoot, includePkgs, logger, pbar, sys });
  }
  throw new Error('Nenhum método de bootstrap suportado.');
}

function stream(cmd, logger) {
  // executa com stdout ao vivo (para o usuário ver o progresso do apt/debootstrap)
  execSync(cmd, { stdio: 'inherit', timeout: 3600000 });
}

async function bootstrapDebian({ base, arch, targetRoot, includePkgs, logger, pbar, sys }) {
  const suite = DEBIAN_SUITE[base] || 'bookworm';
  const mirror = DEBIAN_MIRROR[base] || DEBIAN_MIRROR.debian;
  const inc = ['locales', 'tzdata', 'systemd', 'initramfs-tools', 'grub-pc-bin', 'grub-efi-amd64-bin', 'linux-image-amd64', 'squashfs-tools', ...includePkgs].filter(Boolean);
  logger?.log(`${'▸'} debootstrap: baixando e instalando a base ${base} (suite ${suite}) — isto baixa vários GB e pode demorar.`, 'build');

  // debootstrap precisa de root (mknod) e de um local sem nodev
  const cmd = `sudo debootstrap --arch=${arch} --variant=minbase --include=${inc.filter((p, i, a) => a.indexOf(p) === i).join(',')} --no-check-gpg ${suite} ${targetRoot} ${mirror}`;
  stream(cmd, logger);
  logger?.log(`${'✔'} Base ${base} bootstrapada (rootfs real).`, 'ok');
  return targetRoot;
}

async function bootstrapArch({ base, arch, targetRoot, includePkgs, logger, pbar, sys }) {
  logger?.log(`${'▸'} pacstrap: instalando base Arch (${base}).`, 'build');
  const basePkgs = ['base', 'linux', 'linux-firmware', 'grub', 'efibootmgr', 'squashfs-tools', ...includePkgs].filter(Boolean);
  const cmd = `sudo pacstrap -C /dev/null ${targetRoot} ${basePkgs.join(' ')}`;
  stream(cmd, logger);
  logger?.log(`${'✔'} Base ${base} bootstrapada.`, 'ok');
  return targetRoot;
}

async function bootstrapDnf({ base, arch, targetRoot, includePkgs, logger, pbar, sys }) {
  logger?.log(`${'▸'} dnf --installroot: instalando base ${base}.`, 'build');
  const release = base === 'fedora' ? '--releasever=40' : '--releasever=15.5';
  const cmd = `sudo dnf --installroot=${targetRoot} ${release} --releasever=${release.includes('releasever=') ? release.split('=')[1] : ''} groupinstall "${base === 'fedora' ? '@core' : 'base'}" -y ${includePkgs.join(' ')}`;
  stream(cmd, logger);
  logger?.log(`${'✔'} Base ${base} bootstrapada.`, 'ok');
  return targetRoot;
}

/** Roda um comando DENTRO do rootfs (chroot). */
export function chrootExec(rootfs, cmd, logger) {
  try {
    execSync(`sudo chroot ${rootfs} /bin/bash -c "${cmd.replace(/"/g, '\\"')}"`, { stdio: 'inherit', timeout: 3600000 });
  } catch (e) {
    logger?.err(`Falha ao executar no chroot: ${cmd} — ${e?.message || e}`);
    throw e;
  }
}

/** Instala pacotes dentro do rootfs via gerenciador da família. */
export async function installPackages({ base, rootfs, pkgs, logger }) {
  if (!pkgs.length) { logger?.log('Nenhum pacote adicional a instalar.', 'info'); return; }
  logger?.log(`${'▸'} Instalando ${pkgs.length} pacote(s) dentro do ISO: ${pkgs.join(', ')}`, 'build');
  if (base === 'debian' || base === 'ubuntu' || base === 'mint') {
    const cmd = `DEBIAN_FRONTEND=noninteractive apt-get update -y && DEBIAN_FRONTEND=noninteractive apt-get install -y ${pkgs.join(' ')}`;
    chrootExec(rootfs, cmd, logger);
  } else if (base === 'arch' || base === 'manjaro' || base === 'endeavouros') {
    const cmd = `pacman -Sy --noconfirm ${pkgs.join(' ')}`;
    chrootExec(rootfs, cmd, logger);
  } else {
    const cmd = `dnf install -y ${pkgs.join(' ')}`;
    chrootExec(rootfs, cmd, logger);
  }
  logger?.log(`${'✔'} Pacotes instalados.`, 'ok');
}

/** Configura o rootfs (hostname, locale, tz, initramfs). */
export async function configureRootfs({ base, rootfs, name, locale, tz, logger }) {
  logger?.log('Configurando o sistema (hostname, locale, fuso, initramfs)...', 'build');
  // hostname
  fs.writeFileSync(path.join(rootfs, 'etc', 'hostname'), `${name.toLowerCase()}\n`);
  fs.writeFileSync(path.join(rootfs, 'etc', 'hosts'), `127.0.0.1 localhost\n127.0.1.1 ${name.toLowerCase()}\n`);
  // os-release personalizado
  fs.writeFileSync(path.join(rootfs, 'etc', 'os-release'),
    `NAME="${name}"\nID=${name.replace(/\s+/g, '_').toLowerCase()}\nID_LIKE=${base}\nVERSION_ID="1.0"\nPRETTY_NAME="${name} 1.0"\n`);
  // locale / tz
  try {
    const tzPath = path.join(rootfs, 'usr', 'share', 'zoneinfo', tz);
    if (fs.existsSync(tzPath)) { fs.rmSync(path.join(rootfs, 'etc', 'localtime'), { force: true }); fs.copyFileSync(tzPath, path.join(rootfs, 'etc', 'localtime')); }
  } catch {}
  try {
    const cmd = `DEBIAN_FRONTEND=noninteractive update-locale LANG=${locale}.UTF-8 2>/dev/null || true; update-initramfs -u 2>/dev/null || true`;
    if (base !== 'arch') chrootExec(rootfs, cmd, logger);
  } catch {}
}

/** Gera a ISO bootável a partir do rootfs (isolinux+efi via grub-mkrescue/xorriso). */
export function makeBootableISO({ rootfs, isoPath, name, logger }) {
  logger?.log('Gerando ISO bootável (GRUB + isolinux)...', 'build');
  // Cria o arquivo de boot do GRUB
  const isoDir = path.join(rootfs, 'isofiles');
  fs.mkdirSync(isoDir, { recursive: true });
  fs.writeFileSync(path.join(rootfs, 'boot', 'grub', 'grub.cfg'), `set timeout=5
menuentry "${name} (Live)" {
  linux /boot/vmlinuz-* root=live rw quiet splash
  initrd /boot/initrd.img-*
}
`);
  // usa grub-mkrescue para criar ISO híbrida (BIOS + EFI)
  const tool = hasTool('grub-mkrescue');
  const grubEmu = tool ? 'grub-mkrescue' : 'xorriso';
  try {
    execSync(`sudo ${grubEmu} -o ${isoPath} ${rootfs}`, { stdio: 'inherit', timeout: 1200000 });
    return fs.existsSync(isoPath);
  } catch {
    // fallback: xorriso -as mkisofs simples
    try {
      execSync(`sudo xorriso -as mkisofs -o ${isoPath} -V "${name}" ${rootfs}`, { stdio: 'inherit', timeout: 1200000 });
      return fs.existsSync(isoPath);
    } catch { return false; }
  }
}
