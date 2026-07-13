"use client";

// Componente Cliente para poder usar o window.confirm()
export default function BotaoDeletar({ 
  id, 
  action, 
  aviso 
}: { 
  id: string; 
  action: (formData: FormData) => void; 
  aviso: string 
}) {
  return (
    <form action={action} className="w-full">
      <input type="hidden" name="id" value={id} />
      <button 
        type="submit" 
        onClick={(e) => {
          if (!window.confirm(aviso)) {
            e.preventDefault(); // Cancela o envio se a pessoa clicar em "Cancelar"
          }
        }}
        className="text-xs border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold px-3 py-2 rounded transition w-full text-center"
      >
        Excluir
      </button>
    </form>
  );
}