import type { Metadata } from "next";
import Link from "next/link";
import { consultarConvite } from "@/lib/convite";
import FormularioConvite from "./FormularioConvite";

export const revalidate = 0;

// O código do convite está no endereço da página: nada de buscadores, e o navegador não o repassa a outros sites.
export const metadata: Metadata = { title: "Convite", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ConvitePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const { estado, convite } = await consultarConvite(codigo);

  // Link inválido, vencido, já usado ou revogado: a MESMA mensagem para todos, para ninguém descobrir se um código já existiu.
  if (estado !== "VALIDO" || !convite) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border-t-8 border-cenaculo-blue text-center">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Convite inválido ou expirado</h1>
          <p className="text-gray-600 mb-8">Este link não pode mais ser usado. Peça um novo convite a quem enviou este.</p>
          <Link href="/painelmmc/login" className="inline-block bg-cenaculo-blue text-white font-bold px-8 py-3 rounded-lg hover:bg-[#1a1d7a] transition">
            Ir para o login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <FormularioConvite codigo={codigo} nomeUsuario={convite.nomeUsuario} redefinicao={convite.usuarioAlvoId !== null} />
    </main>
  );
}
