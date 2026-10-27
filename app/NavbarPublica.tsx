"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", texto: "Início" },
  { href: "/sobre", texto: "Sobre nós" },
  { href: "/calendario", texto: "Calendário" },
  { href: "/galeria", texto: "Galeria" },
];

// Barra de cima do site público. No computador os links ficam na própria barra; no celular viram uma lista suspensa (botão de 3 riscos).
export default function NavbarPublica() {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="bg-cenaculo-blue text-white sticky top-0 z-40 shadow-md border-b border-cenaculo-gold/30">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 h-20 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
          <Image src="/images/logo.png" alt="Logo MMC" width={45} height={45} className="object-contain" />
          <span className="font-extrabold text-lg md:text-xl tracking-tight">
            Cenáculo<span className="text-cenaculo-gold">MMC</span>
          </span>
        </Link>

        {/* Computador */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4 text-sm font-bold">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="px-3 py-2 rounded-lg hover:bg-white/10 transition">
              {l.texto}
            </Link>
          ))}
          <Link
            href="/inscricao"
            className="bg-cenaculo-gold text-cenaculo-blue px-5 py-2 rounded-full hover:bg-yellow-400 transition transform hover:scale-105 shadow font-extrabold ml-2"
          >
            Inscrições
          </Link>
        </div>

        {/* Celular: botão que abre a lista */}
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
          aria-controls="menu-celular"
          className="md:hidden p-3 -mr-2 rounded-lg hover:bg-white/10 transition"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            {aberto ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {aberto && (
        <div id="menu-celular" className="md:hidden border-t border-white/10 bg-cenaculo-blue px-4 pb-4 pt-2 flex flex-col gap-1 font-bold">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setAberto(false)}
              className={`px-4 py-3 rounded-lg hover:bg-white/10 transition ${pathname === l.href ? "bg-white/10 text-cenaculo-gold" : ""}`}
            >
              {l.texto}
            </Link>
          ))}
          <Link
            href="/inscricao"
            onClick={() => setAberto(false)}
            className="mt-2 bg-cenaculo-gold text-cenaculo-blue px-4 py-3 rounded-full text-center font-extrabold hover:bg-yellow-400 transition"
          >
            Inscrições
          </Link>
        </div>
      )}
    </nav>
  );
}
