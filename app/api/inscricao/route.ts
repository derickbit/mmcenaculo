import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getStatusReal } from "@/lib/eventos";
import { inscricaoAdultoSchema, inscricaoKidsSchema, validar } from "@/lib/inscricao";

const erro = (status: number, mensagem: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error: mensagem, ...extra }, { status });

export async function POST(request: Request) {
  // 1. Corpo precisa ser um JSON com o id do evento
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return erro(400, "Requisição inválida.");
  }

  const eventoId = typeof corpo === "object" && corpo !== null ? (corpo as { eventoId?: unknown }).eventoId : undefined;
  if (typeof eventoId !== "string" || eventoId === "" || eventoId.length > 64) {
    return erro(400, "O ID do evento é obrigatório para realizar a inscrição.");
  }

  try {
    // 2. O evento precisa existir
    const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) return erro(404, "Evento não encontrado.");

    // 3. E precisa estar aberto AGORA, conferido no servidor (a página esconder o formulário não basta)
    if (getStatusReal(evento) !== "ABERTO") {
      return erro(403, "As inscrições para este evento não estão abertas.");
    }

    // 4. Validação, com regras diferentes para Kids e adulto
    if (evento.tipo === "KIDS") {
      const r = validar(inscricaoKidsSchema, corpo);
      if (!r.ok) return erro(400, `Confira os dados informados: ${Object.values(r.erros)[0]}`, { campos: r.erros });

      // 5. Gravação com campos explícitos: só entra o que foi combinado. O aceite (LGPD) é datado pelo servidor.
      await prisma.inscricaoKids.create({
        data: {
          eventoId: evento.id,
          criancaNome: r.dados.criancaNome,
          criancaNascimento: r.dados.criancaNascimento,
          saudeObservacao: r.dados.saudeObservacao,
          saudeComEquipe: r.dados.saudeComEquipe,
          responsavelNome: r.dados.responsavelNome,
          responsavelTelefone: r.dados.responsavelTelefone,
          responsavelEmail: r.dados.responsavelEmail,
          parentesco: r.dados.parentesco,
          consentimentoEm: new Date(),
        },
      });
    } else {
      const r = validar(inscricaoAdultoSchema, corpo);
      if (!r.ok) return erro(400, `Confira os dados informados: ${Object.values(r.erros)[0]}`, { campos: r.erros });

      await prisma.inscricao.create({ data: { ...r.dados, eventoId: evento.id } });
    }

    // 7. Resposta sem nenhum dado da inscrição (nem de saúde)
    return NextResponse.json({ message: "Inscrição realizada com sucesso!" }, { status: 201 });
  } catch (error) {
    // 6. Duplicidade (regra do banco, vale também para envios simultâneos). Mensagem genérica de propósito:
    // não confirma a ninguém que um e-mail ou uma criança já está inscrita.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return erro(
        409,
        "Não foi possível concluir a inscrição com os dados informados. Se você já se inscreveu, é só aguardar o contato da equipe."
      );
    }
    console.error("Erro ao salvar inscrição:", error);
    return erro(500, "Ocorreu um erro ao processar a inscrição.");
  }
}
