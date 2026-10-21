import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

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

// O redirect do Next lança uma exceção especial; aqui lançamos um erro simples com o destino, para o teste ler.
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  },
}));

describe.skipIf(!urlTeste)("salvarPreCadastro (banco de testes)", () => {
  const sufixo = Date.now().toString(36);
  let prisma: PrismaClient;
  let salvarPreCadastro: (formData: FormData) => Promise<void>;

  const form = (campos: Record<string, string>) => {
    const dados = new FormData();
    for (const [chave, valor] of Object.entries(campos)) dados.set(chave, valor);
    return dados;
  };

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

  it("grava, normaliza o e-mail e manda para a tela de sucesso", async () => {
    await expect(salvarPreCadastro(form(lista({ email: `  LISTA.${sufixo}@Teste.COM ` })))).rejects.toThrow(
      "REDIRECT:/inscricao?sucessoPre=true"
    );
    expect(await quantos(`lista.${sufixo}@teste.com`)).toBe(1);
  });

  it("repetir o mesmo e-mail e retiro não cria outra linha, mas responde igual", async () => {
    const entrada = lista({ email: `repetido.${sufixo}@teste.com` });
    await expect(salvarPreCadastro(form(entrada))).rejects.toThrow("REDIRECT:/inscricao?sucessoPre=true");
    await expect(salvarPreCadastro(form(entrada))).rejects.toThrow("REDIRECT:/inscricao?sucessoPre=true");
    expect(await quantos(entrada.email)).toBe(1);
  });

  it("o mesmo e-mail pode entrar na lista de outro retiro", async () => {
    const email = `dois.${sufixo}@teste.com`;
    await expect(salvarPreCadastro(form(lista({ email, tipo: "CENACULO" })))).rejects.toThrow("sucessoPre");
    await expect(salvarPreCadastro(form(lista({ email, tipo: "KIDS" })))).rejects.toThrow("sucessoPre");
    expect(await quantos(email)).toBe(2);
  });

  it("dados inválidos não gravam nada e voltam com o aviso de erro", async () => {
    const casos = [
      lista({ email: `ruim1.${sufixo}@teste.com`, tipo: "QUALQUER" }),
      lista({ email: `ruim2.${sufixo}@teste.com`, telefone: "123" }),
      lista({ email: `ruim3.${sufixo}@teste.com`, nome: "x".repeat(121) }),
      lista({ email: "isso-nao-e-email" }),
    ];
    for (const caso of casos) {
      await expect(salvarPreCadastro(form(caso))).rejects.toThrow("REDIRECT:/inscricao?erroPre=1");
      expect(await quantos(caso.email)).toBe(0);
    }
  });

  it("a 6ª tentativa do mesmo IP é recusada e não grava nada, mesmo com dados válidos", async () => {
    origem.ip = `ip-${sufixo}-limite`;
    for (let i = 0; i < 5; i++) {
      await expect(salvarPreCadastro(form(lista({ email: `limite${i}.${sufixo}@teste.com` })))).rejects.toThrow("sucessoPre");
    }
    const sexta = lista({ email: `limite5.${sufixo}@teste.com` });
    await expect(salvarPreCadastro(form(sexta))).rejects.toThrow("REDIRECT:/inscricao?erroPre=limite");
    expect(await quantos(sexta.email)).toBe(0);

    origem.ip = `ip-${sufixo}-outro`; // outro IP não é afetado
    await expect(salvarPreCadastro(form(sexta))).rejects.toThrow("sucessoPre");
  });

  it("robô (campo escondido preenchido ou envio rápido demais): finge sucesso e não grava", async () => {
    const preenchido = lista({ email: `robo1.${sufixo}@teste.com`, website: "http://spam.example" });
    await expect(salvarPreCadastro(form(preenchido))).rejects.toThrow("REDIRECT:/inscricao?sucessoPre=true");
    expect(await quantos(preenchido.email)).toBe(0);

    const rapido = lista({ email: `robo2.${sufixo}@teste.com`, abertoEm: String(Date.now() - 500) });
    await expect(salvarPreCadastro(form(rapido))).rejects.toThrow("REDIRECT:/inscricao?sucessoPre=true");
    expect(await quantos(rapido.email)).toBe(0);
  });

  it("pessoa de verdade passa: campo escondido vazio e formulário aberto há mais de 1 segundo", async () => {
    const entrada = lista({ email: `gente.${sufixo}@teste.com`, website: "", abertoEm: String(Date.now() - 10_000) });
    await expect(salvarPreCadastro(form(entrada))).rejects.toThrow("REDIRECT:/inscricao?sucessoPre=true");
    expect(await quantos(entrada.email)).toBe(1);
  });

  it("sem o horário de abertura (formulário sem JavaScript) ainda grava normalmente", async () => {
    const entrada = lista({ email: `semjs.${sufixo}@teste.com` });
    await expect(salvarPreCadastro(form(entrada))).rejects.toThrow("sucessoPre");
    expect(await quantos(entrada.email)).toBe(1);
  });
});
