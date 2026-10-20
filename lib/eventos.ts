import type { Evento } from "@prisma/client";

type EventoParaStatus = Pick<Evento, "status" | "dataInicio" | "dataAbertura" | "duracaoDias">;

// Status que a coordenação vê/usa: se o status é manual, vale o manual;
// se é AUTOMATICO, é calculado pelas datas. `agora` existe para os testes poderem fixar a hora.
export function getStatusReal(evento: EventoParaStatus, agora: Date = new Date()): string {
  if (evento.status !== "AUTOMATICO") return evento.status;

  const inicio = new Date(evento.dataInicio);
  const abertura = evento.dataAbertura ? new Date(evento.dataAbertura) : inicio;

  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + (evento.duracaoDias || 1));

  if (agora < abertura) return "AGUARDANDO";
  if (agora >= abertura && agora < inicio) return "ABERTO";
  if (agora >= inicio && agora < fim) return "FECHADO";

  return "CONCLUIDO";
}
