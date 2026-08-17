import prisma from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 0;

// 🔴 FUNÇÃO MÁGICA DE AUTOMAÇÃO
function getStatusReal(evento: any) {
  // Se a coordenação forçou um status manual (ABERTO, FECHADO, CONCLUIDO), ele obedece o manual.
  if (evento.status !== "AUTOMATICO") return evento.status;

  const agora = new Date();
  const inicio = new Date(evento.dataInicio);
  const abertura = evento.dataAbertura ? new Date(evento.dataAbertura) : inicio;
  
  // Calcula o dia que o evento acaba somando a duração
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + (evento.duracaoDias || 1));

  if (agora < abertura) return "AGUARDANDO"; // Antes da data de abrir inscrições
  if (agora >= abertura && agora < inicio) return "ABERTO"; // Inscrições rolando
  if (agora >= inicio && agora < fim) return "FECHADO"; // Evento acontecendo (Inscrições encerradas)
  
  return "CONCLUIDO"; // O evento já passou
}

export default async function CalendarioPage() {
  const eventos = await prisma.evento.findMany({
    orderBy: { dataInicio: 'desc' },
    include: { fotos: true } 
  });

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <header className="bg-cenaculo-blue text-white py-20 px-6 text-center shadow-inner w-full">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Linha do Tempo de <span className="text-cenaculo-gold">Eventos</span></h1>
          <p className="text-lg text-gray-200 max-w-2xl mx-auto">Acompanhe a agenda futura e reveja a história dos retiros e comemorações do nosso movimento.</p>
        </div>
      </header>

      <section className="py-20 px-4 max-w-5xl mx-auto w-full">
        <div className="space-y-12 relative before:absolute before:inset-0 before:left-4 md:before:left-1/2 before:w-1 before:bg-gray-200">
          
          {eventos.map((evento, index) => {
            const dataFormatada = new Date(evento.dataInicio).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC'
            });

            // Usamos o status calculado na hora em vez do status fixo do banco
            const statusReal = getStatusReal(evento);
            const alinhamentoEsquerda = index % 2 === 0;
            const ehPassado = statusReal === 'CONCLUIDO';

            return (
              <div key={evento.id} className={`flex flex-col md:flex-row items-start relative ${alinhamentoEsquerda ? 'md:justify-start' : 'md:justify-end'}`}>
                
                {/* Ponto da Timeline */}
                <div className={`absolute left-4 md:left-1/2 w-5 h-5 rounded-full border-4 border-white shadow -translate-x-[9px] md:-translate-x-[10px] mt-8 z-10 ${ehPassado ? 'bg-gray-400' : 'bg-cenaculo-gold'}`}></div>

                <div className={`w-full md:w-[45%] pl-12 md:pl-0 ${alinhamentoEsquerda ? 'md:pr-10' : 'md:pl-10'}`}>
                  
                  <div className={`bg-white p-6 rounded-2xl shadow-md border-t-4 transition-all hover:shadow-xl ${ehPassado ? 'border-gray-400 opacity-90' : 'border-cenaculo-blue'}`}>
                    
                    {/* 🔴 A NOVA IMAGEM DE CAPA NO CALENDÁRIO */}
                    {evento.imagemCapa && (
                      <div className="relative w-full h-48 mb-6 rounded-xl overflow-hidden shadow-sm bg-gray-100">
                        <Image src={evento.imagemCapa} alt={evento.nome} fill className="object-cover hover:scale-105 transition-transform duration-500" unoptimized />
                      </div>
                    )}

                    <span className="text-[10px] font-bold text-cenaculo-gold tracking-widest uppercase block mb-1">
                      {evento.tipo} {ehPassado && "• Realizado"}
                    </span>
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{evento.nome}</h2>
                    
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {dataFormatada} {evento.duracaoDias > 1 ? `(São ${evento.duracaoDias} dias)` : ''}
                    </div>

                    <div className="flex flex-wrap justify-between items-center pt-4 border-t border-gray-100 gap-4">
                      
                      {/* STATUS VISUAL INTELIGENTE */}
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        statusReal === 'ABERTO' ? 'bg-green-100 text-green-700' : 
                        statusReal === 'AGUARDANDO' ? 'bg-orange-100 text-orange-700' :
                        statusReal === 'FECHADO' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {statusReal === 'AGUARDANDO' ? 'Em Breve' : statusReal}
                      </span>

                      {/* LÓGICA DE BOTÕES BASEADA NO STATUS REAL */}
                      {statusReal === 'ABERTO' && (
                        <Link href={`/inscricao?e=${evento.id}`} className="text-xs bg-cenaculo-blue text-white font-bold px-4 py-2.5 rounded-lg hover:bg-[#1a1d7a] transition shadow-sm">
                          Inscrever-se &rarr;
                        </Link>
                      )}

                      {/* SÓ MOSTRA GALERIA SE O EVENTO ACABOU E TIVER FOTOS */}
                      {evento.fotos.length > 0 && statusReal === 'CONCLUIDO' && (
                        <Link href={`/galeria?e=${evento.id}`} className="text-xs border border-cenaculo-blue text-cenaculo-blue hover:bg-cenaculo-blue hover:text-white font-bold px-4 py-2.5 rounded-lg transition">
                          Ver Fotos da Edição
                        </Link>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </section>
    </main>
  );
}