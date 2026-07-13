import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. VALIDAÇÃO ESSENCIAL: Garante que o eventoId foi enviado
    if (!body.eventoId) {
      return NextResponse.json({ error: 'O ID do evento é obrigatório para realizar a inscrição.' }, { status: 400 });
    }

    // 2. REGRA DE NEGÓCIO AJUSTADA: Verifica se o e-mail já existe NO MESMO EVENTO
    const inscricaoExistente = await prisma.inscricao.findFirst({
      where: { 
        email: body.email,
        eventoId: body.eventoId // Procura o e-mail apenas nas inscrições deste curso específico
      }
    });

    if (inscricaoExistente) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado para este retiro específico!' }, { status: 400 });
    }

    const dataNascimento = new Date(body.dataNascimento).toISOString();

    // 3. GRAVAÇÃO NO BANCO RELACIONAL
    const novaInscricao = await prisma.inscricao.create({
      data: {
        nomeCompleto: body.nomeCompleto,
        email: body.email,
        instagram: body.instagram || null,
        telefone: body.telefone,
        cidade: body.cidade,
        dataNascimento: dataNascimento,
        jaFezCenaculo: body.jaFezCenaculo || null,
        paroquiaAtuante: body.paroquiaAtuante || null,
        problemaSaude: body.problemaSaude || null,
        medicacaoControlada: body.medicacaoControlada || null,
        restricaoAlimentar: body.restricaoAlimentar || null,
        atendimentoEspecial: body.atendimentoEspecial || null,
        comoConheceu: body.comoConheceu || null,
        eventoId: body.eventoId, // <-- INJETANDO A CHAVE ESTRANGEIRA AQUI
      },
    });

    return NextResponse.json({ message: 'Inscrição realizada com sucesso!', data: novaInscricao }, { status: 201 });

  } catch (error) {
    console.error("Erro ao salvar inscrição:", error);
    return NextResponse.json({ error: 'Ocorreu um erro ao processar a inscrição.' }, { status: 500 });
  }
}