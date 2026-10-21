"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { preCadastroSchema, validar } from "@/lib/inscricao";

// Lista de espera (pré-cadastro). Vem do formulário público, então tudo é validado aqui no servidor.
export async function salvarPreCadastro(formData: FormData) {
  const r = validar(preCadastroSchema, Object.fromEntries(formData.entries()));
  if (!r.ok) redirect("/inscricao?erroPre=1");

  const { nome, email, telefone, tipo } = r.dados;

  // Mesmo e-mail pedindo o mesmo retiro de novo: não cria outra linha e responde como se tivesse dado certo
  // (não confirma a ninguém que o e-mail já está na lista).
  const jaExiste = await prisma.preCadastro.findFirst({ where: { email, tipo }, select: { id: true } });
  if (!jaExiste) {
    await prisma.preCadastro.create({ data: { nome, email, telefone, tipo } });
  }

  redirect("/inscricao?sucessoPre=true");
}
