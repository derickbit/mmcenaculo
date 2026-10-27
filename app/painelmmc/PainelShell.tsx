"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

// Menu lateral do painel. Quem está logado vem do layout (que lê a sessão no servidor): o item "Usuários" só aparece para o ADMIN.
// No celular o menu vira uma lista suspensa (botão de 3 riscos na barra de cima); no computador fica fixo na lateral.
export default function PainelShell({
  children,
  papel,
  nomeUsuario,
}: {
  children: React.ReactNode;
  papel: string | null;
  nomeUsuario: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  if (pathname === "/painelmmc/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/painelmmc/login');
    router.refresh();
  };

  const itens = [
    { href: "/painelmmc/eventos", texto: "Gerenciar Eventos", ativo: pathname.includes("/eventos") },
    { href: "/painelmmc", texto: "Inscrições", ativo: pathname === "/painelmmc" },
    { href: "/painelmmc/kids", texto: "Inscrições Kids", ativo: pathname.includes("/kids") },
    { href: "/painelmmc/espera", texto: "Lista de Espera", ativo: pathname.includes("/espera") },
    { href: "/painelmmc/galeria", texto: "Galeria de Fotos", ativo: pathname.includes("/galeria") },
    { href: "/painelmmc/frequencia", texto: "Frequência e Presença", ativo: pathname.includes("/frequencia") },
    ...(papel === "ADMIN" ? [{ href: "/painelmmc/usuarios", texto: "Usuários", ativo: pathname.includes("/usuarios") }] : []),
  ];

  return (
    <div className="w-full bg-gray-100 flex flex-col md:flex-row md:overflow-hidden md:h-[calc(100dvh-5rem)] md:min-h-[calc(100dvh-5rem)]">

      <aside className="w-full md:w-64 md:h-full md:flex-shrink-0 bg-cenaculo-blue text-white flex flex-col shadow-xl z-20">
        <div className="px-4 py-3 md:p-6 flex items-center justify-between border-b border-[#1a1d7a]">
          <span className="text-xl md:text-2xl font-extrabold">
            Painel <span className="text-cenaculo-gold">MMC</span>
          </span>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-label={aberto ? "Fechar menu do painel" : "Abrir menu do painel"}
            aria-expanded={aberto}
            aria-controls="menu-painel"
            className="md:hidden p-2 -mr-2 rounded-lg hover:bg-[#1a1d7a] transition"
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

        <div id="menu-painel" className={`${aberto ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0`}>
          <nav className="flex-1 p-3 md:p-4 space-y-1 md:space-y-2 md:mt-4 md:overflow-y-auto">
            {itens.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setAberto(false)}
                className={`block p-3 rounded-lg transition-colors ${item.ativo ? 'bg-cenaculo-gold text-cenaculo-blue font-bold' : 'hover:bg-[#1a1d7a]'}`}
              >
                {item.texto}
              </Link>
            ))}
          </nav>

          {/* Botão de Sair fixo no fundo */}
          <div className="p-4 border-t border-[#1a1d7a]">
            {nomeUsuario && (
              <p className="px-3 pb-2 text-xs text-blue-200 truncate">
                {nomeUsuario} · {papel === "ADMIN" ? "Administrador" : "Coordenação"}
              </p>
            )}
            <button onClick={handleLogout} className="w-full text-left p-3 text-red-300 hover:bg-red-500 hover:text-white rounded-lg transition-colors font-semibold">
              Sair do Sistema
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 min-h-0 p-4 sm:p-6 lg:p-8 md:overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
}
