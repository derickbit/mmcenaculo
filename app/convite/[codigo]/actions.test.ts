import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { EstadoAceite } from "./actions";

// Estes testes usam um banco de verdade (DATABASE_URL_TESTE). Sem a variável, são pulados.
const urlTeste = process.env.DATABASE_URL_TESTE;

if (urlTeste && !new URL(urlTeste).pathname.slice(1).endsWith("_test")) {
  // Trava de segurança: nunca rodar testes em um banco que não seja de testes.
  throw new Error("DATABASE_URL_TESTE precisa apontar para um banco cujo nome termina em _test.");
}

// O que só existe dentro do servidor do Next é trocado por versões simples: o IP da requisição, os cookies e o redirect.
const { origem, cookiesGravados } = vi.hoisted(() => ({
  origem: { ip: "" },
  cookiesGravados: [] as { nome: string; valor: string }[],
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": origem.ip }),
  cookies: async () => ({ set: (nome: string, valor: string) => cookiesGravados.push({ nome, valor }) }),
}));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  },
}));

describe.skipIf(!urlTeste)("aceitar convite pela página (banco de testes)", () => {
  const sufixo = Date.now().toString(36);
  const SENHA = "uma-senha-boa-123";
  let prisma: PrismaClient;
  let convites: typeof import("@/lib/convite");
  let sessao: typeof import("@/lib/session");
  let aceitar: (anterior: EstadoAceite, dados: FormData) => Promise<EstadoAceite>;
  let adminId: string;
  let n = 0;
  let ipN = 0;

  const form = (campos: Record<string, string>) => {
    const dados = new FormData();
    for (const [chave, valor] of Object.entries(campos)) dados.set(chave, valor);
    return dados;
  };
  const novoConvite = async () => {
    const r = await convites.criarConvite({ nomeUsuario: `c${sufixo}x${++n}`, criadoPorId: adminId });
    if (!r.ok) throw new Error(r.mensagem);
    return r;
  };

  beforeEach(() => {
    origem.ip = `ip-${sufixo}-${++ipN}`; // cada teste vem de um IP diferente, para não esbarrar no limite
    cookiesGravados.length = 0;
  });

  beforeAll(async () => {
    // O lib/prisma lê DATABASE_URL ao ser importado, então apontamos para o banco de testes antes.
    process.env.DATABASE_URL = urlTeste;
    process.env.SESSION_SECRET = "segredo-so-para-os-testes-0123456789abcdef";
    prisma = (await import("@/lib/prisma")).default;
    convites = await import("@/lib/convite");
    sessao = await import("@/lib/session");
    aceitar = (await import("./actions")).aceitarConviteAction;
    adminId = (await prisma.usuario.create({ data: { nome: `admin-${sufixo}`, senha: "x", papel: "ADMIN", primeiroAcesso: false } })).id;
  });

  afterAll(async () => {
    await prisma.convite.deleteMany({ where: { criadoPorId: adminId } });
    await prisma.usuario.deleteMany({ where: { nome: { startsWith: `c${sufixo}`, mode: "insensitive" } } });
    await prisma.limiteTentativa.deleteMany({ where: { chave: { startsWith: `convite:ip-${sufixo}-` } } });
    await prisma.usuario.delete({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it("cria a conta, entra no painel (cookie de sessão válido) e manda para /admin", async () => {
    const { codigo, convite } = await novoConvite();

    await expect(aceitar(null, form({ codigo, senha: SENHA, confirmacao: SENHA }))).rejects.toThrow("REDIRECT:/admin");

    expect(await prisma.usuario.count({ where: { nome: convite.nomeUsuario, papel: "COORDENACAO", ativo: true } })).toBe(1);

    expect(cookiesGravados).toHaveLength(1);
    const dados = await sessao.verificarToken(cookiesGravados[0].valor);
    expect(cookiesGravados[0].nome).toBe(sessao.COOKIE_SESSAO);
    expect(dados?.sub).toBe(convite.nomeUsuario);
    expect(dados?.pa).toBe(false); // sem pendência de troca de senha
  });

  it("senhas diferentes: avisa ao lado do campo e não gasta o convite", async () => {
    const { codigo } = await novoConvite();
    const resultado = await aceitar(null, form({ codigo, senha: SENHA, confirmacao: "outra-senha-boa-456" }));
    expect(resultado?.erros.confirmacao).toBeTruthy();
    expect((await convites.consultarConvite(codigo)).estado).toBe("VALIDO");
    expect(cookiesGravados).toHaveLength(0);
  });

  it("senha curta: avisa ao lado do campo e não gasta o convite", async () => {
    const { codigo } = await novoConvite();
    const resultado = await aceitar(null, form({ codigo, senha: "curta", confirmacao: "curta" }));
    expect(resultado?.erros.senha).toBeTruthy();
    expect((await convites.consultarConvite(codigo)).estado).toBe("VALIDO");
    expect(cookiesGravados).toHaveLength(0);
  });

  it("link inválido ou já usado: a mesma mensagem, sem conta e sem cookie", async () => {
    const errado = await aceitar(null, form({ codigo: "codigo-errado", senha: SENHA, confirmacao: SENHA }));
    expect(errado?.mensagem).toMatch(/inválido ou expirou/);

    const { codigo } = await novoConvite();
    await expect(aceitar(null, form({ codigo, senha: SENHA, confirmacao: SENHA }))).rejects.toThrow("REDIRECT:/admin");
    cookiesGravados.length = 0;

    const reuso = await aceitar(null, form({ codigo, senha: "outra-senha-boa-456", confirmacao: "outra-senha-boa-456" }));
    expect(reuso?.mensagem).toMatch(/inválido ou expirou/);
    expect(cookiesGravados).toHaveLength(0);
  });

  it("a 11ª tentativa do mesmo IP é recusada, mesmo com um convite válido, que continua livre", async () => {
    const { codigo } = await novoConvite();
    origem.ip = `ip-${sufixo}-limite`;
    for (let i = 0; i < 10; i++) await aceitar(null, form({ codigo: "codigo-errado", senha: SENHA, confirmacao: SENHA }));

    const recusada = await aceitar(null, form({ codigo, senha: SENHA, confirmacao: SENHA }));
    expect(recusada?.mensagem).toMatch(/Muitas tentativas/);
    expect(cookiesGravados).toHaveLength(0);
    expect((await convites.consultarConvite(codigo)).estado).toBe("VALIDO");

    origem.ip = `ip-${sufixo}-outro`; // outro IP não é afetado
    await expect(aceitar(null, form({ codigo, senha: SENHA, confirmacao: SENHA }))).rejects.toThrow("REDIRECT:/admin");
  });
});
