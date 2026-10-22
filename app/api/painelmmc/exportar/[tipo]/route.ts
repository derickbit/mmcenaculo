import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { lerSessao } from "@/lib/auth";
import {
  TIPO_XLSX,
  abaFrequencia,
  abaInscritosAdultos,
  abaInscritosKids,
  gerarXlsx,
  nomeDeArquivo,
  type Aba,
} from "@/lib/planilha";

// Planilhas do painel (.xlsx), geradas aqui no servidor depois de conferir o login:
//   /api/painelmmc/exportar/inscritos?eventoId=...   inscritos adultos (sem eventoId: todos os eventos)
//   /api/painelmmc/exportar/kids?eventoId=...        inscritos Kids
//   /api/painelmmc/exportar/frequencia?grupo=...     relatório de frequência (sem grupo: todos)

const erro = (mensagem: string, status: number) => NextResponse.json({ error: mensagem }, { status });

const notas = { include: { usuario: { select: { nome: true } } }, orderBy: { criadoEm: "asc" as const } };

export async function GET(request: Request, { params }: { params: Promise<{ tipo: string }> }) {
  // Só quem está logado (e já trocou a senha provisória) baixa planilhas. O proxy não basta: confere-se aqui também.
  const sessao = await lerSessao();
  if (!sessao) return erro("Não autorizado", 401);

  const { tipo } = await params;
  const busca = new URL(request.url).searchParams;

  let aba: Aba;
  let arquivo: string;

  if (tipo === "inscritos" || tipo === "kids") {
    const eventoId = busca.get("eventoId") ?? "";
    const evento = eventoId ? await prisma.evento.findUnique({ where: { id: eventoId }, select: { nome: true } }) : null;
    if (eventoId && !evento) return erro("Evento não encontrado.", 404);
    const descricao = evento?.nome ?? "Todos os eventos";
    const filtro = eventoId ? { eventoId } : {};

    if (tipo === "inscritos") {
      const inscricoes = await prisma.inscricao.findMany({ where: filtro, orderBy: { criadoEm: "desc" }, include: { observacoes: notas } });
      aba = abaInscritosAdultos(inscricoes);
      arquivo = nomeDeArquivo("Inscritos", descricao);
    } else {
      const inscricoes = await prisma.inscricaoKids.findMany({
        where: filtro,
        orderBy: { criadoEm: "desc" },
        include: { evento: { select: { nome: true, dataInicio: true } }, observacoes: notas },
      });
      aba = abaInscritosKids(inscricoes);
      arquivo = nomeDeArquivo("Inscritos_Kids", descricao);
    }
  } else if (tipo === "frequencia") {
    const grupo = (busca.get("grupo") ?? "").slice(0, 80);
    const membros = await prisma.membro.findMany({
      orderBy: { nome: "asc" },
      include: { presencas: { include: { atividade: { select: { nome: true } } } } },
    });
    const doGrupo = grupo ? membros.filter((m) => m.grupo.includes(grupo)) : membros;
    aba = abaFrequencia([...doGrupo].sort((a, b) => b.presencas.length - a.presencas.length));
    arquivo = nomeDeArquivo("Relatorio_Frequencia", grupo || "Todos os grupos");
  } else {
    return erro("Relatório desconhecido.", 404);
  }

  const planilha = await gerarXlsx(aba);
  return new Response(new Uint8Array(planilha), {
    headers: {
      "Content-Type": TIPO_XLSX,
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
