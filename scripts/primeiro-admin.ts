// Script de terminal para o ADMINISTRADOR (o dono do sistema). Roda UMA vez para criar o primeiro admin, e depois só se você
// esquecer a sua senha (a tela de usuários do painel não mexe na conta de administrador, de propósito).
//
//   npm run admin:criar             cria o administrador (recusa se já existir um: só pode haver um)
//   npm run admin:redefinir-senha   define uma senha nova para o administrador e derruba as sessões abertas dele
//
// O usuário e a senha são pedidos aqui no terminal (a senha não aparece enquanto você digita e não fica em arquivo nem no histórico).
// O banco usado é o DATABASE_URL do ambiente, ou o do arquivo .env. Para rodar contra a produção, defina o DATABASE_URL só naquele
// terminal (a variável de terminal vale mais que o .env). O script mostra qual banco é e pede confirmação antes de mexer.

import { readFileSync } from "node:fs";
import * as readline from "node:readline/promises";

const interativo = Boolean(process.stdin.isTTY);
// Sem terminal interativo (por exemplo, entrada redirecionada num teste), as respostas vêm das linhas da entrada, em ordem.
const respostasPendentes: string[] = interativo ? [] : readFileSync(0, "utf8").split(/\r?\n/);

async function perguntar(texto: string): Promise<string> {
  if (!interativo) {
    process.stdout.write(`${texto}\n`);
    return respostasPendentes.shift() ?? "";
  }
  const leitor = readline.createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await leitor.question(texto);
  leitor.close();
  return resposta;
}

// Pergunta sem mostrar o que é digitado (para senhas).
function perguntarOculto(texto: string): Promise<string> {
  if (!interativo) {
    process.stdout.write(`${texto}(entrada não interativa)\n`);
    return Promise.resolve(respostasPendentes.shift() ?? "");
  }
  return new Promise((resolver) => {
    process.stdout.write(texto);
    const entrada = process.stdin;
    entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding("utf8");
    let digitado = "";
    const aoReceber = (pedaco: string) => {
      for (const letra of pedaco) {
        if (letra === "\r" || letra === "\n") {
          entrada.setRawMode(false);
          entrada.pause();
          entrada.off("data", aoReceber);
          process.stdout.write("\n");
          return resolver(digitado);
        }
        if (letra === "\u0003") process.exit(130); // Ctrl+C
        if (letra === "\u007f" || letra === "\b") digitado = digitado.slice(0, -1);
        else digitado += letra;
      }
    };
    entrada.on("data", aoReceber);
  });
}

async function principal(): Promise<number> {
  const modo = process.argv[2];
  if (modo !== "criar" && modo !== "redefinir") {
    console.log("Uso: npm run admin:criar   |   npm run admin:redefinir-senha");
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
  const confirmou = (await perguntar("Está certo mexer neste banco? Digite sim para continuar: ")).trim().toLowerCase();
  if (confirmou !== "sim") {
    console.log("Cancelado. Nada foi alterado.");
    return 1;
  }

  const { default: prisma } = await import("../lib/prisma");
  const { criarPrimeiroAdmin, redefinirSenhaDoAdmin } = await import("../lib/primeiro-admin");

  try {
    const nome = modo === "criar" ? (await perguntar("Usuário do administrador: ")).trim() : undefined;
    const senha = await perguntarOculto("Senha (mínimo de 10 caracteres): ");
    const repeticao = await perguntarOculto("Repita a senha: ");
    if (senha !== repeticao) {
      console.error("\nAs senhas não coincidem. Nada foi alterado.");
      return 1;
    }

    const resultado = modo === "criar" ? await criarPrimeiroAdmin(prisma, { nome: nome ?? "", senha }) : await redefinirSenhaDoAdmin(prisma, { senha });
    if (!resultado.ok) {
      console.error(`\n${resultado.mensagem}`);
      return 1;
    }
    console.log(
      modo === "criar"
        ? `\nAdministrador "${resultado.nome}" criado. Entre em /painelmmc/login.`
        : `\nSenha de "${resultado.nome}" redefinida. As sessões abertas dessa conta foram encerradas.`
    );
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
