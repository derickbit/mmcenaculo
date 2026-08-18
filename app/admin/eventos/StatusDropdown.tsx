"use client";

export default function StatusDropdown({ 
  eventoId, 
  statusAtual, 
  mudarStatus 
}: { 
  eventoId: string, 
  statusAtual: string, 
  mudarStatus: (formData: FormData) => void 
}) {
  return (
    <form action={mudarStatus}>
      <input type="hidden" name="id" value={eventoId} />
      
      {/* O 'key' mágico! */}
      <select
        key={statusAtual} 
        name="novoStatus"
        defaultValue={statusAtual}
        onChange={(e) => {
          e.target.form?.requestSubmit();
        }} 
        className={`text-xs font-bold px-3 py-1 rounded-full outline-none cursor-pointer border shadow-sm transition-colors ${
          statusAtual === 'ABERTO' 
            ? 'bg-green-50 text-green-700 border-green-200' 
            : statusAtual === 'FECHADO' 
              ? 'bg-red-50 text-red-700 border-red-200'
              : statusAtual === 'AUTOMATICO'
                ? 'bg-blue-50 text-cenaculo-blue border-blue-200'
                : statusAtual === 'AGUARDANDO'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-gray-100 text-gray-500 border-gray-200' // CONCLUIDO
        }`}
      >
        <option value="AUTOMATICO">Automação Inteligente</option>
        <option value="AGUARDANDO">Aguardando (Em Breve)</option>
        <option value="ABERTO">Aberto</option>
        <option value="FECHADO">Fechado</option>
        <option value="CONCLUIDO">Concluído</option>
      </select>
    </form>
  );
}