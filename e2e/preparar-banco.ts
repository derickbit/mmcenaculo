// Cria o banco do e2e (se ainda não existir) e aplica as migrations nele. Roda antes de o servidor de teste subir.
import { execSync } from "node:child_process";
import { Client } from "pg";
import { urlBancoAdministrativo, urlBancoE2E } from "./ambiente";

async function principal() {
  const alvo = urlBancoE2E();
  const nome = new URL(alvo).pathname.slice(1);
  if (!nome.endsWith("_test")) throw new Error("O banco do e2e precisa terminar em _test.");

  const admin = new Client({ connectionString: urlBancoAdministrativo() });
  await admin.connect();
  try {
    const existe = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [nome]);
    if (existe.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${nome}"`);
      console.log(`Banco ${nome} criado.`);
    }
  } finally {
    await admin.end();
  }

  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: alvo } });
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
