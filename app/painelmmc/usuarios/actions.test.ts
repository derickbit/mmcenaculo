import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

// Estes testes usam um banco de verdade (DATABASE_URL_TESTE). Sem a variável, são pulados.
const urlTeste = process.env.DATABASE_URL_TESTE;

if (urlTeste && !new URL(urlTeste).pathname.slice(1).endsWith("_test")) {
  // Trava de segurança: nunca rodar testes em um banco que não seja de testes.
  throw new Error("DATABASE_URL_TESTE precisa apontar para um banco cujo nome termina em _test.");
}

// Quem está logado em cada teste. Que o exigirAdmin de verdade barra a coordenação é testado em lib/auth.test.ts;
// aqui o foco é: as ações CHAMAM o exigirAdmin antes de qualquer coisa, e fazem o que dizem quando o ADMIN pede.
type Quem = { sub: string; papel: string } | null;
const { login } = vi.hoisted(() => ({ login: { atual: null as Quem } }));
vi.mock("@/lib/auth", () => ({
  exigirAdmin: async () => {
    if (!login.atual || login.atual.papel !== "ADMIN") throw new Error("Não autorizado");
    return { sub: login.atual.sub, nome: "admin", papel: "ADMIN" };
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe.skipIf(!urlTeste)("ações da tela de usuários (banco de testes)", () => {
  const sufixo = Date.now().toString(36);
  const SENHA = "senha-antiga-123";
  let prisma: PrismaClient;
  let acoes: typeof import("./actions");
  let convites: typeof import("@/lib/convite");
  let adminId: string;
  let n = 0;
  const nome = () => `a${sufixo}x${++n}`;

  const novaConta = (extra: { ativo?: boolean; papel?: string } = {}) =>
    prisma.usuario.create({ data: { nome: nome(), senha: bcrypt.hashSync(SENHA, 4), ...extra } });
  const comoAdmin = () => {
    login.atual = { sub: adminId, papel: "ADMIN" };
  };
  const comoCoordenacao = async () => {
    login.atual = { sub: (await novaConta()).id, papel: "COORDENACAO" };
  };

  beforeEach(() => {
    login.atual = null;
  });

  beforeAll(async () => {
    // O lib/prisma lê DATABASE_URL ao ser importado, então apontamos para o banco de testes antes.
    process.env.DATABASE_URL = urlTeste;
    prisma = (await import("@/lib/prisma")).default;
    acoes = await import("./actions");
    convites = await import("@/lib/convite");
    adminId = (await prisma.usuario.create({ data: { nome: `admin-a${sufixo}`, senha: "x", papel: "ADMIN" } })).id;
  });

  afterAll(async () => {
    await prisma.convite.deleteMany({ where: { criadoPorId: adminId } });
    await prisma.usuario.deleteMany({ where: { nome: { startsWith: `a${sufixo}`, mode: "insensitive" } } });
    await prisma.usuario.delete({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  describe("quem pode usar", () => {
    it("sem login ou como coordenação, NENHUMA ação funciona e nada muda no banco", async () => {
      comoAdmin();
      const alvo = await novaConta();
      const pendente = await convites.criarConvite({ nomeUsuario: nome(), criadoPorId: adminId });
      if (!pendente.ok) throw new Error(pendente.mensagem);
      const convitesAntes = await prisma.convite.count({ where: { criadoPorId: adminId } });

      for (const quem of ["ninguem", "coordenacao"] as const) {
        if (quem === "ninguem") login.atual = null;
        else await comoCoordenacao();

        await expect(acoes.gerarConvite(nome())).rejects.toThrow("Não autorizado");
        await expect(acoes.redefinirSenha(alvo.id)).rejects.toThrow("Não autorizado");
        await expect(acoes.revogar(pendente.convite.id)).rejects.toThrow("Não autorizado");
        await expect(acoes.renomear(alvo.id, nome())).rejects.toThrow("Não autorizado");
        await expect(acoes.desativar(alvo.id)).rejects.toThrow("Não autorizado");
        await expect(acoes.reativar(alvo.id)).rejects.toThrow("Não autorizado");
      }

      const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: alvo.id } });
      expect(depois.nome).toBe(alvo.nome);
      expect(depois.ativo).toBe(true);
      expect(await bcrypt.compare(SENHA, depois.senha)).toBe(true); // a senha continua a mesma
      expect(await prisma.convite.count({ where: { criadoPorId: adminId } })).toBe(convitesAntes); // nenhum convite novo
      expect((await convites.consultarConvite(pendente.codigo)).estado).toBe("VALIDO"); // e o pendente não foi revogado
    });
  });

  describe("como ADMIN", () => {
    it("gerarConvite devolve o link (código) uma vez, para o usuário escolhido, e registra quem criou", async () => {
      comoAdmin();
      const usuario = nome();
      const r = await acoes.gerarConvite(usuario);
      expect(r.ok).toBe(true);
      if (!r.ok) return;

      expect(r.usuario).toBe(usuario);
      expect(r.tipo).toBe("NOVA_CONTA");
      expect(r.codigo.length).toBeGreaterThanOrEqual(43);
      expect(new Date(r.expiraEm).getTime() - Date.now()).toBeGreaterThan(47 * 3600 * 1000);
      expect((await convites.consultarConvite(r.codigo)).convite?.criadoPorId).toBe(adminId);
    });

    it("gerarConvite recusa nome inválido, com a mensagem para mostrar na tela", async () => {
      comoAdmin();
      const r = await acoes.gerarConvite("com espaço");
      expect(r.ok === false && r.mensagem).toMatch(/Use só letras/);
    });

    it("redefinirSenha devolve o link e a senha antiga para de funcionar; recusa a conta de administrador", async () => {
      comoAdmin();
      const alvo = await novaConta();
      const r = await acoes.redefinirSenha(alvo.id);
      expect(r.ok && r.tipo).toBe("REDEFINICAO");
      expect(await bcrypt.compare(SENHA, (await prisma.usuario.findUniqueOrThrow({ where: { id: alvo.id } })).senha)).toBe(false);

      const doAdmin = await acoes.redefinirSenha(adminId);
      expect(doAdmin.ok).toBe(false);
    });

    it("revogar cancela o convite pendente, e não revoga duas vezes", async () => {
      comoAdmin();
      const r = await acoes.gerarConvite(nome());
      if (!r.ok) throw new Error(r.mensagem);
      const { convite } = await convites.consultarConvite(r.codigo);

      expect((await acoes.revogar(convite!.id)).ok).toBe(true);
      expect((await convites.consultarConvite(r.codigo)).estado).toBe("REVOGADO");
      expect((await acoes.revogar(convite!.id)).ok).toBe(false);
    });

    it("renomear, desativar e reativar funcionam na conta de coordenação e recusam a de administrador", async () => {
      comoAdmin();
      const alvo = await novaConta();

      const novo = `a${sufixo}-novo${++n}`;
      expect((await acoes.renomear(alvo.id, novo)).ok).toBe(true);
      expect((await prisma.usuario.findUniqueOrThrow({ where: { id: alvo.id } })).nome).toBe(novo);

      expect((await acoes.desativar(alvo.id)).ok).toBe(true);
      expect((await prisma.usuario.findUniqueOrThrow({ where: { id: alvo.id } })).ativo).toBe(false);
      expect((await acoes.reativar(alvo.id)).ok).toBe(true);
      expect((await prisma.usuario.findUniqueOrThrow({ where: { id: alvo.id } })).ativo).toBe(true);

      expect((await acoes.desativar(adminId)).ok).toBe(false);
      expect((await acoes.renomear(adminId, nome())).ok).toBe(false);
      expect((await prisma.usuario.findUniqueOrThrow({ where: { id: adminId } })).ativo).toBe(true);
    });
  });
});
