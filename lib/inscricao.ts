import { z } from "zod";
import { PARENTESCOS, idadeEm } from "./kids";
import { telefoneValido } from "./telefone";

// As constantes e o cálculo de idade ficam em lib/kids.ts (sem zod); são reexportados aqui por conveniência.
export { PARENTESCOS, FAIXA_KIDS, idadeEm, foraDaFaixaKids } from "./kids";

// Regras de entrada das inscrições. A API valida o que chega do formulário com estes schemas.
// Adulto: campos extras são ignorados. Kids: campo extra é REJEITADO (nada além do mínimo é aceito).

const IDADE_MAXIMA_CRIANCA = 17;

const limpar = (s: string) => s.trim().replace(/\s+/g, " ");

// ---------- datas ----------

function lerData(texto: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const existe = data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  return existe ? data : null;
}

// ---------- peças reutilizáveis ----------

const obrigatorio = (rotulo: string, max: number) =>
  z
    .string({ error: `${rotulo} é obrigatório.` })
    .transform(limpar)
    .pipe(z.string().min(1, `${rotulo} é obrigatório.`).max(max, `${rotulo}: máximo de ${max} caracteres.`));

const opcional = (rotulo: string, max: number) =>
  z
    .string()
    .nullish()
    .transform((v) => limpar(v ?? "") || undefined)
    .pipe(z.string().max(max, `${rotulo}: máximo de ${max} caracteres.`).optional());

const email = (rotulo: string) =>
  z
    .string({ error: `${rotulo} é obrigatório.` })
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.email(`${rotulo} inválido.`).max(254, `${rotulo}: máximo de 254 caracteres.`));

const telefone = (rotulo: string) =>
  obrigatorio(rotulo, 20).refine((t) => telefoneValido(t), `${rotulo} inválido. Use DDD + número.`);

const dataNascimento = (rotulo: string) =>
  z
    .string({ error: `${rotulo} é obrigatória.` })
    .transform((s) => s.trim())
    .refine((s) => lerData(s) !== null, `${rotulo} inválida.`)
    .transform((s) => lerData(s) as Date)
    .refine((d) => d.getUTCFullYear() >= 1900, `${rotulo} inválida.`)
    .refine((d) => d.getTime() <= Date.now(), `${rotulo} não pode estar no futuro.`);

const eventoId = z.string({ error: "Evento é obrigatório." }).min(1, "Evento é obrigatório.").max(64, "Evento inválido.");

const titulo = (s: string) =>
  s.toLocaleLowerCase("pt-BR").replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toLocaleUpperCase("pt-BR"));

// ---------- adulto ----------

export const inscricaoAdultoSchema = z.object({
  eventoId,
  nomeCompleto: obrigatorio("Nome completo", 120),
  email: email("E-mail"),
  telefone: telefone("Telefone"),
  cidade: obrigatorio("Cidade", 80),
  dataNascimento: dataNascimento("Data de nascimento"),
  instagram: opcional("Instagram", 60),
  jaFezCenaculo: opcional("Já fez Cenáculo", 60),
  paroquiaAtuante: opcional("Paróquia", 120),
  problemaSaude: opcional("Problema de saúde", 300),
  medicacaoControlada: opcional("Medicação", 300),
  restricaoAlimentar: opcional("Restrição alimentar", 300),
  atendimentoEspecial: opcional("Atendimento especial", 300),
  comoConheceu: opcional("Como conheceu", 120),
});

// ---------- Kids ----------

const nomeCrianca = obrigatorio("Nome da criança", 40)
  .refine((n) => /^\p{L}[\p{L}'-]*(?: \p{L}[\p{L}'-]*)?$/u.test(n), "Informe apenas o primeiro nome, usando só letras.")
  .transform(titulo);

export const inscricaoKidsSchema = z
  .strictObject({
    eventoId,
    // Criança: só dados simples
    criancaNome: nomeCrianca,
    criancaNascimento: dataNascimento("Data de nascimento da criança").refine(
      (d) => idadeEm(d, new Date()) <= IDADE_MAXIMA_CRIANCA,
      "Data de nascimento da criança inválida."
    ),
    saudeObservacao: opcional("Observação de saúde", 300),
    saudeComEquipe: z.boolean().default(false),
    // Responsável
    responsavelNome: obrigatorio("Nome do responsável", 120),
    responsavelTelefone: telefone("Telefone do responsável"),
    responsavelEmail: email("E-mail do responsável"),
    parentesco: z.enum(PARENTESCOS, { error: "Selecione o parentesco." }),
    // O aceite é do responsável; a data do aceite é gravada pelo servidor, não vem do navegador.
    consentimento: z.literal(true, { error: "É necessário o consentimento do responsável." }),
  })
  // Quem prefere falar com a equipe não registra o texto de saúde.
  .transform((d) => ({ ...d, saudeObservacao: d.saudeComEquipe ? undefined : d.saudeObservacao }));

// ---------- lista de espera (pré-cadastro) ----------

export const TIPOS_PRE_CADASTRO = ["CENACULO", "KIDS", "CENACULAO"] as const;

export const preCadastroSchema = z.object({
  nome: obrigatorio("Nome", 120),
  email: email("E-mail"),
  telefone: telefone("Telefone"),
  tipo: z.enum(TIPOS_PRE_CADASTRO, { error: "Selecione o retiro." }),
});

// ---------- resultado ----------

export type ResultadoValidacao<T> = { ok: true; dados: T } | { ok: false; erros: Record<string, string> };

// Devolve uma mensagem por campo (a primeira), no formato { campo: "mensagem" }.
export function validar<S extends z.ZodType>(schema: S, entrada: unknown): ResultadoValidacao<z.output<S>> {
  const resultado = schema.safeParse(entrada);
  if (resultado.success) return { ok: true, dados: resultado.data };

  const erros: Record<string, string> = {};
  for (const problema of resultado.error.issues) {
    if (problema.code === "unrecognized_keys") {
      erros._geral ??= `Campos não permitidos: ${problema.keys.join(", ")}.`;
    } else {
      erros[problema.path.length ? String(problema.path[0]) : "_geral"] ??= problema.message;
    }
  }
  return { ok: false, erros };
}
