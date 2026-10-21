import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "@prisma/client";

// Estes testes usam um banco de verdade (DATABASE_URL_TESTE). Sem a variável, são pulados.
const urlTeste = process.env.DATABASE_URL_TESTE;

if (urlTeste && !new URL(urlTeste).pathname.slice(1).endsWith("_test")) {
  // Trava de segurança: nunca rodar testes em um banco que não seja de testes.
  throw new Error("DATABASE_URL_TESTE precisa apontar para um banco cujo nome termina em _test.");
}

describe.skipIf(!urlTeste)("POST /api/inscricao (banco de testes)", () => {
  const sufixo = Date.now().toString(36);
  let prisma: PrismaClient;
  let POST: (request: Request) => Promise<Response>;
  let contador = 0;
  let abertoId: string; // evento adulto aberto
  let abertoOutroId: string; // outro evento adulto aberto
  let fechadoId: string; // evento adulto fechado
  let kidsId: string; // evento Kids aberto
  const eventosCriados: string[] = [];

  const enviar = (corpo: unknown) =>
    POST(
      new Request("http://localhost/api/inscricao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
      })
    );

  const adulto = (eventoId: string, extra: Record<string, unknown> = {}) => ({
    eventoId,
    nomeCompleto: "Maria da Silva",
    email: `maria${++contador}.${sufixo}@teste.com`,
    telefone: "(53) 99999-9999",
    cidade: "Pelotas",
    dataNascimento: "1990-05-20",
    ...extra,
  });

  const crianca = (extra: Record<string, unknown> = {}) => ({
    eventoId: kidsId,
    criancaNome: "Pedro",
    criancaNascimento: `${new Date().getUTCFullYear() - 9}-03-10`,
    responsavelNome: "Ana Souza",
    responsavelTelefone: "(53) 98888-7777",
    responsavelEmail: `ana.${sufixo}@teste.com`,
    parentesco: "MAE",
    consentimento: true,
    ...extra,
  });

  const novoEvento = async (nome: string, tipo: string, status: string) => {
    const evento = await prisma.evento.create({
      data: { nome: `${nome} ${sufixo}`, tipo, status, dataInicio: new Date(Date.now() + 7 * 86400000) },
    });
    eventosCriados.push(evento.id);
    return evento.id;
  };

  beforeAll(async () => {
    // O lib/prisma lê DATABASE_URL ao ser importado, então apontamos para o banco de testes antes.
    process.env.DATABASE_URL = urlTeste;
    prisma = (await import("@/lib/prisma")).default;
    POST = (await import("./route")).POST;

    abertoId = await novoEvento("Cenáculo aberto", "CENACULO", "ABERTO");
    abertoOutroId = await novoEvento("Outro cenáculo aberto", "CENACULO", "ABERTO");
    fechadoId = await novoEvento("Cenáculo fechado", "CENACULO", "FECHADO");
    kidsId = await novoEvento("Kids aberto", "KIDS", "ABERTO");
  });

  afterAll(async () => {
    // Apagar o evento leva junto as inscrições (cascata).
    await prisma.evento.deleteMany({ where: { id: { in: eventosCriados } } });
    await prisma.$disconnect();
  });

  describe("adulto", () => {
    it("grava, normaliza o e-mail e responde só com a mensagem (sem dados da inscrição)", async () => {
      const entrada = adulto(abertoId, { email: `  MAIA.${sufixo}@Teste.COM `, problemaSaude: "asma" });
      const resposta = await enviar(entrada);
      expect(resposta.status).toBe(201);
      expect(await resposta.json()).toEqual({ message: "Inscrição realizada com sucesso!" });

      const gravada = await prisma.inscricao.findFirst({ where: { eventoId: abertoId, email: `maia.${sufixo}@teste.com` } });
      expect(gravada?.problemaSaude).toBe("asma");
    });

    it("recusa evento que não está aberto e não grava nada", async () => {
      const entrada = adulto(fechadoId);
      const resposta = await enviar(entrada);
      expect(resposta.status).toBe(403);
      expect(await prisma.inscricao.count({ where: { eventoId: fechadoId } })).toBe(0);
    });

    it("responde 404 para evento que não existe", async () => {
      expect((await enviar(adulto("nao-existe"))).status).toBe(404);
    });

    it("responde 400 sem o id do evento ou com JSON quebrado", async () => {
      expect((await enviar({ nomeCompleto: "Sem evento" })).status).toBe(400);
      expect((await enviar("isso não é json")).status).toBe(400);
    });

    it("responde 400 (e não 500) com data inválida, com a mensagem do campo", async () => {
      const resposta = await enviar(adulto(abertoId, { dataNascimento: "2020-02-31" }));
      expect(resposta.status).toBe(400);
      const corpo = await resposta.json();
      expect(corpo.campos.dataNascimento).toBeTruthy();
    });

    it("barra e-mail repetido no mesmo evento, mesmo com letras diferentes, com aviso genérico", async () => {
      const entrada = adulto(abertoId);
      expect((await enviar(entrada)).status).toBe(201);

      const repetida = await enviar({ ...entrada, email: entrada.email.toUpperCase() });
      expect(repetida.status).toBe(409);
      const corpo = await repetida.json();
      expect(corpo.error).not.toMatch(/e-mail|email/i); // não confirma que o e-mail está inscrito
      expect(await prisma.inscricao.count({ where: { eventoId: abertoId, email: entrada.email } })).toBe(1);
    });

    it("aceita o mesmo e-mail em outro evento", async () => {
      const entrada = adulto(abertoId);
      expect((await enviar(entrada)).status).toBe(201);
      expect((await enviar({ ...entrada, eventoId: abertoOutroId })).status).toBe(201);
    });
  });

  describe("Kids", () => {
    it("grava só o que foi combinado, com o aceite datado pelo servidor", async () => {
      const antes = Date.now();
      const resposta = await enviar(crianca({ criancaNome: "  lucas ", saudeObservacao: "alergia a amendoim" }));
      expect(resposta.status).toBe(201);
      expect(await resposta.json()).toEqual({ message: "Inscrição realizada com sucesso!" });

      const gravada = await prisma.inscricaoKids.findFirstOrThrow({ where: { eventoId: kidsId, criancaNome: "Lucas" } });
      expect(gravada.saudeObservacao).toBe("alergia a amendoim");
      expect(gravada.parentesco).toBe("MAE");
      expect(gravada.consentimentoEm.getTime()).toBeGreaterThanOrEqual(antes - 1000);
    });

    it("rejeita campo extra e não grava nada", async () => {
      const resposta = await enviar(crianca({ criancaNome: "Extra", email: "crianca@teste.com", cidade: "Pelotas" }));
      expect(resposta.status).toBe(400);
      expect(await prisma.inscricaoKids.count({ where: { eventoId: kidsId, criancaNome: "Extra" } })).toBe(0);
    });

    it("não aceita um cadastro de adulto em evento Kids", async () => {
      expect((await enviar(adulto(kidsId))).status).toBe(400);
      expect(await prisma.inscricao.count({ where: { eventoId: kidsId } })).toBe(0);
    });

    it("exige o consentimento do responsável", async () => {
      expect((await enviar(crianca({ criancaNome: "Sem", consentimento: false }))).status).toBe(400);
      expect(await prisma.inscricaoKids.count({ where: { eventoId: kidsId, criancaNome: "Sem" } })).toBe(0);
    });

    it("descarta o texto de saúde quando o responsável prefere falar com a equipe", async () => {
      const resposta = await enviar(crianca({ criancaNome: "Equipe", saudeComEquipe: true, saudeObservacao: "não deveria ficar" }));
      expect(resposta.status).toBe(201);
      const gravada = await prisma.inscricaoKids.findFirstOrThrow({ where: { eventoId: kidsId, criancaNome: "Equipe" } });
      expect(gravada.saudeComEquipe).toBe(true);
      expect(gravada.saudeObservacao).toBeNull();
    });

    it("aceita irmãos com o mesmo responsável, mas barra a mesma criança duas vezes", async () => {
      const responsavelEmail = `irmaos.${sufixo}@teste.com`;
      expect((await enviar(crianca({ criancaNome: "Davi", responsavelEmail }))).status).toBe(201);
      expect((await enviar(crianca({ criancaNome: "Miguel", responsavelEmail }))).status).toBe(201);

      const repetida = await enviar(crianca({ criancaNome: "DAVI", responsavelEmail: responsavelEmail.toUpperCase() }));
      expect(repetida.status).toBe(409);
      expect(await prisma.inscricaoKids.count({ where: { eventoId: kidsId, responsavelEmail } })).toBe(2);
    });

    it("aceita criança fora de 8 a 10 anos (exceção); o aviso é feito no painel", async () => {
      const resposta = await enviar(
        crianca({ criancaNome: "Pequeno", criancaNascimento: `${new Date().getUTCFullYear() - 5}-03-10` })
      );
      expect(resposta.status).toBe(201);
    });
  });
});
