import { execSync, spawn } from 'node:child_process';
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
  apt: { cmd: 'sudo apt-get update && sudo apt-get install -y', pkgs: 'debootstrap squashfs-tools grub-pc-bin grub-efi-amd64-bin xorriso mtools' },
  'apt-get': { cmd: 'sudo apt-get update && sudo apt-get install -y', pkgs: 'debootstrap squashfs-tools grub-pc-bin grub-efi-amd64-bin xorriso mtools' },
  pacman: { cmd: 'sudo pacman -S --noconfirm', pkgs: 'debootstrap squashfs-tools grub libisoburn mtools' },
  dnf: { cmd: 'sudo dnf install -y', pkgs: 'debootstrap squashfs-tools grub2 xorriso mtools' },
  yum: { cmd: 'sudo yum install -y', pkgs: 'debootstrap squashfs-tools grub2 xorriso mtools' },
  zypper: { cmd: 'sudo zypper install -y', pkgs: 'debootstrap squashfs-tools grub2 xorriso mtools' },
  apk: { cmd: 'sudo apk add', pkgs: 'debootstrap squashfs-tools xorriso mtools' },
  emerge: { cmd: 'sudo emerge --ask=y', pkgs: 'debootstrap squashfs-tools xorriso mtools' },
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
  // Bootstrap exige um destino VAZIO (debootstrap, pacstrap e dnf abortam se
  // sobrar arquivos de uma tentativa anterior — "file already exists").
  cleanDir(targetRoot, logger);

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

/** Esvazia um diretório (mantém a pasta em si). Evita o conflito de extração
 *  "Tried to extract package, but file already exists" quando uma tentativa
 *  anterior deixou lixo (debootstrap/pacstrap/dnf exigem destino limpo). */
function cleanDir(dir, logger) {
  try {
    const leftovers = fs.readdirSync(dir);
    if (leftovers.length) {
      logger?.log(`Limpando ${leftovers.length} item(ns) residual(is) de uma tentativa anterior em ${dir}...`, 'info');
      for (const it of leftovers) fs.rmSync(path.join(dir, it), { recursive: true, force: true });
    }
  } catch {}
}

/** Executa um comando externo transmitindo a saída AO VIVO para o terminal E
 *  capturando-a para diagnóstico. Se o comando falhar, grava o log em arquivo e
 *  lança um erro com o trecho final do log — para que o usuário veja o MOTIVO
 *  real da falha (o execSync com 'inherit' escondia isso, mostrando só
 *  "Command failed: <comando>"). */
function stream(cmd, logger) {
  return new Promise((resolve, reject) => {
    const child = spawn('/bin/bash', ['-c', cmd], { timeout: 3600000 });
    let buf = [];
    const tail = () => buf.slice(-60).join('\n');
    child.stdout.on('data', (d) => { const s = d.toString(); buf.push(s); process.stdout.write(s); });
    child.stderr.on('data', (d) => { const s = d.toString(); buf.push(s); process.stdout.write(s); });
    child.on('error', (e) => reject(new Error('Falha ao iniciar comando: ' + e.message)));
    child.on('close', (code) => {
      if (code === 0) return resolve();
      const err = new Error(`✖ O comando falhou com exit code ${code}.\n\n${tail()}`);
      err.tail = tail();
      err.exitCode = code;
      reject(err);
    });
  });
}


async function bootstrapDebian({ base, arch, targetRoot, includePkgs, logger, pbar, sys }) {
  const suite = DEBIAN_SUITE[base] || 'bookworm';
  const mirror = DEBIAN_MIRROR[base] || DEBIAN_MIRROR.debian;
  // IMPORTANTE: não colocar kernel/grub aqui. O --include do debootstrap só enxerga
  // a componente `main` e o nome do kernel/grub difere por base (linux-image-amd64 no
  // Debian vs linux-image-generic no Ubuntu). Usar o nome errado faz o debootstrap
  // abortar ("Couldn't find these debs"). Kernel+GRUB são instalados DEPOIS via chroot.
  const inc = ['locales', 'tzdata', 'systemd', 'initramfs-tools', 'squashfs-tools',
    'rsync', 'apt-utils', 'dbus', 'ca-certificates', 'dirmngr', ...includePkgs].filter(Boolean);
  logger?.log(`${'▸'} debootstrap: baixando e instalando a base ${base} (suite ${suite}) — isto baixa vários GB e pode demorar.`, 'build');

  // debootstrap precisa de root (mknod) e de um local sem nodev
  const cmd = `sudo debootstrap --arch=${arch} --variant=minbase --include=${inc.filter((p, i, a) => a.indexOf(p) === i).join(',')} --no-check-gpg ${suite} ${targetRoot} ${mirror}`;
  await stream(cmd, logger);
  logger?.log(`${'✔'} Base ${base} bootstrapada (rootfs real).`, 'ok');
  return targetRoot;
}

async function bootstrapArch({ base, arch, targetRoot, includePkgs, logger, pbar, sys }) {
  logger?.log(`${'▸'} pacstrap: instalando base Arch (${base}).`, 'build');
  const basePkgs = ['base', 'linux', 'linux-firmware', 'grub', 'efibootmgr', 'squashfs-tools', ...includePkgs].filter(Boolean);
  const cmd = `sudo pacstrap -C /dev/null ${targetRoot} ${basePkgs.join(' ')}`;
  await stream(cmd, logger);
  logger?.log(`${'✔'} Base ${base} bootstrapada.`, 'ok');
  return targetRoot;
}

async function bootstrapDnf({ base, arch, targetRoot, includePkgs, logger, pbar, sys }) {
  logger?.log(`${'▸'} dnf --installroot: instalando base ${base}.`, 'build');
  const release = base === 'fedora' ? '--releasever=40' : '--releasever=15.5';
  const cmd = `sudo dnf --installroot=${targetRoot} ${release} --releasever=${release.includes('releasever=') ? release.split('=')[1] : ''} groupinstall "${base === 'fedora' ? '@core' : 'base'}" -y ${includePkgs.join(' ')}`;
  await stream(cmd, logger);
  logger?.log(`${'✔'} Base ${base} bootstrapada.`, 'ok');
  return targetRoot;
}

/** Roda um comando DENTRO do rootfs (chroot), capturando o motivo real da falha. */
export function chrootExec(rootfs, cmd, logger) {
  const full = `sudo chroot ${rootfs} /bin/bash -c "${cmd.replace(/"/g, '\\"')}"`;
  return stream(full, logger).catch((e) => {
    logger?.err(`Falha ao executar no chroot: ${cmd.split('&&')[0]} — ${e.message.split('\n').slice(-8).join('\n')}`);
    throw e;
  });
}

/** Instala pacotes dentro do rootfs via gerenciador da família. */
export async function installPackages({ base, rootfs, pkgs, logger }) {
  if (!pkgs.length) { logger?.log('Nenhum pacote adicional a instalar.', 'info'); return; }
  logger?.log(`${'▸'} Instalando ${pkgs.length} pacote(s) dentro do ISO: ${pkgs.join(', ')}`, 'build');
  if (base === 'debian' || base === 'ubuntu' || base === 'mint') {
    const cmd = `DEBIAN_FRONTEND=noninteractive apt-get update -y && DEBIAN_FRONTEND=noninteractive apt-get install -y ${pkgs.join(' ')}`;
    await chrootExec(rootfs, cmd, logger); // IMPORTANTE: aguardar para não rodar apt em paralelo (lock)
  } else if (base === 'arch' || base === 'manjaro' || base === 'endeavouros') {
    const cmd = `pacman -Sy --noconfirm ${pkgs.join(' ')}`;
    await chrootExec(rootfs, cmd, logger);
  } else {
    const cmd = `dnf install -y ${pkgs.join(' ')}`;
    await chrootExec(rootfs, cmd, logger);
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

/** Gera a ISO bootável a partir do rootfs (grub-mkrescue => El Torito BIOS + EFI). */
export function makeBootableISO({ rootfs, isoPath, name, logger }) {
  logger?.log('Gerando ISO bootável (GRUB + isolinux + EFI)...', 'build');
  const isoDir = path.join(rootfs, 'isofiles');
  fs.mkdirSync(isoDir, { recursive: true });
  // Detecta o kernel/initrd REAIS presentes no rootfs (não usar glob — o GRUB não
  // expande "*"). Se achar, gera um menu que boota direto no sistema da ISO.
  const boot = path.join(rootfs, 'boot');
  let vmlinuz = '';
  let initrd = '';
  try {
    // Escolhe o kernel/initrd REAIS mais recentes (ignora os '.old' e os links 'vmlinuz').
    const pick = (arr) => arr.filter((f) => !f.endsWith('.old')).sort().pop() || arr.sort().pop();
    const kernels = fs.readdirSync(boot).filter((f) => f.startsWith('vmlinuz') && f !== 'vmlinuz');
    if (kernels.length) vmlinuz = pick(kernels);
    const inits = fs.readdirSync(boot).filter((f) => f.startsWith('initrd.img') && f !== 'initrd.img');
    if (inits.length) initrd = pick(inits);
  } catch {}
  const useReal = vmlinuz && initrd;
  const bootLabel = vmlinuz ? vmlinuz.replace(/^vmlinuz-?/, '') : 'live';
  const entry = useReal
    ? `set root=(cd0)
set timeout=5
menuentry "${name} (ISO)" {
  linux /boot/${vmlinuz} root=live boot=live rw quiet splash locale=pt_BR.UTF-8
  initrd /boot/${initrd}
}
menuentry "${name} (Check mode)" {
  linux /boot/${vmlinuz} root=live boot=live rw quiet splash check
  initrd /boot/${initrd}
}`
    : `set timeout=5
menuentry "${name} (Live)" {
  linux /boot/vmlinuz root=live rw quiet splash
  initrd /boot/initrd.img
}`;
  fs.writeFileSync(path.join(rootfs, 'boot', 'grub', 'grub.cfg'), `${entry}\n`);

  // grub-mkrescue cria ISO híbrida com El Torito para BIOS e UEFI. Precisa de
  // mtools instalado (mformat). Se não estiver, é instalado automaticamente pelo
  // BUILD_TOOL_PKGS_BY_PM; em último caso avisamos.
  try {
    execSync(`sudo grub-mkrescue -o ${isoPath} ${rootfs}`, { stdio: 'inherit', timeout: 1200000 });
    if (fs.existsSync(isoPath)) return true;
  } catch {
    logger?.log('grub-mkrescue falhou; tentando gerar ISO via xorriso (pode não bootar em UEFI).', 'warn');
  }
  // fallback: xorriso mkisofs simples
  try {
    execSync(`sudo xorriso -as mkisofs -o ${isoPath} -V "${name}" ${rootfs}`, { stdio: 'inherit', timeout: 1200000 });
    return fs.existsSync(isoPath);
  } catch { return false; }
}
