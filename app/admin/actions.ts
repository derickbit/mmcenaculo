"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";

export async function adicionarNota(inscricaoId: string, formData: FormData) {
  const texto = formData.get("texto") as string;
  if (!texto) return;

  // Exige sessão assinada e válida; o autor da nota vem da sessão, não de um cookie forjável.
  const sessao = await exigirSessao();
  const usuario = await prisma.usuario.findUnique({ where: { nome: sessao.sub }, select: { id: true } });
  if (!usuario) throw new Error("Não autorizado");

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