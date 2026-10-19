import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerSessao } from "@/lib/auth";
import { COOKIE_SESSAO, criarToken, opcoesCookieSessao } from "@/lib/session";

const TAMANHO_MINIMO_SENHA = 8;

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  // Só chega aqui quem está logado com senha provisória (o middleware também garante isso).
  const sessao = await lerSessao();
  if (!sessao) redirect("/admin/login");
  if (!sessao.pa) redirect("/admin");

  const params = await searchParams;
  const usuarioNome = sessao.sub;

  async function redefinirSenha(formData: FormData) {
    "use server";

    // O usuário vem da sessão assinada, nunca do formulário.
    const atual = await lerSessao();
    if (!atual || !atual.pa) redirect("/admin/login");

    const novaSenha = String(formData.get("novaSenha") ?? "");
    const confirmacao = String(formData.get("confirmacao") ?? "");

    if (novaSenha.length < TAMANHO_MINIMO_SENHA) redirect("/admin/setup?erro=curta");
    if (novaSenha !== confirmacao) redirect("/admin/setup?erro=diferente");

    const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

    await prisma.usuario.update({
      where: { nome: atual.sub },
      data: { senha: senhaCriptografada, primeiroAcesso: false },
    });

    // Emite uma nova sessão já sem a pendência de troca de senha.
    const token = await criarToken(atual.sub, false);
    const armazenamento = await cookies();
    armazenamento.set(COOKIE_SESSAO, token, opcoesCookieSessao());

    redirect("/admin");
  }

  const mensagemErro =
    params.erro === "curta"
      ? `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`
      : params.erro === "diferente"
      ? "As senhas não coincidem."
      : "";

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-2">Primeiro Acesso</h1>
        <p className="text-gray-400 mb-6 text-sm">
          Por razões de segurança, cadastre uma nova senha pessoal para continuar.
        </p>

        {mensagemErro && (
          <p className="mb-4 rounded bg-red-900/40 border border-red-700 p-3 text-sm text-red-200">
            {mensagemErro}
          </p>
        )}

        <form action={redefinirSenha} className="space-y-4">
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
              minLength={TAMANHO_MINIMO_SENHA}
              placeholder={`Mínimo de ${TAMANHO_MINIMO_SENHA} caracteres`}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white focus:ring-cenaculo-gold outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar Nova Senha</label>
            <input
              type="password"
              name="confirmacao"
              required
              minLength={TAMANHO_MINIMO_SENHA}
              placeholder="Repita a nova senha"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white focus:ring-cenaculo-gold outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-cenaculo-gold text-cenaculo-blue font-bold py-3 px-4 rounded hover:bg-yellow-400 transition mt-4"
          >
            Salvar Nova Senha e Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
