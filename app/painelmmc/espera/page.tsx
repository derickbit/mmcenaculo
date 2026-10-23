import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import FiltroEspera from "./FiltroEspera";
import { exigirSessao, exigirSessaoPagina } from "@/lib/auth";

export const revalidate = 0;

const ROTULOS_TIPO: Record<string, string> = { CENACULO: "Cenáculo", KIDS: "Cenáculo Kids", CENACULAO: "Cenaculão" };

export default async function EsperaPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  // A página mostra dados da coordenação: confere a sessão no banco (conta ativa), sem depender só do proxy.
  await exigirSessaoPagina();

  // Lê a URL para saber se tem algum filtro aplicado
  const resolvedParams = await searchParams;
  const tipoFiltro = resolvedParams.tipo || "";

  // Se houver filtro, adiciona a regra no Prisma. Se não, busca tudo.
  const whereClause = tipoFiltro ? { tipo: tipoFiltro } : {};

  const preCadastros = await prisma.preCadastro.findMany({
    where: whereClause,
    orderBy: { criadoEm: 'desc' }
  });

  const contagem = new Map<string, number>();
  for (const p of preCadastros) contagem.set(p.tipo, (contagem.get(p.tipo) ?? 0) + 1);
  const porTipo = [...contagem.entries()];

  async function excluirPreCadastro(formData: FormData) {
    "use server";
    await exigirSessao();
    const id = formData.get("id") as string;
    
    await prisma.preCadastro.delete({ where: { id } });
    revalidatePath("/painelmmc/espera");
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-cenaculo-blue">Lista de Espera</h1>
          <p className="text-gray-600 mt-2">
            Contatos aguardando a abertura de novas vagas. Total: <span className="font-bold">{preCadastros.length}</span>
            {!tipoFiltro && porTipo.length > 0 && (
              <span className="text-gray-500"> ({porTipo.map(([tipo, n]) => `${ROTULOS_TIPO[tipo] ?? tipo}: ${n}`).join(" · ")})</span>
            )}
          </p>
        </div>
        
        {/* Adicionamos o Componente de Filtro aqui no canto superior direito */}
        <FiltroEspera tipoAtual={tipoFiltro} />
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
                      {ROTULOS_TIPO[pre.tipo] ?? pre.tipo}
                    </span>
                  </td>
                  
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{pre.nome}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Registrado em: {new Date(pre.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </td>
                  
                  <td className="p-4 text-sm text-gray-600">
                    <div className="font-medium text-gray-800">{pre.telefone}</div>
                    <div className="text-gray-500">{pre.email}</div>
                  </td>
                  
                  <td className="p-4 text-center">
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
                    {tipoFiltro ? "Nenhum cadastro encontrado para este tipo de retiro." : "A lista de espera está vazia no momento."}
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