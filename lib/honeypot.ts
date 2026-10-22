// Proteção simples contra robôs que preenchem formulários (honeypot).
// Cada formulário público tem um campo escondido (a "isca") e o horário em que foi aberto.
// - Isca preenchida: pessoa de verdade não vê o campo, só robô preenche.
// - Enviado rápido demais (menos de TEMPO_MINIMO_MS depois de aberto): humano não preenche tão depressa.
// Quando parece robô, o servidor finge que deu certo e descarta, para o robô não perceber que foi barrado.
// Limite conhecido: o horário vem do navegador, então um robô esperto consegue falsificá-lo.

export const CAMPO_ISCA = "website";
export const CAMPO_ABERTURA = "abertoEm";
export const TEMPO_MINIMO_MS = 1000;

export function pareceRobo(
  entrada: Record<string, unknown> | null | undefined,
  opcoes: { exigirAbertura?: boolean; agora?: number } = {}
): boolean {
  const { exigirAbertura = false, agora = Date.now() } = opcoes;
  const dados = entrada ?? {};

  const isca = dados[CAMPO_ISCA];
  if (isca !== undefined && isca !== null && String(isca).trim() !== "") return true;

  const bruto = dados[CAMPO_ABERTURA];
  const aberto = bruto === undefined || bruto === null || bruto === "" ? NaN : Number(bruto);
  if (!Number.isFinite(aberto)) return exigirAbertura; // ausente ou inválido

  return agora - aberto < TEMPO_MINIMO_MS;
}
