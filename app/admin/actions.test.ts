import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

// Estes testes usam um banco de verdade (DATABASE_URL_TESTE). Sem a variável, são pulados.
const urlTeste = process.env.DATABASE_URL_TESTE;

if (urlTeste && !new URL(urlTeste).pathname.slice(1).endsWith("_test")) {
  // Trava de segurança: nunca rodar testes em um banco que não seja de testes.
  throw new Error("DATABASE_URL_TESTE precisa apontar para um banco cujo nome termina em _test.");
}

// A sessão e o revalidatePath do Next não existem fora do servidor: trocamos por versões simples.
const { sessao } = vi.hoisted(() => ({ sessao: { sub: "" } }));
vi.mock("@/lib/auth", () => ({
  // sub vazio = ninguém logado
  exigirSessao: async () => {
    if (!sessao.sub) throw new Error("Não autorizado");
    return { sub: sessao.sub, pa: false, exp: 0 };
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe.skipIf(!urlTeste)("adicionarNota (banco de testes)", () => {
  const sufixo = Date.now().toString(36);
  let prisma: PrismaClient;
  let adicionarNota: (inscricaoId: string, formData: FormData) => Promise<void>;
  let adicionarNotaKids: (inscricaoKidsId: string, formData: FormData) => Promise<void>;
  let excluirInscricaoKids: (formData: FormData) => Promise<void>;
  let usuarioId: string;
  let eventoId: string;
  let inscricaoId: string;
  let eventoKidsId: string;
  let inscricaoKidsId: string;

  const form = (texto: string) => {
    const dados = new FormData();
    dados.set("texto", texto);
    return dados;
  };

  const novaInscricaoKids = (criancaNome: string) =>
    prisma.inscricaoKids.create({
      data: {
        criancaNome,
        criancaNascimento: new Date("2017-03-10"),
        responsavelNome: "Ana Souza",
        responsavelTelefone: "53988887777",
        responsavelEmail: `${criancaNome.toLowerCase()}.${sufixo}@teste.com`,
        parentesco: "MAE",
        consentimentoEm: new Date(),
        eventoId: eventoKidsId,
      },
    });

  beforeAll(async () => {
    // O lib/prisma lê DATABASE_URL ao ser importado, então apontamos para o banco de testes antes.
    process.env.DATABASE_URL = urlTeste;
    prisma = (await import("@/lib/prisma")).default;
    const acoes = await import("./actions");
    adicionarNota = acoes.adicionarNota;
    adicionarNotaKids = acoes.adicionarNotaKids;
    excluirInscricaoKids = acoes.excluirInscricaoKids;

    const usuario = await prisma.usuario.create({
      data: { nome: `teste-${sufixo}`, senha: "x", primeiroAcesso: false },
    });
    usuarioId = usuario.id;

    const evento = await prisma.evento.create({
      data: { nome: `Evento teste ${sufixo}`, tipo: "CENACULO", dataInicio: new Date() },
    });
    eventoId = evento.id;

    const inscricao = await prisma.inscricao.create({
      data: {
        nomeCompleto: "Pessoa de Teste",
        email: `${sufixo}@teste.com`,
        cidade: "Pelotas",
        telefone: "53999999999",
        dataNascimento: new Date("1990-01-01"),
        eventoId,
      },
    });
    inscricaoId = inscricao.id;

    const eventoKids = await prisma.evento.create({
      data: { nome: `Kids teste ${sufixo}`, tipo: "KIDS", dataInicio: new Date() },
    });
    eventoKidsId = eventoKids.id;
    inscricaoKidsId = (await novaInscricaoKids("Pedro")).id;
  });

  afterAll(async () => {
    // Apagar os eventos leva junto as inscrições e as notas (cascata); depois o usuário.
    await prisma.evento.deleteMany({ where: { id: { in: [eventoId, eventoKidsId] } } });
    await prisma.usuario.delete({ where: { id: usuarioId } });
    await prisma.$disconnect();
  });

  it("grava a nota com o usuário logado e lista com o nome do autor", async () => {
    sessao.sub = `teste-${sufixo}`;
    await adicionarNota(inscricaoId, form("Precisa de carona"));

    const notas = await prisma.observacao.findMany({
      where: { inscricaoId },
      include: { usuario: { select: { nome: true } } },
    });
    expect(notas).toHaveLength(1);
    expect(notas[0].texto).toBe("Precisa de carona");
    expect(notas[0].usuarioId).toBe(usuarioId);
    expect(notas[0].usuario.nome).toBe(`teste-${sufixo}`);
  });

  it("recusa e não grava nada quando o usuário da sessão não existe", async () => {
    sessao.sub = `nao-existe-${sufixo}`;
    await expect(adicionarNota(inscricaoId, form("nota fantasma"))).rejects.toThrow("Não autorizado");

    const fantasma = await prisma.observacao.count({ where: { inscricaoId, texto: "nota fantasma" } });
    expect(fantasma).toBe(0);
  });

  it("texto vazio não cria nota", async () => {
    sessao.sub = `teste-${sufixo}`;
    const antes = await prisma.observacao.count({ where: { inscricaoId } });
    await adicionarNota(inscricaoId, form(""));
    expect(await prisma.observacao.count({ where: { inscricaoId } })).toBe(antes);
  });

  describe("inscrição Kids", () => {
    it("grava a nota ligada só à inscrição Kids, com o autor", async () => {
      sessao.sub = `teste-${sufixo}`;
      await adicionarNotaKids(inscricaoKidsId, form("Alergia a amendoim, mãe avisou no dia"));

      const notas = await prisma.observacao.findMany({
        where: { inscricaoKidsId },
        include: { usuario: { select: { nome: true } } },
      });
      expect(notas).toHaveLength(1);
      expect(notas[0].inscricaoId).toBeNull(); // nunca ligada também a uma inscrição de adulto
      expect(notas[0].usuarioId).toBe(usuarioId);
      expect(notas[0].usuario.nome).toBe(`teste-${sufixo}`);
    });

    it("recusa usuário inexistente e texto vazio não cria nota", async () => {
      sessao.sub = `nao-existe-${sufixo}`;
      await expect(adicionarNotaKids(inscricaoKidsId, form("fantasma"))).rejects.toThrow("Não autorizado");

      sessao.sub = `teste-${sufixo}`;
      const antes = await prisma.observacao.count({ where: { inscricaoKidsId } });
      await adicionarNotaKids(inscricaoKidsId, form(""));
      expect(await prisma.observacao.count({ where: { inscricaoKidsId } })).toBe(antes);
    });

    it("sem sessão, não grava nota nem exclui", async () => {
      sessao.sub = ""; // ninguém logado
      const antes = await prisma.observacao.count({ where: { inscricaoKidsId } });
      await expect(adicionarNotaKids(inscricaoKidsId, form("sem login"))).rejects.toThrow("Não autorizado");
      expect(await prisma.observacao.count({ where: { inscricaoKidsId } })).toBe(antes);

      const dados = new FormData();
      dados.set("id", inscricaoKidsId);
      await expect(excluirInscricaoKids(dados)).rejects.toThrow("Não autorizado");
      expect(await prisma.inscricaoKids.count({ where: { id: inscricaoKidsId } })).toBe(1);
    });

    it("excluir a inscrição apaga também as notas dela, sem tocar nas outras", async () => {
      sessao.sub = `teste-${sufixo}`;
      const outra = await novaInscricaoKids("Davi");
      await adicionarNotaKids(outra.id, form("nota que deve sumir"));

      const dados = new FormData();
      dados.set("id", outra.id);
      await excluirInscricaoKids(dados);

      expect(await prisma.inscricaoKids.count({ where: { id: outra.id } })).toBe(0);
      expect(await prisma.observacao.count({ where: { inscricaoKidsId: outra.id } })).toBe(0);
      expect(await prisma.inscricaoKids.count({ where: { id: inscricaoKidsId } })).toBe(1);
    });
  });
});
