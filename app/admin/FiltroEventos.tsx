"use client";

import { useRouter } from "next/navigation";

type EventoResumo = { id: string; nome: string; status: string; };

export default function FiltroEventos({ eventos, eventoSelecionadoId }: { eventos: EventoResumo[], eventoSelecionadoId: string }) {
  const router = useRouter();

  return (
    <select 
      value={eventoSelecionadoId} 
      onChange={(e) => router.push(`/admin?eventoId=${e.target.value}`)} 
      className="p-2 border border-gray-300 rounded focus:ring-cenaculo-gold bg-gray-50 outline-none w-full md:w-auto"
    >
      <option value="">Todos os Eventos</option>
      {eventos.map(evento => (
        <option key={evento.id} value={evento.id}>
          {evento.nome} ({evento.status})
        </option>
      ))}
    </select>
  );
}