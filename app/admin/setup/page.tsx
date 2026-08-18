import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ usuario?: string }> }) {
  const params = await searchParams;
  const usuarioNome = params.usuario || "";

  async function redefinirSenha(formData: FormData) {
    "use server";
    const nome = formData.get("nome") as string;
    const novaSenha = formData.get("novaSenha") as string;

    if (!nome || !novaSenha) return;

    // Criptografa a nova senha com Bcrypt
    const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

    // Atualiza a senha e desmarca o primeiroAcesso
    await prisma.usuario.update({
      where: { nome: nome },
      data: {
        senha: senhaCriptografada,
        primeiroAcesso: false
      }
    });

    redirect("/admin");
  }

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-2">Primeiro Acesso</h1>
        <p className="text-gray-400 mb-6 text-sm">
          Por razões de segurança, cadastre uma nova senha pessoal para continuar.
        </p>

        <form action={redefinirSenha} className="space-y-4">
          <input type="hidden" name="nome" value={usuarioNome} />
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Usuário</label>
            <input 
              type="text" 
              value={usuarioNome} 
              disabled 
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-gray-400 cursor-not-allowed" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nova Senha</label>
            <input 
              type="password" 
              name="novaSenha" 
              required 
              placeholder="Digite sua nova senha" 
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white focus:ring-cenaculo-gold outline-none" 
            />
          </div>
          
          <button type="submit" className="w-full bg-cenaculo-gold text-cenaculo-blue font-bold py-3 px-4 rounded hover:bg-yellow-400 transition mt-4">
            Salvar Nova Senha e Entrar
          </button>
        </form>
      </div>
    </main>
  );
}