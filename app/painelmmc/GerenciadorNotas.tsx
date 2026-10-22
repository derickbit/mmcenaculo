"use client";

import { useState } from "react";
import { adicionarNota, adicionarNotaKids } from "./actions";

// Tipagem para o TypeScript não reclamar
type Observacao = {
  id: string;
  texto: string;
  criadoEm: Date;
  usuario: { nome: string };
};

export default function GerenciadorNotas({ inscricaoId, observacoes, tipo = "ADULTO" }: { inscricaoId: string, observacoes: Observacao[], tipo?: "ADULTO" | "KIDS" }) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Envolvemos a server action para dar um feedback visual (loading)
  async function handleSalvar(formData: FormData) {
    setCarregando(true);
    await (tipo === "KIDS" ? adicionarNotaKids : adicionarNota)(inscricaoId, formData);
    setCarregando(false);
    // Limpa o input (reset no form) precisa ser feito via DOM, mas como é simples, deixamos o form revalidar a página
  }

  return (
    <div className="w-full">
      {/* O Botão que você pediu */}
      <button 
        onClick={() => setAberto(!aberto)}
        className="bg-gray-100 text-gray-700 px-4 py-2 rounded font-bold text-sm hover:bg-gray-200 transition border border-gray-300 w-full text-left flex justify-between items-center"
      >
        Notas Internas
        <span className="bg-cenaculo-blue text-white text-xs px-2 py-0.5 rounded-full">
          {observacoes.length}
        </span>
      </button>

      {/* O Painel Sanfona que abre ao clicar */}
      {aberto && (
        <div className="mt-2 bg-blue-50/50 border border-blue-100 rounded-lg p-3 shadow-inner">
          
          {/* Histórico da Trilha de Auditoria */}
          <div className="max-h-32 overflow-y-auto mb-3 space-y-2 pr-1">
            {observacoes.map(obs => (
              <div key={obs.id} className="bg-white p-2 rounded border border-gray-200 text-sm">
                <p className="text-gray-800">{obs.texto}</p>
                <div className="text-[10px] text-gray-400 mt-1 font-semibold uppercase tracking-wider">
                  Por {obs.usuario.nome} em {new Date(obs.criadoEm).toLocaleDateString('pt-BR')} às {new Date(obs.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {observacoes.length === 0 && (
              <p className="text-xs text-gray-500 italic text-center">Nenhuma nota adicionada.</p>
            )}
          </div>

          {/* Formulário para Nova Nota */}
          <form action={handleSalvar} className="flex gap-2">
            <input 
              type="text" 
              name="texto" 
              required
              placeholder="Adicionar observação..." 
              className="flex-1 p-2 text-sm border border-gray-300 rounded focus:ring-cenaculo-gold outline-none"
            />
            <button 
              type="submit" 
              disabled={carregando}
              className="bg-cenaculo-gold text-cenaculo-blue font-bold px-3 py-2 rounded text-sm hover:bg-yellow-500 transition disabled:opacity-50"
            >
              +
            </button>
          </form>
        </div>
      )}
    </div>
  );
}