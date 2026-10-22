import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

// Estes testes usam um banco de verdade (DATABASE_URL_TESTE). Sem a variável, são pulados.
const urlTeste = process.env.DATABASE_URL_TESTE;

if (urlTeste && !new URL(urlTeste).pathname.slice(1).endsWith("_test")) {
  // Trava de segurança: nunca rodar testes em um banco que não seja de testes.
  throw new Error("DATABASE_URL_TESTE precisa apontar para um banco cujo nome termina em _test.");
}

// O que só existe dentro do servidor do Next é trocado por versões simples: o cookie que o navegador mandou e o redirect.
const { navegador } = vi.hoisted(() => ({ navegador: { cookie: undefined as string | undefined } }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nome: string) => (navegador.cookie && nome === "cenaculo-session" ? { value: navegador.cookie } : undefined) }),
}));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  },
}));

describe.skipIf(!urlTeste)("sessão conferida no banco (banco de testes)", () => {
  const sufixo = Date.now().toString(36);
  let prisma: PrismaClient;
  let auth: typeof import("./auth");
  let sessao: typeof import("./session");
  let n = 0;
  const idsCriados: string[] = [];

  const novaConta = async (extra: { papel?: string; ativo?: boolean; sessoesValidasDesde?: Date; nome?: string } = {}) => {
    const conta = await prisma.usuario.create({
      data: { nome: extra.nome ?? `s${sufixo}x${++n}`, senha: "x", papel: extra.papel ?? "COORDENACAO", ativo: extra.ativo ?? true, sessoesValidasDesde: extra.sessoesValidasDesde },
    });
    idsCriados.push(conta.id);
    return conta;
  };
  const entrarComo = async (id: string) => {
    navegador.cookie = await sessao.criarToken(id);
  };

  beforeEach(() => {
    navegador.cookie = undefined;
  });

  beforeAll(async () => {
    // O lib/prisma lê DATABASE_URL ao ser importado, então apontamos para o banco de testes antes.
    process.env.DATABASE_URL = urlTeste;
    process.env.SESSION_SECRET = "segredo-so-para-os-testes-0123456789abcdef";
    prisma = (await import("@/lib/prisma")).default;
    sessao = await import("./session");
    auth = await import("./auth");
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { id: { in: idsCriados } } });
    await prisma.$disconnect();
  });

  describe("lerSessao", () => {
    it("devolve a conta, o nome e o papel de quem está logado", async () => {
      const conta = await novaConta({ papel: "ADMIN" });
      await entrarComo(conta.id);
      expect(await auth.lerSessao()).toEqual({ sub: conta.id, nome: conta.nome, papel: "ADMIN" });
    });

    it("sem cookie, não há sessão", async () => {
      expect(await auth.lerSessao()).toBeNull();
    });

    it("conta desativada não tem sessão, mesmo com o cookie ainda dentro da validade", async () => {
      const conta = await novaConta();
      await entrarComo(conta.id);
      expect(await auth.lerSessao()).not.toBeNull();

      await prisma.usuario.update({ where: { id: conta.id }, data: { ativo: false } });
      expect(await auth.lerSessao()).toBeNull(); // vale na hora

      await prisma.usuario.update({ where: { id: conta.id }, data: { ativo: true } });
      expect(await auth.lerSessao()).not.toBeNull(); // reativar devolve o acesso
    });

    it("cookie de uma conta que não existe não vale", async () => {
      await entrarComo("00000000-0000-0000-0000-000000000000");
      expect(await auth.lerSessao()).toBeNull();
    });

    it("cookie emitido ANTES de uma redefinição de senha não vale; um emitido depois vale", async () => {
      const conta = await novaConta();
      await entrarComo(conta.id);
      expect(await auth.lerSessao()).not.toBeNull();

      await new Promise((resolver) => setTimeout(resolver, 5));
      await prisma.usuario.update({ where: { id: conta.id }, data: { sessoesValidasDesde: new Date() } });
      expect(await auth.lerSessao()).toBeNull(); // o cookie antigo foi derrubado

      await new Promise((resolver) => setTimeout(resolver, 5));
      await entrarComo(conta.id); // um novo login
      expect(await auth.lerSessao()).not.toBeNull();
    });

    it("o cookie guarda a conta, e não o nome: renomear não passa o acesso para quem pegar o nome antigo", async () => {
      const original = await novaConta();
      await entrarComo(original.id);
      const nomeAntigo = original.nome;

      await prisma.usuario.update({ where: { id: original.id }, data: { nome: `${nomeAntigo}-novo` } });
      const outra = await novaConta({ nome: nomeAntigo }); // outra pessoa fica com o nome antigo

      const atual = await auth.lerSessao();
      expect(atual?.sub).toBe(original.id); // continua sendo a mesma conta
      expect(atual?.sub).not.toBe(outra.id);
      expect(atual?.nome).toBe(`${nomeAntigo}-novo`);
    });
  });

  describe("exigirSessao", () => {
    it("deixa passar quem está logado e barra os outros", async () => {
      const conta = await novaConta();
      await entrarComo(conta.id);
      expect((await auth.exigirSessao()).sub).toBe(conta.id);

      navegador.cookie = undefined;
      await expect(auth.exigirSessao()).rejects.toThrow("Não autorizado");
    });

    it("barra conta desativada", async () => {
      const conta = await novaConta({ ativo: false });
      await entrarComo(conta.id);
      await expect(auth.exigirSessao()).rejects.toThrow("Não autorizado");
    });
  });

  describe("só o ADMIN", () => {
    it("exigirAdmin deixa o admin e barra a coordenação", async () => {
      const admin = await novaConta({ papel: "ADMIN" });
      await entrarComo(admin.id);
      expect((await auth.exigirAdmin()).papel).toBe("ADMIN");

      const coordenacao = await novaConta({ papel: "COORDENACAO" });
      await entrarComo(coordenacao.id);
      await expect(auth.exigirAdmin()).rejects.toThrow("Não autorizado");
    });

    it("exigirAdminPagina leva a coordenação de volta ao painel e quem não entrou ao login", async () => {
      const coordenacao = await novaConta({ papel: "COORDENACAO" });
      await entrarComo(coordenacao.id);
      await expect(auth.exigirAdminPagina()).rejects.toThrow("REDIRECT:/painelmmc");

      navegador.cookie = undefined;
      await expect(auth.exigirAdminPagina()).rejects.toThrow("REDIRECT:/painelmmc/login");
    });

  });
});
