import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logout realizado' });
  // Deleta o cookie de autenticação
  response.cookies.delete('cenaculo-admin-token');
  return response;
}