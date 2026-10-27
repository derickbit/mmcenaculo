"use client";

import { useState } from "react";
import type { InscricaoAdmin } from "./tipos";

export default function ModalDetalhes({ inscricao }: { inscricao: InscricaoAdmin }) {
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button 
        onClick={() => setAberto(true)}
        className="mt-2 text-xs font-bold text-cenaculo-blue underline hover:text-cenaculo-gold transition"
      >
        Ver ficha completa
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto relative">
        
        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50 sticky top-0">
          <h2 className="text-xl font-extrabold text-cenaculo-blue">Ficha de Inscrição</h2>
          <button onClick={() => setAberto(false)} className="text-gray-500 hover:text-red-500 font-bold text-xl">
            &times;
          </button>
        </div>

        {/* Corpo do Modal (Todos os dados) */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Dados Pessoais</p>
            <p className="mt-2 text-gray-800"><span className="font-semibold">Nome:</span> {inscricao.nomeCompleto}</p>
            <p className="text-gray-800"><span className="font-semibold">Nascimento:</span> {new Date(inscricao.dataNascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
            <p className="text-gray-800"><span className="font-semibold">Cidade:</span> {inscricao.cidade}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Contato</p>
            <p className="mt-2 text-gray-800"><span className="font-semibold">Telefone:</span> {inscricao.telefone}</p>
            <p className="text-gray-800"><span className="font-semibold">E-mail:</span> {inscricao.email}</p>
            <p className="text-gray-800"><span className="font-semibold">Instagram:</span> {inscricao.instagram || "-"}</p>
          </div>

          <div className="col-span-1 md:col-span-2 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Histórico e Igreja</p>
            <p className="mt-2 text-gray-800"><span className="font-semibold">Já fez Cenáculo?</span> {inscricao.jaFezCenaculo}</p>
            <p className="text-gray-800"><span className="font-semibold">Paróquia Atuante:</span> {inscricao.paroquiaAtuante || "Nenhuma"}</p>
            <p className="text-gray-800"><span className="font-semibold">Como conheceu:</span> {inscricao.comoConheceu || "-"}</p>
          </div>

          <div className="col-span-1 md:col-span-2 border-t border-gray-100 pt-4 bg-orange-50/50 rounded p-4">
            <p className="text-xs text-orange-600 uppercase font-bold tracking-wider mb-2">Saúde e Atenção Especial</p>
            <p className="text-gray-800"><span className="font-semibold">Problemas de Saúde:</span> {inscricao.problemaSaude || "Nenhum"}</p>
            <p className="text-gray-800"><span className="font-semibold">Medicação Controlada:</span> {inscricao.medicacaoControlada || "Nenhuma"}</p>
            <p className="text-gray-800"><span className="font-semibold">Restrição Alimentar:</span> {inscricao.restricaoAlimentar || "Nenhuma"}</p>
            <p className="text-gray-800"><span className="font-semibold">Atendimento Especial:</span> {inscricao.atendimentoEspecial || "Nenhum"}</p>
          </div>
          
{inscricao.observacoes && inscricao.observacoes.length > 0 && (
            <div className="col-span-1 md:col-span-2 border-t border-gray-100 pt-4 bg-blue-50/50 rounded p-4">
              <p className="text-xs text-cenaculo-blue uppercase font-bold tracking-wider mb-2">Notas Internas (Auditoria)</p>
              <div className="space-y-2">
                {inscricao.observacoes.map(obs => (
                  <div key={obs.id} className="bg-white p-2 rounded border border-gray-200 text-sm">
                    <p className="text-gray-800">{obs.texto}</p>
                    <div className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">
                      Por {obs.usuario.nome} em {new Date(obs.criadoEm).toLocaleDateString('pt-BR')} às {new Date(obs.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="col-span-1 md:col-span-2 border-t border-gray-100 pt-4">
             <p className="text-xs text-gray-400">Inscrição realizada em: {new Date(inscricao.criadoEm).toLocaleString('pt-BR')}</p>
             <p className="text-xs text-gray-400">
               {inscricao.consentimentoEm
                 ? `Consentimento (LGPD) aceito em: ${new Date(inscricao.consentimentoEm).toLocaleString('pt-BR')}`
                 : "Consentimento (LGPD): inscrição anterior à caixinha de consentimento."}
             </p>
             {inscricao.evento && <p className="text-xs text-gray-400">Evento: {inscricao.evento.nome}</p>}
          </div>
        </div>

      </div>
    </div>
  );
}