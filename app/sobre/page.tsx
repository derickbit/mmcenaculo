"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// 1. DADOS EXTRAÍDOS COM AS IMAGENS INCLUÍDAS
const GRUPOS_POS_CENACULO = [
  {
    id: "salve-maria",
    nome: "Salve Maria",
    desc: "Animação, Música, Oração e partilha.",
    restrito: true,
    dia: "Quarta-feira",
    hora: "19h30min",
    local: "Igreja Nossa Sra. de Fátima (R. Frederico Trebbi, 68)",
    coords: "Daiane e Francisco",
    imagem: "/images/cardSalve.jpg" // Arte do Salve Maria
  },
  {
    id: "marta-maria",
    nome: "Marta e Maria",
    desc: "Confecção de lembrancinhas, ornamentação de ambientes, oração e partilha.",
    restrito: true,
    dia: "Segunda-feira",
    hora: "19h30min",
    local: "Local a combinar previamente",
    coords: "Eni e Valesca",
    imagem: "/images/cardMarta.jpg" // Arte do Marta e Maria
  },
  {
    id: "coracao-andarilho",
    nome: "Coração Andarilho",
    desc: "Leva a Oração do Terço aos lares de quem precisa.",
    restrito: false,
    dia: "Terça-feira",
    hora: "20h",
    local: "Local a combinar previamente",
    coords: "Cristiane, Gládis e Luciane",
    imagem: "/images/cardCoraçãoAndarilho.jpg" // Arte do Coração Andarilho
  },
  {
    id: "cenaculo-online",
    nome: "Cenáculo Online",
    desc: "Leitura e partilha do Evangelho.",
    restrito: false,
    dia: "Segunda-feira",
    hora: "20h",
    local: "Online pelo Google Meet",
    coords: "Arieli e Ana",
    imagem: "/images/cardOnline.jpg" // Arte do Online
  },
  {
    id: "sao-gabriel",
    nome: "São Gabriel",
    desc: "Oração, partilha, anuncia o Movimento e a Devoção Mariana.",
    restrito: false,
    dia: "Sexta-feira",
    hora: "19h30min",
    local: "Local a combinar previamente",
    coords: "Natalí e Zilda",
    imagem: "/images/cardSaoGabriel.jpg" // Arte do São Gabriel
  },
  {
    id: "gabaon",
    nome: "Gabaon",
    desc: "Adoração ao Santíssimo Sacramento, Oração do Terço e partilha do Evangelho.",
    restrito: false,
    dia: "Sexta-feira",
    hora: "12h às 13h",
    local: "Santuário de Adoração (R. 7 de Setembro, 145)",
    coords: "Ana Virgínia e Silvinha",
    imagem: "/images/cardGabaon.jpg" // Arte do Gabaon
  }
];

export default function SobrePage() {
  const [grupoAtivo, setGrupoAtivo] = useState(GRUPOS_POS_CENACULO[0].id);
  const infoGrupo = GRUPOS_POS_CENACULO.find(g => g.id === grupoAtivo);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col pb-20">
      
      {/* HEADER DA PÁGINA */}
      <header className="bg-cenaculo-blue text-white py-20 px-6 text-center shadow-inner w-full">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Nossa <span className="text-cenaculo-gold">Identidade</span>
          </h1>
          <p className="text-lg text-gray-200 max-w-2xl mx-auto">
            Conheça a história, a missão e as formas de perseverar no Movimento Mariano Cenáculo.
          </p>
        </div>
      </header>

      {/* SEÇÃO: NOSSA HISTÓRIA & O RETIRO (Textos restaurados com persuasão) */}
      <section className="max-w-7xl mx-auto px-6 mt-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-cenaculo-blue mb-6">Quem Somos e O Retiro</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed text-lg text-justify">
              <p>
                O Movimento Mariano Cenáculo nasceu do desejo profundo de criar um espaço onde as pessoas pudessem se desligar das correrias do mundo e se reconectar com o essencial: o amor de Deus e a presença terna de Maria Santíssima. Iniciado há anos na Arquidiocese de Pelotas, hoje somos uma grande família paroquial espalhada por diversas cidades da região.
              </p>
              <p>
                O nosso retiro acontece de sexta-feira à noite a domingo no final da tarde. É um período de isolamento saudável, onde os participantes vivenciam momentos intensos de palestras, dinâmicas de grupo, forte espiritualidade, confissões e adoração ao Santíssimo Sacramento.
              </p>
              <p className="font-semibold text-gray-800">
                O grande diferencial do Cenáculo é a sua capacidade de tocar o coração através da simplicidade e do acolhimento marianos. É um divisor de águas na vida de quem participa, reacendendo casamentos, curando traumas e devolvendo o sentido da vida em comunidade.
              </p>
            </div>
          </div>
          
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border-4 border-white">
            <Image 
              src="/images/hero_bg.jpg" 
              alt="Comunidade Cenáculo" 
              fill 
              className="object-cover" 
            />
          </div>
        </div>
      </section>

      {/* SEÇÃO: PÓS-CENÁCULO (COM IMAGENS NOS CARDS) */}
      <section className="max-w-5xl mx-auto px-6 mt-24 w-full">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-cenaculo-blue mb-4">
            Pós-<span className="text-cenaculo-gold">Cenáculo</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            O retiro não termina no domingo. Para manter a chama acesa, temos diversos grupos de oração, serviço e partilha que se reúnem semanalmente. Escolha o seu e persevere conosco!
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
          
          {/* Navegação das Abas */}
          <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50 hide-scrollbar">
            {GRUPOS_POS_CENACULO.map(grupo => (
              <button
                key={grupo.id}
                onClick={() => setGrupoAtivo(grupo.id)}
                className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-colors border-b-4 ${
                  grupoAtivo === grupo.id 
                    ? "border-cenaculo-gold text-cenaculo-blue bg-white" 
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {grupo.nome}
              </button>
            ))}
          </div>

          {/* Conteúdo da Aba Selecionada */}
          {infoGrupo && (
            <div className="p-8 md:p-10 animate-fadeIn flex flex-col md:flex-row gap-10 items-stretch">
              
              {/* Lado Esquerdo: Textos e Ícones */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="mb-4">
                  <h3 className="text-3xl font-extrabold text-cenaculo-blue uppercase tracking-tight">{infoGrupo.nome}</h3>
                </div>
                
                <p className="text-xl text-gray-700 font-medium mb-6">
                  {infoGrupo.desc}
                </p>

                {infoGrupo.restrito && (
                  <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 border border-orange-200 px-4 py-2 rounded-lg text-sm font-bold mb-8 w-fit">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Restrito para Cenantes.
                  </div>
                )}

                <div className="space-y-5 mt-2">
                  <div className="flex items-center gap-4 text-gray-600">
                    <div className="w-10 h-10 bg-gray-100 text-cenaculo-blue rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dia e Horário</p>
                      <p className="font-semibold text-gray-800">{infoGrupo.dia} às {infoGrupo.hora}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-gray-600">
                    <div className="w-10 h-10 bg-gray-100 text-cenaculo-blue rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Local</p>
                      <p className="font-semibold text-gray-800">{infoGrupo.local}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-gray-600">
                    <div className="w-10 h-10 bg-gray-100 text-cenaculo-blue rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Coordenação</p>
                      <p className="font-semibold text-gray-800">{infoGrupo.coords}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lado Direito: Imagem do Card e Botão CTA */}
              <div className="w-full md:w-2/5 flex flex-col gap-4 shrink-0 justify-center">
                <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden shadow-md bg-gray-100 border border-gray-200">
                  <Image 
                    src={infoGrupo.imagem} 
                    alt={infoGrupo.nome} 
                    fill 
                    className="object-cover hover:scale-105 transition-transform duration-500" 
                  />
                </div>
                <Link 
                  href="https://www.instagram.com/mmcenaculo" 
                  target="_blank"
                  className="block w-full text-center bg-cenaculo-blue text-white font-bold py-3.5 px-8 rounded-lg hover:bg-[#1a1d7a] transition shadow-md"
                >
                  Falar no Instagram
                </Link>
              </div>

            </div>
          )}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mt-24 bg-cenaculo-blue text-white py-16 px-6 text-center">
        <h2 className="text-3xl font-extrabold mb-6">Ainda não viveu o Cenáculo?</h2>
        <p className="text-lg text-gray-200 mb-8 max-w-2xl mx-auto">
          Fique atento às nossas próximas datas e venha ter uma experiência inesquecível de fé e comunidade.
        </p>
        <Link href="/calendario" className="inline-block bg-cenaculo-gold text-cenaculo-blue font-extrabold py-4 px-10 rounded-full hover:bg-yellow-400 transition transform hover:scale-105 shadow-xl text-lg">
          Ver Calendário de Retiros
        </Link>
      </section>

    </main>
  );
}