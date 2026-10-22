"use client";

import { useActionState, useState } from "react";
import { SENHA_MINIMA, SENHA_MAXIMA_BYTES, validarSenha } from "@/lib/senha";
import { aceitarConviteAction } from "./actions";

const campo = "mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold outline-none";

export default function FormularioConvite({
  codigo,
  nomeUsuario,
  redefinicao = false,
}: {
  codigo: string;
  nomeUsuario: string;
  redefinicao?: boolean; // true = a conta já existe e só ganha uma senha nova
}) {
  const [estado, enviar] = useActionState(aceitarConviteAction, null);

  // Campos controlados: o que a pessoa digitou fica na tela mesmo quando há um aviso para corrigir.
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [errosLocais, setErrosLocais] = useState<Record<string, string>>({});

  // Confere antes de enviar o que dá para conferir (o servidor confere tudo de novo).
  function aoEnviar(dados: FormData) {
    const novos: Record<string, string> = {};
    const problema = validarSenha(senha);
    if (problema) novos.senha = problema;
    if (senha !== confirmacao) novos.confirmacao = "As senhas não coincidem.";
    setErrosLocais(novos);
    if (Object.keys(novos).length > 0) return;
    enviar(dados);
  }

  const erros = { ...(estado?.erros ?? {}), ...errosLocais };
  const erro = (nome: string) =>
    erros[nome] ? (
      <p role="alert" className="mt-1 text-sm text-red-600">
        {erros[nome]}
      </p>
    ) : null;

  return (
    <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border-t-8 border-cenaculo-blue">
      <h1 className="text-3xl font-extrabold text-cenaculo-blue text-center">
        {redefinicao ? (
          <>
            Definir nova <span className="text-cenaculo-gold">senha</span>
          </>
        ) : (
          <>
            Criar sua <span className="text-cenaculo-gold">conta</span>
          </>
        )}
      </h1>
      <p className="mt-3 mb-6 text-center text-gray-600 text-sm">
        {redefinicao
          ? "A sua senha foi redefinida pela coordenação. Escolha uma nova senha para entrar no painel."
          : "Você foi convidado(a) para o painel da coordenação do MMC. Escolha uma senha para entrar."}
      </p>

      {estado?.mensagem && Object.keys(estado.erros).length === 0 && (
        <div role="alert" className="mb-4 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {estado.mensagem}
        </div>
      )}

      <form action={aoEnviar} className="space-y-4">
        <input type="hidden" name="codigo" value={codigo} />

        <div>
          <label className="block text-sm font-medium text-gray-700">Usuário</label>
          <input
            type="text"
            name="usuario"
            value={nomeUsuario}
            readOnly
            autoComplete="username"
            className={`${campo} bg-gray-100 text-gray-600 cursor-not-allowed`}
          />
          <p className="mt-1 text-xs text-gray-500">Este usuário foi escolhido por quem enviou o convite.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Senha</label>
          <input
            type="password"
            name="senha"
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value);
              setErrosLocais((atual) => ({ ...atual, senha: "" }));
            }}
            autoComplete="new-password"
            required
            minLength={SENHA_MINIMA}
            maxLength={SENHA_MAXIMA_BYTES}
            placeholder={`Mínimo de ${SENHA_MINIMA} caracteres`}
            className={campo}
            aria-invalid={!!erros.senha}
          />
          {erro("senha")}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Confirmar senha</label>
          <input
            type="password"
            name="confirmacao"
            value={confirmacao}
            onChange={(e) => {
              setConfirmacao(e.target.value);
              setErrosLocais((atual) => ({ ...atual, confirmacao: "" }));
            }}
            autoComplete="new-password"
            required
            placeholder="Repita a senha"
            className={campo}
            aria-invalid={!!erros.confirmacao}
          />
          {erro("confirmacao")}
        </div>

        <button type="submit" className="w-full bg-cenaculo-blue text-white font-bold py-3.5 rounded-md hover:bg-[#1a1d7a] transition shadow-md mt-2">
          {redefinicao ? "Salvar senha e entrar" : "Criar conta e entrar"}
        </button>
      </form>
    </div>
  );
}
