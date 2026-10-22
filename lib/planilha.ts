import writeExcelFile from "write-excel-file/node";
import type { SheetData } from "write-excel-file/node";
import { FAIXA_KIDS, PARENTESCO_ROTULOS, foraDaFaixaKids, idadeEm, type Parentesco } from "@/lib/kids";

// Montagem das planilhas exportadas pelo painel. As linhas são montadas por funções simples (fáceis de testar) e o arquivo
// .xlsx é gerado no servidor, depois de conferir o login (ver as rotas em app/api/admin/exportar).
//
// Segurança: texto vindo do formulário público é sempre gravado como TEXTO. O .xlsx tem um tipo de célula próprio para
// fórmulas, e esta biblioteca só o usa se pedirmos; por isso um nome como "=HYPERLINK(...)" aparece como texto e não é
// executado ao abrir. Os dados NÃO são alterados (nada de apóstrofo na frente). Um teste confere isso abrindo o arquivo.

type NotaExport = { criadoEm: Date; texto: string; usuario: { nome: string } };

export type InscricaoAdultoExport = {
  nomeCompleto: string;
  telefone: string;
  email: string;
  instagram: string | null;
  dataNascimento: Date;
  cidade: string;
  jaFezCenaculo: string | null;
  paroquiaAtuante: string | null;
  problemaSaude: string | null;
  medicacaoControlada: string | null;
  restricaoAlimentar: string | null;
  atendimentoEspecial: string | null;
  comoConheceu: string | null;
  criadoEm: Date;
  observacoes: NotaExport[];
};

export type InscricaoKidsExport = {
  criancaNome: string;
  criancaNascimento: Date;
  saudeObservacao: string | null;
  saudeComEquipe: boolean;
  responsavelNome: string;
  responsavelTelefone: string;
  responsavelEmail: string;
  parentesco: string;
  consentimentoEm: Date;
  criadoEm: Date;
  evento: { nome: string; dataInicio: Date };
  observacoes: NotaExport[];
};

export type MembroExport = {
  nome: string;
  grupo: string;
  cenaculoFeito: string | null;
  presencas: { atividade?: { nome: string } | null }[];
};

export type Aba = { nome: string; linhas: SheetData; larguras: number[] };

// ---------- formatação ----------

const FUSO = "America/Sao_Paulo";
// Datas de nascimento ficam no banco como meia-noite UTC; as demais são horários de verdade, mostrados em Brasília.
const dataNascimentoBR = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
const dataBR = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: FUSO });
const dataHoraBR = (d: Date) => d.toLocaleString("pt-BR", { timeZone: FUSO });

const ou = (valor: string | null | undefined) => valor || "-";

const notas = (observacoes: NotaExport[]) =>
  observacoes.length > 0 ? observacoes.map((o) => `[${dataBR(o.criadoEm)} por ${o.usuario.nome}]: ${o.texto}`).join(" | ") : "-";

const cabecalho = (titulos: string[]) => titulos.map((value) => ({ value, fontWeight: "bold" as const }));

// ---------- as três planilhas ----------

export function abaInscritosAdultos(inscricoes: InscricaoAdultoExport[]): Aba {
  const linhas: SheetData = [
    cabecalho([
      "Nome Completo", "Telefone", "E-mail", "Instagram", "Data de Nascimento", "Cidade", "Já fez Cenáculo?", "Paróquia",
      "Problema de Saúde", "Medicação", "Restrição Alimentar", "Atendimento Especial", "Como Conheceu", "Data da Inscrição",
      "Observações Internas (Auditoria)",
    ]),
    ...inscricoes.map((i) => [
      i.nomeCompleto, i.telefone, i.email, ou(i.instagram), dataNascimentoBR(i.dataNascimento), i.cidade, ou(i.jaFezCenaculo),
      ou(i.paroquiaAtuante), ou(i.problemaSaude), ou(i.medicacaoControlada), ou(i.restricaoAlimentar), ou(i.atendimentoEspecial),
      ou(i.comoConheceu), dataHoraBR(i.criadoEm), notas(i.observacoes),
    ]),
  ];
  return { nome: "Inscritos", linhas, larguras: [30, 18, 30, 18, 14, 18, 16, 36, 30, 24, 24, 22, 22, 20, 50] };
}

export function abaInscritosKids(inscricoes: InscricaoKidsExport[]): Aba {
  const linhas: SheetData = [
    cabecalho([
      "Criança", "Idade no evento", "Data de Nascimento", `Fora da faixa ${FAIXA_KIDS.min}-${FAIXA_KIDS.max}?`, "Saúde",
      "Responsável", "Parentesco", "Telefone do responsável", "E-mail do responsável", "Consentimento em", "Data da Inscrição", "Evento",
      "Observações Internas (Auditoria)",
    ]),
    ...inscricoes.map((i) => [
      i.criancaNome,
      idadeEm(i.criancaNascimento, i.evento.dataInicio),
      dataNascimentoBR(i.criancaNascimento),
      foraDaFaixaKids(i.criancaNascimento, i.evento.dataInicio) ? "Sim" : "Não",
      i.saudeComEquipe ? "Falar com a equipe no dia" : ou(i.saudeObservacao),
      i.responsavelNome,
      PARENTESCO_ROTULOS[i.parentesco as Parentesco] ?? i.parentesco,
      i.responsavelTelefone,
      i.responsavelEmail,
      dataHoraBR(i.consentimentoEm),
      dataHoraBR(i.criadoEm),
      i.evento.nome,
      notas(i.observacoes),
    ]),
  ];
  return { nome: "Inscritos Kids", linhas, larguras: [18, 14, 14, 18, 34, 30, 16, 24, 32, 20, 20, 24, 50] };
}

export function abaFrequencia(membros: MembroExport[]): Aba {
  const linhas: SheetData = [
    cabecalho(["Nome", "Grupo", "Cenáculo", "Total de Presenças", "Eventos Frequentados"]),
    ...membros.map((m) => [
      m.nome,
      m.grupo,
      m.cenaculoFeito ? `${m.cenaculoFeito}º` : "N/A",
      m.presencas.length,
      m.presencas.map((p) => p.atividade?.nome).filter(Boolean).join(", ") || "Nenhum evento registrado",
    ]),
  ];
  return { nome: "Relatorio_Frequencia", linhas, larguras: [30, 24, 12, 16, 60] };
}

// ---------- o arquivo ----------

export async function gerarXlsx(aba: Aba): Promise<Buffer> {
  return writeExcelFile([{ data: aba.linhas, sheet: aba.nome, columns: aba.larguras.map((width) => ({ width })) }]).toBuffer();
}

// Nome do arquivo para download: sem acentos nem símbolos, com o dia de hoje (em Brasília).
export function nomeDeArquivo(prefixo: string, descricao: string, agora: Date = new Date()): string {
  const limpo = descricao.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const dia = agora.toLocaleDateString("sv-SE", { timeZone: FUSO });
  return `${prefixo}_${limpo || "evento"}_${dia}.xlsx`;
}

export const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
