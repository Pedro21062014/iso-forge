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
  // Ferramentas como debootstrap/grub-mkrescue costumam viver em /usr/sbin, que
  // nem sempre está no PATH do usuário. Procuramos também nesses diretórios.
  try { execSync(`command -v ${t} 2>/dev/null || command -v /usr/sbin/${t} 2>/dev/null || command -v /usr/local/sbin/${t} 2>/dev/null || command -v /sbin/${t} 2>/dev/null`, { stdio: 'ignore', timeout: 5000 }); return true; } catch { return false; }
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

/**
 * O debootstrap desmonta /proc, /sys, /dev, /dev/pts e /run ao terminar o
 * segundo estágio. Sem eles, alguns postinst (ex.: openjdk/libreoffice) falham
 * com "Can not write log (Is /dev/pts mounted?)" / "Failed to connect to
 * system message bus". Esta função re-monta esses filesystems dentro do chroot
 * (espelhando o ambiente do 2º estágio do debootstrap). Idempotente.
 */
export function prepareChrootMounts(rootfs, logger) {
  const d = rootfs;
  const script = `set -e
mkdir -p ${d}/proc ${d}/sys ${d}/dev ${d}/dev/pts ${d}/run ${d}/run/lock ${d}/run/systemd ${d}/var/run
mountpoint -q ${d}/proc     || mount -t proc proc ${d}/proc
mountpoint -q ${d}/sys      || mount -t sysfs sysfs ${d}/sys
mountpoint -q ${d}/dev      || mount --bind /dev ${d}/dev
mountpoint -q ${d}/dev/pts  || mount -t devpts devpts ${d}/dev/pts
`;
  try {
    execSync(`sudo bash -c '${script}'`, { stdio: 'inherit', timeout: 60000 });
  } catch (e) {
    logger?.log(`Aviso: não foi possível montar parte do chroot (${e.message.split('\n').pop()}). Alguns pacotes pesados podem falhar ao configurar.`, 'warn');
  }
}

/** Desmonta os filesystems de chroot montados por prepareChrootMounts.
 *  Deve rodar ANTES do sudoChown (chown -R num bind /dev é perigoso) e ANTES do
 *  mksquashfs (senão arquiva /proc,/sys,/dev). */
export function cleanupChrootMounts(rootfs) {
  const d = rootfs;
  const script = `umount ${d}/dev/pts 2>/dev/null; umount ${d}/dev 2>/dev/null; umount ${d}/proc 2>/dev/null; umount ${d}/sys 2>/dev/null; true`;
  try { execSync(`sudo bash -c '${script}'`, { stdio: 'ignore', timeout: 60000 }); } catch {}
}

/** Roda um comando DENTRO do rootfs (chroot), capturando o motivo real da falha. */
export function chrootExec(rootfs, cmd, logger) {
  const full = `sudo chroot ${rootfs} /bin/bash -c "${cmd.replace(/"/g, '\\"')}"`;
  return stream(full, logger).catch((e) => {
    logger?.err(`Falha ao executar no chroot: ${cmd.split('&&')[0]} — ${e.message.split('\n').slice(-8).join('\n')}`);
    throw e;
  });
}

/**
 * O debootstrap só configura a componente `main` do repositório. Vários apps
 * (vlc, libreoffice, gnome-software, timeshift...) vivem nas componentes
 * `universe`/`multiverse` (Ubuntu/Mint) ou `contrib`/`non-free` (Debian).
 * Esta função adiciona um arquivo de sources com as componentes completas e
 * roda apt-get update, para que o apt consiga localizar esses pacotes.
 */
export async function enableFullRepos(base, rootfs, logger) {
  if (base !== 'debian' && base !== 'ubuntu' && base !== 'mint') return;
  const suite = DEBIAN_SUITE[base] || 'bookworm';
  const mirror = (DEBIAN_MIRROR[base] || DEBIAN_MIRROR.debian).replace(/\/+$/, '');
  let extra = '';
  if (base === 'ubuntu') {
    // archive.ubuntu.com serve noble, -updates e -backports; a SEGURANÇA fica
    // em security.ubuntu.com (não existe 'ubuntu-security' no archive).
    extra = `deb ${mirror} ${suite} main restricted universe multiverse
deb ${mirror} ${suite}-updates main restricted universe multiverse
deb ${mirror} ${suite}-backports main restricted universe multiverse
deb https://security.ubuntu.com/ubuntu ${suite}-security main restricted universe multiverse
`;
  } else if (base === 'debian') {
    const comps = 'main contrib non-free non-free-firmware';
    extra = `deb ${mirror} ${suite} ${comps}
deb ${mirror} ${suite}-updates ${comps}
deb ${mirror} ${suite}-backports ${comps}
deb http://security.debian.org/debian-security ${suite}-security ${comps}
`;
  }
  if (!extra) return; // mint: espelho já traz main/universe
  // IMPORTANTE: neste ponto o rootfs ainda é root-owned (o chown ao usuário só
  // acontece após os installs), então NÃO dá para usar fs.writeFileSync aqui.
  // Gravamos o arquivo DENTRO do chroot, via root.
  const b64 = Buffer.from(extra).toString('base64');
  const cmd = `mkdir -p /etc/apt/sources.list.d && echo ${b64} | base64 -d > /etc/apt/sources.list.d/iso-forge-full.list`;
  await chrootExec(rootfs, cmd, logger);
}

/** Extrai os nomes de pacotes que o apt disse não encontrar ("Unable to locate
 *  package X" / "Package 'X' has no installation candidate"). */
function extractMissingPkgs(text) {
  const missing = new Set();
  if (!text) return missing;
  let m;
  const reLocate = /Unable to locate package\s+(\S+)/g;
  while ((m = reLocate.exec(text))) missing.add(m[1]);
  const reCand = /has no installation candidate(?:\s+for\s+|[^\n]*?\s)package\s+([^\s'']+)|Package '([^']+)' has no installation candidate/g;
  while ((m = reCand.exec(text))) missing.add(m[1] || m[2]);
  return missing;
}

/**
 * Gera os locales base DENTRO do chroot ANTES de instalar aplicativos pesados.
 * O postinst do openjdk (puxado pelo LibreOffice) e vários scripts são sensíveis
 * a locale e, se o locale não existir, falham com
 * "locale: Cannot set LC_* to default locale". Antes isso só era feito no
 * configureRootfs (que roda DEPOIS dos installs). Aqui geramos <locale> + C.UTF-8.
 */
export async function ensureChrootLocale(base, rootfs, locale, logger) {
  if (base !== 'debian' && base !== 'ubuntu' && base !== 'mint') return;
  const safeLoc = (locale && locale !== 'C' ? locale : 'C') + '.UTF-8';
  try {
    const cmd = `DEBIAN_FRONTEND=noninteractive bash -c "
      echo '${safeLoc} UTF-8' > /etc/locale.gen;
      echo 'C.UTF-8 UTF-8' >> /etc/locale.gen;
      locale-gen >/dev/null 2>&1 || true;
      update-locale LANG=${safeLoc} 2>/dev/null || true;
    "`;
    await chrootExec(rootfs, cmd, logger);
  } catch { logger?.log('Aviso: não foi possível gerar o locale no chroot.', 'warn'); }
}

/** Detecta se a falha é um erro de CONFIGURAÇÃO (post-install) — os pacotes foram
 *  extraídos mas ficaram unconfigured (ex.: cadeia openjdk/libreoffice). São
 *  recuperáveis com dpkg --configure -a e NÃO matam o build. */
function isConfigureError(text) {
  return /dependency problems|leaving unconfigured|is not configured yet|post-installation script.*returned|Sub-process.*dpkg.*error|returned an error code|Could not create.*manager object|message bus/.test(text || '');
}

/** Instala pacotes dentro do rootfs via gerenciador da família, de forma
 *  RESILIENTE: habilita as componentes completas (universe/multiverse), pula
 *  pacote que não existir no repositório e, se a instalação sofrer erro de
 *  CONFIGURAÇÃO (post-install, ex.: openjdk/libreoffice), tenta reparar com
 *  dpkg --configure -a / apt-get -f em vez de abortar o build inteiro. */
export async function installPackages({ base, rootfs, pkgs, logger }) {
  if (!pkgs.length) { logger?.log('Nenhum pacote adicional a instalar.', 'info'); return; }
  logger?.log(`${'▸'} Instalando ${pkgs.length} pacote(s) dentro do ISO: ${pkgs.join(', ')}`, 'build');
  if (base === 'debian' || base === 'ubuntu' || base === 'mint') {
    // garante que os pacotes em universe/multiverse fiquem localizáveis
    await enableFullRepos(base, rootfs, logger);
    let remaining = [...pkgs];
    let configRetries = 0;
    while (remaining.length) {
      const cmd = `DEBIAN_FRONTEND=noninteractive apt-get update -y && DEBIAN_FRONTEND=noninteractive apt-get install -y ${remaining.join(' ')}`;
      try {
        await chrootExec(rootfs, cmd, logger); // IMPORTANTE: aguardar (não rodar apt em paralelo - lock)
        return;
      } catch (e) {
        const text = e.message || '';
        const missing = extractMissingPkgs(text);
        if (missing.size) {
          const drop = [...missing];
          logger?.log(`Pulos: pacote(s) não existente(s) no repositório da base: ${drop.join(', ')}`, 'warn');
          remaining = remaining.filter((p) => !drop.some((m) => p === m || m.includes(p)));
          if (!remaining.length) return;
          continue;
        }
        // Erro de CONFIGURAÇÃO (post-install): reparar em vez de abortar.
        if (isConfigureError(text) && configRetries < 2) {
          configRetries++;
          logger?.log('Configuração incompleta (post-install). Reparando com dpkg --configure -a...', 'warn');
          try {
            await chrootExec(rootfs, `DEBIAN_FRONTEND=noninteractive dpkg --configure -a >/dev/null 2>&1; DEBIAN_FRONTEND=noninteractive apt-get install -f -y >/dev/null 2>&1; DEBIAN_FRONTEND=noninteractive dpkg --configure -a`, logger);
            continue;
          } catch {}
        }
        throw e; // falha real e/ou não reparável
      }
    }
    logger?.log(`${'✔'} Pacotes instalados.`, 'ok');
  } else if (base === 'arch' || base === 'manjaro' || base === 'endeavouros') {
    const cmd = `pacman -Sy --noconfirm ${pkgs.join(' ')}`;
    await chrootExec(rootfs, cmd, logger);
    logger?.log(`${'✔'} Pacotes instalados.`, 'ok');
  } else {
    const cmd = `dnf install -y ${pkgs.join(' ')}`;
    await chrootExec(rootfs, cmd, logger);
    logger?.log(`${'✔'} Pacotes instalados.`, 'ok');
  }
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
/** Gera um ISO bootavel (casper live) a partir do rootfs + squashfs do sistema.
 *  Como o squashfs pode passar de 4 GB (limite do ISO 9660 nivel 1/2), usamos a
 *  estrategia em 2 passos: (1) grub-mkrescue num ESQUELETO (so kernel+initrd+boot)
 *  para gerar as imagens El Torito (BIOS + UEFI); (2) remontamos a ISO final com
 *  xorriso '-as mkisofs -iso-level 3' (que aceita arquivos grandes) reusando
 *  essas imagens de boot. Resultado: ISO hibrida bootavel, mesmo com > 4 GB. */
export function makeBootableISO({ rootfs, isoPath, name, logger, squashPath, persistence = false }) {
  logger?.log('Gerando ISO bootavel (GRUB + isolinux + EFI + casper live)...', 'build');
  const buildDir = path.dirname(rootfs);
  const boot = path.join(rootfs, 'boot');
  let vmlinuzName = '', initrdName = '';
  try {
    const pick = (arr) => arr.filter((f) => !f.endsWith('.old')).sort().pop() || arr.sort().pop();
    const kernels = fs.readdirSync(boot).filter((f) => f.startsWith('vmlinuz') && f !== 'vmlinuz');
    const inits = fs.readdirSync(boot).filter((f) => f.startsWith('initrd.img') && f !== 'initrd.img');
    if (kernels.length) vmlinuzName = pick(kernels);
    if (inits.length) initrdName = pick(inits);
  } catch {}
  const vmlinuzSrc = vmlinuzName ? path.join(boot, vmlinuzName) : path.join(boot, 'vmlinuz');
  const initrdSrc = initrdName ? path.join(boot, initrdName) : path.join(boot, 'initrd.img');
  const persistFlag = persistence ? ' persistent' : '';
  const grubCfg = `set timeout=5
set default=0
menuentry "${name} (Live)" {
  linux /boot/vmlinuz boot=casper quiet splash${persistFlag}
  initrd /boot/initrd.img
}
menuentry "${name} (Check)" {
  linux /boot/vmlinuz boot=casper quiet splash check${persistFlag}
  initrd /boot/initrd.img
}
`;
  // Passo 1: esqueleto -> imagens de boot via grub-mkrescue
  const skel = path.join(buildDir, 'skel');
  fs.rmSync(skel, { recursive: true, force: true });
  fs.mkdirSync(path.join(skel, 'boot', 'grub'), { recursive: true });
  fs.copyFileSync(vmlinuzSrc, path.join(skel, 'boot', 'vmlinuz'));
  fs.copyFileSync(initrdSrc, path.join(skel, 'boot', 'initrd.img'));
  fs.writeFileSync(path.join(skel, 'boot', 'grub', 'grub.cfg'), grubCfg);
  const skelIso = path.join(buildDir, 'skel.iso');
  let ok = false;
  try { execSync(`sudo grub-mkrescue -o ${skelIso} ${skel}`, { stdio: 'inherit', timeout: 600000 }); ok = fs.existsSync(skelIso); } catch { ok = false; }
  if (!ok) { logger?.log('grub-mkrescue falhou; ISO nao podera ser gerada.', 'err'); return false; }
  // Passo 2: extrair imagens de boot + montar arvore final com o squashfs
  const staging = path.join(buildDir, 'isofiles');
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  try { execSync(`xorriso -indev ${skelIso} -osirrox on -extract / ${staging}`, { stdio: 'ignore', timeout: 300000 }); } catch {}
  try { execSync(`chmod -R u+w ${staging}`, { stdio: 'ignore', timeout: 60000 }); } catch {}
  fs.mkdirSync(path.join(staging, 'casper'), { recursive: true });
  if (squashPath && fs.existsSync(squashPath)) {
    const dest = path.join(staging, 'casper', 'filesystem.squashfs');
    try { fs.linkSync(squashPath, dest); } catch { fs.copyFileSync(squashPath, dest); }
  }
  try { fs.writeFileSync(path.join(staging, 'boot', 'grub', 'grub.cfg'), grubCfg); } catch {}
  // monta a ISO final hibrida (BIOS + UEFI), suportando arquivos grandes
  const mbr = fs.existsSync('/usr/lib/grub/i386-pc/boot_hybrid.img') ? '/usr/lib/grub/i386-pc/boot_hybrid.img' : '';
  const mbrOpt = mbr ? `-isohybrid-mbr ${mbr}` : '';
  try {
    execSync(`sudo xorriso -as mkisofs -o ${isoPath} -V "${name}" -iso-level 3 -joliet ` +
      `-b boot/grub/i386-pc/eltorito.img -no-emul-boot -boot-load-size 4 -boot-info-table ` +
      `-eltorito-alt-boot -e efi.img -no-emul-boot ${mbrOpt} ${staging}`, { stdio: 'inherit', timeout: 1200000 });
    return fs.existsSync(isoPath);
  } catch {
    return false;
  }
}

