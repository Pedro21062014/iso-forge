import os from 'node:os';
import { execSync } from 'node:child_process';

/**
 * Detecta informações do sistema para adaptar o processo de build.
 * Em máquinas com pouca RAM o build é mais lento, porém estável.
 */
export function detectSystem() {
  const totalBytes = os.totalmem();
  const totalGb = totalBytes / 1024 ** 3;
  const cpus = os.cpus().length;
  const arch = os.arch();
  const platform = os.platform();
  const hostname = os.hostname();

  // Classificação de perfil de desempenho
  let profile = 'fast';
  let slowWarning = '';
  let concurrency = 4;

  if (totalGb < 2) {
    profile = 'very-slow';
    slowWarning = '⚠  Máquina com pouca RAM registrada. O processo rodará bem lento e estável, sem quebrar. Evite interromper o build.';
    concurrency = 1;
  } else if (totalGb < 4) {
    profile = 'slow';
    slowWarning = '⚠  RAM abaixo de 4 GB. O processo será mais lento para não estourar a memória, mas não será interrompido.';
    concurrency = 2;
  } else if (totalGb < 8) {
    profile = 'medium';
    slowWarning = '●  Máquina com RAM moderada. Build em velocidade média e estável.';
    concurrency = 3;
  } else if (totalGb < 16) {
    profile = 'fast';
    slowWarning = '';
    concurrency = 4;
  } else {
    profile = 'ultra';
    slowWarning = '⚡  Máquina potente detectada! Build com alta velocidade.';
    concurrency = Math.max(4, Math.min(cpus, 10));
  }

  // Fator de "velocidade" usado para controlar a duração simulada/real das etapas
  const speedFactor = {
    'very-slow': 2.4,
    slow: 1.7,
    medium: 1.0,
    fast: 0.62,
    ultra: 0.35,
  }[profile];

  return {
    totalBytes,
    totalGb,
    cpus,
    arch,
    platform,
    hostname,
    profile,
    slowWarning,
    concurrency,
    speedFactor,
  };
}

/** Verifica se uma ferramenta de build está disponível no PATH. */
export function hasTool(tool) {
  try {
    execSync(`command -v ${tool} 2>/dev/null`, { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/** Lista as ferramentas de empacotamento de ISO disponíveis. */
export function detectBuildTools() {
  return {
    xorriso: hasTool('xorriso'),
    mkisofs: hasTool('mkisofs'),
    genisoimage: hasTool('genisoimage'),
    squashfs: hasTool('mksquashfs'),
    debootstrap: hasTool('debootstrap'),
    grub: hasTool('grub-mkimage'),
    isolinux: hasTool('isolinux'),
    dd: hasTool('dd'),
    losetup: hasTool('losetup'),
  };
}

/**
 * Detecta o gerenciador de pacotes do sistema, para instalarmos o xorriso
 * automaticamente quando necessário.
 */
export function detectPackageManager() {
  const cands = [
    { pkg: 'apt', label: 'Debian/Ubuntu', cmd: 'sudo apt-get update && sudo apt-get install -y', pkgName: 'xorriso' },
    { pkg: 'apt-get', label: 'Debian/Ubuntu', cmd: 'sudo apt-get update && sudo apt-get install -y', pkgName: 'xorriso' },
    { pkg: 'dnf', label: 'Fedora/RHEL', cmd: 'sudo dnf install -y', pkgName: 'xorriso' },
    { pkg: 'yum', label: 'RHEL/CentOS', cmd: 'sudo yum install -y', pkgName: 'xorriso' },
    { pkg: 'pacman', label: 'Arch', cmd: 'sudo pacman -S --noconfirm', pkgName: 'libisoburn' },
    { pkg: 'zypper', label: 'openSUSE', cmd: 'sudo zypper install -y', pkgName: 'xorriso' },
    { pkg: 'apk', label: 'Alpine', cmd: 'sudo apk add', pkgName: 'xorriso' },
    { pkg: 'emerge', label: 'Gentoo', cmd: 'sudo emerge --ask=y', pkgName: 'xorriso' },
  ];
  for (const c of cands) {
    if (hasTool(c.pkg)) return c;
  }
  return null;
}

export function hasSudo() {
  return hasTool('sudo');
}
