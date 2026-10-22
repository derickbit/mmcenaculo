"use server";

import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { preCadastroSchema, validar } from "@/lib/inscricao";
import { LIMITES, limitar, mensagemLimite } from "@/lib/limite";
import { ipDoCliente } from "@/lib/ip";
import { pareceRobo } from "@/lib/honeypot";

// Resultado da lista de espera: o formulário mostra os avisos ao lado de cada campo, sem apagar o que a pessoa digitou.
export type EstadoListaEspera =
  | { status: "ok" }
  | { status: "erro"; mensagem: string; erros: Record<string, string> };

// Lista de espera (pré-cadastro). Vem do formulário público, então tudo é validado aqui no servidor.
export async function salvarPreCadastro(_estadoAnterior: EstadoListaEspera | null, formData: FormData): Promise<EstadoListaEspera> {
  // Limite de tentativas por IP (cada envio conta, certo ou errado)
  const limite = await limitar(
    `precadastro:${ipDoCliente(await headers())}`,
    LIMITES.preCadastro.maximo,
    LIMITES.preCadastro.janelaSegundos
  );
  if (!limite.permitido) return { status: "erro", mensagem: mensagemLimite(limite.tentarEmSegundos), erros: {} };

  const enviado = Object.fromEntries(formData.entries());

  // Robô: finge que deu certo e descarta. O formulário sempre manda o horário em que foi aberto.
  if (pareceRobo(enviado, { exigirAbertura: true })) return { status: "ok" };

  const r = validar(preCadastroSchema, enviado);
  if (!r.ok) return { status: "erro", mensagem: "Confira os campos destacados.", erros: r.erros };

  const { nome, email, telefone, tipo } = r.dados;

  // Mesmo e-mail pedindo o mesmo retiro de novo: não cria outra linha e responde como se tivesse dado certo
  // (não confirma a ninguém que o e-mail já está na lista).
  const jaExiste = await prisma.preCadastro.findFirst({ where: { email, tipo }, select: { id: true } });
  if (!jaExiste) {
    await prisma.preCadastro.create({ data: { nome, email, telefone, tipo } });
  }

  return { status: "ok" };
}
