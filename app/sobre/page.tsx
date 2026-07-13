"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function SobrePage() {
  // Estado para controlar qual aba está ativa: 'historia' | 'retiro' | 'pos'
  const [abaAtiva, setAbaAtiva] = useState<"historia" | "retiro" | "pos">("historia");

  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4 flex flex-col items-center">
      <div className="max-w-4xl w-full text-center mb-12">
        <h1 className="text-4xl font-extrabold text-cenaculo-blue mb-4">
          Conheça o Nosso <span className="text-cenaculo-gold">Movimento</span>
        </h1>
        <p className="text-gray-600 text-lg">
          Descubra a história, o propósito e a caminhada pós-retiro que transformam tantas vidas.
        </p>
      </div>

      {/* SELETOR DE ABAS COMPONENT */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col md:flex-row min-h-[500px]">
        
        {/* Menu Lateral das Abas */}
        <div className="md:w-1/3 bg-cenaculo-blue p-6 flex flex-col justify-between gap-8 border-b md:border-b-0 md:border-r border-cenaculo-gold/20">
          <div className="space-y-3">
            <p className="text-xs font-bold text-cenaculo-gold uppercase tracking-widest mb-4">Navegação</p>
            
            <button
              onClick={() => setAbaAtiva("historia")}
              className={`w-full text-left p-4 rounded-xl font-bold text-sm transition-all flex items-center justify-between ${
                abaAtiva === "historia" 
                  ? "bg-cenaculo-gold text-cenaculo-blue shadow-lg transform translate-x-1" 
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              Nossa História
              <span>&rarr;</span>
            </button>

            <button
              onClick={() => setAbaAtiva("retiro")}
              className={`w-full text-left p-4 rounded-xl font-bold text-sm transition-all flex items-center justify-between ${
                abaAtiva === "retiro" 
                  ? "bg-cenaculo-gold text-cenaculo-blue shadow-lg transform translate-x-1" 
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              O Retiro de Fim de Semana
              <span>&rarr;</span>
            </button>

            <button
              onClick={() => setAbaAtiva("pos")}
              className={`w-full text-left p-4 rounded-xl font-bold text-sm transition-all flex items-center justify-between ${
                abaAtiva === "pos" 
                  ? "bg-cenaculo-gold text-cenaculo-blue shadow-lg transform translate-x-1" 
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              Pós-Cenáculo (Grupos)
              <span>&rarr;</span>
            </button>
          </div>

          <div className="hidden md:block bg-[#1a1d7a] p-4 rounded-xl border border-white/5 text-center">
            <p className="text-xs text-gray-300">Quer viver essa experiência?</p>
            <Link href="/inscricao" className="mt-2 inline-block text-xs font-extrabold text-cenaculo-gold underline hover:text-white transition">
              Ver inscrições abertas &rarr;
            </Link>
          </div>
        </div>

        {/* Conteúdo Dinâmico da Aba Ativa */}
        <div className="md:w-2/3 p-8 md:p-12 flex flex-col justify-center">
          
          {/* CONTEÚDO 1: HISTÓRIA */}
          {abaAtiva === "historia" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="relative h-48 w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm">
                {/* Imagem estática: public/images/sobre_historia.jpg */}
                <Image src="/images/sobre_historia.jpg" alt="História do Cenáculo" fill className="object-cover" fallback-src="https://placehold.co/600x300" />
              </div>
              <h2 className="text-3xl font-extrabold text-cenaculo-blue">Nossa Caminhada de Fé</h2>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                O Movimento Mariano Cenáculo nasceu do desejo profundo de criar um espaço onde as pessoas pudessem se desligar das correrias do mundo e se reconectar com o essencial: o amor de Deus e a presença terna de Maria Santíssima. 
              </p>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                Iniciado há anos na Arquidiocese de Pelotas, o movimento já realizou dezenas de edições do retiro tradicional, expandindo-se também para alcançar as crianças no Cenáculo Kids e os veteranos no Cenaculão. Hoje, somos uma grande família paroquial espalhada por diversas cidades da região.
              </p>
            </div>
          )}

          {/* CONTEÚDO 2: O RETIRO */}
          {abaAtiva === "retiro" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="relative h-48 w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm">
                {/* Imagem estática: public/images/sobre_retiro.jpg */}
                <Image src="/images/sobre_retiro.jpg" alt="O Retiro" fill className="object-cover" fallback-src="https://placehold.co/600x300" />
              </div>
              <h2 className="text-3xl font-extrabold text-cenaculo-blue">Um Fim de Semana Inesquecível</h2>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                O retiro do Cenáculo acontece de sexta-feira à noite a domingo no final da tarde. É um período de isolamento saudável, onde os participantes vivenciam momentos intensos de palestras, dinâmicas de grupo, forte espiritualidade, confissões e adoração ao Santíssimo Sacramento.
              </p>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                O grande diferencial do Cenáculo é a sua capacidade de tocar o coração através da simplicidade e do acolhimento marianos. É um divisor de águas na vida de quem participa, reacendendo casamentos, curando traumas e devolvendo o sentido da vida em comunidade.
              </p>
            </div>
          )}

          {/* CONTEÚDO 3: PÓS-CENÁCULO (GRUPOS) */}
          {abaAtiva === "pos" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="relative h-48 w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm">
                {/* Imagem estática: public/images/sobre_grupos.jpg */}
                <Image src="/images/sobre_grupos.jpg" alt="Grupos de Pós-Cenáculo" fill className="object-cover" fallback-src="https://placehold.co/600x300" />
              </div>
              <h2 className="text-3xl font-extrabold text-cenaculo-blue">A Caminhada Continua</h2>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                Dizemos sempre no movimento: <strong>&quot;O Cenáculo não termina no domingo, ele começa na segunda-feira!&quot;</strong>. Para que a chama do retiro não se apague, os participantes são inseridos nos chamados Grupos de Pós-Cenáculo.
              </p>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                Esses grupos reúnem-se semanalmente nas casas ou nas paróquias para partilhar a palavra de Deus, rezar o terço e manter vivos os laços de amizade e santidade que nasceram no final de semana. É o suporte diário necessário para perseverar firme na igreja.
              </p>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}