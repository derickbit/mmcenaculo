// Dados de contato e prazo de guarda que aparecem nos avisos de privacidade e nos textos de consentimento.
// Ficam num lugar só para a página, os formulários e a rotina de limpeza (passo 9) nunca discordarem.

export const EMAIL_PRIVACIDADE = "mmcenaculopel@gmail.com";

// Quanto tempo os dados ficam guardados depois do evento (ou, na lista de espera, depois do cadastro).
// Decisão da coordenação: 1 ano, porque há dois Cenáculos por ano e o Cenaculão, no fim do ano, é só para quem já fez o curso.
export const PRAZO_GUARDA_MESES = 12;
export const PRAZO_GUARDA_TEXTO = "1 ano";

// Texto do aceite do adulto (LGPD). Há dado de saúde no formulário, que é dado sensível: o aceite é obrigatório e fica datado.
// A coordenação deve ler e aprovar antes do lançamento. O do Kids (responsável pela criança) fica em lib/kids.ts.
export const TEXTO_CONSENTIMENTO_ADULTO =
  "Concordo que o Movimento Mariano Cenáculo (MMC) use os dados informados neste formulário para organizar o evento e " +
  "entrar em contato comigo. Se eu informar problema de saúde, medicação ou restrição alimentar, autorizo o uso dessa " +
  "informação apenas para o cuidado comigo durante o evento. Os dados ficam guardados por até " + PRAZO_GUARDA_TEXTO +
  " depois do evento e depois são apagados. Posso pedir acesso, correção ou exclusão a qualquer momento pelo e-mail " +
  EMAIL_PRIVACIDADE + ".";

// Prazo para responder a um pedido do titular dos dados (a lei dá até 15 dias).
export const PRAZO_RESPOSTA_DIAS = 15;
