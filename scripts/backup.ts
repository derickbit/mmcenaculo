// Script de terminal: backup manual e restauração do banco (o plano grátis do Supabase NÃO faz backup sozinho).
//
//   npm run backup                            salva todas as tabelas em backups/backup-AAAA-MM-DD-HHMM.json (só lê o banco)
//   npm run backup:restaurar -- <arquivo>     devolve um backup para um banco VAZIO (recusa se houver dados)
//
// O banco usado é o DATABASE_URL do ambiente, ou o do arquivo .env. Para a produção, defina o DATABASE_URL só naquele terminal.
// O arquivo de backup tem dados pessoais (inclusive de crianças) e os hashes das senhas: a pasta backups/ não vai para o Git.
// Guarde os arquivos em lugar seguro e não os envie por e-mail ou chat.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as readline from "node:readline/promises";

async function perguntar(texto: string): Promise<string> {
  const leitor = readline.createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await leitor.question(texto);
  leitor.close();
  return resposta;
}

const dois = (n: number) => String(n).padStart(2, "0");

async function principal(): Promise<number> {
  const modo = process.argv[2];
  if (modo !== "salvar" && modo !== "restaurar") {
    console.log("Uso: npm run backup   |   npm run backup:restaurar -- <arquivo>");
    return 1;
  }

  try {
    process.loadEnvFile(".env"); // não sobrescreve variáveis já definidas no terminal
  } catch {
    // sem .env: vale só o que estiver no ambiente
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não está definida (nem no ambiente, nem no .env).");
    return 1;
  }

  const banco = new URL(process.env.DATABASE_URL);
  console.log(`\nBanco de dados: ${banco.host}${banco.pathname}  (a senha do banco não é mostrada)`);

  const { default: prisma } = await import("../lib/prisma");
  const { fazerBackup, restaurarBackup } = await import("../lib/backup");

  try {
    if (modo === "salvar") {
      const backup = await fazerBackup(prisma);
      const agora = new Date();
      const nome = `backup-${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}-${dois(agora.getHours())}${dois(agora.getMinutes())}.json`;
      const arquivo = path.join("backups", nome);
      mkdirSync("backups", { recursive: true });
      writeFileSync(arquivo, JSON.stringify(backup, null, 2), "utf8");
      console.log(`\nBackup salvo em ${arquivo}`);
      for (const [tabela, linhas] of Object.entries(backup.tabelas)) console.log(`  ${tabela}: ${linhas.length}`);
      return 0;
    }

    const arquivo = process.argv[3];
    if (!arquivo) {
      console.error("Informe o arquivo: npm run backup:restaurar -- backups/backup-....json");
      return 1;
    }
    const confirmou = (await perguntar("Restaurar este backup neste banco? (só funciona num banco vazio) Digite sim para continuar: ")).trim().toLowerCase();
    if (confirmou !== "sim") {
      console.log("Cancelado. Nada foi alterado.");
      return 1;
    }
    const resultado = await restaurarBackup(prisma, JSON.parse(readFileSync(arquivo, "utf8")));
    if (!resultado.ok) {
      console.error(`\n${resultado.mensagem}`);
      return 1;
    }
    console.log("\nBackup restaurado:");
    for (const [tabela, n] of Object.entries(resultado.linhas)) console.log(`  ${tabela}: ${n}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

principal()
  .then((codigo) => process.exit(codigo))
  .catch((erro) => {
    console.error("Erro inesperado:", erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
