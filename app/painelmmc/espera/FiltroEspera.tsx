"use client";

import { useRouter } from "next/navigation";

export default function FiltroEspera({ tipoAtual }: { tipoAtual: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-200 w-full md:w-auto">
      <label className="text-sm font-bold text-gray-700 whitespace-nowrap">Filtrar por Interesse:</label>
      <select
        value={tipoAtual}
        onChange={(e) => {
          const valor = e.target.value;
          if (valor === "") {
            router.push("/painelmmc/espera"); // Remove o filtro da URL
          } else {
            router.push(`/painelmmc/espera?tipo=${valor}`); // Adiciona o filtro na URL
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