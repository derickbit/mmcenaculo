import prisma from "@/lib/prisma";
import Link from "next/link";

export const revalidate = 0;

export default async function CalendarioPage() {
  // 1. Buscamos TODOS os eventos (passados e futuros)
  // Ordenando por 'desc' para que os mais novos/recentes fiquem sempre no topo!
  const eventos = await prisma.evento.findMany({
    orderBy: { dataInicio: 'desc' },
    include: { fotos: true } // Já traz o array de fotos para sabermos se tem galeria
  });

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 py-6 px-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-cenaculo-blue font-extrabold text-xl tracking-tight hover:text-cenaculo-gold transition">
            Movimento Mariano <span className="text-cenaculo-gold">Cenáculo</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition">
            &larr; Voltar ao Início
          </Link>
        </div>
      </header>

      <section className="py-20 px-4 max-w-4xl mx-auto w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-cenaculo-blue mb-4">
            Linha do Tempo de <span className="text-cenaculo-gold">Eventos</span>
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Acompanhe a agenda futura e reveja a história dos retiros e comemorações do nosso movimento.
          </p>
        </div>

        <div className="space-y-8 relative before:absolute before:inset-0 before:left-4 md:before:left-1/2 before:w-0.5 before:bg-gray-200">
          
          {eventos.map((evento, index) => {
            const dataFormatada = new Date(evento.dataInicio).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC'
            });

            const alinhamentoEsquerda = index % 2 === 0;
            const ehPassado = new Date(evento.dataInicio) < new Date();

            return (
              <div key={evento.id} className={`flex flex-col md:flex-row items-start relative ${
                alinhamentoEsquerda ? 'md:justify-start' : 'md:justify-end'
              }`}>
                
                {/* Ponto da Timeline muda de cor se o evento já passou */}
                <div className={`absolute left-4 md:left-1/2 w-4 h-4 rounded-full border-4 border-white shadow -translate-x-1.5 mt-6 z-10 ${
                  ehPassado ? 'bg-gray-400' : 'bg-cenaculo-gold'
                }`}></div>

                <div className={`w-full md:w-[45%] pl-10 md:pl-0 ${
                  alinhamentoEsquerda ? 'md:pr-8' : 'md:pl-8'
                }`}>
                  {/* Card com opacidade reduzida de forma elegante caso o evento já tenha acontecido */}
                  <div className={`bg-white p-6 rounded-2xl shadow-md border-t-4 transition-all hover:shadow-xl ${
                    ehPassado ? 'border-gray-400 opacity-85' : 'border-cenaculo-blue'
                  }`}>
                    
                    <span className="text-[10px] font-bold text-cenaculo-gold tracking-widest uppercase block mb-1">
                      {evento.tipo} {ehPassado && "• Realizado"}
                    </span>
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{evento.nome}</h2>
                    
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {dataFormatada}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 gap-2">
                      {/* STATUS DO EVENTO ATUALIZADO */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        evento.status === 'ABERTO' ? 'bg-green-100 text-green-700' : 
                        evento.status === 'FECHADO' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {evento.status}
                      </span>

                      {/* LÓGICA DE BOTÕES ATUALIZADA */}
                      {!ehPassado && evento.status === 'ABERTO' && (
                        <Link href={`/inscricao?e=${evento.id}`} className="text-xs bg-cenaculo-blue text-white font-bold px-4 py-2 rounded-lg hover:bg-[#1a1d7a] transition shadow-sm">
                          Inscrever-se &rarr;
                        </Link>
                      )}

                      {/* SÓ MOSTRA 'VER FOTOS' SE O EVENTO TIVER FOTOS CADASTRADAS E NÃO ESTIVER ABERTO */}
                      {evento.fotos.length > 0 && evento.status !== 'ABERTO' && (
                        <Link href={`/galeria?e=${evento.id}`} className="text-xs border border-cenaculo-blue text-cenaculo-blue hover:bg-cenaculo-blue hover:text-white font-bold px-4 py-2 rounded-lg transition">
                          Ver Fotos da Edição
                        </Link>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            );
          })}

          {eventos.length === 0 && (
            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center shadow-sm max-w-lg mx-auto">
              <p className="text-gray-500 font-medium">Nenhum evento histórico ou agendado no sistema.</p>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}