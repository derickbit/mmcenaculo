# Backup e restauração do banco

O plano grátis do Supabase **não faz backup automático** (a aba Database → Backups pede o plano Pro). Por isso o projeto tem um
backup manual: um comando que copia **todas as tabelas** para um arquivo, e outro que devolve esse arquivo para um banco vazio.

## Fazer um backup

No terminal, na pasta do projeto:

```powershell
npm run backup
```

- Salva `backups/backup-AAAA-MM-DD-HHMM.json` e mostra quantas linhas há em cada tabela.
- **Só lê o banco**: não altera nada. Pode rodar quando quiser.
- Usa o banco do `.env` (o de desenvolvimento). Para fazer backup da **produção**, aponte o terminal para ela só naquela janela:

```powershell
$env:DATABASE_URL = "COLE_AQUI_A_URL_DO_SUPABASE"
npm run backup
Remove-Item Env:DATABASE_URL
```

(A URL está no Supabase em **Connect**; a senha é a do banco, a mesma do `DATABASE_URL` da Vercel. Nunca cole a URL em chat, e-mail ou arquivo do projeto.)

**Quando fazer:** antes de qualquer mudança no banco de produção, antes de cada evento e, depois dele, quando as inscrições fecharem.

## Guardar o arquivo

O arquivo tem **dados pessoais (inclusive de crianças) e os hashes das senhas**. A pasta `backups/` não vai para o Git (está no `.gitignore`).

- Guarde em lugar seguro (um pendrive ou uma pasta sua protegida) e apague os antigos que não precisa mais.
- Não envie por e-mail, WhatsApp ou chat.
- Um backup que só existe no mesmo computador do projeto não protege de perder o computador: copie para um segundo lugar.

## Restaurar

A restauração **só funciona num banco vazio**: se qualquer tabela já tiver dados, o comando recusa e não mexe em nada. É de propósito,
para nunca misturar nem apagar dados por engano.

1. Crie o banco novo e vazio com as tabelas (por exemplo, um projeto novo no Supabase ou um banco local) e aplique as migrations:

```powershell
$env:DATABASE_URL = "URL_DO_BANCO_NOVO"
npx prisma migrate deploy
```

2. Restaure o arquivo:

```powershell
npm run backup:restaurar -- backups/backup-2026-10-22-2106.json
```

O comando mostra o banco de destino e pede para você digitar `sim`. A restauração é feita numa transação: ou volta tudo, ou não volta nada.

3. Aponte o site para o banco novo (variável `DATABASE_URL` na Vercel) e faça um novo deploy.

## O que fica de fora

- Os contadores de limite de tentativas (login, inscrição). São passageiros e se recriam sozinhos.
- As **fotos da galeria** em si ficam no Cloudinary, não no banco; o backup guarda só os endereços delas.
- As sessões de login: depois de restaurar, quem estava logado entra de novo.

## Como foi testado

- Backup do banco local (3 eventos, 5 inscrições, 25 presenças etc.) restaurado num banco temporário vazio: o backup do banco restaurado ficou **idêntico** ao original.
- Restaurar uma segunda vez no mesmo banco foi **recusado**, sem alterar nada.
- Testes automáticos em `lib/backup.test.ts` (ordem das tabelas, datas, recusa de banco com dados, restauração sem deixar nada pela metade).
