// Constantes e funções do Cenáculo Kids usadas pelo formulário, pelo painel e pela validação.
// Arquivo simples de propósito (sem bibliotecas), para poder ser usado também no navegador.

import { EMAIL_PRIVACIDADE, PRAZO_GUARDA_TEXTO } from "./privacidade";

export const PARENTESCOS = ["MAE", "PAI", "AVO", "TIO", "RESPONSAVEL_LEGAL", "OUTRO"] as const;
export type Parentesco = (typeof PARENTESCOS)[number];

export const PARENTESCO_ROTULOS: Record<Parentesco, string> = {
  MAE: "Mãe",
  PAI: "Pai",
  AVO: "Avó / Avô",
  TIO: "Tio / Tia",
  RESPONSAVEL_LEGAL: "Responsável legal",
  OUTRO: "Outro",
};

// Faixa do Cenáculo Kids. Fora dela a inscrição é aceita, mas a equipe é avisada no painel.
export const FAIXA_KIDS = { min: 8, max: 10 };

// Idade completa em `referencia`, contando pelo calendário (UTC, como as datas ficam no banco).
export function idadeEm(nascimento: Date, referencia: Date): number {
  const idade = referencia.getUTCFullYear() - nascimento.getUTCFullYear();
  const jaFezAniversario =
    referencia.getUTCMonth() > nascimento.getUTCMonth() ||
    (referencia.getUTCMonth() === nascimento.getUTCMonth() && referencia.getUTCDate() >= nascimento.getUTCDate());
  return jaFezAniversario ? idade : idade - 1;
}

// A criança está fora de 8 a 10 anos na data do evento? (usado para avisar a equipe)
export function foraDaFaixaKids(nascimento: Date, dataEvento: Date): boolean {
  const idade = idadeEm(nascimento, dataEvento);
  return idade < FAIXA_KIDS.min || idade > FAIXA_KIDS.max;
}

// Texto do aceite do responsável (LGPD). A coordenação deve ler e aprovar antes do lançamento.
export const TEXTO_CONSENTIMENTO =
  "Declaro que sou o responsável legal pela criança acima e autorizo o Movimento Mariano Cenáculo (MMC) a usar os dados " +
  "informados neste formulário somente para organizar a participação dela no evento e para entrar em contato comigo. " +
  "Informei apenas o necessário. Se eu informar alergia, restrição alimentar ou uso de medicação, autorizo o uso dessa " +
  "informação apenas para o cuidado da criança durante o evento. Os dados ficam guardados por até " + PRAZO_GUARDA_TEXTO +
  " depois do evento e depois são apagados. Sei que posso pedir acesso, correção ou exclusão a qualquer momento pelo e-mail " +
  EMAIL_PRIVACIDADE + ".";
