import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const revalidate = 0;

export default async function EsperaPage() {
  // Busca todos os cadastros em ordem do mais recente para o mais antigo
  const preCadastros = await prisma.preCadastro.findMany({
    orderBy: { criadoEm: 'desc' }
  });

  // Server Action para excluir o lead da lista depois que ele for contatado
  async function excluirPreCadastro(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    
    await prisma.preCadastro.delete({
      where: { id }
    });
    
    revalidatePath("/admin/espera");
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-cenaculo-blue">Lista de Espera</h1>
          <p className="text-gray-600 mt-2">
            Contatos aguardando a abertura de novas vagas. Total: <span className="font-bold">{preCadastros.length}</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 font-semibold text-sm text-gray-600">Interesse em</th>
                <th className="p-4 font-semibold text-sm text-gray-600">Nome do Participante</th>
                <th className="p-4 font-semibold text-sm text-gray-600">Contatos</th>
                <th className="p-4 font-semibold text-sm text-gray-600 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {preCadastros.map(pre => (
                <tr key={pre.id} className="hover:bg-gray-50 transition-colors">
                  
                  <td className="p-4">
                    <span className="bg-blue-100 text-cenaculo-blue px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                      {pre.tipo}
                    </span>
                  </td>
                  
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{pre.nome}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Registrado em: {new Date(pre.criadoEm).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  
                  <td className="p-4 text-sm text-gray-600">
                    <div className="font-medium text-gray-800">{pre.telefone}</div>
                    <div className="text-gray-500">{pre.email}</div>
                  </td>
                  
                  <td className="p-4 text-center">
                    {/* Formulário para chamar a exclusão do banco */}
                    <form action={excluirPreCadastro}>
                      <input type="hidden" name="id" value={pre.id} />
                      <button 
                        type="submit" 
                        className="text-xs border border-red-200 text-red-600 hover:bg-red-50 font-bold px-3 py-1.5 rounded transition"
                        title="Remover da lista (Ex: Já foi contatado)"
                      >
                        Excluir
                      </button>
                    </form>
                  </td>
                  
                </tr>
              ))}
              
              {preCadastros.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-500">
                    A lista de espera está vazia no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}