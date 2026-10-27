import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import StatusDropdown from "./StatusDropdown"
import BotaoDeletar from "../BotaoDeletar";
import FormNovoEvento from "./FormNovoEvento"; // 🔴 IMPORTAMOS O NOVO FORMULÁRIO
import { exigirSessao, exigirSessaoPagina } from "@/lib/auth";

export const revalidate = 0;

export default async function EventosPage() {
  // A página mostra dados da coordenação: confere a sessão no banco (conta ativa), sem depender só do proxy.
  await exigirSessaoPagina();

  const eventos = await prisma.evento.findMany({
    orderBy: { criadoEm: 'desc' }
  });

async function criarEvento(formData: FormData) {
    "use server";
    await exigirSessao();
    const nome = formData.get("nome") as string;
    const tipo = formData.get("tipo") as string;
    
    // Pegando as datas cruas do formulário
    const dataInicioRaw = formData.get("dataInicio") as string;
    const dataAberturaRaw = formData.get("dataAbertura") as string;
    
    // 🔴 O SEGREDO DO FUSO HORÁRIO BRASILEIRO (-03:00)
    // Forçamos a dataInicio para ser Meia-Noite no horário de Brasília
    const dataInicio = new Date(`${dataInicioRaw}T00:00:00-03:00`);
    
    // Forçamos a data de abertura para obedecer o fuso do Brasil
    const dataAbertura = dataAberturaRaw ? new Date(`${dataAberturaRaw}-03:00`) : new Date();

    const duracaoDias = parseInt(formData.get("duracaoDias") as string) || 1;
    const imagemCapa = formData.get("imagemCapa") as string || null;

    await prisma.evento.create({
      data: { 
        nome, 
        tipo, 
        dataInicio, 
        dataAbertura, 
        duracaoDias, 
        imagemCapa,
        status: "AUTOMATICO"
      }
    });
    revalidatePath("/painelmmc/eventos");
    revalidatePath("/calendario");
    revalidatePath("/inscricao");
  }

  async function mudarStatus(formData: FormData) {
    "use server";
    await exigirSessao();
    const id = formData.get("id") as string;
    const novoStatus = formData.get("novoStatus") as string;
    await prisma.evento.update({ where: { id }, data: { status: novoStatus } });
    revalidatePath("/painelmmc/eventos");
    revalidatePath("/calendario");
  }

  async function excluirEvento(formData: FormData) {
    "use server";
    await exigirSessao();
    const id = formData.get("id") as string;
    await prisma.evento.delete({ where: { id } });
    revalidatePath("/painelmmc/eventos");
    revalidatePath("/calendario");
  }

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-cenaculo-blue">Gerenciar Eventos</h1>
        <p className="text-gray-600 mt-2">Crie novos cursos com automação de status e abertura de vagas.</p>
      </div>

      {/* 🔴 AQUI ENTRA O NOSSO NOVO FORMULÁRIO CLIENT-SIDE */}
      <FormNovoEvento criarEventoAction={criarEvento} />

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
        <table className="w-full text-left md:min-w-[720px] block md:table">
          <thead className="bg-gray-50 hidden md:table-header-group">
            <tr>
              <th className="p-4 font-semibold text-sm text-gray-600">Evento</th>
              <th className="p-4 font-semibold text-sm text-gray-600">Automação (Início / Fim)</th>
              <th className="p-4 font-semibold text-sm text-gray-600">Status Controle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 block md:table-row-group">
            {eventos.map(evento => (
              <tr key={evento.id} className="block md:table-row py-2 md:py-0 hover:bg-gray-50">
                <td className="block md:table-cell px-4 py-3 md:p-4 font-bold align-top">
                  <div className="flex items-center gap-3">
                    {evento.imagemCapa && (
                      <img src={evento.imagemCapa} alt="Capa" className="w-12 h-12 rounded object-cover shadow-sm" />
                    )}
                    <div>
                      <Link href={`/painelmmc?eventoId=${evento.id}`} className="text-cenaculo-blue hover:text-cenaculo-gold transition underline-offset-4 hover:underline text-lg">
                        {evento.nome}
                      </Link>
                      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{evento.tipo}</div>
                    </div>
                  </div>
                </td>
                
                <td className="block md:table-cell px-4 py-3 md:p-4 text-sm text-gray-600 align-top">
                  {evento.dataAbertura ? (
                    <div className="space-y-1">
                      <p><span className="font-bold text-green-600">Abre:</span> {new Date(evento.dataAbertura).toLocaleDateString('pt-BR')} às {new Date(evento.dataAbertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      <p><span className="font-bold text-red-600">Fecha:</span> {new Date(evento.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                      <p className="text-xs text-gray-400 mt-1">Duração: {evento.duracaoDias} dia(s)</p>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Sem datas automáticas</span>
                  )}
                </td>

                <td className="px-4 py-3 md:p-4 flex items-center gap-2 align-top">
                  {/* O dropdown agora tem a opção 'AUTOMATICO' */}
                  <StatusDropdown eventoId={evento.id} statusAtual={evento.status} mudarStatus={mudarStatus} />
                  
                  <div className="w-20">
                    <BotaoDeletar 
                      id={evento.id} action={excluirEvento} 
                      aviso={`ATENÇÃO: Excluir o evento '${evento.nome}' vai apagar TODAS as inscrições e FOTOS! Tem certeza?`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {eventos.length === 0 && (
              <tr><td colSpan={3} className="p-8 text-center text-gray-500">Nenhum evento cadastrado.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}