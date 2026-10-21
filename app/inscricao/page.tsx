import prisma from "@/lib/prisma";
import Formulario from "./Formulario";
import FormularioKids from "./FormularioKids";
import ListaEspera from "./ListaEspera";
import Link from "next/link";
import { getStatusReal } from "@/lib/eventos";

export const revalidate = 0;

export default async function InscricaoPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const params = await searchParams;
  const eventoEscolhidoId = params.e;

  // 1. Busca TODOS os eventos para podermos aplicar a lógica de data inteligente
  const todosEventos = await prisma.evento.findMany({
    orderBy: { dataInicio: 'asc' } // Do mais próximo para o mais distante
  });

  // 2. Filtra dinamicamente apenas os que estão realmente ABERTOS agora (Manual ou Automático)
  const eventosAbertos = todosEventos.filter(ev => getStatusReal(ev) === "ABERTO");

  // 3. TRAVA DE SEGURANÇA: Se a pessoa tentou forçar a URL de um evento que não está aberto
  if (eventoEscolhidoId) {
    const eventoAlvo = todosEventos.find(ev => ev.id === eventoEscolhidoId);
    if (eventoAlvo && getStatusReal(eventoAlvo) !== "ABERTO") {
      return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-lg border-t-4 border-cenaculo-blue text-center max-w-md">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-3">Inscrições Indisponíveis</h2>
            <p className="text-gray-600 mb-8">
              As inscrições para o <strong>{eventoAlvo.nome}</strong> ainda não começaram ou já foram encerradas.
            </p>
            <Link href="/calendario" className="inline-block bg-cenaculo-gold text-cenaculo-blue font-bold px-8 py-3 rounded-lg hover:bg-yellow-400 transition shadow-md">
              Ver Calendário
            </Link>
          </div>
        </main>
      );
    }
  }

  // CENÁRIO 1: Nenhum evento aberto -> RENDERIZA A LISTA DE ESPERA
  if (eventosAbertos.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-10 xl:px-12 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white p-8 md:p-12 rounded-2xl shadow-xl border-t-8 border-cenaculo-gold">
          
          <ListaEspera />
        </div>
      </main>
    );
  }

  // Descobre qual evento renderizar no formulário normal
  let eventoParaFormulario = null;

  if (eventosAbertos.length === 1) {
    eventoParaFormulario = eventosAbertos[0];
  } else if (eventoEscolhidoId) {
    eventoParaFormulario = eventosAbertos.find(ev => ev.id === eventoEscolhidoId);
  }

  // CENÁRIO 2: O usuário já sabe qual evento quer (ou só tem 1 aberto)
  if (eventoParaFormulario) {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-10 xl:px-12">
        {eventosAbertos.length > 1 && (
          <div className={`mx-auto mb-4 ${eventoParaFormulario.tipo === "KIDS" ? "max-w-3xl" : "max-w-5xl"}`}>
            <Link href="/inscricao" className="text-sm font-semibold text-cenaculo-blue hover:text-cenaculo-gold transition">
              ← Escolher outro evento
            </Link>
          </div>
        )}
        {eventoParaFormulario.tipo === "KIDS" ? (
          <FormularioKids
            eventoId={eventoParaFormulario.id}
            eventoNome={eventoParaFormulario.nome}
            dataInicioEvento={eventoParaFormulario.dataInicio.toISOString()}
          />
        ) : (
          <Formulario 
            eventoId={eventoParaFormulario.id} 
            eventoNome={eventoParaFormulario.nome} 
            eventoTipo={eventoParaFormulario.tipo} 
          />
        )}
      </main>
    );
  }

  // CENÁRIO 3: Tem mais de um aberto e a pessoa ainda não escolheu
  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-10 xl:px-12">
      <div className="max-w-5xl w-full mx-auto text-center mb-12">
        <h1 className="text-4xl font-extrabold text-cenaculo-blue mb-4">
          Escolha o seu <span className="text-cenaculo-gold">Retiro</span>
        </h1>
        <p className="text-gray-600 text-lg">
          Temos mais de um evento com inscrições abertas no momento. Selecione abaixo de qual você deseja participar:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl mx-auto">
        {eventosAbertos.map(evento => (
          <Link 
            href={`/inscricao?e=${evento.id}`} 
            key={evento.id} 
            className="bg-white p-8 rounded-2xl shadow-lg border-t-4 border-cenaculo-blue hover:shadow-2xl transition-all transform hover:-translate-y-1 flex flex-col items-center text-center"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{evento.nome}</h2>
            <p className="text-gray-500 mb-8 font-medium">
              Data de Início: {new Date(evento.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
            </p>
            <div className="mt-auto bg-cenaculo-gold text-cenaculo-blue font-bold px-8 py-3 rounded-full flex items-center gap-2">
              Fazer Inscrição
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}