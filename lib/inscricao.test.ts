import { describe, it, expect } from "vitest";
import {
  inscricaoAdultoSchema,
  inscricaoKidsSchema,
  preCadastroSchema,
  validar,
  idadeEm,
  foraDaFaixaKids,
} from "./inscricao";

// Datas relativas a hoje, para os testes não envelhecerem.
const anoAtual = new Date().getUTCFullYear();
const nascidoHa = (anos: number) => `${anoAtual - anos}-01-01`;

const adulto = {
  eventoId: "evento-1",
  nomeCompleto: "Maria da Silva",
  email: "maria@email.com",
  telefone: "(53) 99999-9999",
  cidade: "Pelotas",
  dataNascimento: "1990-05-20",
};

const kids = {
  eventoId: "evento-1",
  criancaNome: "Pedro",
  criancaNascimento: nascidoHa(9),
  responsavelNome: "Ana Souza",
  responsavelTelefone: "(53) 98888-7777",
  responsavelEmail: "ana@email.com",
  parentesco: "MAE",
  consentimento: true,
};

describe("inscrição de adulto", () => {
  it("aceita um cadastro completo e normaliza os dados", () => {
    const r = validar(inscricaoAdultoSchema, {
      ...adulto,
      nomeCompleto: "  Maria   da  Silva ",
      email: "  MARIA@Email.COM ",
      instagram: "",
      paroquiaAtuante: null,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.nomeCompleto).toBe("Maria da Silva");
    expect(r.dados.email).toBe("maria@email.com");
    expect(r.dados.instagram).toBeUndefined();
    expect(r.dados.paroquiaAtuante).toBeUndefined();
    expect(r.dados.dataNascimento.toISOString()).toBe("1990-05-20T00:00:00.000Z");
  });

  it("exige os campos obrigatórios", () => {
    const r = validar(inscricaoAdultoSchema, { eventoId: "evento-1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    for (const campo of ["nomeCompleto", "email", "telefone", "cidade", "dataNascimento"]) {
      expect(r.erros[campo]).toBeTruthy();
    }
  });

  it("rejeita e-mail inválido", () => {
    const r = validar(inscricaoAdultoSchema, { ...adulto, email: "isso-nao-e-email" });
    expect(!r.ok && r.erros.email).toBeTruthy();
  });

  it("rejeita telefone com número de dígitos errado", () => {
    const r = validar(inscricaoAdultoSchema, { ...adulto, telefone: "12345" });
    expect(!r.ok && r.erros.telefone).toBeTruthy();
  });

  it.each(["2020-02-31", "31/12/2000", "ontem", "1850-01-01", `${anoAtual + 1}-01-01`])(
    "rejeita data de nascimento inválida (%s) sem dar erro 500",
    (data) => {
      const r = validar(inscricaoAdultoSchema, { ...adulto, dataNascimento: data });
      expect(!r.ok && r.erros.dataNascimento).toBeTruthy();
    }
  );

  it("limita o tamanho dos textos", () => {
    const r = validar(inscricaoAdultoSchema, { ...adulto, problemaSaude: "x".repeat(301), cidade: "y".repeat(81) });
    expect(!r.ok && r.erros.problemaSaude).toBeTruthy();
    expect(!r.ok && r.erros.cidade).toBeTruthy();
  });

  it("ignora campos desconhecidos em vez de gravá-los", () => {
    const r = validar(inscricaoAdultoSchema, { ...adulto, admin: true, id: "forcado" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados).not.toHaveProperty("admin");
    expect(r.dados).not.toHaveProperty("id");
  });

  it("não aceita entrada que não seja objeto", () => {
    expect(validar(inscricaoAdultoSchema, null).ok).toBe(false);
    expect(validar(inscricaoAdultoSchema, "texto").ok).toBe(false);
  });
});

describe("inscrição Kids", () => {
  it("aceita um cadastro completo e normaliza os dados", () => {
    const r = validar(inscricaoKidsSchema, {
      ...kids,
      criancaNome: "  pEDRO ",
      responsavelEmail: " ANA@Email.com ",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.criancaNome).toBe("Pedro");
    expect(r.dados.responsavelEmail).toBe("ana@email.com");
    expect(r.dados.saudeComEquipe).toBe(false);
  });

  it("aceita nome composto, normalizado", () => {
    const r = validar(inscricaoKidsSchema, { ...kids, criancaNome: "maria clara" });
    expect(r.ok && r.dados.criancaNome).toBe("Maria Clara");
  });

  it("rejeita sobrenome: só o primeiro nome da criança", () => {
    const r = validar(inscricaoKidsSchema, { ...kids, criancaNome: "Pedro Henrique Souza" });
    expect(!r.ok && r.erros.criancaNome).toBeTruthy();
  });

  it("rejeita números e símbolos no nome da criança", () => {
    const r = validar(inscricaoKidsSchema, { ...kids, criancaNome: "Pedro7" });
    expect(!r.ok && r.erros.criancaNome).toBeTruthy();
  });

  it("REJEITA qualquer campo fora da lista (e-mail, telefone ou endereço da criança)", () => {
    for (const extra of [{ email: "crianca@x.com" }, { telefone: "53999999999" }, { cidade: "Pelotas" }, { sobrenome: "Souza" }]) {
      const r = validar(inscricaoKidsSchema, { ...kids, ...extra });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erros._geral).toContain("Campos não permitidos");
    }
  });

  it("exige o consentimento do responsável", () => {
    const semCampo: Record<string, unknown> = { ...kids };
    delete semCampo.consentimento;
    for (const entrada of [semCampo, { ...kids, consentimento: false }, { ...kids, consentimento: "true" }]) {
      const r = validar(inscricaoKidsSchema, entrada);
      expect(!r.ok && r.erros.consentimento).toBeTruthy();
    }
  });

  it("só aceita parentescos da lista", () => {
    expect(validar(inscricaoKidsSchema, { ...kids, parentesco: "OUTRO" }).ok).toBe(true);
    expect(validar(inscricaoKidsSchema, { ...kids, parentesco: "VIZINHO" }).ok).toBe(false);
  });

  it("descarta o texto de saúde quando o responsável prefere falar com a equipe", () => {
    const r = validar(inscricaoKidsSchema, { ...kids, saudeComEquipe: true, saudeObservacao: "alergia a amendoim" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.saudeComEquipe).toBe(true);
    expect(r.dados.saudeObservacao).toBeUndefined();
  });

  it("guarda o texto de saúde quando a opção da equipe não está marcada", () => {
    const r = validar(inscricaoKidsSchema, { ...kids, saudeObservacao: "  alergia a amendoim " });
    expect(r.ok && r.dados.saudeObservacao).toBe("alergia a amendoim");
  });

  it("rejeita nascimento no futuro e idade de adulto", () => {
    expect(validar(inscricaoKidsSchema, { ...kids, criancaNascimento: `${anoAtual + 1}-01-01` }).ok).toBe(false);
    expect(validar(inscricaoKidsSchema, { ...kids, criancaNascimento: nascidoHa(30) }).ok).toBe(false);
  });

  it("aceita criança fora de 8 a 10 anos (exceções); o aviso é feito à parte", () => {
    expect(validar(inscricaoKidsSchema, { ...kids, criancaNascimento: nascidoHa(6) }).ok).toBe(true);
    expect(validar(inscricaoKidsSchema, { ...kids, criancaNascimento: nascidoHa(12) }).ok).toBe(true);
  });
});

describe("idade e faixa do Kids", () => {
  const evento = new Date("2026-11-10T03:00:00.000Z"); // meia-noite de Brasília

  it("conta a idade pelo aniversário", () => {
    expect(idadeEm(new Date("2016-11-10T00:00:00Z"), evento)).toBe(10); // faz 10 no dia do evento
    expect(idadeEm(new Date("2016-11-11T00:00:00Z"), evento)).toBe(9); // faz 10 no dia seguinte
  });

  it("avisa fora de 8 a 10 anos, usando a idade na data do evento", () => {
    expect(foraDaFaixaKids(new Date("2019-11-11T00:00:00Z"), evento)).toBe(true); // 6 anos (faz 7 amanhã)
    expect(foraDaFaixaKids(new Date("2018-11-11T00:00:00Z"), evento)).toBe(true); // 7
    expect(foraDaFaixaKids(new Date("2018-11-10T00:00:00Z"), evento)).toBe(false); // 8 no dia
    expect(foraDaFaixaKids(new Date("2016-11-10T00:00:00Z"), evento)).toBe(false); // 10 no dia
    expect(foraDaFaixaKids(new Date("2015-11-11T00:00:00Z"), evento)).toBe(false); // 10 (faz 11 amanhã)
    expect(foraDaFaixaKids(new Date("2015-11-10T00:00:00Z"), evento)).toBe(true); // 11 no dia
  });
});

describe("lista de espera (pré-cadastro)", () => {
  const pre = { nome: "Maria da Silva", email: "maria@email.com", telefone: "53999999999", tipo: "CENACULO" };

  it("aceita um cadastro completo e normaliza o e-mail", () => {
    const r = validar(preCadastroSchema, { ...pre, nome: "  Maria   da Silva ", email: " MARIA@Email.com " });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.nome).toBe("Maria da Silva");
    expect(r.dados.email).toBe("maria@email.com");
  });

  it("só aceita os retiros da lista", () => {
    for (const tipo of ["CENACULO", "KIDS", "CENACULAO"]) expect(validar(preCadastroSchema, { ...pre, tipo }).ok).toBe(true);
    for (const tipo of ["FESTIVIDADE", "qualquer coisa", ""]) expect(validar(preCadastroSchema, { ...pre, tipo }).ok).toBe(false);
  });

  it("exige nome, e-mail e telefone, e limita o tamanho", () => {
    expect(validar(preCadastroSchema, {}).ok).toBe(false);
    expect(validar(preCadastroSchema, { ...pre, email: "não é e-mail" }).ok).toBe(false);
    expect(validar(preCadastroSchema, { ...pre, telefone: "123" }).ok).toBe(false);
    expect(validar(preCadastroSchema, { ...pre, nome: "x".repeat(121) }).ok).toBe(false);
  });

  it("aceita o telefone com o código do país (55)", () => {
    expect(validar(preCadastroSchema, { ...pre, telefone: "+55 53 99999-9999" }).ok).toBe(true);
    expect(validar(preCadastroSchema, { ...pre, telefone: "55 53 3333-4444" }).ok).toBe(true);
  });
});
