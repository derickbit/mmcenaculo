import { cookies } from "next/headers";
import { COOKIE_SESSAO, verificarToken, type Sessao } from "@/lib/session";

// Lê a sessão do cookie, validando a assinatura e a expiração.
export async function lerSessao(): Promise<Sessao | null> {
  const armazenamento = await cookies();
  return verificarToken(armazenamento.get(COOKIE_SESSAO)?.value);
}

// Use no início de toda Server Action do painel admin.
// Barra quem não está logado e quem ainda não trocou a senha provisória.
export async function exigirSessao(): Promise<Sessao> {
  const sessao = await lerSessao();
  if (!sessao || sessao.pa) {
    throw new Error("Não autorizado");
  }
  return sessao;
}
