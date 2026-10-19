import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESSAO, verificarToken } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // A tela de login é a única rota do admin aberta sem sessão.
  if (path === "/admin/login") return NextResponse.next();

  const sessao = await verificarToken(request.cookies.get(COOKIE_SESSAO)?.value);

  if (!sessao) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Senha provisória: só pode acessar a tela de troca de senha.
  if (sessao.pa && path !== "/admin/setup") {
    return NextResponse.redirect(new URL("/admin/setup", request.url));
  }

  // Quem já trocou a senha não tem o que fazer no setup.
  if (!sessao.pa && path === "/admin/setup") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
