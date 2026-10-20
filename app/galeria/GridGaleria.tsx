"use client";

import { useState } from "react";
import Image from "next/image";

export default function GridGaleria({ fotos, eventoNome }: { fotos: { id: string; url: string }[]; eventoNome: string }) {
  // Estado para guardar a URL da foto que o utilizador clicou para ver em ponto grande
  const [fotoAtiva, setFotoAtiva] = useState<string | null>(null);

  return (
    <>
      {/* GRELHA EXPANDIDA PARA MAX-W-7XL (Fica incrível em monitores largos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
        {fotos.map((foto) => (
          <div 
            key={foto.id} 
            onClick={() => setFotoAtiva(foto.url)}
            className="relative aspect-square rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group bg-gray-200 cursor-pointer border border-gray-100"
          >
            <Image 
              src={foto.url} 
              alt={`Foto de ${eventoNome}`} 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
            {/* Efeito de Lupa no Hover */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg className="w-8 h-8 text-white drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL / LIGHTBOX (Ecrã Inteiro) */}
      {fotoAtiva && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setFotoAtiva(null)} // Fecha se clicar no fundo preto
        >
          {/* Botão de Fechar */}
          <button 
            onClick={() => setFotoAtiva(null)}
            className="absolute top-6 right-6 text-white hover:text-cenaculo-gold font-bold text-3xl transition z-50 bg-white/10 w-12 h-12 rounded-full flex items-center justify-center"
          >
            &times;
          </button>

          {/* Imagem em Tamanho Real */}
          <div className="relative w-full h-full max-w-5xl max-h-[85vh] flex items-center justify-center">
            <img 
              src={fotoAtiva} 
              alt="Visualização completa" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}