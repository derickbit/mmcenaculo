import prisma from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import GridGaleria from "./GridGaleria"; // IMPORTAÇÃO NOVA

export const revalidate = 0;

export default async function GaleriaPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const params = await searchParams;
  const eventoId = params.e;

  // CENÁRIO 1: Lista de Álbuns (Alargado para max-w-7xl)
  if (!eventoId) {
    const eventosComFotos = await prisma.evento.findMany({
      where: { fotos: { some: {} } },
      orderBy: { dataInicio: 'desc' },
      include: { fotos: { take: 1, orderBy: { criadoEm: 'desc' } } }
    });

    return (
      <main className="min-h-screen bg-gray-50 flex flex-col pb-20">
        {/* O fundo azul estica a 100%, mas o conteúdo central expande até max-w-7xl */}
        <header className="bg-cenaculo-blue text-white py-20 px-6 text-center shadow-inner w-full">
          <div className="max-w-screen-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Nossa <span className="text-cenaculo-gold">História</span></h1>
            <p className="text-lg text-gray-200 max-w-2xl mx-auto">Relembre os momentos inesquecíveis vividos em nossos retiros e encontros.</p>
          </div>
        </header>

        <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 mt-12 w-full">
          {eventosComFotos.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-gray-200 max-w-xl mx-auto">
              <p className="text-gray-500 font-medium">Ainda não temos álbuns de fotos publicados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {eventosComFotos.map(evento => (
                <Link href={`/galeria?e=${evento.id}`} key={evento.id} className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1">
                  <div className="relative h-64 w-full bg-gray-200 overflow-hidden">
                    {evento.fotos[0] && (
                      <Image src={evento.fotos[0].url} alt={`Capa ${evento.nome}`} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-6 left-6 text-white">
                      <span className="text-[10px] font-bold text-cenaculo-gold tracking-widest uppercase block mb-1">{evento.tipo}</span>
                      <h2 className="text-2xl font-bold">{evento.nome}</h2>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  // CENÁRIO 2: Fotos Internas do Álbum
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    include: { fotos: { orderBy: { criadoEm: 'desc' } } }
  });

  if (!evento) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Evento não encontrado.</h2>
          <Link href="/galeria" className="text-cenaculo-blue underline">Voltar para a Galeria</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <header className="bg-cenaculo-blue text-white py-16 px-6 text-center shadow-inner w-full">
        <div className="max-w-screen-2xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-2">Galeria de <span className="text-cenaculo-gold">Fotos</span></h1>
          <p className="text-lg text-gray-200">Recordações do {evento.nome}</p>
          <Link href="/galeria" className="inline-block mt-6 text-sm text-gray-300 hover:text-white transition">
            &larr; Voltar para os Álbuns
          </Link>
        </div>
      </header>

      {/* Passa as fotos para o nosso novo Grid Inteligente com Lightbox */}
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 mt-12 w-full">
        <GridGaleria fotos={evento.fotos} eventoNome={evento.nome} />
      </section>
    </main>
  );
}