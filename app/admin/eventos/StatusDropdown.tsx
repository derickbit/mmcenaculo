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
      
      {/* O 'key' mágico! Ele avisa o React: Se o statusAtual mudar no banco, jogue esse select no lixo e crie outro. */}
      <select
        key={statusAtual} 
        name="novoStatus"
        defaultValue={statusAtual}
        onChange={(e) => {
          // Quando clica, apenas manda o form pro servidor. O Next.js cuida do resto.
          e.target.form?.requestSubmit();
        }} 
        className={`text-xs font-bold px-3 py-1 rounded-full outline-none cursor-pointer border shadow-sm transition-colors ${
          statusAtual === 'ABERTO' 
            ? 'bg-green-50 text-green-700 border-green-200' 
            : statusAtual === 'FECHADO' 
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-gray-200 text-gray-700 border-gray-300' // CONCLUIDO
        }`}
      >
        <option value="ABERTO">ABERTO</option>
        <option value="FECHADO">FECHADO</option>
        <option value="CONCLUIDO">CONCLUÍDO</option>
      </select>
    </form>
  );
}