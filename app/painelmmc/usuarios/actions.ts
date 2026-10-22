"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { criarConvite, criarRedefinicao, revogarConvite } from "@/lib/convite";
import { desativarUsuario, reativarUsuario, renomearUsuario, type Resultado } from "@/lib/usuarios";

// Gestão de contas. TODA ação começa conferindo que quem pede é o ADMIN (a coordenação não passa, mesmo que chame a ação
// por fora da tela). O link de convite ou de redefinição só volta aqui, uma vez: no banco fica só o hash.

const CAMINHO = "/painelmmc/usuarios";

export type ResultadoLink =
  | { ok: true; codigo: string; usuario: string; expiraEm: string; tipo: "NOVA_CONTA" | "REDEFINICAO" }
  | { ok: false; mensagem: string };

export async function gerarConvite(nomeUsuario: string): Promise<ResultadoLink> {
  const admin = await exigirAdmin();
  const r = await criarConvite({ nomeUsuario, criadoPorId: admin.sub });
  if (!r.ok) return { ok: false, mensagem: r.mensagem };
  revalidatePath(CAMINHO);
  return { ok: true, codigo: r.codigo, usuario: r.convite.nomeUsuario, expiraEm: r.convite.expiraEm.toISOString(), tipo: "NOVA_CONTA" };
}

// A senha atual da conta deixa de funcionar na hora (ver criarRedefinicao).
export async function redefinirSenha(usuarioId: string): Promise<ResultadoLink> {
  const admin = await exigirAdmin();
  const r = await criarRedefinicao({ usuarioId, criadoPorId: admin.sub });
  if (!r.ok) return { ok: false, mensagem: r.mensagem };
  revalidatePath(CAMINHO);
  return { ok: true, codigo: r.codigo, usuario: r.convite.nomeUsuario, expiraEm: r.convite.expiraEm.toISOString(), tipo: "REDEFINICAO" };
}

export async function revogar(conviteId: string): Promise<Resultado> {
  await exigirAdmin();
  const revogou = await revogarConvite(conviteId);
  revalidatePath(CAMINHO);
  return revogou ? { ok: true } : { ok: false, motivo: "NAO_PERMITIDO", mensagem: "Este convite não está mais pendente." };
}

export async function renomear(usuarioId: string, novoNome: string): Promise<Resultado> {
  await exigirAdmin();
  const r = await renomearUsuario(usuarioId, novoNome);
  revalidatePath(CAMINHO);
  return r;
}

export async function desativar(usuarioId: string): Promise<Resultado> {
  await exigirAdmin();
  const r = await desativarUsuario(usuarioId);
  revalidatePath(CAMINHO);
  return r;
}

export async function reativar(usuarioId: string): Promise<Resultado> {
  await exigirAdmin();
  const r = await reativarUsuario(usuarioId);
  revalidatePath(CAMINHO);
  return r;
}
