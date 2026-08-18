import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Se tentar acessar o /admin e não for a página de login
  if (path.startsWith('/admin') && path !== '/admin/login') {
    
    // 🔴 AGORA O MIDDLEWARE PROCURA O NOME EXATO DO SEU COOKIE
    const temSessao = request.cookies.has('cenaculo-admin-token');

    // Se NÃO TIVER, chuta pra tela de login
    if (!temSessao) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};