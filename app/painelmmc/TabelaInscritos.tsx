"use client";

import { useState, useMemo } from "react";
import ModalDetalhes from "./ModalDetalhes";
import GerenciadorNotas from "./GerenciadorNotas";
import BotaoDeletar from "./BotaoDeletar";
import type { InscricaoAdmin } from "./tipos";
import { idadeEm } from "@/lib/kids";

const SO_DIGITOS = /\D/g;

type Ordem = "RECENTES" | "ANTIGAS" | "A_Z" | "Z_A";

export default function TabelaInscritos({ inscricoes, excluirInscricao }: { inscricoes: InscricaoAdmin[], excluirInscricao: (formData: FormData) => void }) {
  const [buscaNome, setBuscaNome] = useState("");
  const [filtroParoquia, setFiltroParoquia] = useState("");
  // 🔴 AGORA O PADRÃO É POR DATA MAIS RECENTE
  const [ordem, setOrdem] = useState<Ordem>("RECENTES");

  const paroquiasDisponiveis = useMemo(() => {
    const lista = inscricoes.map((i) => i.paroquiaAtuante).filter((p): p is string => !!p && p.trim() !== "");
    return Array.from(new Set(lista));
  }, [inscricoes]);

  const inscricoesProcessadas = useMemo(() => {
    let resultado = [...inscricoes];

    const termo = buscaNome.trim().toLowerCase();
    if (termo !== "") {
      const termoDigitos = termo.replace(SO_DIGITOS, "");
      resultado = resultado.filter(
        (i) =>
          i.nomeCompleto.toLowerCase().includes(termo) ||
          i.email.toLowerCase().includes(termo) ||
          i.cidade.toLowerCase().includes(termo) ||
          (termoDigitos !== "" && i.telefone.replace(SO_DIGITOS, "").includes(termoDigitos))
      );
    }

    if (filtroParoquia !== "") {
      resultado = resultado.filter((i) => i.paroquiaAtuante === filtroParoquia);
    }

    // LÓGICA DE ORDENAÇÃO COMPLETA
    resultado.sort((a, b) => {
      if (ordem === "RECENTES") return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
      if (ordem === "ANTIGAS") return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
      if (ordem === "A_Z") return a.nomeCompleto.localeCompare(b.nomeCompleto);
      if (ordem === "Z_A") return b.nomeCompleto.localeCompare(a.nomeCompleto);
      return 0;
    });

    return resultado;
  }, [inscricoes, buscaNome, filtroParoquia, ordem]);

  const filtrando = buscaNome.trim() !== "" || filtroParoquia !== "";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar (nome, e-mail, telefone ou cidade):</label>
          <input type="text" value={buscaNome} onChange={(e) => setBuscaNome(e.target.value)} placeholder="Digite para buscar..." className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-cenaculo-gold outline-none" />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtrar por Paróquia:</label>
          <select value={filtroParoquia} onChange={(e) => setFiltroParoquia(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-cenaculo-gold bg-white outline-none">
            <option value="">Todas as Paróquias</option>
            {paroquiasDisponiveis.map((paroquia) => <option key={paroquia} value={paroquia}>{paroquia}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ordenar por:</label>
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-cenaculo-gold bg-white outline-none font-semibold text-gray-700">
            <option value="RECENTES">Data: Mais Recentes</option>
            <option value="ANTIGAS">Data: Mais Antigas</option>
            <option value="A_Z">Nome: A → Z</option>
            <option value="Z_A">Nome: Z → A</option>
          </select>
        </div>
      </div>

      {filtrando && (
        <p className="text-sm text-gray-500 px-1">
          Mostrando <span className="font-bold text-gray-700">{inscricoesProcessadas.length}</span> de {inscricoes.length} inscrições.
        </p>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="p-4 font-bold text-sm">Nome / Contato</th>
                <th className="p-4 font-bold text-sm">Evento</th>
                <th className="p-4 font-bold text-sm">Histórico</th>
                <th className="p-4 font-bold text-sm">Saúde / Restrições</th>
                <th className="p-4 font-bold text-sm">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inscricoesProcessadas.map((inscricao) => (
                <tr key={inscricao.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 align-top w-1/3">
                    <div className="font-extrabold text-cenaculo-blue text-lg">{inscricao.nomeCompleto}</div>
                    <div className="text-sm text-gray-500 font-medium mt-1">{inscricao.telefone}</div>
                    <div className="text-sm text-gray-500">{inscricao.email}</div>
                    <div className="text-sm text-gray-500">{inscricao.cidade}</div>
                    <div className="text-xs text-gray-400 mt-2 mb-2">
                      {idadeEm(new Date(inscricao.dataNascimento), new Date(inscricao.evento.dataInicio))} anos no evento · nasc. {new Date(inscricao.dataNascimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </div>
                    <ModalDetalhes inscricao={inscricao} />
                  </td>
                  <td className="p-4 align-top w-1/6">
                    <div className="font-bold text-cenaculo-blue text-sm">{inscricao.evento.nome}</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(inscricao.evento.dataInicio).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div>
                    <div className="text-xs text-gray-400 mt-2">Inscrito em {new Date(inscricao.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</div>
                  </td>
                  <td className="p-4 align-top w-1/5">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${inscricao.jaFezCenaculo !== "Não fez" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{inscricao.jaFezCenaculo}</div>
                    <div className="text-sm text-gray-600"><span className="font-semibold text-gray-800">Paróquia:</span> {inscricao.paroquiaAtuante || "-"}</div>
                  </td>
                  <td className="p-4 align-top text-sm w-1/4">
                    {inscricao.problemaSaude && <div className="mb-1"><span className="font-bold text-red-600">Saúde:</span> {inscricao.problemaSaude}</div>}
                    {inscricao.restricaoAlimentar && <div className="mb-1"><span className="font-bold text-orange-600">Alimentar:</span> {inscricao.restricaoAlimentar}</div>}
                    {inscricao.medicacaoControlada && <div className="mb-1"><span className="font-bold text-blue-600">Remédio:</span> {inscricao.medicacaoControlada}</div>}
                    {inscricao.atendimentoEspecial && <div className="mb-1"><span className="font-bold text-purple-600">Especial:</span> {inscricao.atendimentoEspecial}</div>}
                    {!inscricao.problemaSaude && !inscricao.restricaoAlimentar && !inscricao.medicacaoControlada && !inscricao.atendimentoEspecial && <span className="text-gray-400 italic">Nenhuma restrição</span>}
                  </td>
<td className="p-4 align-top w-1/4">
                    <div className="flex flex-col gap-2">
                      <GerenciadorNotas inscricaoId={inscricao.id} observacoes={inscricao.observacoes} />
                      <BotaoDeletar 
                        id={inscricao.id} 
                        action={excluirInscricao} 
                        aviso={`Tem certeza que deseja excluir permanentemente a inscrição de ${inscricao.nomeCompleto}?`}
                      />
                    </div>
                  </td>
                  
                </tr>
              ))}
              {inscricoesProcessadas.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-gray-500 text-lg">{inscricoes.length === 0 ? "Nenhuma inscrição recebida ainda." : "Nenhum inscrito corresponde aos filtros selecionados."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}