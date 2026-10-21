"use client";

import * as XLSX from "xlsx";
import type { InscricaoAdmin } from "./tipos";

export default function BotaoExportar({ inscricoes, nomeEvento }: { inscricoes: InscricaoAdmin[], nomeEvento: string }) {
  
  const exportarPlanilha = () => {
    if (inscricoes.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const dadosFormatados = inscricoes.map(insc => {
      // 🔴 NOVA LÓGICA: Transforma o array de notas em um texto legível para o Excel
      const notasFormatadas = insc.observacoes && insc.observacoes.length > 0
        ? insc.observacoes.map(obs => 
            `[${new Date(obs.criadoEm).toLocaleDateString('pt-BR')} por ${obs.usuario.nome}]: ${obs.texto}`
          ).join(" | ") // Separa as notas por uma barra vertical
        : "-";

      return {
        "Nome Completo": insc.nomeCompleto,
        "Telefone": insc.telefone,
        "E-mail": insc.email,
        "Data de Nascimento": new Date(insc.dataNascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
        "Cidade": insc.cidade,
        "Já fez Cenáculo?": insc.jaFezCenaculo,
        "Paróquia": insc.paroquiaAtuante || "-",
        "Problema de Saúde": insc.problemaSaude || "-",
        "Medicação": insc.medicacaoControlada || "-",
        "Restrição Alimentar": insc.restricaoAlimentar || "-",
        "Atendimento Especial": insc.atendimentoEspecial || "-",
        "Como Conheceu": insc.comoConheceu || "-",
        "Data da Inscrição": new Date(insc.criadoEm).toLocaleString('pt-BR'),
        "Observações Internas (Auditoria)": notasFormatadas // <-- COLUNA NOVA AQUI
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inscritos");

    const dataHoje = new Date().toISOString().split('T')[0];
    const nomeArquivo = `Inscritos_${nomeEvento.replace(/\s+/g, '_')}_${dataHoje}.xlsx`;

    XLSX.writeFile(workbook, nomeArquivo);
  };

  return (
    <button
      onClick={exportarPlanilha}
      className="bg-green-600 text-white font-bold px-4 py-2 rounded-lg shadow hover:bg-green-700 transition flex items-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
      </svg>
      Exportar Excel
    </button>
  );
}