import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESSAO, verificarToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // A tela de login é a única rota do admin aberta sem sessão.
  if (path === "/painelmmc/login") return NextResponse.next();

  const sessao = await verificarToken(request.cookies.get(COOKIE_SESSAO)?.value);

  if (!sessao) {
    return NextResponse.redirect(new URL("/painelmmc/login", request.url));
  }

  // Senha provisória: só pode acessar a tela de troca de senha.
  if (sessao.pa && path !== "/painelmmc/setup") {
    return NextResponse.redirect(new URL("/painelmmc/setup", request.url));
  }

  // Quem já trocou a senha não tem o que fazer no setup.
  if (!sessao.pa && path === "/painelmmc/setup") {
    return NextResponse.redirect(new URL("/painelmmc", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/painelmmc/:path*"],
};
