import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    // Agora receberemos email e senha da tela de login
    const { email, senha } = await request.json();

    // 1. Busca o usuário no banco de dados
    const admin = await prisma.admin.findUnique({
      where: { email: email }
    });

    if (!admin) {
      return NextResponse.json({ error: 'Usuário não encontrado!' }, { status: 401 });
    }

    // 2. Compara a senha digitada com o Hash do banco de dados
    const senhaValida = await bcrypt.compare(senha, admin.senha);

    if (senhaValida) {
      const response = NextResponse.json({ message: 'Login efetuado!' }, { status: 200 });
      
      // Entrega o Cookie, agora guardando o ID do Admin para sabermos quem está logado
      response.cookies.set({
        name: 'cenaculo-admin-token',
        value: admin.id, // No futuro, isso será um JWT. Por enquanto, o ID resolve.
        httpOnly: true,
        path: '/',
        maxAge: 86400, // 1 dia
      });

      return response;
    }

    return NextResponse.json({ error: 'Senha incorreta!' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
  }
}