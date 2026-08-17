import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import UploaderImagens from "./UploaderImagens";

export const revalidate = 0;

export default async function AdminGaleriaPage() {
  const eventos = await prisma.evento.findMany({
    orderBy: { dataInicio: 'desc' },
    include: { fotos: { orderBy: { criadoEm: 'desc' } } }
  });

  // Server Action: Pega a URL do Cloudinary e salva no Prisma
  async function salvarFotoNoBanco(eventoId: string, url: string) {
    "use server";
    await prisma.foto.create({
      data: { eventoId, url }
    });
    revalidatePath("/admin/galeria");
    revalidatePath("/galeria");
  }

  // Server Action: Deletar Foto
  async function removerFoto(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.foto.delete({ where: { id } });
    revalidatePath("/admin/galeria");
    revalidatePath("/galeria");
  }

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-cenaculo-blue">Gerenciar Galeria</h1>
        <p className="text-gray-600 mt-2">Vincule imagens aos eventos para criar álbuns públicos. As fotos são salvas na nuvem.</p>
      </div>

      {/* Lista de Álbuns (Cada álbum tem seu próprio botão de upload) */}
      <div className="space-y-8">
        {eventos.map(evento => (
          <div key={evento.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-100 pb-4 gap-4">
              <div>
                <h3 className="text-xl font-bold text-cenaculo-blue">{evento.nome}</h3>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{evento.tipo}</span>
                <span className="text-xs bg-gray-100 text-gray-600 font-bold px-3 py-1 rounded-full ml-3">{evento.fotos.length} fotos</span>
              </div>
              
              {/* O NOVO BOTÃO DE UPLOAD */}
<div className="w-full md:w-auto">
                {/* 🔴 NOVA TRAVA: Se o evento estiver ABERTO, bloqueia o botão e avisa a coordenação */}
                {evento.status === "ABERTO" ? (
                  <span className="inline-block bg-orange-50 text-orange-700 border border-orange-200 font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm">
                    ⚠️ Conclua o evento no painel para libertar o upload de fotos.
                  </span>
                ) : (
                  <UploaderImagens eventoId={evento.id} salvarNoBanco={salvarFotoNoBanco} />
                )}
              </div>
            </div>
            
            {evento.fotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {evento.fotos.map(foto => (
                  <div key={foto.id} className="relative aspect-square rounded-lg overflow-hidden group bg-gray-200 border border-gray-200 shadow-sm">
                    {/* A foto puxando direto do Cloudinary */}
                    <Image src={foto.url} alt="Foto" fill className="object-cover" unoptimized />
                    
                    {/* Botão de Excluir */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <form action={removerFoto}>
                        <input type="hidden" name="id" value={foto.id} />
                        <button type="submit" className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition shadow">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm italic text-center py-4">Nenhuma foto adicionada neste evento ainda.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}