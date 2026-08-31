# 🛠️ iso-forge

**Crie a sua própria distribuição Linux no terminal.** Escolha a base, edite o tema, os wallpapers, a tela de bloqueio, os aplicativos — e gere a sua ISO com logs detalhados e uma barra de progresso inteligente que se adapta ao seu hardware.

```
 ██╗███████╗ ██████╗      ███████╗ ██████╗ ██████╗  ██████╗ ███████╗
 ██║██╔════╝██╔═══██╗     ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
 ██║███████╗██║   ██║█████╗███████╗██║   ██║██████╔╝██║  ███╗█████╗
 ██║╚════██║██║   ██║╚════╝╚════██║██║   ██║██╔══██╗██║   ██║██╔══╝
 ██║███████║╚██████╔╝      ███████║╚██████╔╝██║  ██║╚██████╔╝███████╗
 ╚═╝╚══════╝ ╚═════╝       ╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
>>>  Crie a sua própria distribuição Linux  <<<
```

---

## ✨ O que a ferramenta faz

O `iso-forge` é um assistente interativo. Você responde a uma série de perguntas e, ao final, ele monta e empacota a sua ISO.

### O passo a passo do assistente

1. **Nome do sistema** — dê um nome à sua distro.
2. **Base** — escolha a distribuição base (Ubuntu, Debian, Arch, Fedora, openSUSE, Void, Alpine, Mint, EndeavourOS, Gentoo, NixOS, Manjaro...).
3. **Edição da ISO** — `Lite`, `Leve` ou `Core` (normal).
4. **Arquitetura** — `amd64`, `arm64` ou `i386`.
5. **Logo de boot** — caminho local ou URL do logo de inicialização.
6. **Logo do sistema** — caminho ou URL do logo do sistema.
7. **Tema do desktop** — KDE, GNOME, XFCE, MATE, Cinnamon, LXQt, Budgie, COSMIC, Sway, i3 — e **tema global** (Adwaita, Breeze, Dracula, Catppuccin, Gruvbox, Tokyo Night, Nord...).
8. **Wallpapers** — seleção múltipla de fundos + wallpapers personalizados por caminho/URL.
9. **Tela de bloqueio** — Blur, cartões, mínimo, relógio central, moderno, onda.
10. **Tela de início / boot** — tema do GRUB/GRUB+GRUB2, splash do Plymouth.
11. **Aplicativos personalizados** — seleção fácil de apps para pré-instalar.
12. **Configurações avançadas** — kernel (LTS, Zen, Hardened, RT), compressão (gzip/xz/zstd/lzo), idioma, fuso, persistência, login automático e extras (drivers, codecs, fontes...).

### Personalização total

- Muitas opções de **tema, desktop, wallpaper, tela de bloqueio, boot e apps**.
- **Logos** por caminho **ou URL** (baixa automaticamente).
- Arquivos de configuração são gerados para cada escolha (`os-release`, `theme.conf`, `lockscreen.conf`, `system.conf`, manifest JSON...).

---

## 🧠 Barra de progresso inteligente

- A barra de progresso fica **fixa no rodapé** do terminal; os logs rolam por cima.
- Ela **detecta a RAM e os CPUs** do seu computador e se adapta:
  - **Pouca RAM (ex.: 2 GB)** → o processo roda mais lento e um aviso aparece **logo abaixo da barra** indicando que pode demorar — mas **sem quebrar**.
  - **Muita RAM (8 GB+)** → o processo roda mais rápido e com mais paralelismo.

Esse comportamento torna o build **estável** em qualquer máquina, do netbook antigo ao desktop potente.

---

## 📦 Instalação

Requer **Node.js 16+**.

```bash
# instalar globalmente e usar em qualquer lugar
npm install -g iso-forge

# ou rodar sem instalar
npx iso-forge
```

## ▶️ Uso

```bash
iso-forge            # abre o assistente interativo
iso-forge --help     # ajuda
iso-forge --version  # versão
```

### 🖥️ O que a ISO realmente contém (build REAL)

Diferente de ferramentas que só geram um "esqueleto", o **iso-forge faz um bootstrap real**:

1. **Baixa e instala o sistema base** de verdade (`debootstrap` para Debian/Ubuntu/Mint, `pacstrap` para Arch, `dnf` para Fedora/openSUSE) — kernel, initramfs, GRUB, locais, tudo.
2. **Instala o desktop escolhido** (meta-pacote real: `kubuntu-desktop`, `xfce4`, `cinnamon`...).
3. **Instala cada app personalizado** que você marcou (Firefox, VLC, LibreOffice, git, etc.).
4. **Aplica o tema, a tela de bloqueio, o boot e os wallpapers** (geramos imagens reais 1920×1080 em PNG — gradientes — e você pode adicionar os seus por caminho/URL).
5. **Compacta** o sistema num **squashfs** e monta uma **ISO bootável** (GRUB + isolinux + EFI).

**Resultado:** uma ISO real de **centenas de MB a ~2–4 GB** (dependendo da base e dos apps), que **boota em um PC/virtualizador**.

> ⚠️ **Requisitos para o modo REAL:** ter `debootstrap` (ou `pacstrap`/`dnf`), `sudo`, `squashfs-tools`, `grub-mkrescue`/`xorriso` e **internet** (baixa a base toda). Se algo faltar, o iso-forge avisa claramente e cai no *modo esqueleto* (projeto, ISO compacta) — nunca te engana.

### Instalação automática do xorriso 🔐

Se o **xorriso** (ou `mkisofs`/`genisoimage`) não estiver instalado, o `iso-forge` **detecta o gerenciador de pacotes e pede a sua permissão para instalar automaticamente**:

```
[build] Nenhuma ferramenta de ISO (xorriso/mkisofs/genisoimage) encontrada.
[warn]  Falta uma ferramenta de ISO (xorriso/mkisofs). Encontramos o seu gerenciador de pacotes (Debian/Ubuntu).

◈ Quer que eu instale o "xorriso" automaticamente agora? (pode pedir a senha do sudo)
   ❯ Sim
     Não
```

- Se você confirmar (**Sim**), ele roda o comando do seu gerenciador (via `sudo`) — por exemplo `sudo apt-get install -y xorriso`, `sudo dnf install -y xorriso`, `sudo pacman -S --noconfirm libisoburn`, `sudo zypper install -y xorriso`, `sudo apk add xorriso`, `sudo emerge --ask=y xorriso`.
- Depois ele **re-detecta** a ferramenta e gera uma **ISO real e bootável**.
- Se você recusar (**Não**), o projeto de build fica pronto em disco e a ferramenta mostra como gerar a imagem depois.
- Se não houver gerenciador reconhecido nem `sudo`, ele avisa para instalar manualmente.

### Para gerar uma ISO bootável de verdade

A ferramenta empacota a ISO com `xorriso`/`mkisofs`/`genisoimage` (instalando automaticamente com a sua permissão, se faltar). Você também pode instalar manualmente:

```bash
sudo apt install xorriso     # Debian / Ubuntu
sudo dnf install xorriso     # Fedora
sudo pacman -S libisoburn    # Arch
```

---

## 🗂️ Estrutura do projeto

- `packages` montados no rootfs (`etc/`), logos em `assets/`, wallpapers em `usr/share/backgrounds/` e tema em `usr/share/themes/`.
- `manifest.json` com toda a configuração escolhida.
- Relatório de build (`<nome>.iso.info.txt`) ao lado da ISO.

---

## 📄 Licença

MIT — use, modifique e distribua à vontade.
