import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { COOKIE_SESSAO, verificarToken } from "@/lib/session";

// A sessão de quem está logado, já conferida no banco.
export type SessaoValida = {
  sub: string; // identificador da conta
  nome: string;
  papel: string; // ADMIN ou COORDENACAO
};

// Lê a sessão do cookie, validando a assinatura e a expiração, e confere no banco que a conta ainda vale:
// existe, está ativa e o cookie não foi emitido antes de uma redefinição de senha.
// É por isso que desativar uma conta (ou redefinir a senha dela) vale NA HORA, mesmo com a pessoa logada.
export async function lerSessao(): Promise<SessaoValida | null> {
  const armazenamento = await cookies();
  const token = await verificarToken(armazenamento.get(COOKIE_SESSAO)?.value);
  if (!token) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: token.sub },
    select: { id: true, nome: true, papel: true, ativo: true, sessoesValidasDesde: true },
  });
  if (!usuario || !usuario.ativo) return null;
  if (token.iat < usuario.sessoesValidasDesde.getTime()) return null;

  return { sub: usuario.id, nome: usuario.nome, papel: usuario.papel };
}

// Use no início de páginas do painel que mostram dados: sem sessão válida, vai para o login
// (assim a página não depende só do proxy, que é apenas uma checagem rápida).
export async function exigirSessaoPagina(): Promise<SessaoValida> {
  const sessao = await lerSessao();
  if (!sessao) redirect("/painelmmc/login");
  return sessao;
}

// Páginas que só o ADMIN pode ver (gestão de contas): quem é da coordenação volta para o painel.
export async function exigirAdminPagina(): Promise<SessaoValida> {
  const sessao = await exigirSessaoPagina();
  if (sessao.papel !== "ADMIN") redirect("/painelmmc");
  return sessao;
}

// Use no início de toda Server Action do painel admin.
// Barra quem não está logado (e conta desativada ou sessão derrubada: ver lerSessao).
export async function exigirSessao(): Promise<SessaoValida> {
  const sessao = await lerSessao();
  if (!sessao) {
    throw new Error("Não autorizado");
  }
  return sessao;
}

// Ações que só o ADMIN pode fazer (gestão de contas).
export async function exigirAdmin(): Promise<SessaoValida> {
  const sessao = await exigirSessao();
  if (sessao.papel !== "ADMIN") throw new Error("Não autorizado");
  return sessao;
}
