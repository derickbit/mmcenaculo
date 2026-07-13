"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    // Trava o tamanho do site inteiro no limite da tela
    <div className="h-screen w-full bg-gray-100 flex overflow-hidden">
      
      {/* Menu Lateral Estritamente Fixo */}
      <aside className="w-64 flex-shrink-0 bg-cenaculo-blue text-white flex flex-col shadow-xl z-20">
        <div className="p-6 text-2xl font-extrabold border-b border-[#1a1d7a]">
          Painel <span className="text-cenaculo-gold">MMC</span>
        </div>
        
        {/* Navegação fixa sem scroll */}
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <Link href="/admin/eventos" className={`block p-3 rounded-lg transition-colors ${pathname.includes('/eventos') ? 'bg-cenaculo-gold text-cenaculo-blue font-bold' : 'hover:bg-[#1a1d7a]'}`}>
            Gerenciar Eventos
          </Link>
          <Link href="/admin" className={`block p-3 rounded-lg transition-colors ${pathname === '/admin' ? 'bg-cenaculo-gold text-cenaculo-blue font-bold' : 'hover:bg-[#1a1d7a]'}`}>
            Inscrições
          </Link>
          <Link href="/admin/espera" className={`block p-3 rounded-lg transition-colors ${pathname.includes('/espera') ? 'bg-cenaculo-gold text-cenaculo-blue font-bold' : 'hover:bg-[#1a1d7a]'}`}>
            Lista de Espera
          </Link>
          <Link href="/admin/galeria" className={`block p-3 rounded-lg transition-colors ${pathname.includes('/galeria') ? 'bg-cenaculo-gold text-cenaculo-blue font-bold' : 'hover:bg-[#1a1d7a]'}`}>
            Galeria de Fotos
          </Link>
        </nav>
        
        {/* Botão de Sair fixo no fundo */}
        <div className="p-4 border-t border-[#1a1d7a]">
          <button onClick={handleLogout} className="w-full text-left p-3 text-red-300 hover:bg-red-500 hover:text-white rounded-lg transition-colors font-semibold">
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal (Apenas esta área rola) */}
      <main className="flex-1 h-full p-8 overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
}