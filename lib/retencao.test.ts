import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { fimDoEvento, limiteDeGuarda } from "./retencao";

describe("prazo de guarda (contas de data)", () => {
  it("o limite é 12 meses antes de agora", () => {
    expect(limiteDeGuarda(new Date("2027-06-01T12:00:00Z")).toISOString()).toBe("2026-06-01T12:00:00.000Z");
    expect(limiteDeGuarda(new Date("2026-10-23T00:00:00Z")).toISOString()).toBe("2025-10-23T00:00:00.000Z");
  });

  it("o evento termina no início mais a duração em dias", () => {
    const fim = fimDoEvento({ dataInicio: new Date("2026-05-30T12:00:00Z"), duracaoDias: 3 });
    expect(fim.toISOString()).toBe("2026-06-02T12:00:00.000Z");
  });
});

// Estes testes usam um banco de verdade (DATABASE_URL_TESTE). Sem a variável, são pulados.
const urlTeste = process.env.DATABASE_URL_TESTE;

if (urlTeste && !new URL(urlTeste).pathname.slice(1).endsWith("_test")) {
  // Trava de segurança: nunca rodar testes em um banco que não seja de testes.
  throw new Error("DATABASE_URL_TESTE precisa apontar para um banco cujo nome termina em _test.");
}

describe.skipIf(!urlTeste)("apagar o que passou do prazo (banco de testes)", () => {
  const sufixo = Date.now().toString(36);
  // "Agora" fixo: o limite fica em 2026-06-01 e os testes não envelhecem.
  const agora = new Date("2027-06-01T12:00:00Z");
  let prisma: PrismaClient;
  let retencao: typeof import("./retencao");
  let usuarioId: string;
  const ids: Record<string, string> = {};

  const novoEvento = (chave: string, dataInicio: string, duracaoDias: number) =>
    prisma.evento
      .create({ data: { nome: `Reten ${chave} ${sufixo}`, tipo: "CENACULO", status: "FECHADO", dataInicio: new Date(dataInicio), duracaoDias } })
      .then((e) => (ids[chave] = e.id));

  const novaInscricao = (eventoId: string, n: string) =>
    prisma.inscricao.create({
      data: { eventoId, nomeCompleto: `Pessoa ${n}`, email: `${n}.${sufixo}@teste.com`, telefone: "(53) 99999-9999", cidade: "Pelotas", dataNascimento: new Date("1990-01-01") },
    });

  beforeAll(async () => {
    process.env.DATABASE_URL = urlTeste;
    prisma = (await import("@/lib/prisma")).default;
    retencao = await import("./retencao");

    usuarioId = (await prisma.usuario.create({ data: { nome: `reten-${sufixo}`, senha: "x" } })).id;

    await novoEvento("antigo", "2026-01-10T12:00:00Z", 1); // vencido
    await novoEvento("limite", "2026-05-30T12:00:00Z", 1); // terminou 31/05, antes do limite (01/06): vencido
    await novoEvento("longo", "2026-05-30T12:00:00Z", 3); // termina 02/06, depois do limite: NÃO vence (conta o fim, não o início)
    await novoEvento("futuro", "2027-03-01T12:00:00Z", 1); // recente: não vence

    for (const chave of ["antigo", "limite", "longo", "futuro"]) {
      const insc = await novaInscricao(ids[chave], chave);
      await prisma.observacao.create({ data: { texto: `nota ${chave}`, usuarioId, inscricaoId: insc.id } });
    }
    for (const chave of ["antigo", "futuro"]) {
      await prisma.inscricaoKids.create({
        data: {
          eventoId: ids[chave], criancaNome: "Pedro", criancaNascimento: new Date("2017-01-01"), responsavelNome: "Ana",
          responsavelTelefone: "(53) 98888-7777", responsavelEmail: `kids-${chave}.${sufixo}@teste.com`, parentesco: "MAE", consentimentoEm: new Date("2026-01-01"),
        },
      });
    }
    await prisma.preCadastro.create({ data: { nome: `Velho ${sufixo}`, email: `velho.${sufixo}@teste.com`, telefone: "(53) 99999-9999", criadoEm: new Date("2026-01-01") } });
    await prisma.preCadastro.create({ data: { nome: `Novo ${sufixo}`, email: `novo.${sufixo}@teste.com`, telefone: "(53) 99999-9999", criadoEm: new Date("2027-05-01") } });
  });

  afterAll(async () => {
    await prisma.evento.deleteMany({ where: { nome: { endsWith: ` ${sufixo}` }, id: { in: Object.values(ids) } } });
    await prisma.preCadastro.deleteMany({ where: { email: { endsWith: `.${sufixo}@teste.com` } } });
    await prisma.usuario.deleteMany({ where: { id: usuarioId } }); // apaga depois dos eventos (as notas saem com as inscrições)
    await prisma.$disconnect();
  });

  const nossas = <T extends { nome?: string }>(lista: T[]) => lista.filter((x) => x.nome?.endsWith(` ${sufixo}`));

  it("só olhar não apaga nada e lista os eventos vencidos pelo FIM do evento", async () => {
    const v = await retencao.levantarVencidos(prisma, agora);
    expect(nossas(v.eventos).map((e) => e.nome).sort()).toEqual([`Reten antigo ${sufixo}`, `Reten limite ${sufixo}`]);
    expect(v.inscricoes).toBeGreaterThanOrEqual(2);
    expect(v.inscricoesKids).toBeGreaterThanOrEqual(1);
    expect(v.notas).toBeGreaterThanOrEqual(2);
    expect(v.preCadastros).toBeGreaterThanOrEqual(1);

    expect(await prisma.inscricao.count({ where: { eventoId: { in: Object.values(ids) } } })).toBe(4); // nada foi apagado
  });

  it("apaga só o que passou do prazo, com as notas, e deixa o resto e os eventos", async () => {
    await retencao.apagarVencidos(prisma, agora);

    const restam = (await prisma.inscricao.findMany({ where: { eventoId: { in: Object.values(ids) } }, select: { eventoId: true } })).map((i) => i.eventoId).sort();
    expect(restam).toEqual([ids.longo, ids.futuro].sort());

    const notas = (await prisma.observacao.findMany({ where: { usuarioId }, select: { texto: true } })).map((n) => n.texto).sort();
    expect(notas).toEqual(["nota futuro", "nota longo"]); // as notas das inscrições apagadas saíram junto

    const kids = await prisma.inscricaoKids.findMany({ where: { eventoId: { in: Object.values(ids) } }, select: { eventoId: true } });
    expect(kids.map((k) => k.eventoId)).toEqual([ids.futuro]);

    const espera = (await prisma.preCadastro.findMany({ where: { email: { endsWith: `.${sufixo}@teste.com` } }, select: { nome: true } })).map((p) => p.nome);
    expect(espera).toEqual([`Novo ${sufixo}`]);

    expect(await prisma.evento.count({ where: { id: { in: Object.values(ids) } } })).toBe(4); // o evento em si fica
  });

  it("rodar de novo não apaga mais nada das nossas", async () => {
    const v = await retencao.levantarVencidos(prisma, agora);
    expect(nossas(v.eventos)).toHaveLength(2); // os eventos continuam existindo e vencidos
    expect(await prisma.inscricao.count({ where: { eventoId: { in: [ids.antigo, ids.limite] } } })).toBe(0);
  });
});
