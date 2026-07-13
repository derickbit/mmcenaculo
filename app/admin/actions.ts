"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function adicionarNota(inscricaoId: string, formData: FormData) {
  const texto = formData.get("texto") as string;
  if (!texto) return;

  // No Next.js moderno, cookies() é uma Promise. Lemos a "pulseira VIP" para saber QUEM está salvando a nota.
  const cookieStore = await cookies();
  const adminId = cookieStore.get('cenaculo-admin-token')?.value;

  if (!adminId) {
    throw new Error("Usuário não autenticado");
  }

  // Cria a nota na Trilha de Auditoria
  await prisma.observacao.create({
    data: {
      texto,
      inscricaoId,
      adminId
    }
  });

  // Atualiza a tela automaticamente
  revalidatePath("/admin");
}