import fs from 'node:fs';
import { detectSystem, detectBuildTools } from './system.js';
import { Logger } from './ui/logger.js';
import { WELCOME, HELP } from './ui/banner.js';
import { select, multiselect, inputPage, confirmItem } from './ui/prompts.js';
import {
  BASE_DISTROS, EDITIONS, DESKTOPS, GLOBAL_THEMES, WALLPAPERS,
  LOCKSCREEN_STYLES, BOOT_THEMES, CUSTOM_APPS, KERNELS,
  LOCALES, TIMEZONES, COMPRESSION,
} from './presets.js';
import { buildISO } from './build/engine.js';
import { colors, bold, dim } from './ui/ansi.js';

let logger;

async function say(msg, channel) {
  logger?.log(msg, channel);
}

/** Label seguro: retorna o rótulo ou um padrão se a seleção veio vazia/Esc. */
function pick(catalog, value) {
  const item = catalog.find((x) => x.value === value);
  return item ? item.label : (catalog[0]?.label ?? value ?? '—');
}

export async function run() {
  const args = process.argv.slice(2);
  logger = new Logger();

  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(WELCOME + HELP);
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    process.stdout.write(`${pkg.name} v${pkg.version}\n`);
    return;
  }

  const sys = detectSystem();
  const tools = detectBuildTools();

  process.stdout.write('\n' + WELCOME + '\n');
  logger.blank();
  say(colors.gray(`Detectado: ${sys.cpus} CPUs · ${sys.totalGb.toFixed(1)} GB RAM · arquitetura ${sys.arch} · ${sys.platform}`), 'sys');

  if (sys.slowWarning) {
    logger.warn(sys.slowWarning);
    process.stdout.write('\n');
  } else {
    logger.blank();
  }

  // ---------------- 1. Nome do sistema ----------------
  logger.section('1/12 · Nome do sistema');
  let name = await inputPage({
    title: 'Como você quer chamar a sua distribuição?',
    placeholder: 'Ex.: NebulaOS, Aurora, MeuLinux...',
    validate: (v) => v.trim().length >= 2,
  });
  name = name.trim() || 'MinhaDistro';
  say(`Nome do sistema: ${bold(colors.green(name))}`, 'ok');

  // ---------------- 2. Base ----------------
  logger.section('2/12 · Base da distribuição');
  const base = (await select(BASE_DISTROS, { title: 'Escolha a base que será usada:' })) ?? BASE_DISTROS[0].value;
  const baseInfo = BASE_DISTROS.find((b) => b.value === base);
  say(`Base selecionada: ${bold(baseInfo.label)} (${baseInfo.family})`, 'ok');

  // ---------------- 3. Edição (Lite/Leve/Core) ----------------
  logger.section('3/12 · Edição da ISO');
  const edition = (await select(EDITIONS, { title: 'Qual edição do sistema você quer?' })) ?? EDITIONS[0].value;
  const editionInfo = EDITIONS.find((e) => e.value === edition);
  say(`Edição: ${bold(editionInfo.label)}`, 'ok');

  // ---------------- 4. Arquitetura ----------------
  logger.section('4/12 · Arquitetura');
  const arch = (await select([
    { value: 'amd64', label: 'amd64 / x86_64', desc: 'PCs e notebooks comuns (64 bits).' },
    { value: 'arm64', label: 'arm64 / aarch64', desc: 'ARM, Raspberry Pi e similar.' },
    { value: 'i386', label: 'i386 / 32 bits', desc: 'Hardware mais antigo.' },
  ], { title: 'Arquitetura de destino:' })) ?? 'amd64';
  say(`Arquitetura: ${bold(arch)}`, 'ok');

  // ---------------- 5. Logo de boot ----------------
  logger.section('5/12 · Logo de boot (splash inicial)');
  const bootLogo = await inputPage({
    title: 'Caminho ou URL do logo de boot (use Enter para usar um padrão):',
    placeholder: '/caminho/para/logo.png  ou  https://exemplo.com/logo.png',
  });
  say(`Logo de boot: ${bold(bootLogo || '(padrão)')}`, 'ok');

  // ---------------- 6. Logo do sistema ----------------
  logger.section('6/12 · Logo do sistema');
  const sysLogo = await inputPage({
    title: 'Caminho ou URL do logo do sistema (use Enter para padrão):',
    placeholder: '/caminho/sistema.svg ou https://...',
  });
  say(`Logo do sistema: ${bold(sysLogo || '(padrão)')}`, 'ok');

  // ---------------- 7. Tema desktop ----------------
  logger.section('7/12 · Tema do desktop');
  const desktop = (await select(DESKTOPS, { title: 'Escolha o ambiente de desktop:' })) ?? DESKTOPS[0].value;
  const desktopInfo = DESKTOPS.find((d) => d.value === desktop);
  say(`Desktop: ${bold(desktopInfo.label)}`, 'ok');

  const theme = (await select(GLOBAL_THEMES, { title: 'Escolha o tema global:' })) ?? GLOBAL_THEMES[0].value;
  const themeInfo = GLOBAL_THEMES.find((t) => t.value === theme);
  say(`Tema: ${bold(themeInfo.label)}`, 'ok');

  // ---------------- 8. Wallpapers ----------------
  logger.section('8/12 · Wallpapers');
  const wallpapers = await multiselect(WALLPAPERS, { title: 'Selecione os wallpapers incluídos (espaço para marcar):' });
  const customWalls = [];
  const addCustom = await confirmItem({ title: 'Quer adicionar papéis de parede personalizados?' });
  if (addCustom) {
    const w1 = await inputPage({ title: 'Caminho/URL do wallpaper #1 (Enter para pular):', placeholder: '...' });
    if (w1.trim()) customWalls.push(w1.trim());
    const w2 = await inputPage({ title: 'Wallpaper #2 (opcional):', placeholder: '...' });
    if (w2.trim()) customWalls.push(w2.trim());
  }
  if (wallpapers.length === 0 && customWalls.length === 0) {
    logger.warn('Nenhum wallpaper selecionado — usaremos o padrão.');
  } else {
    say(`Wallpapers: ${bold(wallpapers.length + customWalls.length + ' selecionados')}`, 'ok');
  }

  // ---------------- 9. Tela de bloqueio ----------------
  logger.section('9/12 · Tela de bloqueio');
  const lockStyle = (await select(LOCKSCREEN_STYLES, { title: 'Estilo da tela de bloqueio:' })) ?? LOCKSCREEN_STYLES[0].value;
  const lockInfo = LOCKSCREEN_STYLES.find((l) => l.value === lockStyle);
  say(`Bloqueio: ${bold(lockInfo.label)}`, 'ok');

  // ---------------- 10. Tela de início / boot ----------------
  logger.section('10/12 · Tela de início e boot');
  const bootTheme = (await select(BOOT_THEMES, { title: 'Tema do carregador/splash de boot:' })) ?? BOOT_THEMES[0].value;
  say(`Boot: ${bold(pick(BOOT_THEMES, bootTheme))}`, 'ok');
  const enablePlymouth = await confirmItem({ title: 'Ativar splash do Plymouth (animação de boot)?' });
  const splash = enablePlymouth ? 'on' : 'off';

  // ---------------- 11. Aplicativos personalizados ----------------
  logger.section('11/12 · Aplicativos personalizados');
  const apps = await multiselect(CUSTOM_APPS, { title: 'Selecione os apps que serão pré-instalados (espaço para marcar):' });
  say(`Apps selecionados: ${bold(apps.length + ' pacotes')}`, 'ok');

  // ---------------- 12. Configurações avançadas ----------------
  logger.section('12/12 · Configurações avançadas');
  logger.step('Escolha o kernel:');
  const kernel = (await select(KERNELS, { title: 'Kernel:' })) ?? KERNELS[0].value;
  say(`Kernel: ${bold(pick(KERNELS, kernel))}`, 'ok');

  logger.step('Compressão do sistema:');
  const compression = (await select(COMPRESSION, { title: 'Compressão:' })) ?? COMPRESSION[0].value;
  say(`Compressão: ${bold(pick(COMPRESSION, compression))}`, 'ok');

  const locale = (await select(LOCALES, { title: 'Idioma do sistema (locale):' })) ?? LOCALES[0].value;
  say(`Locale: ${bold(pick(LOCALES, locale))}`, 'ok');

  const tz = (await select(TIMEZONES, { title: 'Fuso horário:' })) ?? TIMEZONES[0].value;
  say(`Fuso: ${bold(pick(TIMEZONES, tz))}`, 'ok');

  const persistence = await confirmItem({ title: 'Incluir persistência (salvar alterações no pen drive)?' });
  const autoLogin = await confirmItem({ title: 'Login automático do usuário padrão?' });
  const extraTools = await multiselect([
    { value: 'drivers', label: 'Drivers proprietários (NVIDIA/AMD/Intel)', desc: 'melhor suporte gráfico' },
    { value: 'codecs', label: 'Codecs multimídia', desc: 'H.264, MP3, AAC' },
    { value: 'fonts', label: 'Fontes adicionais', desc: 'inclui fontes variadas' },
    { value: 'dev', label: 'Kit de desenvolvimento', desc: 'compiladores, headers' },
    { value: 'misc', label: 'Extras / utilitários', desc: 'pacotes diversos' },
  ], { title: 'Extras opcionais (espaço para marcar):' });

  const outputDir = await inputPage({ title: 'Pasta onde salvar a ISO (Enter = ./iso-forge-out):', placeholder: './iso-forge-out' });
  const finalName = `${name.replace(/\s+/g, '-').toLowerCase()}-${edition}-${arch}.iso`;

  // ---------------- Resumo ----------------
  waitForEnterClear();
  logger.blank();
  const config = {
    name,
    base,
    edition,
    arch,
    bootLogo,
    sysLogo,
    desktop,
    theme,
    wallpapers,
    customWalls,
    lockStyle,
    bootTheme,
    splash,
    apps,
    kernel,
    compression,
    locale,
    tz,
    persistence,
    autoLogin,
    extraTools,
    outputDir: outputDir.trim() || './iso-forge-out',
    fileName: finalName,
  };

  process.stdout.write(summary(config) + '\n\n');
  const proceed = await confirmItem({ title: 'Confirmar e iniciar a geração da ISO?' });

  if (!proceed) {
    say('Geração cancelada. Tudo bem, podemos parar por aqui.', 'ok');
    return;
  }

  // ---------------- BUILD ----------------
  await buildISO(config, { logger, sys, tools });
}

function summary(c) {
  const p = (label, val) => `  ${colors.cyan('•')} ${label.padEnd(28)} ${colors.white(bold(val))}`;
  return [
    colors.purple(bold('══════════════ RESUMO DA SUA ISO ══════════════')),
    p('Nome', c.name),
    p('Base', pick(BASE_DISTROS, c.base)),
    p('Edição', pick(EDITIONS, c.edition)),
    p('Arquitetura', c.arch),
    p('Desktop', pick(DESKTOPS, c.desktop)),
    p('Tema', pick(GLOBAL_THEMES, c.theme)),
    p('Kernel', pick(KERNELS, c.kernel)),
    p('Compressão', pick(COMPRESSION, c.compression)),
    p('Locale', c.locale),
    p('Fuso', c.tz),
    p('Apps', c.apps.length ? c.apps.length + ' pacotes' : 'nenhum'),
    p('Wallpapers', c.wallpapers.length + c.customWalls.length),
    p('Persistência', c.persistence ? 'sim' : 'não'),
    p('Login automático', c.autoLogin ? 'sim' : 'não'),
    p('Arquivo final', c.fileName),
    colors.purple(bold('══════════════════════════════════════════════')),
  ].join('\n');
}

function waitForEnterClear() {
  process.stdout.write('\x1b[?25h');
}
