import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import StatusDropdown from "./StatusDropdown"
import BotaoDeletar from "../BotaoDeletar";

export const revalidate = 0;

export default async function EventosPage() {
  const eventos = await prisma.evento.findMany({
    orderBy: { criadoEm: 'desc' }
  });

  async function criarEvento(formData: FormData) {
    "use server";
    const nome = formData.get("nome") as string;
    const tipo = formData.get("tipo") as string;
    const dataInicio = new Date(formData.get("dataInicio") as string);

    await prisma.evento.create({
      data: { nome, tipo, dataInicio, status: "ABERTO" }
    });
    revalidatePath("/admin/eventos");
  }

  // 🔴 NOVA AÇÃO: Alternar Status
async function mudarStatus(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const novoStatus = formData.get("novoStatus") as string;
    
    await prisma.evento.update({
      where: { id },
      data: { status: novoStatus }
    });
    revalidatePath("/admin/eventos");
  }

  async function excluirEvento(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await prisma.evento.delete({ where: { id } });
  revalidatePath("/admin/eventos");
  revalidatePath("/calendario"); // Atualiza o calendário público na hora
}

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-cenaculo-blue">Gerenciar Eventos</h1>
        <p className="text-gray-600 mt-2">Crie novos cursos e abra inscrições para a comunidade.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Abrir Novo Evento</h2>
        <form action={criarEvento} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Evento</label>
            <input type="text" name="nome" required placeholder="Ex: 83º Cenáculo" className="w-full p-2 border border-gray-300 rounded focus:ring-cenaculo-gold" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
<select name="tipo" className="w-full p-2 border border-gray-300 rounded focus:ring-cenaculo-gold bg-white">
  <option value="CENACULO">Cenáculo (Tradicional)</option>
  <option value="KIDS">Cenáculo Kids</option>
  <option value="CENACULAO">Cenaculão</option>
  <option value="FESTIVIDADE">Festividade / Comemoração</option>
  <option value="OUTRO">Outro Evento</option>
</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label>
            <input type="date" name="dataInicio" required className="w-full p-2 border border-gray-300 rounded focus:ring-cenaculo-gold" />
          </div>
          <div className="md:col-span-4 mt-2 text-right">
            <button type="submit" className="bg-cenaculo-blue text-white font-bold py-2 px-6 rounded hover:bg-[#1a1d7a] transition shadow">
              + Cadastrar Evento
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 font-semibold text-sm text-gray-600">Evento</th>
              <th className="p-4 font-semibold text-sm text-gray-600">Tipo</th>
              <th className="p-4 font-semibold text-sm text-gray-600">Data</th>
              <th className="p-4 font-semibold text-sm text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {eventos.map(evento => (
              <tr key={evento.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold">
                  <Link href={`/admin?eventoId=${evento.id}`} className="text-cenaculo-blue hover:text-cenaculo-gold transition underline-offset-4 hover:underline">
                    {evento.nome}
                  </Link>
                </td>
                <td className="p-4 text-sm text-gray-600">{evento.tipo}</td>
                <td className="p-4 text-sm text-gray-600">
                  {new Date(evento.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </td>
<td className="p-4 flex items-center gap-2">
               <StatusDropdown 
                 eventoId={evento.id} 
                 statusAtual={evento.status} 
                 mudarStatus={mudarStatus} 
               />
               <div className="w-20">
                 <BotaoDeletar 
                   id={evento.id} 
                   action={excluirEvento} 
                   aviso={`ATENÇÃO: Excluir o evento '${evento.nome}' vai apagar definitivamente TODAS as inscrições, observações e a galeria de FOTOS vinculadas a ele! Tem certeza absoluta?`}
                 />
               </div>
             </td>
              </tr>
            ))}
            {eventos.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum evento cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}