import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { EstadoListaEspera } from "./actions";

// Estes testes usam um banco de verdade (DATABASE_URL_TESTE). Sem a variável, são pulados.
const urlTeste = process.env.DATABASE_URL_TESTE;

if (urlTeste && !new URL(urlTeste).pathname.slice(1).endsWith("_test")) {
  // Trava de segurança: nunca rodar testes em um banco que não seja de testes.
  throw new Error("DATABASE_URL_TESTE precisa apontar para um banco cujo nome termina em _test.");
}

// A ação lê o IP dos cabeçalhos da requisição; no teste, escolhemos o IP de cada caso.
const { origem } = vi.hoisted(() => ({ origem: { ip: "" } }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": origem.ip }),
}));

describe.skipIf(!urlTeste)("salvarPreCadastro (banco de testes)", () => {
  const sufixo = Date.now().toString(36);
  let prisma: PrismaClient;
  let salvarPreCadastro: (estado: EstadoListaEspera | null, formData: FormData) => Promise<EstadoListaEspera>;

  // Como o formulário manda: os campos e o horário em que foi aberto (aqui, há 10 segundos).
  const form = (campos: Record<string, string>) => {
    const dados = new FormData();
    for (const [chave, valor] of Object.entries({ abertoEm: String(Date.now() - 10_000), ...campos })) dados.set(chave, valor);
    return dados;
  };
  const enviar = (campos: Record<string, string>) => salvarPreCadastro(null, form(campos));

  const lista = (extra: Record<string, string> = {}) => ({
    nome: "Maria da Silva",
    email: `lista.${sufixo}@teste.com`,
    telefone: "(53) 99999-9999",
    tipo: "CENACULO",
    ...extra,
  });

  const quantos = (email: string) => prisma.preCadastro.count({ where: { email } });

  // Cada teste vem de um IP diferente, para não esbarrar no limite de tentativas.
  let ipN = 0;
  beforeEach(() => {
    origem.ip = `ip-${sufixo}-${++ipN}`;
  });

  beforeAll(async () => {
    // O lib/prisma lê DATABASE_URL ao ser importado, então apontamos para o banco de testes antes.
    process.env.DATABASE_URL = urlTeste;
    prisma = (await import("@/lib/prisma")).default;
    salvarPreCadastro = (await import("./actions")).salvarPreCadastro;
  });

  afterAll(async () => {
    await prisma.preCadastro.deleteMany({ where: { email: { endsWith: `${sufixo}@teste.com` } } });
    await prisma.limiteTentativa.deleteMany({ where: { chave: { startsWith: `precadastro:ip-${sufixo}-` } } });
    await prisma.$disconnect();
  });

  it("grava e normaliza o e-mail", async () => {
    expect(await enviar(lista({ email: `  LISTA.${sufixo}@Teste.COM ` }))).toEqual({ status: "ok" });
    expect(await quantos(`lista.${sufixo}@teste.com`)).toBe(1);
  });

  it("repetir o mesmo e-mail e retiro não cria outra linha, mas responde igual", async () => {
    const entrada = lista({ email: `repetido.${sufixo}@teste.com` });
    expect(await enviar(entrada)).toEqual({ status: "ok" });
    expect(await enviar(entrada)).toEqual({ status: "ok" });
    expect(await quantos(entrada.email)).toBe(1);
  });

  it("o mesmo e-mail pode entrar na lista de outro retiro", async () => {
    const email = `dois.${sufixo}@teste.com`;
    expect((await enviar(lista({ email, tipo: "CENACULO" }))).status).toBe("ok");
    expect((await enviar(lista({ email, tipo: "KIDS" }))).status).toBe("ok");
    expect(await quantos(email)).toBe(2);
  });

  it("dados inválidos não gravam nada e devolvem o aviso de cada campo, para a pessoa corrigir só ele", async () => {
    const casos: [Record<string, string>, string][] = [
      [lista({ email: `ruim1.${sufixo}@teste.com`, tipo: "QUALQUER" }), "tipo"],
      [lista({ email: `ruim2.${sufixo}@teste.com`, telefone: "123" }), "telefone"],
      [lista({ email: `ruim3.${sufixo}@teste.com`, nome: "x".repeat(121) }), "nome"],
      [lista({ email: "isso-nao-e-email" }), "email"],
    ];
    for (const [entrada, campo] of casos) {
      const resultado = await enviar(entrada);
      expect(resultado.status).toBe("erro");
      if (resultado.status === "erro") expect(resultado.erros[campo]).toBeTruthy();
      expect(await quantos(entrada.email)).toBe(0);
    }
  });

  it("a 6ª tentativa do mesmo IP é recusada e não grava nada, mesmo com dados válidos", async () => {
    origem.ip = `ip-${sufixo}-limite`;
    for (let i = 0; i < 5; i++) expect((await enviar(lista({ email: `limite${i}.${sufixo}@teste.com` }))).status).toBe("ok");

    const sexta = lista({ email: `limite5.${sufixo}@teste.com` });
    const recusada = await enviar(sexta);
    expect(recusada.status).toBe("erro");
    if (recusada.status === "erro") expect(recusada.mensagem).toMatch(/Muitas tentativas/);
    expect(await quantos(sexta.email)).toBe(0);

    origem.ip = `ip-${sufixo}-outro`; // outro IP não é afetado
    expect((await enviar(sexta)).status).toBe("ok");
  });

  it("robô (campo escondido preenchido ou envio rápido demais): finge sucesso e não grava", async () => {
    const preenchido = lista({ email: `robo1.${sufixo}@teste.com`, website: "http://spam.example" });
    expect(await enviar(preenchido)).toEqual({ status: "ok" });
    expect(await quantos(preenchido.email)).toBe(0);

    const rapido = lista({ email: `robo2.${sufixo}@teste.com`, abertoEm: String(Date.now() - 500) });
    expect(await enviar(rapido)).toEqual({ status: "ok" });
    expect(await quantos(rapido.email)).toBe(0);
  });

  it("pessoa de verdade passa: campo escondido vazio e formulário aberto há mais de 1 segundo", async () => {
    const entrada = lista({ email: `gente.${sufixo}@teste.com`, website: "" });
    expect(await enviar(entrada)).toEqual({ status: "ok" });
    expect(await quantos(entrada.email)).toBe(1);
  });

  it("sem o horário de abertura (envio direto, sem o formulário), finge sucesso e não grava", async () => {
    const dados = new FormData();
    for (const [chave, valor] of Object.entries(lista({ email: `direto.${sufixo}@teste.com` }))) dados.set(chave, valor);
    expect(await salvarPreCadastro(null, dados)).toEqual({ status: "ok" });
    expect(await quantos(`direto.${sufixo}@teste.com`)).toBe(0);
  });
});
