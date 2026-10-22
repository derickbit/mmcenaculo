"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

// Menu lateral do painel. Quem está logado vem do layout (que lê a sessão no servidor): o item "Usuários" só aparece para o ADMIN.
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

  if (pathname === "/painelmmc/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/painelmmc/login');
    router.refresh();
  };

  return (
    <div className="h-full min-h-0 w-full bg-gray-100 flex flex-col md:flex-row overflow-hidden md:h-[calc(100dvh-5rem)] md:min-h-[calc(100dvh-5rem)]">
      
      <aside className="w-full md:w-64 md:h-full md:flex-shrink-0 bg-cenaculo-blue text-white flex flex-col shadow-xl z-20">
        <div className="p-6 text-2xl font-extrabold border-b border-[#1a1d7a]">
          Painel <span className="text-cenaculo-gold">MMC</span>
        </div>
        
        <nav className="flex-1 p-3 md:p-4 space-y-2 md:mt-4 overflow-x-auto md:overflow-visible whitespace-nowrap md:whitespace-normal">
          <Link href="/painelmmc/eventos" className={`block p-3 rounded-lg transition-colors ${pathname.includes('/eventos') ? 'bg-cenaculo-gold text-cenaculo-blue font-bold' : 'hover:bg-[#1a1d7a]'}`}>
            Gerenciar Eventos
          </Link>
          <Link href="/painelmmc" className={`block p-3 rounded-lg transition-colors ${pathname === '/painelmmc' ? 'bg-cenaculo-gold text-cenaculo-blue font-bold' : 'hover:bg-[#1a1d7a]'}`}>
            Inscrições
          </Link>
          <Link href="/painelmmc/kids" className={`block p-3 rounded-lg transition-colors ${pathname.includes('/kids') ? 'bg-cenaculo-gold text-cenaculo-blue font-bold' : 'hover:bg-[#1a1d7a]'}`}>
            Inscrições Kids
          </Link>
          <Link href="/painelmmc/espera" className={`block p-3 rounded-lg transition-colors ${pathname.includes('/espera') ? 'bg-cenaculo-gold text-cenaculo-blue font-bold' : 'hover:bg-[#1a1d7a]'}`}>
            Lista de Espera
          </Link>
          <Link href="/painelmmc/galeria" className={`block p-3 rounded-lg transition-colors ${pathname.includes('/galeria') ? 'bg-cenaculo-gold text-cenaculo-blue font-bold' : 'hover:bg-[#1a1d7a]'}`}>
            Galeria de Fotos
          </Link>
          <Link href="/painelmmc/frequencia" className={`block p-3 rounded-lg transition-colors ${pathname.includes('/frequencia') ? 'bg-cenaculo-gold text-cenaculo-blue font-bold' : 'hover:bg-[#1a1d7a]'}`}>
            Frequência e Presença
          </Link>
          {papel === "ADMIN" && (
            <Link href="/painelmmc/usuarios" className={`block p-3 rounded-lg transition-colors ${pathname.includes('/usuarios') ? 'bg-cenaculo-gold text-cenaculo-blue font-bold' : 'hover:bg-[#1a1d7a]'}`}>
              Usuários
            </Link>
          )}
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
      </aside>

      <main className="flex-1 min-h-0 p-4 sm:p-6 lg:p-8 overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
}