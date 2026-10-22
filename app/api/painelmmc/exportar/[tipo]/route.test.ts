import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { lerZip } from "@/lib/lerZipParaTestes";

// Estes testes usam um banco de verdade (DATABASE_URL_TESTE). Sem a variável, são pulados.
const urlTeste = process.env.DATABASE_URL_TESTE;

if (urlTeste && !new URL(urlTeste).pathname.slice(1).endsWith("_test")) {
  // Trava de segurança: nunca rodar testes em um banco que não seja de testes.
  throw new Error("DATABASE_URL_TESTE precisa apontar para um banco cujo nome termina em _test.");
}

// A leitura da sessão do Next não existe fora do servidor: aqui escolhemos quem está logado em cada teste.
type SessaoDeTeste = { sub: string; pa: boolean; exp: number } | null;
const { login } = vi.hoisted(() => ({ login: { atual: null as SessaoDeTeste } }));
vi.mock("@/lib/auth", () => ({ lerSessao: async () => login.atual }));

describe.skipIf(!urlTeste)("exportação de planilhas (banco de testes)", () => {
  const sufixo = Date.now().toString(36);
  let prisma: PrismaClient;
  let GET: (request: Request, contexto: { params: Promise<{ tipo: string }> }) => Promise<Response>;
  let usuarioId: string;
  let eventoAId: string;
  let eventoBId: string;
  let eventoKidsId: string;
  const eventos: string[] = [];

  const logado = () => {
    login.atual = { sub: `teste-${sufixo}`, pa: false, exp: 9_999_999_999 };
  };
  const baixar = (tipo: string, consulta = "") =>
    GET(new Request(`http://localhost/api/painelmmc/exportar/${tipo}${consulta}`), { params: Promise.resolve({ tipo }) });
  const abrir = async (resposta: Response) => lerZip(Buffer.from(await resposta.arrayBuffer()));

  const novoEvento = async (nome: string, tipo: string) => {
    const evento = await prisma.evento.create({ data: { nome: `${nome} ${sufixo}`, tipo, dataInicio: new Date("2026-11-10T03:00:00Z") } });
    eventos.push(evento.id);
    return evento.id;
  };

  const adulto = (eventoId: string, nome: string, extra: Record<string, string> = {}) =>
    prisma.inscricao.create({
      data: {
        nomeCompleto: nome,
        email: `${nome.toLowerCase().replace(/\W/g, "")}.${sufixo}@teste.com`,
        cidade: "Pelotas",
        telefone: "(53) 99999-9999",
        dataNascimento: new Date("1990-05-20T00:00:00Z"),
        eventoId,
        ...extra,
      },
    });

  beforeAll(async () => {
    // O lib/prisma lê DATABASE_URL ao ser importado, então apontamos para o banco de testes antes.
    process.env.DATABASE_URL = urlTeste;
    prisma = (await import("@/lib/prisma")).default;
    GET = (await import("./route")).GET;

    usuarioId = (await prisma.usuario.create({ data: { nome: `teste-${sufixo}`, senha: "x", primeiroAcesso: false } })).id;

    eventoAId = await novoEvento("Cenáculo A", "CENACULO");
    eventoBId = await novoEvento("Cenáculo B", "CENACULO");
    eventoKidsId = await novoEvento("Kids", "KIDS");

    const maria = await adulto(eventoAId, `Maria ${sufixo}`, { problemaSaude: "=1+1", instagram: '=HYPERLINK("http://golpe.example","x")' });
    await prisma.observacao.create({ data: { texto: `Precisa de carona ${sufixo}`, inscricaoId: maria.id, usuarioId } });
    await adulto(eventoBId, `Outra ${sufixo}`);

    await prisma.inscricaoKids.create({
      data: {
        criancaNome: `Pedro${sufixo}`,
        criancaNascimento: new Date("2017-03-10T00:00:00Z"),
        saudeComEquipe: true,
        responsavelNome: `Ana ${sufixo}`,
        responsavelTelefone: "(53) 98888-7777",
        responsavelEmail: `ana.${sufixo}@teste.com`,
        parentesco: "MAE",
        consentimentoEm: new Date(),
        eventoId: eventoKidsId,
      },
    });

    const membroA = await prisma.membro.create({ data: { nome: `Ana Membro ${sufixo}`, grupo: `Grupo${sufixo}A`, cenaculoFeito: "83" } });
    await prisma.membro.create({ data: { nome: `Davi Membro ${sufixo}`, grupo: `Grupo${sufixo}B` } });
    const atividade = await prisma.atividade.create({ data: { nome: `Missa ${sufixo}`, data: new Date() } });
    await prisma.presenca.create({ data: { membroId: membroA.id, atividadeId: atividade.id } });
  });

  afterAll(async () => {
    // Apagar os eventos leva junto as inscrições e as notas; membros levam as presenças.
    await prisma.evento.deleteMany({ where: { id: { in: eventos } } });
    await prisma.membro.deleteMany({ where: { nome: { endsWith: `Membro ${sufixo}` } } });
    await prisma.atividade.deleteMany({ where: { nome: `Missa ${sufixo}` } });
    await prisma.usuario.delete({ where: { id: usuarioId } });
    await prisma.$disconnect();
  });

  describe("quem pode baixar", () => {
    it("sem login, nenhuma planilha é entregue", async () => {
      login.atual = null;
      for (const tipo of ["inscritos", "kids", "frequencia"]) {
        const resposta = await baixar(tipo);
        expect(resposta.status).toBe(401);
        expect(resposta.headers.get("content-type")).toContain("application/json");
      }
    });

    it("com senha provisória ainda não trocada, também não", async () => {
      login.atual = { sub: `teste-${sufixo}`, pa: true, exp: 9_999_999_999 };
      expect((await baixar("inscritos")).status).toBe(401);
    });
  });

  describe("inscritos adultos", () => {
    it("entrega o .xlsx do evento escolhido, com notas e autor, sem as inscrições de outros eventos", async () => {
      logado();
      const resposta = await baixar("inscritos", `?eventoId=${eventoAId}`);
      expect(resposta.status).toBe(200);
      expect(resposta.headers.get("content-type")).toContain("spreadsheetml");
      expect(resposta.headers.get("content-disposition")).toMatch(/^attachment; filename="Inscritos_Cenaculo_A_.*\.xlsx"$/);
      expect(resposta.headers.get("cache-control")).toBe("no-store");

      const textos = (await abrir(resposta))["xl/sharedStrings.xml"];
      expect(textos).toContain(`Maria ${sufixo}`);
      expect(textos).toContain(`Precisa de carona ${sufixo}`);
      expect(textos).toContain(`por teste-${sufixo}`);
      expect(textos).not.toContain(`Outra ${sufixo}`);
    });

    it("sem escolher evento, entrega todos os eventos (e nenhuma criança)", async () => {
      logado();
      const textos = (await abrir(await baixar("inscritos")))["xl/sharedStrings.xml"];
      expect(textos).toContain(`Maria ${sufixo}`);
      expect(textos).toContain(`Outra ${sufixo}`);
      expect(textos).not.toContain(`Pedro${sufixo}`);
    });

    it("texto perigoso digitado no formulário sai como texto, sem fórmula", async () => {
      logado();
      const arquivos = await abrir(await baixar("inscritos", `?eventoId=${eventoAId}`));
      expect(arquivos["xl/worksheets/sheet1.xml"]).not.toContain("<f");
      expect(arquivos["xl/sharedStrings.xml"]).toContain("=1+1");
      expect(arquivos["xl/sharedStrings.xml"]).toContain("=HYPERLINK(");
    });

    it("evento que não existe dá 404", async () => {
      logado();
      expect((await baixar("inscritos", "?eventoId=nao-existe")).status).toBe(404);
    });
  });

  describe("inscritos Kids", () => {
    it("entrega a criança com o contato do responsável e o aviso de saúde, e nenhum adulto", async () => {
      logado();
      const resposta = await baixar("kids", `?eventoId=${eventoKidsId}`);
      expect(resposta.status).toBe(200);
      expect(resposta.headers.get("content-disposition")).toMatch(/filename="Inscritos_Kids_Kids_.*\.xlsx"/);

      const textos = (await abrir(resposta))["xl/sharedStrings.xml"];
      expect(textos).toContain(`Pedro${sufixo}`);
      expect(textos).toContain(`Ana ${sufixo}`); // responsável
      expect(textos).toContain("(53) 98888-7777"); // telefone do responsável
      expect(textos).toContain(`ana.${sufixo}@teste.com`); // e-mail do responsável
      expect(textos).toContain("Telefone do responsável");
      expect(textos).toContain("Falar com a equipe no dia");
      expect(textos).toContain("Mãe");
      expect(textos).not.toContain(`Maria ${sufixo}`);
    });
  });

  describe("frequência", () => {
    it("entrega os membros com as presenças", async () => {
      logado();
      const textos = (await abrir(await baixar("frequencia")))["xl/sharedStrings.xml"];
      expect(textos).toContain(`Ana Membro ${sufixo}`);
      expect(textos).toContain(`Davi Membro ${sufixo}`);
      expect(textos).toContain(`Missa ${sufixo}`);
    });

    it("filtra por grupo", async () => {
      logado();
      const resposta = await baixar("frequencia", `?grupo=Grupo${sufixo}A`);
      const textos = (await abrir(resposta))["xl/sharedStrings.xml"];
      expect(textos).toContain(`Ana Membro ${sufixo}`);
      expect(textos).not.toContain(`Davi Membro ${sufixo}`);
    });
  });

  it("relatório desconhecido dá 404", async () => {
    logado();
    expect((await baixar("qualquer-coisa")).status).toBe(404);
  });
});
