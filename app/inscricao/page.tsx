import prisma from "@/lib/prisma";
import Formulario from "./Formulario";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStatusReal } from "@/lib/eventos";

export const revalidate = 0;

export default async function InscricaoPage({ searchParams }: { searchParams: Promise<{ e?: string, sucessoPre?: string }> }) {
  const params = await searchParams;
  const eventoEscolhidoId = params.e;
  const exibiuSucessoPre = params.sucessoPre === "true";

  async function salvarPreCadastro(formData: FormData) {
    "use server";
    const nome = formData.get("nome") as string;
    const email = formData.get("email") as string;
    const telefone = formData.get("telefone") as string;
    const tipo = formData.get("tipo") as string;

    if (!nome || !email || !telefone) return;

    await prisma.preCadastro.create({
      data: { nome, email, telefone, tipo }
    });

    redirect("/inscricao?sucessoPre=true");
  }

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
          
          {exibiuSucessoPre ? (
            <div className="text-center py-6">
              <h2 className="text-3xl font-extrabold text-cenaculo-blue mb-4">Interesse Registrado!</h2>
              <p className="text-gray-600 mb-8">
                Obrigado! Entraremos em contato por e-mail ou WhatsApp assim que abrirmos as vagas para o próximo retiro.
              </p>
              <Link href="/" className="bg-cenaculo-blue text-white font-bold py-3 px-8 rounded-full hover:bg-[#1a1d7a] transition">
                Voltar ao Início
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-800">
                  Próximos <span className="text-cenaculo-blue">Retiros</span>
                </h2>
                <p className="text-gray-600 mt-3 text-sm md:text-base">
                  No momento as inscrições oficiais estão fechadas. Deixe seu contato abaixo na nossa <strong>Lista de Espera</strong> para ser avisado em primeira mão assim que abrirmos as próximas inscrições!
                </p>
              </div>

              <form action={salvarPreCadastro} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Qual retiro você tem interesse?</label>
                  <select name="tipo" className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold outline-none bg-white">
                    <option value="CENACULO">Cenáculo (Tradicional)</option>
                    <option value="KIDS">Cenáculo Kids</option>
                    <option value="CENACULAO">Cenaculão</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                  <input type="text" name="nome" required className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">E-mail</label>
                  <input type="email" name="email" required className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
                  <input type="text" name="telefone" required className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold outline-none" />
                </div>
                <button type="submit" className="w-full bg-cenaculo-blue text-white font-bold py-3.5 rounded-md hover:bg-[#1a1d7a] transition shadow-md mt-2">
                  Quero ser Avisado!
                </button>
              </form>
              
              <div className="text-center mt-6">
                <Link href="/" className="text-xs text-gray-400 hover:text-cenaculo-gold transition">Voltar para a página inicial</Link>
              </div>
            </>
          )}

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
        <Formulario 
          eventoId={eventoParaFormulario.id} 
          eventoNome={eventoParaFormulario.nome} 
          eventoTipo={eventoParaFormulario.tipo} 
        />
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