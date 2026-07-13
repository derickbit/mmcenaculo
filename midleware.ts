import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Verifica se o navegador do usuário tem o nosso cookie de segurança
  const temCookie = request.cookies.has('cenaculo-admin-token');

  // Se a pessoa tentar acessar qualquer coisa dentro de /admin (exceto a tela de login)
  if (path.startsWith('/admin') && path !== '/admin/login') {
    if (!temCookie) {
      // Chuta de volta para o login
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Se a pessoa já estiver logada e tentar acessar a tela de login, manda direto pro painel
  if (path === '/admin/login' && temCookie) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

// Configura o middleware para rodar APENAS nas rotas de admin (para não deixar o site lento)
export const config = {
  matcher: ['/admin/:path*'],
};