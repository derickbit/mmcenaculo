"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState(""); // NOVO ESTADO
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro("");
    setLoading(true);

    try {
      // Enviando email e senha
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      if (response.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        const data = await response.json();
        setErro(data.error || "Erro de credenciais.");
      }
    } catch (error) {
      setErro("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border-t-8 border-cenaculo-blue">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-cenaculo-blue">
            Área <span className="text-cenaculo-gold">Restrita</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Acesso exclusivo para a coordenação do MMC.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* NOVO CAMPO DE EMAIL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="admin@mmcenaculo.com.br"
              className="block w-full p-3 border border-gray-300 rounded-lg focus:ring-cenaculo-gold focus:border-cenaculo-gold outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha de Acesso
            </label>
            <input 
              type="password" 
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required 
              placeholder="••••••••"
              className="block w-full p-3 border border-gray-300 rounded-lg focus:ring-cenaculo-gold focus:border-cenaculo-gold outline-none transition-all"
            />
          </div>

          {erro && (
            <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">
              {erro}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !senha || !email}
            className="w-full bg-cenaculo-blue text-white font-bold py-3 px-4 rounded-lg hover:bg-[#1a1d7a] disabled:opacity-50 transition duration-300 shadow-md"
          >
            {loading ? "Verificando..." : "Entrar no Painel"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-cenaculo-gold transition-colors">
            &larr; Voltar para o site principal
          </Link>
        </div>

      </div>
    </main>
  );
}