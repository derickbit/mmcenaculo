import prisma from "@/lib/prisma";
import FiltroEventos from "./FiltroEventos";
import BotaoExportar from "./BotaoExportar";
import TabelaInscritos from "./TabelaInscritos"; // IMPORTAÇÃO NOVA
import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";

export const revalidate = 0;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ eventoId?: string }> }) {
  const resolvedParams = await searchParams;

  const eventos = await prisma.evento.findMany({
    orderBy: { criadoEm: 'desc' }
  });

  const eventoSelecionadoId = resolvedParams.eventoId || "";
  const whereClause = eventoSelecionadoId ? { eventoId: eventoSelecionadoId } : {};

  const inscricoes = await prisma.inscricao.findMany({
    where: whereClause,
    orderBy: { criadoEm: 'desc' },
    include: {
      evento: true,
      observacoes: {
        include: { admin: true },
        orderBy: { criadoEm: 'asc' }
      }
    }
  });

  async function excluirInscricao(formData: FormData) {
    "use server";
    await exigirSessao();
    const id = formData.get("id") as string;
    await prisma.inscricao.delete({ where: { id } });
    revalidatePath("/admin");
  }

  return (
    <div className="max-w-screen-2xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-cenaculo-blue">Inscrições Recebidas</h1>
          <p className="text-gray-600 mt-2">Gerencie os participantes inscritos em cada retiro.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200 w-full md:w-auto">
          <label className="text-sm font-bold text-gray-700 whitespace-nowrap">Filtrar por Evento:</label>
          <FiltroEventos eventos={eventos} eventoSelecionadoId={eventoSelecionadoId} />
        </div>
      </div>

      <div className="mb-6 bg-cenaculo-blue text-white px-6 py-4 rounded-xl shadow flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="font-bold">
          Total neste evento: <span className="text-cenaculo-gold text-xl ml-2">{inscricoes.length}</span>
        </div>
        <BotaoExportar 
          inscricoes={inscricoes} 
          nomeEvento={eventoSelecionadoId ? (eventos.find(e => e.id === eventoSelecionadoId)?.nome || "Evento") : "Todos_os_Eventos"} 
        />
      </div>

      {/* CHAMA A NOSSA NOVA TABELA INTELIGENTE E PASSA OS DADOS DO PRISMA */}
      <TabelaInscritos 
        inscricoes={inscricoes} 
        excluirInscricao={excluirInscricao} 
      />
    </div>
  );
}