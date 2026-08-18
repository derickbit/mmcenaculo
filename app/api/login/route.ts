import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, senha } = body;

    const usuario = await prisma.usuario.findUnique({
      where: { nome: nome }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado!' }, { status: 401 });
    }

    let senhaValida = false;

    // Se for PRIMEIRO ACESSO, aceita texto puro ("123") ou Hash
    if (usuario.primeiroAcesso) {
      senhaValida = (senha === usuario.senha) || await bcrypt.compare(senha, usuario.senha);
    } else {
      // Se não for primeiro acesso, exige a senha criptografada normal
      senhaValida = await bcrypt.compare(senha, usuario.senha);
    }

    if (!senhaValida) {
      return NextResponse.json({ error: 'Senha incorreta!' }, { status: 401 });
    }

    const response = NextResponse.json({ 
      message: 'Login realizado com sucesso',
      primeiroAcesso: usuario.primeiroAcesso // 🔴 Avisa o frontend se é o primeiro acesso!
    }, { status: 200 });
    
    response.cookies.set('cenaculo-admin-token', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    response.cookies.set('cenaculo-user-nome', usuario.nome, {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;

  } catch (error) {
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}