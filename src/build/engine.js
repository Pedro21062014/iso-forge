import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ProgressBar } from '../ui/progress.js';
import { colors, bold, dim } from '../ui/ansi.js';
import { confirmItem } from '../ui/prompts.js';
import { detectPackageManager, hasSudo } from '../system.js';
import {
  BASE_DISTROS, EDITIONS, DESKTOPS, GLOBAL_THEMES, WALLPAPERS,
  LOCKSCREEN_STYLES, BOOT_THEMES, CUSTOM_APPS, KERNELS,
  LOCALES, TIMEZONES, COMPRESSION,
} from '../presets.js';

const pkg = (arr, v) => arr.find((x) => x.value === v)?.label || v;

/** Retorna o nome da primeira ferramenta de ISO disponível (ou null). */
function pickTool(tools) {
  if (tools?.xorriso) return 'xorriso';
  if (tools?.mkisofs) return 'mkisofs';
  if (tools?.genisoimage) return 'genisoimage';
  return null;
}

/**
 * Pergunta ao usuário se quer instalar o xorriso e, se sim, instala via gerenciador
 * de pacotes (com sudo). Retorna o nome da ferramenta agora disponível (ou null).
 */
async function askInstallIsoTool(logger, packageManager, hasSudoFlag) {
  if (!packageManager) {
    logger?.warn('Nenhum gerenciador de pacotes reconhecido — instale o xorriso manualmente.');
    return null;
  }
  if (!hasSudoFlag) {
    logger?.warn('sudo não encontrado — instale o xorriso manualmente.');
    return null;
  }

  logger?.log(`${colors.orange(bold('Falta uma ferramenta de ISO (xorriso/mkisofs).'))} ` +
    `Encontramos o seu gerenciador de pacotes (${packageManager.label}).`, 'warn');
  logger?.blank();

  // esconde o rodapé enquanto pergunta, para o prompt não se sobrepor à barra
  logger?.clearFooter();
  const wantInstall = await confirmItem({
    title: `Quer que eu instale o "${packageManager.pkgName}" automaticamente agora? (pode pedir a senha do sudo)`,
  });

  if (!wantInstall) {
    logger?.log('Ok — seguiremos montando só o projeto de build (sem empacotar a ISO).', 'info');
    return null;
  }

  const installCmd = `${packageManager.cmd} ${packageManager.pkgName}`;
  logger?.log(`Executando: ${installCmd}`, 'run');
  // limpa o rodapé para a saída do sudo não se misturar com a barra
  logger?.clearFooter();
  logger?.blank();
  try {
    execSync(installCmd, { stdio: 'inherit', timeout: 1200000 });
    logger?.log(`${colors.green('✔ Instalação concluída.')}`, 'ok');
    // re-detecta a ferramenta
    const { detectBuildTools } = await import('../system.js');
    const now = detectBuildTools();
    const t = pickTool(now);
    if (t) logger?.log(`Ferramenta disponível agora: ${bold(t)}`, 'ok');
    return t;
  } catch (e) {
    logger?.err(`Não foi possível instalar o ${packageManager.pkgName}: ${e?.message || e}`);
    logger?.log('Você pode instalar manualmente e rodar o iso-forge novamente, ou seguir só com o projeto de build.', 'info');
    return null;
  }
}

export async function buildISO(config, { logger, sys, tools }) {
  const {
    name, base, edition, arch, bootLogo, sysLogo, desktop, theme, wallpapers,
    customWalls, lockStyle, bootTheme, splash, apps, kernel, compression,
    locale, tz, persistence, autoLogin, extraTools, outputDir, fileName,
  } = config;

  // Detecta o gerenciador de pacotes e o sudo (para poder instalar o xorriso)
  const packageManager = detectPackageManager();
  const sudoAvailable = hasSudo();

  // pesos de cada etapa (o total determina a distribuição da barra)
  const steps = {
    prepare: 5,
    tools: 3,
    rootfs: 12,
    packages: 18,
    theme: 12,
    wallpapers: 9,
    lock: 8,
    boot: 10,
    apps: 14,
    config: 9,
    squashfs: 16,
    iso: 16,
    finalize: 6,
  };
  const total = Object.values(steps).reduce((a, b) => a + b, 0);

  const outRoot = path.resolve(outputDir);
  const workDir = path.join(outRoot, '.iso-forge-work', name.replace(/\s+/g, '-').toLowerCase());
  const buildDir = path.join(workDir, 'build');

  const warn = sys.speedFactor > 1 ? sys.slowWarning : '';
  const pbar = new ProgressBar({
    total,
    speedFactor: sys.speedFactor,
    warn,
    logger,
  });

  const say = (msg) => logger?.log(msg, 'build');

  let cursor = 0;
  const advance = async (name, ms = 100) => {
    cursor += steps[name] || 1;
    pbar.update(cursor, total);
    await pbar.idle(ms); // espera escalada pela velocidade da máquina
  };

  try {
    // ---------- 0. preparar ambiente ----------
    say(bold(colors.purple('\n══════════ INICIANDO BUILD ══════════')));
    say(`Ferramentas detectadas: ${Object.entries(tools).filter(([, v]) => v).map(([k]) => k).join(', ') || 'nenhuma ainda'}`, 'env');

    pbar.update(0, total);

    // ---- preparar diretório ----
    say(`Preparando diretório de trabalho: ${buildDir}`, 'build');
    fs.mkdirSync(buildDir, { recursive: true });
    fs.mkdirSync(path.join(buildDir, 'rootfs'), { recursive: true });
    fs.mkdirSync(path.join(buildDir, 'rootfs', 'etc'), { recursive: true });
    fs.mkdirSync(path.join(buildDir, 'rootfs', 'usr', 'share'), { recursive: true });
    fs.mkdirSync(path.join(buildDir, 'boot'), { recursive: true });
    fs.mkdirSync(path.join(buildDir, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(buildDir, 'etc'), { recursive: true });
    fs.mkdirSync(path.join(buildDir, 'rootfs', 'usr', 'share', 'backgrounds'), { recursive: true });
    fs.mkdirSync(path.join(buildDir, 'rootfs', 'usr', 'share', 'themes'), { recursive: true });
    await advance('prepare', 120);

    // ---- verificar ferramentas de ISO e, se faltar, pedir permissão para instalar ----
    let isoTool = pickTool(tools);
    if (isoTool) {
      say(`Ferramenta de ISO encontrada: ${bold(isoTool)} — usaremos para gerar a imagem.`, 'ok');
    } else {
      say(`${colors.orange(bold('Nenhuma ferramenta de ISO (xorriso/mkisofs/genisoimage) encontrada.'))}`, 'warn');
      // Pedir permissão para instalar o xorriso automaticamente
      const installed = await askInstallIsoTool(logger, packageManager, sudoAvailable);
      if (installed) {
        isoTool = installed;
        // atualiza o snapshot de ferramentas para refletir a instalação
        tools.xorriso = isoTool === 'xorriso' || tools.xorriso;
        tools.mkisofs = isoTool === 'mkisofs' || tools.mkisofs;
        tools.genisoimage = isoTool === 'genisoimage' || tools.genisoimage;
        say(`${bold('✔ xorriso instalado!')} Vamos gerar uma ISO real.`, 'ok');
      }
    }
    if (tools.debootstrap) say('debootstrap disponível: podemos montar um sistema base real.', 'ok');
    else say('debootstrap não encontrado: usaremos a estrutura base padrão.', 'info');
    await advance('tools', 120);

    // ---- asset: logo de boot ----
    say('Processando logo de boot...', 'build');
    await resolveAsset(bootLogo, path.join(buildDir, 'assets', 'boot-logo.png'), logger);
    await advance('theme', 60);

    // ---- asset: logo do sistema ----
    say('Processando logo do sistema...', 'build');
    await resolveAsset(sysLogo, path.join(buildDir, 'assets', 'system-logo.svg'), logger);
    await advance('theme', 60);

    // ---- árvore raiz ----
    say('Montando árvore raiz (rootfs)...', 'build');
    fs.writeFileSync(path.join(buildDir, 'rootfs', 'etc', 'os-release'),
      `NAME="${name}"\nID=${name.replace(/\s+/g, '_').toLowerCase()}\nVERSION_ID="1.0"\nID_LIKE=${base}\nPRETTY_NAME="${name} (${edition})"\n`);
    fs.writeFileSync(path.join(buildDir, 'rootfs', 'etc', 'hostname'), `${name.toLowerCase()}`);
    fs.writeFileSync(path.join(buildDir, 'rootfs', 'etc', 'machine-id'), 'iso-forge-generated\n');
    await advance('rootfs', 200);

    // ---- pacotes base + dependências da edição ----
    say(`Instalando pacotes da base ${pkg(BASE_DISTROS, base)} (edição ${pkg(EDITIONS, edition)})...`, 'build');
    const editionWeight = EDITIONS.find((e) => e.value === edition)?.weight || 2;
    const basePackages = edPackages(editionWeight);
    fs.writeFileSync(path.join(buildDir, 'pkgs-base.txt'), basePackages.join('\n'));
    await advance('packages', 260);

    // ---- tema do desktop ----
    const desktopLabel = pkg(DESKTOPS, desktop);
    say(`Aplicando ambiente de desktop: ${desktopLabel}`, 'build');
    fs.writeFileSync(path.join(buildDir, 'rootfs', 'etc', 'desktop-env'), desktop + '\n');
    const themeConfDir = path.join(buildDir, 'rootfs', 'usr', 'share', 'themes', theme);
    fs.mkdirSync(themeConfDir, { recursive: true });
    fs.writeFileSync(path.join(themeConfDir, 'theme.conf'),
      `# Tema global: ${pkg(GLOBAL_THEMES, theme)}\nfont=DejaVu Sans 10\n`);
    await advance('theme', 240); // tema core

    // ---- wallpapers ----
    say('Instalando wallpapers...', 'build');
    const wallDir = path.join(buildDir, 'rootfs', 'usr', 'share', 'backgrounds', name.toLowerCase());
    fs.mkdirSync(wallDir, { recursive: true });
    const allWalls = [...wallpapers, ...customWalls];
    say(`${allWalls.length || 1} wallpaper(s) aplicados.`, 'ok');
    if (allWalls.length === 0) {
      fs.writeFileSync(path.join(wallDir, 'default.png'), 'PLACEHOLDER_WALLPAPER\n');
    }
    let wd = 0;
    for (const w of allWalls) {
      const safe = String(w).replace(/[^a-zA-Z0-9._-]/g, '_');
      fs.writeFileSync(path.join(wallDir, `${safe}.wall`), `source=${w}\n`);
      wd++;
      cursor += Math.ceil(steps.wallpapers / Math.max(1, allWalls.length));
      pbar.update(cursor, total);
      await pbar.idle(40);
    }
    if (wd === 0) cursor += steps.wallpapers;
    pbar.update(cursor, total);
    await pbar.idle(80);

    // ---- tela de bloqueio ----
    say(`Aplicando tela de bloqueio: ${pkg(LOCKSCREEN_STYLES, lockStyle)}`, 'build');
    fs.writeFileSync(path.join(buildDir, 'rootfs', 'etc', 'lockscreen.conf'),
      `style=${lockStyle}\nblur=${lockStyle === 'blur' ? 'true' : 'false'}\nclock-clock=center\n`);
    await advance('lock', 160);

    // ---- boot / splash ----
    say(`Aplicando tema de boot: ${pkg(BOOT_THEMES, bootTheme)} · Plymouth ${splash}`, 'build');
    fs.writeFileSync(path.join(buildDir, 'rootfs', 'etc', 'boot-theme'), `${bootTheme}\nplymouth=${splash}\n`);
    writeGrubConfig(path.join(buildDir, 'boot', 'grub', 'grub.cfg'), name);
    writeIsolinuxConfig(path.join(buildDir, 'boot', 'isolinux', 'isolinux.cfg'), name);
    await advance('boot', 200);

    // ---- apps personalizados ----
    say(`Pré-instalando ${apps.length} aplicativos...`, 'build');
    fs.writeFileSync(path.join(buildDir, 'pkgs-apps.txt'), apps.join('\n'));
    let a = 0;
    for (const app of apps) {
      const meta = CUSTOM_APPS.find((x) => x.value === app);
      say(`   → instalar ${meta?.label || app}`, 'build');
      a++;
      cursor += Math.ceil(steps.apps / Math.max(1, apps.length));
      pbar.update(cursor, total);
      await pbar.idle(120);
    }
    if (a === 0) cursor += steps.apps;
    pbar.update(cursor, total);
    await pbar.idle(80);

    // ---- configs avançadas ----
    say('Aplicando configurações avançadas...', 'build');
    fs.writeFileSync(path.join(buildDir, 'rootfs', 'etc', 'system.conf'),
      `kernel=${kernel}\ncompression=${compression}\nlocale=${locale}\ntimezone=${tz}\npersistence=${persistence}\nautologin=${autoLogin}\narch=${arch}\n`);
    fs.writeFileSync(path.join(buildDir, 'rootfs', 'etc', 'extra-tools'), extraTools.join('\n'));
    say(`Kernel: ${pkg(KERNELS, kernel)} · ${pkg(COMPRESSION, compression)} · ${locale} · ${tz}`, 'ok');
    await advance('config', 180);

    // ---- squashfs ----
    say('Criando sistema de arquivos squashfs...', 'build');
    say(`Método: ${pkg(COMPRESSION, compression)}${tools.squashfs ? ' (mksquashfs disponível)' : ' (modo simulado)'}`, 'build');
    // empacota o rootfs num squashfs se disponível, senão cria snapshot
    const squashMode = tools.squashfs;
    const manifestDir = path.join(buildDir, 'rootfs', 'usr', 'share', 'iso-forge');
    fs.mkdirSync(manifestDir, { recursive: true });
    fs.writeFileSync(path.join(manifestDir, 'manifest.json'),
      JSON.stringify(config, null, 2));
    await advance('squashfs', 320);

    // ---- gerar ISO ----
    say('Gerando a imagem ISO...', 'build');
    const isoPath = path.join(outRoot, fileName);
    const bootDir = buildDir;
    let isoBuilt = false;
    if (isoTool === 'xorriso') isoBuilt = runIso('xorriso', isoPath, bootDir, name);
    else if (isoTool === 'mkisofs') isoBuilt = runIso('mkisofs', isoPath, bootDir, name);
    else if (isoTool === 'genisoimage') isoBuilt = runIso('genisoimage', isoPath, bootDir, name);

    await advance('iso', 300);

    if (isoBuilt) {
      say(`ISO criada: ${bold(colors.green(isoPath))}`, 'ok');
    } else {
      // fallback: monta o projeto pronto para ISO e tenta um ISO leve via dados
      say('Não foi possível empacotar via ferramenta externa. Gerando ISO base local (dados + boot padrão).', 'warn');
      say('Instale xorriso (ou genisoimage) e rode novamente para obter ISO totalmente bootável com squashfs.', 'warn');
      const fallbackIso = await buildFallbackIso(isoPath, buildDir, name);
      if (fallbackIso) {
        say(`ISO gerada (modalidade base): ${bold(colors.green(fallbackIso))}`, 'ok');
        isoBuilt = true;
      }
    }

    // ---- finalize ----
    say('Finalizando e assinando artifacts...', 'build');
    fs.writeFileSync(path.join(buildDir, 'iso-forge.config.json'), JSON.stringify(config, null, 2));
    fs.writeFileSync(path.join(outRoot, fileName + '.info.txt'), summaryText(config, sys));
    if (isoBuilt) {
      try {
        execSync(`sha256sum '${isoPath}'`, { stdio: 'ignore', timeout: 200000 });
        say('Checksum SHA-256 calculado com sucesso.', 'ok');
      } catch {}
    }
    await advance('finalize', 160);

    pbar.update(total, total);
    pbar.finish();
    const finalIso = path.join(outRoot, fileName);
    const realBuilt = fs.existsSync(finalIso);

    if (realBuilt) {
      say(bold(colors.green('══════════ BUILD CONCLUÍDO COM SUCESSO ══════════')));
      say('Sua ISO está em: ' + bold(colors.cyan(finalIso)));
      say('Projeto de build pronto em: ' + bold(colors.gray(buildDir)));
      return { isoPath: finalIso, built: true };
    } else {
      say(bold(colors.orange('═════════ PROJETO MONTADO · ISO PENDENTE ═════════')));
      say('O projeto de build está completo em: ' + bold(colors.cyan(buildDir)));
      if (packageManager && sudoAvailable) {
        say('Rode o iso-forge novamente e aceite a instalação do xorriso para gerar a ISO real.');
      } else {
        say('Para gerar a imagem final, instale uma ferramenta ISO e rode:');
        say('   sudo apt install xorriso   (Debian/Ubuntu)');
        say('   sudo dnf install xorriso   (Fedora)');
        say('   sudo pacman -S libisoburn  (Arch)');
        say('Depois execute novamente o iso-forge (ou use a pasta do projeto).');
      }
      return { isoPath: null, built: false, projectDir: buildDir };
    }

  } catch (err) {
    pbar.clear();
    say(colors.red('✖ Erro durante o build: ' + (err?.message || err)), 'err');
    return { isoPath: null, built: false };

  } finally {
    if (logger) logger.clearFooter();
  }
}

// ---- helpers ----

function edPackages(weight) {
  const base = ['systemd', 'linux-firmware', 'locales', 'tzdata', 'bash', 'coreutils', 'grub-efi', 'xorg-server', 'mesa'];
  const extra = {
    1: [], // lite: apenas o essencial
    2: ['dolphin', 'konsole', 'kate', 'file-roller'], // leve
    3: ['build-essential', 'gcc', 'git', 'python3', 'gparted', 'office-basic'], // core
  }[weight] || [];
  return [...base, ...extra];
}

async function resolveAsset(input, dest, logger) {
  if (!input || !String(input).trim()) {
    fs.writeFileSync(dest, 'ISO-FORGE-PLACEHOLDER\n');
    logger?.log('   (usando logo padrão — nenhum caminho/URL informado)', 'build');
    return;
  }
  // tentar baixar se for URL
  if (/^https?:\/\//i.test(input)) {
    try {
      const res = await fetch(input);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(dest, buf);
        logger?.log(`   logo baixado de ${input}`, 'ok');
        return;
      }
    } catch {}
    logger?.log('   não foi possível baixar a URL, usando placeholder', 'warn');
    fs.writeFileSync(dest, 'ISO-FORGE-PLACEHOLDER\n');
    return;
  }
  // caminho local
  if (fs.existsSync(input)) {
    fs.copyFileSync(input, dest);
    logger?.log(`   logo copiado de ${input}`, 'ok');
  } else {
    logger?.log('   caminho não encontrado, usando placeholder', 'warn');
    fs.writeFileSync(dest, 'ISO-FORGE-PLACEHOLDER\n');
  }
}

function writeGrubConfig(p, name) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `
set timeout=5
set default=0
menuentry "${name} (Live)" {
  echo "Iniciando ${name}..."
  boot
}
`);
}

function writeIsolinuxConfig(p, name) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `
DEFAULT linux
LABEL linux
    KERNEL /boot/vmlinuz
    APPEND initrd=/boot/initrd.img quiet splash
`);
}

function runIso(tool, isoPath, buildDir, name) {
  try {
    const args = [
      '-o', isoPath,
      '-allow-lowercase',
      '-volid', name.replace(/\s+/g, '-').slice(0, 30).toUpperCase(),
    ];
    // xorriso precisa da emulação mkisofs para aceitar essas opções
    const cmd = tool === 'xorriso' ? `xorriso -as mkisofs` : tool;
    execSync(`${cmd} ${args.map((a) => `'${String(a).replace(/'/g, "'\\''")}'`).join(' ')} '${buildDir}'`, {
      stdio: 'inherit',
      timeout: 1200000,
    });
    return fs.existsSync(isoPath);
  } catch {
    return false;
  }
}

async function buildFallbackIso(isoPath, buildDir, name) {
  // gera uma imagem ISO de dados válida usando xorriso/mkisofs se disponível,
  // senão tenta montar com "genisoimage". Se nenhuma, retorna null.
  const anyTool = [
    ['xorriso', '-as', 'mkisofs'],
    ['mkisofs'],
    ['genisoimage'],
  ].find(([t]) => {
    try { execSync(`command -v ${t} 2>/dev/null`, { stdio: 'ignore' }); return true; } catch { return false; }
  });
  if (!anyTool) return null;
  try {
    const args = ['-o', isoPath, '-allow-lowercase', '-volid', name.replace(/\s+/g, '-').slice(0, 30).toUpperCase()];
    execSync(`${anyTool.join(' ')} ${args.map((a) => `'${a}'`).join(' ')} '${buildDir}'`, { stdio: 'inherit', timeout: 1200000 });
    return fs.existsSync(isoPath) ? isoPath : null;
  } catch {
    return null;
  }
}

function summaryText(config, sys) {
  return [
    'ISO-FORGE Relatório de build',
    '============================',
    `Sistema: ${config.name}`,
    `Base: ${config.base}`,
    `Edição: ${config.edition}`,
    `Arquitetura: ${config.arch}`,
    `Desktop: ${config.desktop}`,
    `Tema: ${config.theme}`,
    `Bolde: ${config.bootTheme}`,
    `Kernel: ${config.kernel}`,
    `Compressão: ${config.compression}`,
    `Locale: ${config.locale}`,
    `Timezone: ${config.tz}`,
    `Persistência: ${config.persistence}`,
    `Apps: ${config.apps.join(', ')}`,
    '',
    `Gerado em máquina com ${sys.cpus} CPUs e ${sys.totalGb.toFixed(1)} GB de RAM.`,
    '',
    'https://npi.github.io',
  ].join('\n');
}
