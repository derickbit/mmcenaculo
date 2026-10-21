"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { preCadastroSchema, validar } from "@/lib/inscricao";
import { LIMITES, limitar } from "@/lib/limite";
import { ipDoCliente } from "@/lib/ip";
import { pareceRobo } from "@/lib/honeypot";

// Lista de espera (pré-cadastro). Vem do formulário público, então tudo é validado aqui no servidor.
export async function salvarPreCadastro(formData: FormData) {
  // Limite de tentativas por IP (cada envio conta, certo ou errado)
  const limite = await limitar(
    `precadastro:${ipDoCliente(await headers())}`,
    LIMITES.preCadastro.maximo,
    LIMITES.preCadastro.janelaSegundos
  );
  if (!limite.permitido) redirect("/inscricao?erroPre=limite");

  const enviado = Object.fromEntries(formData.entries());

  // Robô: finge que deu certo e descarta. Sem JavaScript o horário de abertura não é preenchido,
  // então aqui ele não é exigido (para não descartar uma pessoa de verdade em silêncio).
  if (pareceRobo(enviado)) redirect("/inscricao?sucessoPre=true");

  const r = validar(preCadastroSchema, enviado);
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
