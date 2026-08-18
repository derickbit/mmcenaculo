import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 🔴 Liberamos o /admin/login E TAMBÉM o /admin/setup
  if (path.startsWith('/admin') && path !== '/admin/login' && path !== '/admin/setup') {
    
    const temSessao = request.cookies.has('cenaculo-admin-token');

    if (!temSessao) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};