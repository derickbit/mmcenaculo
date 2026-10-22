import { createHash, randomBytes } from "node:crypto";

// Regras do convite que não precisam de banco (por isso ficam separadas de lib/convite.ts e são fáceis de testar).

export const DURACAO_CONVITE_MS = 48 * 60 * 60 * 1000; // o convite vale 48 horas
export const SENHA_MINIMA = 10;
// O bcrypt só usa os 72 primeiros bytes da senha; mais que isso seria ignorado em silêncio.
export const SENHA_MAXIMA_BYTES = 72;

export const PAPEIS = ["ADMIN", "COORDENACAO"] as const;
export type Papel = (typeof PAPEIS)[number];

// Código do link: 256 bits aleatórios, impossível de adivinhar.
export function gerarCodigo(): string {
  return randomBytes(32).toString("base64url");
}

// No banco fica só o hash do código: se o banco vazar, os links não vazam junto.
export function hashDoCodigo(codigo: string): string {
  return createHash("sha256").update(codigo).digest("hex");
}

// Usuário: 3 a 30 caracteres; letras sem acento, números, ponto, hífen e sublinhado.
export function validarNomeUsuario(nome: string): string | null {
  if (nome.length < 3 || nome.length > 30) return "O usuário precisa ter de 3 a 30 caracteres.";
  if (!/^[A-Za-z0-9._-]+$/.test(nome)) return "Use só letras sem acento, números, ponto, hífen ou sublinhado.";
  return null;
}

export function validarSenha(senha: string): string | null {
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (Buffer.byteLength(senha, "utf8") > SENHA_MAXIMA_BYTES) return `A senha pode ter no máximo ${SENHA_MAXIMA_BYTES} caracteres.`;
  return null;
}

export type EstadoConvite = "VALIDO" | "INEXISTENTE" | "EXPIRADO" | "USADO" | "REVOGADO";

export function estadoDoConvite(
  convite: { usadoEm: Date | null; revogadoEm: Date | null; expiraEm: Date },
  agora: Date = new Date()
): Exclude<EstadoConvite, "INEXISTENTE"> {
  if (convite.usadoEm) return "USADO";
  if (convite.revogadoEm) return "REVOGADO";
  if (convite.expiraEm <= agora) return "EXPIRADO";
  return "VALIDO";
}
