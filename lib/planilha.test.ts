import { describe, it, expect } from "vitest";
import {
  abaFrequencia,
  abaInscritosAdultos,
  abaInscritosKids,
  gerarXlsx,
  nomeDeArquivo,
  type InscricaoAdultoExport,
  type InscricaoKidsExport,
} from "./planilha";
import { lerZip } from "./lerZipParaTestes";

const autor = { nome: "derick" };
const nota = { criadoEm: new Date("2026-10-21T20:28:47Z"), texto: "Precisa de carona", usuario: autor };

const adulto = (extra: Partial<InscricaoAdultoExport> = {}): InscricaoAdultoExport => ({
  nomeCompleto: "Maria da Silva",
  telefone: "(53) 99999-9999",
  email: "maria@email.com",
  instagram: null,
  dataNascimento: new Date("1990-05-20T00:00:00Z"),
  cidade: "Pelotas",
  jaFezCenaculo: "Não fez",
  paroquiaAtuante: null,
  problemaSaude: null,
  medicacaoControlada: null,
  restricaoAlimentar: null,
  atendimentoEspecial: null,
  comoConheceu: null,
  criadoEm: new Date("2026-10-21T20:28:47Z"),
  observacoes: [],
  ...extra,
});

const crianca = (extra: Partial<InscricaoKidsExport> = {}): InscricaoKidsExport => ({
  criancaNome: "Pedro",
  criancaNascimento: new Date("2017-03-10T00:00:00Z"),
  saudeObservacao: null,
  saudeComEquipe: false,
  responsavelNome: "Ana Souza",
  responsavelTelefone: "(53) 98888-7777",
  responsavelEmail: "ana@email.com",
  parentesco: "MAE",
  consentimentoEm: new Date("2026-10-21T20:30:00Z"),
  criadoEm: new Date("2026-10-21T20:30:00Z"),
  evento: { nome: "Cenáculo Kids", dataInicio: new Date("2026-11-10T03:00:00Z") },
  observacoes: [],
  ...extra,
});

const valores = (linha: unknown[]) => linha.map((c) => (typeof c === "object" && c !== null && "value" in c ? (c as { value: unknown }).value : c));

describe("planilha de inscritos adultos", () => {
  it("tem o cabeçalho em negrito e uma linha por inscrição, com os dados como foram digitados", () => {
    const aba = abaInscritosAdultos([adulto({ instagram: "@maria", observacoes: [nota] })]);
    expect(aba.linhas).toHaveLength(2);
    expect((aba.linhas[0] as { fontWeight: string }[]).every((c) => c.fontWeight === "bold")).toBe(true);

    const linha = valores(aba.linhas[1] as unknown[]);
    expect(linha.slice(0, 4)).toEqual(["Maria da Silva", "(53) 99999-9999", "maria@email.com", "@maria"]);
    expect(linha[4]).toBe("20/05/1990"); // data de nascimento sem deslocar um dia por causa do fuso
    expect(linha[14]).toMatch(/\[21\/10\/2026 por derick\]: Precisa de carona/);
  });

  it("mostra '-' nos campos vazios e acompanha o número de colunas do cabeçalho", () => {
    const aba = abaInscritosAdultos([adulto()]);
    const linha = valores(aba.linhas[1] as unknown[]);
    expect(linha[3]).toBe("-"); // instagram
    expect(linha[8]).toBe("-"); // problema de saúde
    expect(linha[14]).toBe("-"); // sem notas
    expect(linha).toHaveLength((aba.linhas[0] as unknown[]).length);
    expect(aba.larguras).toHaveLength((aba.linhas[0] as unknown[]).length);
  });

  it("mostra a hora da inscrição no horário de Brasília, mesmo com o servidor em UTC", () => {
    const linha = valores(abaInscritosAdultos([adulto()]).linhas[1] as unknown[]);
    expect(linha[13]).toMatch(/21\/10\/2026.*17:28:47/); // 20:28 UTC = 17:28 em Brasília
  });

  it("junta várias notas com ' | '", () => {
    const outra = { ...nota, texto: "Já avisou a coordenação", usuario: { nome: "maria" } };
    const linha = valores(abaInscritosAdultos([adulto({ observacoes: [nota, outra] })]).linhas[1] as unknown[]);
    expect(String(linha[14]).split(" | ")).toHaveLength(2);
  });
});

describe("planilha de inscritos Kids", () => {
  it("mostra a criança, a idade no evento e o responsável", () => {
    const aba = abaInscritosKids([crianca({ observacoes: [nota] })]);
    const linha = valores(aba.linhas[1] as unknown[]);
    expect(linha[0]).toBe("Pedro");
    expect(linha[1]).toBe(9); // idade na data do evento, como número
    expect(linha[2]).toBe("10/03/2017");
    expect(linha[3]).toBe("Não"); // dentro da faixa de 8 a 10
    expect(linha.slice(5, 9)).toEqual(["Ana Souza", "Mãe", "(53) 98888-7777", "ana@email.com"]);
    expect(linha[11]).toBe("Cenáculo Kids");
    expect(linha).toHaveLength((aba.linhas[0] as unknown[]).length);
  });

  it("deixa claro que telefone e e-mail são do responsável, e não da criança", () => {
    const titulos = valores(abaInscritosKids([]).linhas[0] as unknown[]);
    expect(titulos).toContain("Telefone do responsável");
    expect(titulos).toContain("E-mail do responsável");
    expect(titulos).not.toContain("Telefone");
  });

  it("avisa quando a criança está fora de 8 a 10 anos", () => {
    const pequena = valores(abaInscritosKids([crianca({ criancaNascimento: new Date("2020-01-01T00:00:00Z") })]).linhas[1] as unknown[]);
    expect(pequena[3]).toBe("Sim");
  });

  it("mostra a saúde como texto, como aviso para falar com a equipe, ou '-'", () => {
    const saude = (extra: Partial<InscricaoKidsExport>) => valores(abaInscritosKids([crianca(extra)]).linhas[1] as unknown[])[4];
    expect(saude({ saudeObservacao: "alergia a amendoim" })).toBe("alergia a amendoim");
    expect(saude({ saudeComEquipe: true })).toBe("Falar com a equipe no dia");
    expect(saude({})).toBe("-");
  });

  it("usa o próprio valor quando o parentesco não é conhecido", () => {
    expect(valores(abaInscritosKids([crianca({ parentesco: "OUTRO" })]).linhas[1] as unknown[])[6]).toBe("Outro");
    expect(valores(abaInscritosKids([crianca({ parentesco: "XYZ" })]).linhas[1] as unknown[])[6]).toBe("XYZ");
  });
});

describe("planilha de frequência", () => {
  it("lista as presenças de cada membro", () => {
    const aba = abaFrequencia([
      { nome: "Ana", grupo: "Salve Maria", cenaculoFeito: "83", presencas: [{ atividade: { nome: "Missa" } }, { atividade: { nome: "Reunião" } }] },
      { nome: "Davi", grupo: "Gabaon", cenaculoFeito: null, presencas: [] },
    ]);
    expect(valores(aba.linhas[1] as unknown[])).toEqual(["Ana", "Salve Maria", "83º", 2, "Missa, Reunião"]);
    expect(valores(aba.linhas[2] as unknown[])).toEqual(["Davi", "Gabaon", "N/A", 0, "Nenhum evento registrado"]);
  });
});

describe("arquivo .xlsx: texto vindo do público nunca vira fórmula", () => {
  // Textos que programas de planilha poderiam executar se fossem gravados como fórmula.
  const perigosos = [
    '=HYPERLINK("http://golpe.example","clique aqui")',
    "=1+1",
    "+55 53 99999-9999",
    "-2+3",
    "@SUM(1,2)",
    "=cmd|'/c calc'!A1",
  ];

  it("grava cada célula como texto, sem nenhuma fórmula, e sem alterar o conteúdo", async () => {
    const aba = abaInscritosAdultos([
      adulto({
        nomeCompleto: perigosos[0],
        telefone: perigosos[2],
        email: perigosos[1],
        instagram: perigosos[4],
        cidade: perigosos[3],
        problemaSaude: perigosos[5],
        comoConheceu: perigosos[1],
        observacoes: [{ ...nota, texto: perigosos[0] }],
      }),
    ]);
    const arquivos = lerZip(await gerarXlsx(aba));

    const planilha = arquivos["xl/worksheets/sheet1.xml"];
    const textos = arquivos["xl/sharedStrings.xml"];
    expect(planilha).toBeTruthy();

    // nenhuma fórmula
    expect(planilha).not.toContain("<f>");
    expect(planilha).not.toContain("<f ");

    // toda célula é do tipo texto (t="s"): nenhuma é número, data nem fórmula
    const celulas = planilha.match(/<c [^>]*>/g) ?? [];
    expect(celulas.length).toBeGreaterThan(15); // cabeçalho + uma linha de dados
    for (const celula of celulas) expect(celula).toContain('t="s"');

    // o conteúdo está lá, exatamente como foi digitado (sem apóstrofo na frente)
    for (const texto of ["=HYPERLINK(", "=1+1", "+55 53 99999-9999", "-2+3", "@SUM(1,2)", "=cmd|"]) {
      expect(textos).toContain(texto);
    }
    expect(textos).not.toContain("'=HYPERLINK");
    expect(textos).not.toContain("'+55");
  });

  it("vale também para a planilha do Kids e a de frequência", async () => {
    const kids = lerZip(
      await gerarXlsx(
        abaInscritosKids([crianca({ criancaNome: "=1+1", responsavelNome: perigosos[0], saudeObservacao: "@SUM(1,2)" })])
      )
    );
    expect(kids["xl/worksheets/sheet1.xml"]).not.toContain("<f");
    expect(kids["xl/sharedStrings.xml"]).toContain("=1+1");

    const freq = lerZip(
      await gerarXlsx(abaFrequencia([{ nome: "=1+1", grupo: "@grupo", cenaculoFeito: null, presencas: [] }]))
    );
    expect(freq["xl/worksheets/sheet1.xml"]).not.toContain("<f");
    expect(freq["xl/sharedStrings.xml"]).toContain("=1+1");
  });
});

describe("nome do arquivo para download", () => {
  const hoje = new Date("2026-10-22T02:30:00Z"); // ainda é dia 21 em Brasília

  it("tira acentos e símbolos e usa o dia de hoje em Brasília", () => {
    expect(nomeDeArquivo("Inscritos", "83º Cenáculo / São José", hoje)).toBe("Inscritos_83_Cenaculo_Sao_Jose_2026-10-21.xlsx");
  });

  it("usa um nome padrão quando a descrição não tem letras nem números", () => {
    expect(nomeDeArquivo("Kids", "***", hoje)).toBe("Kids_evento_2026-10-21.xlsx");
  });

  it("não deixa caracteres perigosos passarem para o cabeçalho de download", () => {
    const nome = nomeDeArquivo("Inscritos", 'a"; filename="x.exe\r\nSet-Cookie: y=1', hoje);
    expect(nome).toMatch(/^[A-Za-z0-9_.-]+$/);
  });
});
