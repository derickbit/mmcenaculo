// Sessão assinada (HMAC-SHA256) usando apenas Web Crypto.
// Funciona no middleware (Edge) e nas rotas (Node), sem dependências extras.

export const COOKIE_SESSAO = "cenaculo-session";
export const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 8; // 8 horas

export type Sessao = {
  sub: string; // nome do usuário
  pa: boolean; // true = ainda precisa trocar a senha (primeiro acesso)
  exp: number; // expiração em segundos desde 1970
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function lerSegredo(): string {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || segredo.length < 32) {
    // Falha de forma explícita: sem segredo forte não existe sessão segura.
    throw new Error("SESSION_SECRET ausente ou com menos de 32 caracteres.");
  }
  return segredo;
}

async function importarChave(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function paraBase64Url(bytes: Uint8Array): string {
  let binario = "";
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> {
  const preenchimento = "=".repeat((4 - (texto.length % 4)) % 4);
  const binario = atob(texto.replace(/-/g, "+").replace(/_/g, "/") + preenchimento);
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

export async function criarToken(usuario: string, primeiroAcesso: boolean): Promise<string> {
  const chave = await importarChave(lerSegredo());
  const sessao: Sessao = {
    sub: usuario,
    pa: primeiroAcesso,
    exp: Math.floor(Date.now() / 1000) + DURACAO_SESSAO_SEGUNDOS,
  };
  const corpo = paraBase64Url(encoder.encode(JSON.stringify(sessao)));
  const assinatura = await crypto.subtle.sign("HMAC", chave, encoder.encode(corpo));
  return `${corpo}.${paraBase64Url(new Uint8Array(assinatura))}`;
}

export async function verificarToken(token?: string | null): Promise<Sessao | null> {
  const chave = await importarChave(lerSegredo()); // lança erro se o segredo estiver errado
  if (!token) return null;

  const partes = token.split(".");
  if (partes.length !== 2) return null;
  const [corpo, assinatura] = partes;

  try {
    // crypto.subtle.verify compara a assinatura em tempo constante
    const valido = await crypto.subtle.verify(
      "HMAC",
      chave,
      deBase64Url(assinatura),
      encoder.encode(corpo)
    );
    if (!valido) return null;

    const sessao = JSON.parse(decoder.decode(deBase64Url(corpo)));
    if (
      typeof sessao.sub !== "string" ||
      typeof sessao.pa !== "boolean" ||
      typeof sessao.exp !== "number"
    ) {
      return null;
    }
    if (sessao.exp < Date.now() / 1000) return null;
    return sessao as Sessao;
  } catch {
    return null;
  }
}

export function opcoesCookieSessao() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  };
}
