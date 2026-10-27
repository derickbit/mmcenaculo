// Banco e dados fixos dos testes de ponta a ponta.

const NOME_BANCO_E2E = "cenaculodb_e2e_test"; // termina em _test, como exige a trava dos outros testes de banco

function carregarEnv() {
  try {
    process.loadEnvFile(".env"); // não sobrescreve variáveis que já existam (no CI elas vêm do ambiente)
  } catch {
    // sem .env
  }
}

function urlComBanco(base: string, banco: string): string {
  const url = new URL(base);
  url.pathname = `/${banco}`;
  return url.toString();
}

// Mesmo servidor e usuário do banco de testes (DATABASE_URL_TESTE), mas num banco só do e2e.
export function urlBancoE2E(): string {
  carregarEnv();
  const base = process.env.DATABASE_URL_TESTE;
  if (!base) throw new Error("DATABASE_URL_TESTE não está definida (nem no ambiente, nem no .env): é daí que o e2e tira o servidor do banco.");
  return urlComBanco(base, NOME_BANCO_E2E);
}

// Conexão ao banco "postgres" do mesmo servidor (para poder criar o banco do e2e).
export function urlBancoAdministrativo(): string {
  carregarEnv();
  const base = process.env.DATABASE_URL_TESTE;
  if (!base) throw new Error("DATABASE_URL_TESTE não está definida.");
  return urlComBanco(base, "postgres");
}

export const ADMIN = { nome: "admin-e2e", senha: "senha-do-admin-e2e-123" };
