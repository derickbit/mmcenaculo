"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { aceitarConvite } from "@/lib/convite";
import { LIMITES, limitar, mensagemLimite } from "@/lib/limite";
import { ipDoCliente } from "@/lib/ip";
import { COOKIE_SESSAO, criarToken, opcoesCookieSessao } from "@/lib/session";

// Resultado de uma tentativa de criar a conta: avisos ao lado de cada campo, sem apagar o que a pessoa digitou.
export type EstadoAceite = { mensagem: string; erros: Record<string, string> } | null;

export async function aceitarConviteAction(_anterior: EstadoAceite, formData: FormData): Promise<EstadoAceite> {
  // Limite de tentativas por IP (protege também o trabalho de criptografar a senha)
  const limite = await limitar(`convite:${ipDoCliente(await headers())}`, LIMITES.convite.maximo, LIMITES.convite.janelaSegundos);
  if (!limite.permitido) return { mensagem: mensagemLimite(limite.tentarEmSegundos), erros: {} };

  const codigo = String(formData.get("codigo") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (senha !== confirmacao) {
    return { mensagem: "Confira os campos destacados.", erros: { confirmacao: "As senhas não coincidem." } };
  }

  const resultado = await aceitarConvite(codigo, senha);
  if (!resultado.ok) {
    return resultado.motivo === "SENHA_INVALIDA"
      ? { mensagem: "Confira os campos destacados.", erros: { senha: resultado.mensagem } }
      : { mensagem: resultado.mensagem, erros: {} };
  }

  // Conta criada: a pessoa já entra no painel.
  const token = await criarToken(resultado.usuario.id, false);
  (await cookies()).set(COOKIE_SESSAO, token, opcoesCookieSessao());
  redirect("/admin");
}
