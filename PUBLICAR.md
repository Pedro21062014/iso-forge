# Publicar a correção v1.2.4

Toda a correção já está **commitada localmente** (`85f5b1f`) e a tag
`v1.2.4` está criada. **Não** foi feito push/publish porque o ambiente de
trabalho do agente perdeu a credencial de GitHub (o `.git/config`, que guarda
o remote e o token, é removido quando o sandbox é reiniciado).

Para concluir, rode estes comandos **na sua máquina** (ou me forneça um
GitHub token com permissão de push que eu faço por você):

```bash
cd iso-forge
git remote add origin https://github.com/Pedro21062014/iso-forge.git
git push origin main
git push origin v1.2.4
```

O segundo comando (`git push origin v1.2.4`) dispara o GitHub Actions
(`npm publish`) automaticamente, usando o `NPM_TOKEN` do secredo do repositório.

## O que a v1.2.4 corrige

1. **Apps em `universe`/`multiverse` agora instalam** — o `debootstrap` só
   configura a componente `main`. `vlc`, `libreoffice`, `gnome-software` e
   `timeshift` (que o seu build não achava) ficam em `universe`. Agora o build
   adiciona `universe`+`multiverse` (Ubuntu/Mint) e `contrib`+`non-free`
   (Debian), com o mirror de segurança correto.

2. **`installPackages` resiliente** — se um pacote não existe no repositório
   (ex.: `brave-browser`, que é de terceiros e não tem repo oficial no
   Ubuntu), ele **pula só esse pacote** com um aviso, em vez de abortar o
   build inteiro.

3. **Chroot montado corretamente** — o `debootstrap` desmonta `/proc, /sys,
   /dev, /dev/pts` ao terminar. Sem eles o postinst do `openjdk`/`libreoffice`
   falhava com `Can not write log (Is /dev/pts mounted?)`. Agora o build
   monta o chroot antes dos installs e desmonta antes do `chown -R` e do
   `mksquashfs` (senão arquivava `/proc,/sys,/dev`), sempre desmontando no
   `finally`.

4. **`hasTool` acha ferramentas em `/usr/sbin`** — `debootstrap`/`grub-mkrescue`
   costumam ficar lá e nem sempre estão no `PATH` do usuário.

## Testado de ponta a ponta (Ubuntu, sandbox)

- `vlc`, `libreoffice`, `gnome-software`, `timeshift`, `git`, `htop` — todos
  instalados no rootfs (confirmado via `dpkg-query`).
- ISO de **7.0 GB** gerada, **bootável** (El Torito **BIOS + UEFI**, kernel
  `6.8.0-138-generic`).
- Sem mounts residuais de chroot; `/dev` do host intacto.
- Sem nenhum erro de instalação (o `brave-browser` foi pulado com aviso).
