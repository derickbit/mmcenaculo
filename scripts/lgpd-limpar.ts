// Script de terminal: apaga os dados pessoais que passaram do prazo de guarda (1 ano; ver lib/privacidade.ts e docs/LGPD.md).
//
//   npm run lgpd:limpar                 só MOSTRA o que seria apagado (não apaga nada)
//   npm run lgpd:limpar -- --apagar     apaga, depois de mostrar e pedir confirmação
//
// Antes de apagar na produção, faça um backup (npm run backup). O banco usado é o DATABASE_URL do ambiente, ou o do arquivo .env;
// para a produção, defina o DATABASE_URL só naquele terminal. O script mostra qual banco é.

import * as readline from "node:readline/promises";

async function perguntar(texto: string): Promise<string> {
  const leitor = readline.createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await leitor.question(texto);
  leitor.close();
  return resposta;
}

const data = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

async function principal(): Promise<number> {
  const apagar = process.argv.includes("--apagar");

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
  const { apagarVencidos, levantarVencidos } = await import("../lib/retencao");

  try {
    const vencidos = await levantarVencidos(prisma);
    console.log(`\nPrazo de guarda vencido (anterior a ${data(vencidos.limite)}):`);
    if (vencidos.eventos.length === 0) console.log("  Nenhum evento com mais de 1 ano.");
    for (const e of vencidos.eventos) console.log(`  Evento: ${e.nome} (terminou em ${data(e.fim)})`);
    console.log(`  Inscrições de adultos: ${vencidos.inscricoes}`);
    console.log(`  Inscrições Kids:       ${vencidos.inscricoesKids}`);
    console.log(`  Notas internas:        ${vencidos.notas} (saem junto com as inscrições)`);
    console.log(`  Lista de espera:       ${vencidos.preCadastros}`);

    const total = vencidos.inscricoes + vencidos.inscricoesKids + vencidos.preCadastros;
    if (total === 0) {
      console.log("\nNada para apagar.");
      return 0;
    }
    if (!apagar) {
      console.log("\nNada foi apagado. Para apagar de verdade: npm run lgpd:limpar -- --apagar");
      return 0;
    }

    const confirmou = (await perguntar("\nApagar isso para sempre? Já fez o backup? Digite sim para continuar: ")).trim().toLowerCase();
    if (confirmou !== "sim") {
      console.log("Cancelado. Nada foi alterado.");
      return 1;
    }
    await apagarVencidos(prisma);
    console.log("\nApagado. Lembre-se: os arquivos de backup antigos (pasta backups/ e cópias) ainda têm esses dados; apague os que passaram de 1 ano.");
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
