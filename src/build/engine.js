import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ProgressBar } from '../ui/progress.js';
import { makePngGradient, makePngPlaceholder, formatMb } from './png.js';
import { colors, bold, dim } from '../ui/ansi.js';
import { confirmItem } from '../ui/prompts.js';
import { detectPackageManager, hasSudo } from '../system.js';
import {
  BASE_DISTROS, EDITIONS, DESKTOPS, GLOBAL_THEMES, WALLPAPERS,
  LOCKSCREEN_STYLES, BOOT_THEMES, CUSTOM_APPS, KERNELS,
  LOCALES, TIMEZONES, COMPRESSION,
  DESKTOP_PKGS, APP_PKGS, KERNEL_PKGS, GRUB_PKGS,
  DEBOOTSTRAP_INCLUDE_SAFE, DEFAULT_DESKTOP_BY_BASE, DEFAULT_THEME_BY_BASE,
} from '../presets.js';
import { bootstrapBase, detectBootstrap, installPackages, configureRootfs, makeBootableISO, BOOTSTRAP_TOOL, BUILD_TOOL_PKGS_BY_PM } from './bootstrap.js';

const pkg = (arr, v) => arr.find((x) => x.value === v)?.label || v;

function hasTool(t) {
  try { execSync(`command -v ${t} 2>/dev/null`, { stdio: 'ignore', timeout: 5000 }); return true; } catch { return false; }
}

/** Retorna o nome da primeira ferramenta de ISO disponível (ou null). */
function pickTool(tools) {
  if (tools?.xorriso) return 'xorriso';
  if (tools?.mkisofs) return 'mkisofs';
  if (tools?.genisoimage) return 'genisoimage';
  return null;
}

async function askInstallIsoTool(logger, packageManager, hasSudoFlag) {
  if (!packageManager) { logger?.warn('Nenhum gerenciador de pacotes reconhecido — instale o xorriso manualmente.'); return null; }
  if (!hasSudoFlag) { logger?.warn('sudo não encontrado — instale o xorriso manualmente.'); return null; }
  logger?.log(`${colors.orange(bold('Falta uma ferramenta de ISO (xorriso/mkisofs).'))} Encontramos o seu gerenciador de pacotes (${packageManager.label}).`, 'warn');
  logger?.blank();
  logger?.clearFooter();
  const wantInstall = await confirmItem({
    title: `Quer que eu instale o "${packageManager.pkgName}" automaticamente agora? (pode pedir a senha do sudo)`,
  });
  if (!wantInstall) { logger?.log('Ok — seguiremos montando o projeto (sem ferramenta).', 'info'); return null; }
  const installCmd = `${packageManager.cmd} ${packageManager.pkgName}`;
  logger?.log(`Executando: ${installCmd}`, 'run');
  logger?.clearFooter();
  logger?.blank();
  try {
    execSync(installCmd, { stdio: 'inherit', timeout: 1200000 });
    logger?.log(`${colors.green('✔ Instalação concluída.')}`, 'ok');
    const { detectBuildTools } = await import('../system.js');
    return pickTool(detectBuildTools());
  } catch (e) {
    logger?.err(`Não foi possível instalar o ${packageManager.pkgName}: ${e?.message || e}`);
    return null;
  }
}

/**
 * Detecta se falta o debootstrap (ou ferramentas de build) e PEDE PERMISSÃO ao
 * usuário para instalá-los automaticamente (via gerenciador de pacotes + sudo).
 * Retorna true se ficou tudo pronto para um build REAL; false caso contrário.
 */
async function askInstallBootstrapTool(logger, packageManager, hasSudoFlag, base) {
  const style = BUILD_TOOL_PKGS_BY_PM[packageManager?.pkg];
  if (!style) {
    logger?.warn('Nenhum gerenciador de pacotes reconhecido. Instale manualmente: debootstrap (ou pacstrap/dnf) + squashfs-tools + grub + xorriso.');
    return false;
  }
  if (!hasSudoFlag) {
    logger?.warn('sudo não encontrado. Instale manualmente o debootstrap e as demais ferramentas de build.');
    return false;
  }
  logger?.log(`${colors.orange(bold('Para criar um sistema REAL, precisamos de ferramentas de build (debootstrap/squashfs/grub/xorriso).'))}`, 'warn');
  logger?.log(`Encontramos o seu gerenciador de pacotes (${packageManager.label}).`, 'info');
  logger?.blank();
  logger?.clearFooter();
  const wantInstall = await confirmItem({
    title: `Quer que eu instale automaticamente: "${style.pkgs}"? (pode pedir a senha do sudo)`,
  });
  if (!wantInstall) {
    logger?.log('Ok — seguiremos no modo projeto (ISO compacta, não bootável).', 'info');
    return false;
  }
  const installCmd = `${style.cmd} ${style.pkgs}`;
  logger?.log(`Executando: ${installCmd}`, 'run');
  logger?.clearFooter();
  logger?.blank();
  try {
    execSync(installCmd, { stdio: 'inherit', timeout: 1800000 });
    logger?.log(`${colors.green('✔ Ferramentas de build instaladas.')}`, 'ok');
    // re-detecta o bootstrap
    const now = detectBootstrap();
    logger?.log(`Disponível agora: debootstrap=${now.debootstrap} · squashfs=${hasTool('mksquashfs')} · xorriso=${hasTool('xorriso')}`, 'ok');
    const okBoot = now.debootstrap || now.pacstrap || now.dnf;
    if (okBoot) {
      logger?.log(`${colors.green('✔ Agora podemos criar um sistema REAL.')}`, 'ok');
      return true;
    }
    logger?.warn('Instalação feita, mas o bootstrap ainda não está disponível. Verifique manualmente.');
    return false;
  } catch (e) {
    logger?.err(`Não foi possível instalar as ferramentas: ${e?.message || e}`);
    logger?.log('Você pode instalar manualmente e rodar de novo, ou seguir no modo projeto.', 'info');
    return false;
  }
}

export async function buildISO(config, { logger, sys, tools }) {
  const {
    name, base, edition, arch, bootLogo, sysLogo, desktop, theme, wallpapers,
    customWalls, lockStyle, bootTheme, splash, apps, kernel, compression,
    locale, tz, persistence, autoLogin, extraTools, outputDir, fileName,
  } = config;

  const packageManager = detectPackageManager();
  const sudoAvailable = hasSudo();
  const boot = detectBootstrap();

  // ----- resolve "Padrão do sistema" ('system') para valores concretos por base -----
  const resolvedDesktop = (desktop === 'system') ? (DEFAULT_DESKTOP_BY_BASE[base] || 'xfce') : desktop;
  const resolvedTheme = (theme === 'system') ? (DEFAULT_THEME_BY_BASE[base] || 'adwaita-dark') : theme;
  const resolvedKernel = (kernel === 'system') ? (KERNEL_PKGS[base]?.[0] || 'linux-image-amd64') : kernel;
  const resolvedCompression = (compression === 'system') ? '' : compression;
  const resolvedTz = (tz === 'system') ? detectTimezone() : tz;
  const resolvedLocale = (locale === 'system') ? detectLocale() : locale;

  // pesos
  const steps = {
    prepare: 3, tools: 2, bootstrap: 26, pkgs: 20, desktop: 10, theme: 4,
    wallpapers: 6, lock: 3, boot: 6, apps: 8, config: 3, squashfs: 6, iso: 3,
  };
  const total = Object.values(steps).reduce((a, b) => a + b, 0);

  const outRoot = path.resolve(outputDir);
  const workDir = path.join(outRoot, '.iso-forge-work', name.replace(/\s+/g, '-').toLowerCase());
  const buildDir = path.join(workDir, 'build');
  const rootfs = path.join(buildDir, 'rootfs');

  const warn = sys.speedFactor > 1 ? sys.slowWarning : '';
  const pbar = new ProgressBar({ total, speedFactor: sys.speedFactor, warn, logger });
  const say = (msg) => logger?.log(msg, 'build');

  let cursor = 0;
  const advance = async (ln, ms = 100) => { cursor += steps[ln] || 1; pbar.update(cursor, total); await pbar.idle(ms); };

  // Capacidade de fazer build REAL (bootstrap) ?
  const canBootstrap = boot.debootstrap && sudoAvailable;
  const tool = BOOTSTRAP_TOOL[base];

  try {
    say(bold(colors.purple('\n══════════ INICIANDO BUILD ══════════')));

    // ---------- preparar dirs ----------
    say(`Preparando diretórios em: ${buildDir}`, 'build');
    for (const d of ['', 'assets', 'etc']) fs.mkdirSync(path.join(buildDir, d), { recursive: true });
    fs.mkdirSync(path.join(buildDir, 'rootfs'), { recursive: true });
    fs.mkdirSync(path.join(buildDir, 'rootfs', 'usr', 'share', 'backgrounds', name.toLowerCase()), { recursive: true });
    await advance('prepare', 120);

    // ---------- decidir o modo (real vs esqueleto) ----------
    let mode = (canBootstrap && tool) ? 'real' : 'skeleton';
    if (mode === 'skeleton') {
      // Se falta o debootstrap/ferramentas, PEDE PERMISSÃO para instalar automaticamente.
      say(colors.orange(bold('⚠ SEM FERRAMENTAS DE BUILD (debootstrap pacstrap/dnf) PARA CRIAR UM SISTEMA REAL.')), 'warn');
      say('Sem isso, só conseguimos gerar o ESPELHO do projeto (ISO compacta).', 'warn');
      const ok = await askInstallBootstrapTool(logger, packageManager, sudoAvailable, base);
      if (ok) {
        mode = tool ? 'real' : 'skeleton';
        if (mode === 'real') {
          say(colors.green(bold('✔ Ferramentas disponíveis — modo REAL ativado!')), 'ok');
        }
      }
    }
    if (mode === 'real') {
      say(colors.green(bold(`✔ Modo REAL ativo: bootstrap via ${tool} + squashfs + ISO bootável.`)), 'ok');
      say(`A base "${pkg(BASE_DISTROS, base)}" será baixada e instalada de verdade. Isso baixa vários GB e demora.`, 'info');
    } else {
      say(colors.orange(bold('⚠ Modo "projeto" (ISO compacta, não bootável).')), 'warn');
      say('Instale debootstrap (ou pacstrap/dnf) e aceite a instalação automática para gerar a ISO real.', 'warn');
      say('   sudo apt install debootstrap   # Debian/Ubuntu', 'info');
      say('O resultado ainda será criado, mas é o ESPELHO do projeto, não o sistema de verdade.', 'warn');
    }
    await advance('tools', 120);

    // ---------- bootstrap do sistema base ----------
    if (mode === 'real') {
      say(`Bootstrapando o sistema base "${pkg(BASE_DISTROS, base)}" (${arch})...`, 'build');
      // Só pacotes universais seguros vão no --include (a componente `main` de TODAS
      // as bases Debian-like). Kernel/grub/build são instalados DEPOIS via chroot,
      // porque o nome difere por base (linux-image-amd64 no Debian vs linux-image-generic
      // no Ubuntu) — incluir o nome errado faz o debootstrap abortar.
      const baseMeta = DEFAULT_PKGS_BY_EDITION(edition, resolvedDesktop, resolvedTheme, lockStyle, extraTools, base);
      const bootInclude = baseMeta.bootstrapIncludes;
      await bootstrapBase({
        base, arch, targetRoot: rootfs, includePkgs: bootInclude, logger, pbar, sys,
      });
      await advance('bootstrap', 160);
      say(`${colors.green('✔')} Sistema base pronto em ${rootfs}.`, 'ok');
    } else {
      // esqueleto: prepara estrutura mínima para a ISO compacta
      say('Criando projeto base (esqueleto)...', 'build');
      fs.writeFileSync(path.join(rootfs, 'etc', 'os-release'),
        `NAME="${name}"\nID=${name.replace(/\s+/g, '_').toLowerCase()}\nID_LIKE=${base}\nPRETTY_NAME="${name}" (${edition})\n`);
      fs.writeFileSync(path.join(rootfs, 'etc', 'hostname'), `${name.toLowerCase()}\n`);
      fs.writeFileSync(path.join(buildDir, 'pkgs-base.txt'), 'base inicial\n');
      await advance('bootstrap', 200);
    }

    // ---------- aplicar desktop + apps no rootfs ----------
    const desktopLabel = pkg(DESKTOPS, desktop);
    const wallDir = path.join(rootfs, 'usr', 'share', 'backgrounds', name.toLowerCase());

    if (mode === 'real') {
      // Kernel + GRUB pelo nome correto da base (linux-image-amd64 vs -generic, etc.)
      const kernelPkgs = KERNEL_PKGS[base] || ['linux-image-amd64'];
      const grubPkgs = GRUB_PKGS[base] || ['grub-pc-bin', 'grub-efi-amd64-bin'];
      const editionWeight = EDITIONS.find((e) => e.value === edition)?.weight || 2;
      const buildPkgs = editionWeight >= 3 ? ['build-essential', 'gcc', 'git', 'python3'] : [];
      say('Instalando kernel e carga de boot (GRUB)...', 'build');
      await installPackages({ base, rootfs, pkgs: [...kernelPkgs, ...grubPkgs, ...buildPkgs], logger });
      await advance('pkgs', 160);
      // instala o desktop (meta-pacote da base). 'system' já foi resolvido.
      const desktopMeta = DESKTOP_PKGS[base]?.[resolvedDesktop] || [];
      const appPkgs = apps.flatMap((a) => APP_PKGS[base]?.[a] || []);
      const extraReal = extraTools.flatMap((t) => EXTRA_TOOLS_PKGS[base]?.[t] || []);
      say(`Instalando desktop ${pkg(DESKTOPS, resolvedDesktop)} (meta-pacote)...`, 'build');
      await installPackages({ base, rootfs, pkgs: desktopMeta, logger });
      await advance('desktop', 160);
      say('Pré-instalando aplicativos personalizados...', 'build');
      await installPackages({ base, rootfs, pkgs: appPkgs, logger });
      await advance('apps', 160);
      say('Instalando extras (drivers, codecs, fontes)...', 'build');
      const extraList = Object.keys(extraReal).length ? Object.values(extraReal).flat() : [];
      await installPackages({ base, rootfs, pkgs: extraReal, logger });
      await advance('pkgs', 160);
      // O apt-get dentro do chroot recria arquivos como root quando instala pacotes.
      // Então só agora transferimos a posse ao usuário, para o Node poder escrever
      // os arquivos de configuração (hostname, hosts, os-release, wallpapers, grub...).
      sudoChown(rootfs);
      // configura o sistema (locale/fuso já resolvidos: 'system' vira o real do host)
      await configureRootfs({ base, rootfs, name, locale: resolvedLocale, tz: resolvedTz, logger });
      await advance('config', 120);
    } else {
      say('Configurando sistema (esqueleto)...', 'build');
      fs.writeFileSync(path.join(rootfs, 'etc', 'desktop-env'), `${desktop}\n`);
      fs.writeFileSync(path.join(rootfs, 'etc', 'system.conf'),
        `kernel=${kernel}\ncompression=${compression}\nlocale=${locale}\ntimezone=${tz}\npersistence=${persistence}\nautologin=${autoLogin}\narch=${arch}\ndesktop=${desktop}\n`);
      await advance('desktop', 80);
    }

    // ---------- tema ----------
    const themeLabel = pkg(GLOBAL_THEMES, resolvedTheme);
    say(`Aplicando tema global: ${themeLabel}`, 'build');
    const themeDir = path.join(rootfs, 'usr', 'share', 'themes', resolvedTheme);
    fs.mkdirSync(themeDir, { recursive: true });
    fs.writeFileSync(path.join(themeDir, 'theme.conf'), `# Tema: ${themeLabel}\nfont=DejaVu Sans 10\n`);
    await advance('theme', 120);

    // ---------- wallpapers (gerados procedurais + personalizados) ----------
    say(`Instalando ${wallpapers.length + customWalls.length || 1} wallpaper(s)...`, 'build');
    fs.mkdirSync(wallDir, { recursive: true });
    const allWalls = [...wallpapers, ...customWalls];
    if (allWalls.length === 0) {
      fs.writeFileSync(path.join(wallDir, 'default.png'), makePngPlaceholder(name));
    }
    let wd = 0;
    for (const w of allWalls) {
      // 'system' = manter o wallpaper padrão da base; não gera nada extra
      if (w === 'system') continue;
      const wp = WALLPAPERS.find((x) => x.value === w);
      const safe = String(w).replace(/[^a-zA-Z0-9._-]/g, '_');
      if (wp) {
        // gera PNG procedural (gradiente real)
        fs.writeFileSync(path.join(wallDir, `${safe}.png`), makePngGradient(wp.colorA, wp.colorB));
      } else {
        // caminho/URL personalizado
        await resolveAsset(w, path.join(wallDir, `${safe}.png`), logger);
      }
      wd++;
      cursor += Math.ceil(steps.wallpapers / Math.max(1, allWalls.length));
      pbar.update(cursor, total);
      await pbar.idle(30);
    }
    pbar.update(cursor, total);
    await advance('wallpapers', 60);

    // ---------- tela de bloqueio ----------
    say(`Aplicando tela de bloqueio: ${pkg(LOCKSCREEN_STYLES, lockStyle)}`, 'build');
    if (lockStyle !== 'system') {
      fs.writeFileSync(path.join(rootfs, 'etc', 'lockscreen.conf'), `style=${lockStyle}\nblur=${lockStyle === 'blur' ? '1' : '0'}\n`);
    }
    await advance('lock', 80);

    // ---------- boot / splash ----------
    say(`Aplicando boot: ${pkg(BOOT_THEMES, bootTheme)} · Plymouth ${splash}`, 'build');
    if (bootTheme !== 'system') {
      fs.writeFileSync(path.join(rootfs, 'etc', 'boot-theme'), `${bootTheme}\nplymouth=${splash}\n`);
    }
    writeGrubConfig(path.join(rootfs, 'boot', 'grub', 'grub.cfg'), name, rootfs);
    writeIsolinuxConfig(path.join(rootfs, 'boot', 'isolinux', 'isolinux.cfg'), name);
    const manifestDir = path.join(rootfs, 'usr', 'share', 'iso-forge');
    fs.mkdirSync(manifestDir, { recursive: true });
    fs.writeFileSync(path.join(manifestDir, 'manifest.json'), JSON.stringify(config, null, 2));
    await advance('boot', 120);

    // ---------- squashfs (compacta o sistema) ----------
    say(`Compactando o sistema (squashfs, método ${pkg(COMPRESSION, compression)})...`, 'build');
    const squashPath = path.join(buildDir, 'filesystem.squashfs');
    if (mode === 'real') {
      const compFlag = { gzip: '-comp gzip', xz: '-comp xz', zstd: '-comp zstd', lzo: '-comp lzo' }[resolvedCompression] || '';
      try {
        execSync(`sudo mksquashfs ${rootfs} ${squashPath} ${compFlag} -no-progress`, { stdio: 'inherit', timeout: 3600000 });
        say(`Sistema compactado: ${formatMb(fs.statSync(squashPath).size)}.`, 'ok');
      } catch (e) { say('Falha no mksquashfs: ' + (e?.message || e), 'err'); }
    } else {
      fs.writeFileSync(squashPath, makePngPlaceholder(name));
      say('(esqueleto: squashfs placeholder)', 'info');
    }
    await advance('squashfs', 160);

    // ---------- gerar ISO ----------
    say('Gerando a imagem ISO...', 'build');
    const isoPath = path.join(outRoot, fileName);
    let isoBuilt = false;
    if (mode === 'real') {
      isoBuilt = await makeBootableISO({ rootfs, isoPath, name, logger });
    } else {
      // esqueleto: empacota apenas os arquivos de config como ISO de dados
      isoBuilt = makeMinimalIso(isoPath, buildDir, name);
    }
    await advance('iso', 160);

    if (isoBuilt) {
      const sz = fs.existsSync(isoPath) ? formatMb(fs.statSync(isoPath).size) : '0';
      say(`ISO criada: ${bold(colors.green(isoPath))} (${sz})`, 'ok');
      if (mode === 'real') say(colors.green(bold('✔ ISO BOOTÁVEL com o sistema completo gerada!')));
    } else {
      say('Não foi possível gerar a ISO. Verifique xorriso/grub-mkrescue.', 'err');
    }

    // ---------- finalize ----------
    say('Finalizando e assinando artifacts...', 'build');
    fs.writeFileSync(path.join(buildDir, 'iso-forge.config.json'), JSON.stringify(config, null, 2));
    const showConfig = { ...config, desktop: resolvedDesktop, theme: resolvedTheme, kernel: resolvedKernel, compression: resolvedCompression || config.compression, locale: resolvedLocale, tz: resolvedTz };
    fs.writeFileSync(path.join(outRoot, fileName + '.info.txt'), summaryText(showConfig, sys, mode, fs.existsSync(isoPath) ? formatMb(fs.statSync(isoPath).size) : '0'));
    try { execSync(`sha256sum '${isoPath}'`, { stdio: 'ignore', timeout: 200000 }); } catch {}
    await advance('config', 80);

    pbar.update(total, total);
    pbar.finish();
    const finalIso = path.join(outRoot, fileName);
    const realBuilt = fs.existsSync(finalIso);
    if (realBuilt) {
      say(bold(colors.green('══════════ BUILD CONCLUÍDO COM SUCESSO ══════════')));
      say('Sua ISO está em: ' + bold(colors.cyan(finalIso)));
      if (mode === 'skeleton') say('Nota: esta é uma ISO ESPELHO (projeto). Para o sistema completo, instale debootstrap.', 'warn');
      return { isoPath: finalIso, built: true, mode };
    } else {
      say(bold(colors.orange('═════════ PROJETO MONTADO · ISO PENDENTE ═════════')));
      return { isoPath: null, built: false, mode, projectDir: buildDir };
    }
  } catch (err) {
    pbar.clear();
    say(colors.red('✖ Erro durante o build: ' + (err?.message || err)), 'err');
    return { isoPath: null, built: false };
  } finally {
    if (logger) logger.clearFooter();
  }
}

// ---------------- helpers ----------------

/** Pacotes base seguros para o --include do debootstrap.
 *  Vamos usar apenas DEBOOTSTRAP_INCLUDE_SAFE (universais, existentes na componente
 *  `main` de qualquer base Debian-like). Kernel/grub/build-essential são instalados
 *  depois via chroot (installPackages), já que o nome difere por base. */
function DEFAULT_PKGS_BY_EDITION(edition, desktop, theme, lockStyle, extraTools, base) {
  // Apenas pacotes universais seguros no --include do debootstrap.
  // build-essential (meta-pacote pesado) é instalado DEPOIS via chroot, se edição core.
  return { bootstrapIncludes: [...DEBOOTSTRAP_INCLUDE_SAFE] };
}

const EXTRA_TOOLS_PKGS = {
  debian: { drivers: ['nvidia-legacy-390xx-kernel-source'], codecs: ['gstreamer1.0-plugins-good', 'gstreamer1.0-plugins-bad', 'gstreamer1.0-plugins-ugly'], fonts: ['fonts-dejavu', 'fonts-noto'], dev: ['build-essential', 'gcc'], misc: ['htop', 'tree', 'curl', 'wget'] },
  ubuntu: { drivers: ['nvidia-driver-535', 'mesa-vulkan-drivers'], codecs: ['gstreamer1.0-plugins-good', 'gstreamer1.0-plugins-bad', 'gstreamer1.0-plugins-ugly'], fonts: ['fonts-dejavu', 'fonts-noto'], dev: ['build-essential', 'gcc'], misc: ['htop', 'tree', 'curl', 'wget'] },
  arch: { drivers: ['nvidia', 'mesa-vulkan-drivers'], codecs: ['gstreamer', 'ffmpeg'], fonts: ['ttf-dejavu', 'noto-fonts'], dev: ['base-devel'], misc: ['htop', 'tree', 'curl', 'wget'] },
};

function writeGrubConfig(p, name, rootfs) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const useSplash = 'quiet splash';
  fs.writeFileSync(p, `
set timeout=5
set default=0
menuentry "${name} (Live)" {
  linux /boot/vmlinuz root=live rw ${useSplash}
  initrd /boot/initrd.img
}
`);
}

function writeIsolinuxConfig(p, name) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `DEFAULT linux\nLABEL linux\n  KERNEL /boot/vmlinuz\n  APPEND initrd=/boot/initrd.img quiet splash\n`);
}

async function resolveAsset(input, dest, logger) {
  if (!input || !String(input).trim()) { fs.writeFileSync(dest, makePngPlaceholder('logo')); return; }
  if (/^https?:\/\//i.test(input)) {
    try { const res = await fetch(input); if (res.ok) { fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer())); return; } } catch {}
    logger?.log('   não foi possível baixar ' + input, 'warn');
    fs.writeFileSync(dest, makePngPlaceholder('logo'));
    return;
  }
  if (fs.existsSync(input)) { fs.copyFileSync(input, dest); return; }
  fs.writeFileSync(dest, makePngPlaceholder('logo'));
}

function makeMinimalIso(isoPath, buildDir, name) {
  try {
    const d = path.join(buildDir, 'iso-root'); fs.mkdirSync(d, { recursive: true });
    fs.copyFileSync(path.join(buildDir, 'rootfs', 'etc', 'os-release'), path.join(d, 'os-release'));
    fs.copyFileSync(path.join(buildDir, 'iso-forge.config.json'), path.join(d, 'config.json'));
    const tool = hasTool('xorriso') ? 'xorriso -as mkisofs' : hasTool('genisoimage') ? 'genisoimage' : 'mkisofs';
    execSync(`${tool} -o ${isoPath} -V "${name}" ${d}`, { stdio: 'inherit', timeout: 120000 });
    return fs.existsSync(isoPath);
  } catch { return false; }
}

function summaryText(config, sys, mode, sz) {
  return [
    'ISO-FORGE Relatório de build',
    '============================',
    `Sistema: ${config.name}`,
    `Base: ${config.base}`,
    `Edição: ${config.edition}`,
    `Arquitetura: ${config.arch}`,
    `Desktop: ${config.desktop}`,
    `Tema: ${config.theme}`,
    `Kernel: ${config.kernel}`,
    `Compressão: ${config.compression}`,
    `Locale: ${config.locale}`,
    `Timezone: ${config.tz}`,
    `Persistência: ${config.persistence}`,
    `Apps: ${config.apps.join(', ')}`,
    `Modo: ${mode}`,
    `Tamanho da ISO: ${sz}`,
    '',
    `Gerado em máquina com ${sys.cpus} CPUs e ${sys.totalGb.toFixed(1)} GB de RAM.`,
  ].join('\n');
}

// ---------------- generators PNG procedurais (ver ./png.js) ----------------

/** Detecta o fuso horário do host (para o "Padrão do sistema"). */
function detectTimezone() {
  try {
    if (fs.existsSync('/etc/timezone')) return fs.readFileSync('/etc/timezone', 'utf8').trim();
    if (process.env.TZ && process.env.TZ.trim()) return process.env.TZ.trim();
    // fallback via Intl
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== 'UTC') return tz;
  } catch {}
  return 'America/Sao_Paulo';
}

/** Detecta o locale do host (para o "Padrão do sistema"). */
function detectLocale() {
  try {
    const env = process.env.LANG || process.env.LC_ALL || process.env.LC_CTYPE || '';
    const m = /^([a-zA-Z]{2}_[A-Z]{2})/.exec(env);
    if (m) return m[1];
  } catch {}
  return 'en_US';
}

/** Transfere a posse dos arquivos do rootfs para o usuário atual (via sudo). */
function sudoChown(rootfs) {
  try {
    execSync(`sudo chown -R $(id -u):$(id -g) '${rootfs}'`, { stdio: 'inherit', timeout: 600000 });
  } catch { /* se falhar (ex.: sem sudo), seguimos e os writes falham com aviso claro */ }
}
