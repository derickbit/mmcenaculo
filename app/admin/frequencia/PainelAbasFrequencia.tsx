"use client";

import { useState, useMemo } from "react";

const GRUPOS_OFICIAIS = [
  "Salve Maria",
  "Marta e Maria",
  "Coração Andarilho",
  "Cenáculo Online",
  "São Gabriel",
  "Gabaon"
];

type Presenca = { id: string; atividadeId: string; atividade?: { nome: string } | null };
type Membro = { id: string; nome: string; grupo: string; cenaculoFeito: string | null; presencas: Presenca[] };
type Atividade = { id: string; nome: string; data: Date };

type PainelProps = {
  membros: Membro[];
  atividades: Atividade[];
  grupos: string[];
  cadastrarMembro: (formData: FormData) => Promise<{ erro?: string; sucesso?: boolean } | void>;
  cadastrarAtividade: (formData: FormData) => Promise<void>;
  salvarChamada: (atividadeId: string, presentes: string[], filtrados: string[]) => Promise<void>;
  excluirMembro: (formData: FormData) => Promise<void>;
};

export default function PainelAbasFrequencia({ 
  membros, 
  atividades, 
  grupos, 
  cadastrarMembro, 
  cadastrarAtividade, 
  salvarChamada,
  excluirMembro 
}: PainelProps) {
  const [aba, setAba] = useState<"CHAMADA" | "MEMBROS" | "ATIVIDADES" | "RELATORIO">("CHAMADA");

  // Estados: CHAMADA
  const [atividadeSelecionada, setAtividadeSelecionada] = useState("");
  const [grupoSelecionado, setGrupoSelecionado] = useState("");
  const [buscaChamada, setBuscaChamada] = useState("");
  // Marcações feitas na tela; valem só para a combinação atividade+grupo em que foram feitas.
  const [edicao, setEdicao] = useState<{ chave: string; ids: Set<string> } | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Estados: BUSCA DE ATIVIDADES
  const [buscaAtividadeDropdown, setBuscaAtividadeDropdown] = useState("");
  const [buscaHistoricoAtividade, setBuscaHistoricoAtividade] = useState("");

  // Estados: RELATÓRIO
  const [filtroGrupoRelatorio, setFiltroGrupoRelatorio] = useState("");

  // Estados: UI/UX (Notificações e Modal)
  const [notificacao, setNotificacao] = useState<{ msg: string, erro: boolean } | null>(null);
  const [membroParaExcluir, setMembroParaExcluir] = useState<{ id: string, nome: string } | null>(null);

  // Função auxiliar para mostrar avisos bonitos na tela
  const mostrarNotificacao = (msg: string, erro = false) => {
    setNotificacao({ msg, erro });
    setTimeout(() => setNotificacao(null), 4000); 
  };

  const todosOsGruposParaFiltro = Array.from(
    new Set([
      ...GRUPOS_OFICIAIS,
      ...grupos.flatMap(g => g.split(",").map(str => str.trim()))
    ])
  ).filter(Boolean);

  const membrosDoGrupo = useMemo(() => {
    if (!grupoSelecionado) return [];
    return membros.filter(m => m.grupo.includes(grupoSelecionado));
  }, [membros, grupoSelecionado]);

  const membrosDoGrupoFiltrados = useMemo(() => {
    if (!buscaChamada.trim()) return membrosDoGrupo;
    return membrosDoGrupo.filter(m => m.nome.toLowerCase().includes(buscaChamada.toLowerCase()));
  }, [membrosDoGrupo, buscaChamada]);

  // Filtro: Atividades no Dropdown da Chamada
  const atividadesFiltradasDropdown = useMemo(() => {
    if (!buscaAtividadeDropdown.trim()) return atividades;
    return atividades.filter(a => {
      const dataFormatada = new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      const termo = buscaAtividadeDropdown.toLowerCase();
      return a.nome.toLowerCase().includes(termo) || dataFormatada.includes(termo);
    });
  }, [atividades, buscaAtividadeDropdown]);

  // Filtro: Atividades na Tabela de Histórico
  const atividadesFiltradasHistorico = useMemo(() => {
    if (!buscaHistoricoAtividade.trim()) return atividades;
    return atividades.filter(a => {
      const dataFormatada = new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      const termo = buscaHistoricoAtividade.toLowerCase();
      return a.nome.toLowerCase().includes(termo) || dataFormatada.includes(termo);
    });
  }, [atividades, buscaHistoricoAtividade]);

  const chaveChamada = `${atividadeSelecionada}|${grupoSelecionado}`;

  const presencasJaSalvas = useMemo(() => {
    const ids = new Set<string>();
    if (!atividadeSelecionada || !grupoSelecionado) return ids;
    membrosDoGrupo.forEach(membro => {
      if (membro.presencas.some(p => p.atividadeId === atividadeSelecionada)) ids.add(membro.id);
    });
    return ids;
  }, [atividadeSelecionada, grupoSelecionado, membrosDoGrupo]);

  const presentes = edicao?.chave === chaveChamada ? edicao.ids : presencasJaSalvas;

  const alternarPresenca = (membroId: string) => {
    const novoSet = new Set(presentes);
    if (novoSet.has(membroId)) novoSet.delete(membroId);
    else novoSet.add(membroId);
    setEdicao({ chave: chaveChamada, ids: novoSet });
  };

  const handleSalvarChamada = async () => {
    if (!atividadeSelecionada) return mostrarNotificacao("Selecione uma atividade primeiro!", true);
    setSalvando(true);
    await salvarChamada(atividadeSelecionada, Array.from(presentes), membrosDoGrupo.map(m => m.id));
    setSalvando(false);
    setEdicao(null);
    mostrarNotificacao("Lista de chamada salva com sucesso!");
  };

  const membrosFiltradosParaRelatorio = useMemo(() => {
    let resultado = [...membros];
    if (filtroGrupoRelatorio) resultado = resultado.filter(m => m.grupo.includes(filtroGrupoRelatorio));
    return resultado.sort((a, b) => b.presencas.length - a.presencas.length);
  }, [membros, filtroGrupoRelatorio]);

  // A planilha é montada no servidor; o link leva o grupo escolhido no filtro.
  const enderecoExportacao = `/api/admin/exportar/frequencia${filtroGrupoRelatorio ? `?grupo=${encodeURIComponent(filtroGrupoRelatorio)}` : ""}`;

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
        
        <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
          <button onClick={() => setAba("CHAMADA")} className={`flex-1 py-4 px-4 font-bold text-sm text-center transition-colors border-b-2 whitespace-nowrap ${aba === "CHAMADA" ? "border-cenaculo-blue text-cenaculo-blue bg-white" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}>✅ Fazer Chamada</button>
          <button onClick={() => setAba("MEMBROS")} className={`flex-1 py-4 px-4 font-bold text-sm text-center transition-colors border-b-2 whitespace-nowrap ${aba === "MEMBROS" ? "border-cenaculo-blue text-cenaculo-blue bg-white" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}>👥 Gerenciar Membros</button>
          <button onClick={() => setAba("ATIVIDADES")} className={`flex-1 py-4 px-4 font-bold text-sm text-center transition-colors border-b-2 whitespace-nowrap ${aba === "ATIVIDADES" ? "border-cenaculo-blue text-cenaculo-blue bg-white" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}>📅 Atividades e Missas</button>
          <button onClick={() => setAba("RELATORIO")} className={`flex-1 py-4 px-4 font-bold text-sm text-center transition-colors border-b-2 whitespace-nowrap ${aba === "RELATORIO" ? "border-cenaculo-gold text-cenaculo-blue bg-white" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}>📊 Relatórios</button>
        </div>

        <div className="p-6 md:p-8">
          
          {/* ================= ABA 1: CHAMADA ================= */}
          {aba === "CHAMADA" && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Registrar Presenças</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="flex flex-col gap-2">
                  <label className="block text-sm font-bold text-gray-700">1. Selecione a Atividade/Missa</label>
                  <input 
                    type="text" 
                    placeholder="Pesquisar atividade ou data (Ex: 15/07)..." 
                    value={buscaAtividadeDropdown}
                    onChange={(e) => setBuscaAtividadeDropdown(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-cenaculo-gold outline-none bg-white placeholder-gray-400"
                  />
                  <select value={atividadeSelecionada} onChange={e => setAtividadeSelecionada(e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:ring-cenaculo-gold outline-none bg-white mt-1">
                    <option value="">Selecione...</option>
                    {atividadesFiltradasDropdown.map(a => <option key={a.id} value={a.id}>{a.nome} ({new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })})</option>)}
                  </select>
                  {atividadesFiltradasDropdown.length === 0 && <span className="text-xs text-red-500">Nenhuma atividade encontrada.</span>}
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">2. Filtre pelo seu Grupo</label>
                  <select value={grupoSelecionado} onChange={e => setGrupoSelecionado(e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:ring-cenaculo-gold outline-none bg-white" disabled={!atividadeSelecionada}>
                    <option value="">Selecione um grupo para abrir a lista...</option>
                    {todosOsGruposParaFiltro.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {atividadeSelecionada && grupoSelecionado && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  
                  <div className="bg-cenaculo-blue text-white px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="font-bold">Lista de Chamada: {grupoSelecionado}</h3>
                      <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold mt-2 inline-block">
                        {presentes.size} de {membrosDoGrupo.length} presentes
                      </span>
                    </div>
                    
                    <div className="relative w-full md:w-64">
                      <input 
                        type="text" 
                        placeholder="Pesquisar nome..." 
                        value={buscaChamada}
                        onChange={(e) => setBuscaChamada(e.target.value)}
                        className="w-full p-2 pl-8 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-cenaculo-gold placeholder-gray-400"
                      />
                      <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {membrosDoGrupoFiltrados.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        {buscaChamada ? "Nenhum membro encontrado com este nome." : "Nenhum membro cadastrado neste grupo."}
                      </div>
                    ) : (
                      membrosDoGrupoFiltrados.map(membro => (
                        <label key={membro.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                          <input type="checkbox" checked={presentes.has(membro.id)} onChange={() => alternarPresenca(membro.id)} className="w-5 h-5 text-cenaculo-blue rounded border-gray-300 focus:ring-cenaculo-gold" />
                          <div>
                            <p className="font-bold text-gray-800">{membro.nome}</p>
                            <p className="text-xs text-gray-400">Cenáculo: {membro.cenaculoFeito ? `${membro.cenaculoFeito}º` : "Não informado"}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  
                  <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button onClick={handleSalvarChamada} disabled={salvando} className="bg-cenaculo-gold text-cenaculo-blue font-extrabold py-3 px-8 rounded-lg hover:bg-yellow-400 transition shadow disabled:opacity-50 w-full md:w-auto text-center">
                      {salvando ? "Salvando..." : "Salvar Presenças do Grupo"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= ABA 2: MEMBROS ================= */}
          {aba === "MEMBROS" && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Adicionar Novo Membro</h2>
              <form 
                action={async (formData) => { 
                  const resposta = await cadastrarMembro(formData); 
                  if (resposta?.erro) {
                    mostrarNotificacao(resposta.erro, true);
                  } else {
                    (document.getElementById("form-membro") as HTMLFormElement)?.reset(); 
                    mostrarNotificacao("Membro cadastrado com sucesso!");
                  }
                }} 
                id="form-membro"
                className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200 items-start"
              >
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Nome Completo</label>
                  <input type="text" name="nome" required className="w-full p-2.5 border border-gray-300 rounded focus:ring-cenaculo-gold outline-none bg-white" placeholder="Ex: João da Silva" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Grupos (Pode marcar vários)</label>
                  <div className="flex flex-wrap gap-2">
                    {GRUPOS_OFICIAIS.map(g => (
                      <label key={g} className="flex items-center gap-1.5 bg-white border border-gray-300 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                        <input type="checkbox" name="grupo" value={g} className="text-cenaculo-blue w-4 h-4 rounded border-gray-300" />
                        <span className="text-xs font-bold text-gray-700">{g}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Cenáculo (Só nº)</label>
                  <input type="number" name="cenaculoFeito" className="w-full p-2.5 border border-gray-300 rounded focus:ring-cenaculo-gold outline-none bg-white" placeholder="Ex: 83" min="1" />
                </div>

                <div className="md:col-span-3 mt-2 md:mt-0 flex items-end justify-end h-full">
                  <button type="submit" className="w-full md:w-auto bg-cenaculo-blue text-white font-bold py-2.5 px-8 rounded hover:bg-[#1a1d7a] transition shadow">
                    + Adicionar Membro
                  </button>
                </div>
              </form>

              <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Elenco Cadastrado ({membros.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
                {membros.map(m => (
                  <div key={m.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-start justify-between group">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{m.nome}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.grupo.split(", ").map((g: string) => (
                          <span key={g} className="text-[10px] bg-blue-50 text-cenaculo-blue font-bold px-2 py-0.5 rounded border border-blue-100">{g}</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Cenáculo: {m.cenaculoFeito ? `${m.cenaculoFeito}º` : "S/N"}</p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div title="Total de presenças registradas" className="w-7 h-7 bg-green-50 text-green-700 rounded-full flex items-center justify-center font-bold text-xs shadow-inner">
                        {m.presencas.length}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setMembroParaExcluir({ id: m.id, nome: m.nome })}
                        className="text-gray-400 hover:text-red-600 transition" 
                        title="Excluir Membro"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= ABA 3: ATIVIDADES ================= */}
          {aba === "ATIVIDADES" && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Cadastrar Atividade ou Missa</h2>
              <form action={async (formData) => { await cadastrarAtividade(formData); (document.getElementById("form-atividade") as HTMLFormElement)?.reset(); mostrarNotificacao("Atividade registrada com sucesso!"); }} id="form-atividade" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Nome / Descrição da Atividade</label>
                  <input type="text" name="nome" required className="w-full p-2.5 border border-gray-300 rounded focus:ring-cenaculo-gold outline-none bg-white" placeholder="Ex: Missa de Envio..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Data da Atividade</label>
                  <input type="date" name="data" required className="w-full p-2.5 border border-gray-300 rounded focus:ring-cenaculo-gold outline-none bg-white" />
                </div>
                <div className="md:col-span-3 mt-2">
                  <button type="submit" className="w-full md:w-auto bg-cenaculo-blue text-white font-bold py-2.5 px-6 rounded hover:bg-[#1a1d7a] transition shadow">+ Registrar Atividade</button>
                </div>
              </form>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b pb-2 gap-4">
                <h3 className="font-bold text-gray-700">Histórico de Atividades ({atividades.length})</h3>
                <input 
                  type="text" 
                  placeholder="Pesquisar histórico..." 
                  value={buscaHistoricoAtividade}
                  onChange={(e) => setBuscaHistoricoAtividade(e.target.value)}
                  className="w-full md:w-64 p-2 border border-gray-300 rounded text-sm focus:ring-cenaculo-gold outline-none bg-white"
                />
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0 shadow-sm">
                    <tr>
                      <th className="p-4 font-semibold text-sm text-gray-600">Descrição</th>
                      <th className="p-4 font-semibold text-sm text-gray-600">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {atividadesFiltradasHistorico.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="p-4 font-bold text-gray-800">{a.nome}</td>
                        <td className="p-4 text-sm text-gray-600">{new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                      </tr>
                    ))}
                    {atividadesFiltradasHistorico.length === 0 && <tr><td colSpan={2} className="p-8 text-center text-gray-500">Nenhuma atividade encontrada na busca.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= ABA 4: RELATÓRIOS ================= */}
          {aba === "RELATORIO" && (
            <div className="animate-fadeIn">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Relatório de Presenças</h2>
                  <p className="text-sm text-gray-500 mt-1">Os membros estão ordenados de quem participa mais para quem participa menos.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <select value={filtroGrupoRelatorio} onChange={(e) => setFiltroGrupoRelatorio(e.target.value)} className="p-2.5 border border-gray-300 rounded-lg focus:ring-cenaculo-gold outline-none bg-white text-sm font-semibold">
                    <option value="">Todos os Grupos</option>
                    {todosOsGruposParaFiltro.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>

                  <a href={enderecoExportacao} download className="bg-green-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-green-700 transition shadow flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Exportar Excel
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-4 font-semibold text-sm text-gray-600">Nome do Membro</th>
                        <th className="p-4 font-semibold text-sm text-gray-600">Grupo</th>
                        <th className="p-4 font-semibold text-sm text-gray-600">Cenáculo</th>
                        <th className="p-4 font-semibold text-sm text-gray-600">Eventos Frequentados</th>
                        <th className="p-4 font-semibold text-sm text-gray-600 text-center">Presenças</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {membrosFiltradosParaRelatorio.map(m => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="p-4 font-bold text-gray-800">{m.nome}</td>
                          <td className="p-4 text-sm font-medium text-cenaculo-blue">{m.grupo}</td>
                          <td className="p-4 text-sm text-gray-600">{m.cenaculoFeito ? `${m.cenaculoFeito}º` : "-"}</td>
                          <td className="p-4 text-sm max-w-xs md:max-w-md">
                            <div className="flex flex-wrap gap-1.5">
                              {m.presencas.map(p => <span key={p.id} className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">{p.atividade?.nome}</span>)}
                              {m.presencas.length === 0 && <span className="text-gray-400 italic text-xs">Nenhum evento registrado</span>}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-4 py-1 rounded-full text-xs font-bold ${m.presencas.length > 5 ? 'bg-green-100 text-green-800' : m.presencas.length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>{m.presencas.length}</span>
                          </td>
                        </tr>
                      ))}
                      {membrosFiltradosParaRelatorio.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-gray-500">Nenhum membro encontrado neste grupo.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 🔴 MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {membroParaExcluir && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Atenção!</h3>
            <p className="text-gray-600 mb-8">
              Tem certeza que deseja excluir <strong>{membroParaExcluir.nome}</strong>? O seu histórico de presenças também será perdido para sempre.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setMembroParaExcluir(null)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition">
                Cancelar
              </button>
              <form action={async (formData) => {
                await excluirMembro(formData);
                setMembroParaExcluir(null);
                mostrarNotificacao("Membro excluído com sucesso!");
              }}>
                <input type="hidden" name="id" value={membroParaExcluir.id} />
                <button type="submit" className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow">
                  Sim, Excluir
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 TOAST NOTIFICATION (Aviso elegante flutuante) */}
      {notificacao && (
        <div className={`fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 p-4 md:px-6 md:py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-fadeIn border-l-4 ${
          notificacao.erro ? 'bg-red-50 border-red-500 text-red-800' : 'bg-green-50 border-green-500 text-green-800'
        }`}>
          <span className="font-bold text-sm md:text-base">{notificacao.msg}</span>
          <button onClick={() => setNotificacao(null)} className="opacity-50 hover:opacity-100 font-bold text-xl">&times;</button>
        </div>
      )}
    </>
  );
}