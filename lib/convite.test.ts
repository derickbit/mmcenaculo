import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

// Estes testes usam um banco de verdade (DATABASE_URL_TESTE). Sem a variável, são pulados.
const urlTeste = process.env.DATABASE_URL_TESTE;

if (urlTeste && !new URL(urlTeste).pathname.slice(1).endsWith("_test")) {
  // Trava de segurança: nunca rodar testes em um banco que não seja de testes.
  throw new Error("DATABASE_URL_TESTE precisa apontar para um banco cujo nome termina em _test.");
}

describe.skipIf(!urlTeste)("convites (banco de testes)", () => {
  const sufixo = Date.now().toString(36);
  const SENHA = "uma-senha-boa-123";
  let prisma: PrismaClient;
  let convite: typeof import("./convite");
  let regras: typeof import("./convite-regras");
  let adminId: string;
  let n = 0;
  const nome = () => `u${sufixo}x${++n}`;

  const novo = async (extra: { nomeUsuario?: string; agora?: Date } = {}) => {
    const resultado = await convite.criarConvite({ nomeUsuario: extra.nomeUsuario ?? nome(), criadoPorId: adminId, agora: extra.agora });
    if (!resultado.ok) throw new Error(`nao criou o convite: ${resultado.mensagem}`);
    return resultado;
  };

  beforeAll(async () => {
    // O lib/prisma lê DATABASE_URL ao ser importado, então apontamos para o banco de testes antes.
    process.env.DATABASE_URL = urlTeste;
    prisma = (await import("@/lib/prisma")).default;
    convite = await import("./convite");
    regras = await import("./convite-regras");
    adminId = (await prisma.usuario.create({ data: { nome: `admin-${sufixo}`, senha: "x", papel: "ADMIN", primeiroAcesso: false } })).id;
  });

  afterAll(async () => {
    // Convites primeiro (apontam para usuários); depois os usuários criados nos testes.
    await prisma.convite.deleteMany({ where: { nomeUsuario: { startsWith: `u${sufixo}` } } });
    // sem diferenciar maiúsculas: um teste cria o mesmo nome em maiúsculas
    await prisma.usuario.deleteMany({ where: { nome: { startsWith: `u${sufixo}`, mode: "insensitive" } } });
    await prisma.convite.deleteMany({ where: { criadoPorId: adminId } });
    await prisma.usuario.delete({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  describe("criar", () => {
    it("gera um código, guarda só o hash e o usuário escolhido, e vale 48 horas", async () => {
      const agora = new Date("2026-11-01T12:00:00Z");
      const usuario = nome();
      const { codigo, convite: criado } = await novo({ nomeUsuario: usuario, agora });

      expect(codigo.length).toBeGreaterThanOrEqual(43);
      expect(criado.nomeUsuario).toBe(usuario);
      expect(criado.codigoHash).toBe(regras.hashDoCodigo(codigo));
      expect(criado.codigoHash).not.toContain(codigo); // o código em si nunca fica no banco
      expect(criado.expiraEm.getTime() - agora.getTime()).toBe(48 * 3600 * 1000);
      expect(criado.criadoPorId).toBe(adminId);

      const linhaDoBanco = JSON.stringify(await prisma.convite.findUniqueOrThrow({ where: { id: criado.id } }));
      expect(linhaDoBanco).not.toContain(codigo);
    });

    it("recusa usuário inválido", async () => {
      for (const ruim of ["ab", "com espaço", "joão"]) {
        const r = await convite.criarConvite({ nomeUsuario: ruim, criadoPorId: adminId });
        expect(r.ok === false && r.motivo).toBe("NOME_INVALIDO");
      }
    });

    it("recusa usuário que já existe, sem diferenciar maiúsculas de minúsculas", async () => {
      const r = await convite.criarConvite({ nomeUsuario: `ADMIN-${sufixo}`, criadoPorId: adminId });
      expect(r.ok === false && r.motivo).toBe("NOME_EM_USO");
    });

    it("recusa um segundo convite pendente para o mesmo usuário, mas aceita depois de revogar", async () => {
      const usuario = nome();
      const primeiro = await novo({ nomeUsuario: usuario });
      const repetido = await convite.criarConvite({ nomeUsuario: usuario.toUpperCase(), criadoPorId: adminId });
      expect(repetido.ok === false && repetido.motivo).toBe("CONVITE_PENDENTE");

      expect(await convite.revogarConvite(primeiro.convite.id)).toBe(true);
      expect((await convite.criarConvite({ nomeUsuario: usuario, criadoPorId: adminId })).ok).toBe(true);
    });

    it("aceita outro convite para o usuário depois que o anterior venceu", async () => {
      const usuario = nome();
      await novo({ nomeUsuario: usuario, agora: new Date(Date.now() - 49 * 3600 * 1000) }); // já venceu
      expect((await convite.criarConvite({ nomeUsuario: usuario, criadoPorId: adminId })).ok).toBe(true);
    });
  });

  describe("consultar", () => {
    it("reconhece convite válido, inexistente, vencido, usado e revogado", async () => {
      const valido = await novo();
      expect((await convite.consultarConvite(valido.codigo)).estado).toBe("VALIDO");

      expect((await convite.consultarConvite("codigo-que-nao-existe")).estado).toBe("INEXISTENTE");
      expect((await convite.consultarConvite("")).estado).toBe("INEXISTENTE");
      expect((await convite.consultarConvite("x".repeat(500))).estado).toBe("INEXISTENTE");

      const vencido = await novo({ agora: new Date(Date.now() - 49 * 3600 * 1000) });
      expect((await convite.consultarConvite(vencido.codigo)).estado).toBe("EXPIRADO");

      const revogado = await novo();
      await convite.revogarConvite(revogado.convite.id);
      expect((await convite.consultarConvite(revogado.codigo)).estado).toBe("REVOGADO");

      const usado = await novo();
      await convite.aceitarConvite(usado.codigo, SENHA);
      expect((await convite.consultarConvite(usado.codigo)).estado).toBe("USADO");
    });
  });

  describe("aceitar", () => {
    it("cria a conta COORDENACAO com o usuário reservado e a senha em hash, e marca o convite como usado", async () => {
      const usuario = nome();
      const { codigo, convite: criado } = await novo({ nomeUsuario: usuario });

      const r = await convite.aceitarConvite(codigo, SENHA);
      expect(r.ok).toBe(true);

      const conta = await prisma.usuario.findUniqueOrThrow({ where: { nome: usuario } });
      expect(conta.papel).toBe("COORDENACAO");
      expect(conta.ativo).toBe(true);
      expect(conta.primeiroAcesso).toBe(false);
      expect(conta.senha).not.toContain(SENHA);
      expect(await bcrypt.compare(SENHA, conta.senha)).toBe(true);

      const gasto = await prisma.convite.findUniqueOrThrow({ where: { id: criado.id } });
      expect(gasto.usadoEm).toBeTruthy();
      expect(gasto.usadoPorId).toBe(conta.id);
    });

    it("o mesmo convite não funciona duas vezes", async () => {
      const { codigo } = await novo();
      expect((await convite.aceitarConvite(codigo, SENHA)).ok).toBe(true);
      const segunda = await convite.aceitarConvite(codigo, "outra-senha-boa-456");
      expect(segunda.ok === false && segunda.motivo).toBe("INVALIDO");
    });

    it("convite vencido ou revogado não funciona", async () => {
      const vencido = await novo({ agora: new Date(Date.now() - 49 * 3600 * 1000) });
      expect((await convite.aceitarConvite(vencido.codigo, SENHA)).ok).toBe(false);
      expect(await prisma.usuario.count({ where: { nome: vencido.convite.nomeUsuario } })).toBe(0);

      const revogado = await novo();
      await convite.revogarConvite(revogado.convite.id);
      expect((await convite.aceitarConvite(revogado.codigo, SENHA)).ok).toBe(false);
      expect(await prisma.usuario.count({ where: { nome: revogado.convite.nomeUsuario } })).toBe(0);
    });

    it("código errado não cria nada", async () => {
      const r = await convite.aceitarConvite("codigo-errado", SENHA);
      expect(r.ok === false && r.motivo).toBe("INVALIDO");
    });

    it("senha fraca é recusada e o convite continua livre para tentar de novo", async () => {
      const { codigo } = await novo();
      const fraca = await convite.aceitarConvite(codigo, "curta");
      expect(fraca.ok === false && fraca.motivo).toBe("SENHA_INVALIDA");
      expect((await convite.consultarConvite(codigo)).estado).toBe("VALIDO");
      expect((await convite.aceitarConvite(codigo, SENHA)).ok).toBe(true);
    });

    it("se o usuário foi ocupado no meio do caminho, recusa sem gastar o convite", async () => {
      const usuario = nome();
      const { codigo } = await novo({ nomeUsuario: usuario });
      await prisma.usuario.create({ data: { nome: usuario.toUpperCase(), senha: "x", primeiroAcesso: false } }); // alguém tomou o nome

      const r = await convite.aceitarConvite(codigo, SENHA);
      expect(r.ok === false && r.motivo).toBe("NOME_EM_USO");
      expect((await convite.consultarConvite(codigo)).estado).toBe("VALIDO"); // transação desfeita
    });

    it("vários cliques ao mesmo tempo no mesmo link criam no máximo uma conta", async () => {
      const usuario = nome();
      const { codigo } = await novo({ nomeUsuario: usuario });

      const respostas = await Promise.all(Array.from({ length: 6 }, () => convite.aceitarConvite(codigo, SENHA)));
      expect(respostas.filter((r) => r.ok)).toHaveLength(1);
      expect(respostas.filter((r) => !r.ok)).toHaveLength(5);
      expect(await prisma.usuario.count({ where: { nome: usuario } })).toBe(1);
    });
  });

  describe("revogar", () => {
    it("revoga um convite livre, mas não um já usado nem um já revogado", async () => {
      const livre = await novo();
      expect(await convite.revogarConvite(livre.convite.id)).toBe(true);
      expect(await convite.revogarConvite(livre.convite.id)).toBe(false); // já revogado

      const usado = await novo();
      await convite.aceitarConvite(usado.codigo, SENHA);
      expect(await convite.revogarConvite(usado.convite.id)).toBe(false);
    });
  });
});
