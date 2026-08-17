"use client";

import { useRouter } from "next/navigation";

export default function FiltroEspera({ tipoAtual }: { tipoAtual: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
      <label className="text-sm font-bold text-gray-700 whitespace-nowrap">Filtrar por Interesse:</label>
      <select
        value={tipoAtual}
        onChange={(e) => {
          const valor = e.target.value;
          if (valor === "") {
            router.push("/admin/espera"); // Remove o filtro da URL
          } else {
            router.push(`/admin/espera?tipo=${valor}`); // Adiciona o filtro na URL
          }
        }}
        className="p-2 border border-gray-300 rounded focus:ring-cenaculo-gold bg-gray-50 outline-none text-sm font-semibold"
      >
        <option value="">Todos os Retiros</option>
        <option value="CENACULO">Cenáculo (Tradicional)</option>
        <option value="KIDS">Cenáculo Kids</option>
        <option value="CENACULAO">Cenaculão</option>
      </select>
    </div>
  );
}