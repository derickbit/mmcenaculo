import prisma from "@/lib/prisma";
import { exigirSessaoPagina } from "@/lib/auth";
import { FAIXA_KIDS, PARENTESCO_ROTULOS, foraDaFaixaKids, idadeEm, type Parentesco } from "@/lib/kids";
import FiltroEventos from "../FiltroEventos";
import GerenciadorNotas from "../GerenciadorNotas";
import BotaoDeletar from "../BotaoDeletar";
import BotaoExportar from "../BotaoExportar";
import { excluirInscricaoKids } from "../actions";

export const revalidate = 0;

export default async function KidsPage({ searchParams }: { searchParams: Promise<{ eventoId?: string }> }) {
  // Esta página mostra dados de crianças: confere o login aqui também, sem depender só do proxy.
  await exigirSessaoPagina();

  const { eventoId = "" } = await searchParams;

  const eventos = await prisma.evento.findMany({
    where: { tipo: "KIDS" },
    orderBy: { dataInicio: "desc" },
  });

  const inscricoes = await prisma.inscricaoKids.findMany({
    where: eventoId ? { eventoId } : {},
    orderBy: { criadoEm: "desc" },
    include: {
      evento: { select: { nome: true, dataInicio: true } },
      observacoes: {
        include: { usuario: { select: { nome: true } } },
        orderBy: { criadoEm: "asc" },
      },
    },
  });

  return (
    <div className="max-w-screen-2xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-cenaculo-blue">Inscrições Kids</h1>
          <p className="text-gray-600 mt-2">
            Crianças inscritas no Cenáculo Kids (faixa de {FAIXA_KIDS.min} a {FAIXA_KIDS.max} anos) e seus responsáveis.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200 w-full md:w-auto">
          <label className="text-sm font-bold text-gray-700 whitespace-nowrap">Filtrar por Evento:</label>
          <FiltroEventos eventos={eventos} eventoSelecionadoId={eventoId} rota="/painelmmc/kids" />
        </div>
      </div>

      <div className="mb-6 bg-cenaculo-blue text-white px-6 py-4 rounded-xl shadow flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="font-bold">
          {eventoId ? "Total neste evento" : "Total em todos os eventos"}: <span className="text-cenaculo-gold text-xl ml-2">{inscricoes.length}</span>
        </div>
        <BotaoExportar href={`/api/painelmmc/exportar/kids${eventoId ? `?eventoId=${encodeURIComponent(eventoId)}` : ""}`} />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full md:min-w-[980px] text-left border-collapse block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50 text-gray-700">
                <th className="p-4 font-bold text-sm">Criança</th>
                <th className="p-4 font-bold text-sm">Evento</th>
                <th className="p-4 font-bold text-sm">Responsável</th>
                <th className="p-4 font-bold text-sm">Saúde</th>
                <th className="p-4 font-bold text-sm">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 block md:table-row-group">
              {inscricoes.map((i) => {
                const idade = idadeEm(i.criancaNascimento, i.evento.dataInicio);
                const fora = foraDaFaixaKids(i.criancaNascimento, i.evento.dataInicio);
                return (
                  <tr key={i.id} className="block md:table-row py-2 md:py-0 hover:bg-gray-50 transition-colors">
                    <td className="block md:table-cell px-4 py-3 md:p-4 align-top md:w-1/4">
                      <div className="font-extrabold text-cenaculo-blue text-lg">{i.criancaNome}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {idade} anos no evento · nasc. {i.criancaNascimento.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      </div>
                      {fora && (
                        <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          Fora da faixa {FAIXA_KIDS.min}–{FAIXA_KIDS.max}
                        </span>
                      )}
                    </td>

                    <td className="block md:table-cell px-4 py-3 md:p-4 align-top md:w-1/6 text-sm">
                      <div className="font-bold text-cenaculo-blue">{i.evento.nome}</div>
                      <div className="text-xs text-gray-500 mt-1">{i.evento.dataInicio.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div>
                      <div className="text-xs text-gray-400 mt-2">
                        Inscrito em {i.criadoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </div>
                    </td>

                    <td className="block md:table-cell px-4 py-3 md:p-4 align-top md:w-1/4 text-sm">
                      <div className="font-bold text-gray-800">{i.responsavelNome}</div>
                      <div className="text-gray-500">{PARENTESCO_ROTULOS[i.parentesco as Parentesco] ?? i.parentesco}</div>
                      <div className="text-gray-600 mt-1">{i.responsavelTelefone}</div>
                      <div className="text-gray-500">{i.responsavelEmail}</div>
                      <div className="text-xs text-gray-400 mt-2">
                        Consentimento em {i.consentimentoEm.toLocaleString("pt-BR")}
                      </div>
                    </td>

                    <td className="block md:table-cell px-4 py-3 md:p-4 align-top md:w-1/4 text-sm">
                      {i.saudeComEquipe ? (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                          Falar com a equipe no dia
                        </span>
                      ) : i.saudeObservacao ? (
                        <div>
                          <span className="font-bold text-red-600">Saúde:</span> {i.saudeObservacao}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Nada informado</span>
                      )}
                    </td>

                    <td className="block md:table-cell px-4 py-3 md:p-4 align-top md:w-1/4">
                      <div className="flex flex-col gap-2">
                        <GerenciadorNotas inscricaoId={i.id} observacoes={i.observacoes} tipo="KIDS" />
                        <BotaoDeletar
                          id={i.id}
                          action={excluirInscricaoKids}
                          aviso={`Excluir permanentemente a inscrição de ${i.criancaNome} (responsável: ${i.responsavelNome})? Os dados e as notas serão apagados.`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {inscricoes.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500 text-lg">
                    Nenhuma inscrição Kids encontrada.
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
