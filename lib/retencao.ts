import type { PrismaClient } from "@prisma/client";
import { PRAZO_GUARDA_MESES } from "./privacidade";

// Regra de guarda dos dados (LGPD), usada pelo script scripts/lgpd-limpar.ts.
// - Inscrições (adultos e Kids): apagadas PRAZO_GUARDA_MESES depois do FIM do evento (início + duração em dias).
//   As notas internas ligadas a elas saem junto (o banco apaga em cascata).
// - Lista de espera: apagada PRAZO_GUARDA_MESES depois do cadastro.
// O evento em si (nome, data, fotos) não é dado pessoal e fica. Contas da coordenação e membros/frequência têm outra regra (docs/LGPD.md).
// Usa imports relativos (sem "@/") para poder rodar fora do Next, e recebe o Prisma de fora.

const UM_DIA_MS = 24 * 60 * 60 * 1000;

// A data a partir da qual um dado já passou do prazo: o que for MAIS ANTIGO que isto vence.
export function limiteDeGuarda(agora: Date): Date {
  const limite = new Date(agora);
  limite.setUTCMonth(limite.getUTCMonth() - PRAZO_GUARDA_MESES);
  return limite;
}

export function fimDoEvento(evento: { dataInicio: Date; duracaoDias: number }): Date {
  return new Date(evento.dataInicio.getTime() + evento.duracaoDias * UM_DIA_MS);
}

export type Vencidos = {
  limite: Date;
  eventos: { id: string; nome: string; fim: Date }[];
  inscricoes: number;
  inscricoesKids: number;
  notas: number;
  preCadastros: number;
};

// O que já passou do prazo. Só consulta, não apaga nada.
export async function levantarVencidos(prisma: PrismaClient, agora: Date = new Date()): Promise<Vencidos> {
  const limite = limiteDeGuarda(agora);

  // Eventos que começaram antes do limite são candidatos; o fim exato (início + duração) é conferido aqui.
  const candidatos = await prisma.evento.findMany({
    where: { dataInicio: { lt: limite } },
    select: { id: true, nome: true, dataInicio: true, duracaoDias: true },
  });
  const eventos = candidatos
    .map((e) => ({ id: e.id, nome: e.nome, fim: fimDoEvento(e) }))
    .filter((e) => e.fim.getTime() < limite.getTime());
  const eventoIds = eventos.map((e) => e.id);

  const [inscricoes, inscricoesKids, notas, preCadastros] = await Promise.all([
    prisma.inscricao.count({ where: { eventoId: { in: eventoIds } } }),
    prisma.inscricaoKids.count({ where: { eventoId: { in: eventoIds } } }),
    prisma.observacao.count({
      where: { OR: [{ inscricao: { eventoId: { in: eventoIds } } }, { inscricaoKids: { eventoId: { in: eventoIds } } }] },
    }),
    prisma.preCadastro.count({ where: { criadoEm: { lt: limite } } }),
  ]);

  return { limite, eventos, inscricoes, inscricoesKids, notas, preCadastros };
}

// Apaga o que passou do prazo, numa transação (ou apaga tudo, ou nada). Devolve o que foi levantado antes de apagar.
export async function apagarVencidos(prisma: PrismaClient, agora: Date = new Date()): Promise<Vencidos> {
  const vencidos = await levantarVencidos(prisma, agora);
  const eventoIds = vencidos.eventos.map((e) => e.id);

  await prisma.$transaction([
    prisma.inscricao.deleteMany({ where: { eventoId: { in: eventoIds } } }), // as notas saem em cascata
    prisma.inscricaoKids.deleteMany({ where: { eventoId: { in: eventoIds } } }),
    prisma.preCadastro.deleteMany({ where: { criadoEm: { lt: vencidos.limite } } }),
  ]);
  return vencidos;
}
