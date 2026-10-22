import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { validarNomeUsuario } from "./convite-regras";
import { validarSenha } from "./senha";

// Lógica do script de terminal (scripts/primeiro-admin.ts): criar o PRIMEIRO administrador e redefinir a senha dele.
// O administrador é o dono do sistema: só pode haver um, e ele NÃO nasce por convite nem pelo painel, só por aqui.
// Usa imports relativos (sem "@/") para poder rodar fora do Next, e recebe o Prisma de fora.

const CUSTO_DA_SENHA = 10;

export type ResultadoAdmin = { ok: true; nome: string } | { ok: false; mensagem: string };

// Cria o administrador. Recusa se já existe um (só pode haver um) ou se o usuário já está em uso.
export async function criarPrimeiroAdmin(prisma: PrismaClient, dados: { nome: string; senha: string }): Promise<ResultadoAdmin> {
  const nome = dados.nome.trim();

  const problemaNome = validarNomeUsuario(nome);
  if (problemaNome) return { ok: false, mensagem: problemaNome };
  const problemaSenha = validarSenha(dados.senha);
  if (problemaSenha) return { ok: false, mensagem: problemaSenha };

  const existente = await prisma.usuario.findFirst({ where: { papel: "ADMIN" }, select: { nome: true } });
  if (existente) return { ok: false, mensagem: `Já existe um administrador (${existente.nome}). Só pode haver um.` };

  const emUso = await prisma.usuario.findFirst({ where: { nome: { equals: nome, mode: "insensitive" } }, select: { id: true } });
  if (emUso) return { ok: false, mensagem: "Já existe uma conta com esse usuário." };

  await prisma.usuario.create({ data: { nome, senha: await bcrypt.hash(dados.senha, CUSTO_DA_SENHA), papel: "ADMIN", ativo: true } });
  return { ok: true, nome };
}

// Para quem esqueceu a senha do administrador (a tela de usuários não mexe nessa conta, de propósito).
// Derruba as sessões abertas dessa conta. Se houver mais de um administrador (só em ambiente de teste), informe o nome.
export async function redefinirSenhaDoAdmin(prisma: PrismaClient, dados: { senha: string; nome?: string }): Promise<ResultadoAdmin> {
  const problemaSenha = validarSenha(dados.senha);
  if (problemaSenha) return { ok: false, mensagem: problemaSenha };

  const nome = dados.nome?.trim();
  const admins = await prisma.usuario.findMany({
    where: { papel: "ADMIN", ...(nome ? { nome: { equals: nome, mode: "insensitive" as const } } : {}) },
    select: { id: true, nome: true },
  });

  if (admins.length === 0) return { ok: false, mensagem: nome ? `Não há administrador com o usuário "${nome}".` : "Nenhum administrador encontrado." };
  if (admins.length > 1) {
    return { ok: false, mensagem: `Há mais de um administrador (${admins.map((a) => a.nome).join(", ")}). Informe de qual é a senha.` };
  }

  await prisma.usuario.update({
    where: { id: admins[0].id },
    data: { senha: await bcrypt.hash(dados.senha, CUSTO_DA_SENHA), sessoesValidasDesde: new Date() },
  });
  return { ok: true, nome: admins[0].nome };
}
