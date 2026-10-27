import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavbarPublica from "./NavbarPublica";

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
      <body className={`${inter.className} min-h-screen flex flex-col bg-gray-50 text-gray-900 overflow-x-hidden`}>
        
        <NavbarPublica />

        {/* CONTEÚDO DA PÁGINA */}
        <div className="flex-1 flex flex-col min-h-0 w-full">
          {children}
        </div>

      </body>
    </html>
  );
}