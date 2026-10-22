// Regra da senha. Arquivo simples (sem bibliotecas do servidor), para valer também no navegador:
// a tela avisa na hora e o servidor confere de novo.

export const SENHA_MINIMA = 10;
// O bcrypt só usa os 72 primeiros bytes da senha; mais que isso seria ignorado em silêncio.
export const SENHA_MAXIMA_BYTES = 72;

export function validarSenha(senha: string): string | null {
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (new TextEncoder().encode(senha).length > SENHA_MAXIMA_BYTES) return `A senha pode ter no máximo ${SENHA_MAXIMA_BYTES} caracteres.`;
  return null;
}
