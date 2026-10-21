"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";

// Autor da nota: vem da sessão assinada (não de um cookie forjável) e precisa existir.
async function usuarioDaSessao() {
  const sessao = await exigirSessao();
  const usuario = await prisma.usuario.findUnique({ where: { nome: sessao.sub }, select: { id: true } });
  if (!usuario) throw new Error("Não autorizado");
  return usuario;
}

export async function adicionarNota(inscricaoId: string, formData: FormData) {
  const texto = formData.get("texto") as string;
  if (!texto) return;

  const usuario = await usuarioDaSessao();

  // Cria a nota na Trilha de Auditoria
  await prisma.observacao.create({
    data: {
      texto,
      inscricaoId,
      usuarioId: usuario.id
    }
  });

  // Atualiza a tela automaticamente
  revalidatePath("/admin");
}

// Nota sobre uma inscrição Kids (fica ligada só à inscrição Kids, nunca à de adulto).
export async function adicionarNotaKids(inscricaoKidsId: string, formData: FormData) {
  const texto = formData.get("texto") as string;
  if (!texto) return;

  const usuario = await usuarioDaSessao();

  await prisma.observacao.create({
    data: { texto, inscricaoKidsId, usuarioId: usuario.id }
  });

  revalidatePath("/admin/kids");
}

// Exclui a inscrição Kids; as notas dela vão junto (cascata). Atende pedidos de exclusão de dados (LGPD).
export async function excluirInscricaoKids(formData: FormData) {
  await exigirSessao();
  const id = formData.get("id") as string;
  await prisma.inscricaoKids.delete({ where: { id } });
  revalidatePath("/admin/kids");
}
