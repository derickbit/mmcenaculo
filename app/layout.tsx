import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Movimento Mariano Cenáculo",
  description: "Site oficial do Movimento Mariano Cenáculo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body className={`${inter.className} min-h-screen flex flex-col bg-gray-50 text-gray-900`}>
        
        {/* NAVBAR PÚBLICA */}
{/* NAVBAR PÚBLICA */}
        <nav className="bg-cenaculo-blue text-white sticky top-0 z-40 shadow-md border-b border-cenaculo-gold/30">
          {/* Mudado de max-w-6xl para max-w-7xl e px-6 */}
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            
            {/* Logo + Nome */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
              <Image 
                src="/images/logo.png" 
                alt="Logo MMC" 
                width={45} 
                height={45} 
                className="object-contain"
              />
              <span className="font-extrabold text-lg md:text-xl tracking-tight hidden sm:inline">
                Cenáculo<span className="text-cenaculo-gold">MMC</span>
              </span>
            </Link>

            {/* Links de Navegação */}
            <div className="flex items-center gap-1 sm:gap-4 md:gap-6 text-sm font-bold">
              <Link href="/" className="px-3 py-2 rounded-lg hover:bg-white/10 transition">
                Início
              </Link>
              <Link href="/sobre" className="px-3 py-2 rounded-lg hover:bg-white/10 transition">
                Sobre nós
              </Link>
              <Link href="/calendario" className="px-3 py-2 rounded-lg hover:bg-white/10 transition">
                Calendário
              </Link>
              <Link href="/galeria" className="px-3 py-2 rounded-lg hover:bg-white/10 transition">
                Galeria
              </Link>
              <Link 
                href="/inscricao" 
                className="bg-cenaculo-gold text-cenaculo-blue px-4 py-2 rounded-full hover:bg-yellow-400 transition transform hover:scale-105 shadow font-extrabold ml-2 text-xs md:text-sm"
              >
                Inscrições
              </Link>
            </div>

          </div>
        </nav>

        {/* CONTEÚDO DA PÁGINA */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>

      </body>
    </html>
  );
}