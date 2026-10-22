import bcrypt from "bcryptjs";
import { Prisma, type Convite } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  DURACAO_CONVITE_MS,
  estadoDoConvite,
  gerarCodigo,
  hashDoCodigo,
  validarNomeUsuario,
  validarSenha,
  type EstadoConvite,
} from "@/lib/convite-regras";

// Convites para criar contas do painel. O admin escolhe o usuário; quem aceita só define a senha.
// Um convite sempre cria uma conta COORDENACAO (o único ADMIN nasce pelo script do primeiro admin).

const CUSTO_DA_SENHA = 10;

// ---------- criar ----------

export type ResultadoCriacao =
  | { ok: true; codigo: string; convite: Convite }
  | { ok: false; motivo: "NOME_INVALIDO" | "NOME_EM_USO" | "CONVITE_PENDENTE"; mensagem: string };

// O código só existe aqui, no retorno: no banco fica o hash. Quem chama mostra o link uma única vez.
export async function criarConvite(dados: { nomeUsuario: string; criadoPorId: string; agora?: Date }): Promise<ResultadoCriacao> {
  const agora = dados.agora ?? new Date();
  const nome = dados.nomeUsuario.trim();

  const problema = validarNomeUsuario(nome);
  if (problema) return { ok: false, motivo: "NOME_INVALIDO", mensagem: problema };

  // Sem diferenciar maiúsculas de minúsculas: não pode haver "Mateus" e "mateus".
  const existente = await prisma.usuario.findFirst({ where: { nome: { equals: nome, mode: "insensitive" } }, select: { id: true } });
  if (existente) return { ok: false, motivo: "NOME_EM_USO", mensagem: "Já existe um usuário com esse nome." };

  const pendente = await prisma.convite.findFirst({
    where: { nomeUsuario: { equals: nome, mode: "insensitive" }, usuarioAlvoId: null, usadoEm: null, revogadoEm: null, expiraEm: { gt: agora } },
    select: { id: true },
  });
  if (pendente) {
    return { ok: false, motivo: "CONVITE_PENDENTE", mensagem: "Já existe um convite pendente para esse usuário. Revogue-o para gerar outro." };
  }

  const codigo = gerarCodigo();
  const convite = await prisma.convite.create({
    data: {
      codigoHash: hashDoCodigo(codigo),
      nomeUsuario: nome,
      expiraEm: new Date(agora.getTime() + DURACAO_CONVITE_MS),
      criadoPorId: dados.criadoPorId,
    },
  });
  return { ok: true, codigo, convite };
}

// ---------- redefinir a senha de uma conta que já existe ----------

export type ResultadoRedefinicao =
  | { ok: true; codigo: string; convite: Convite }
  | { ok: false; motivo: "CONTA_INEXISTENTE" | "NAO_PERMITIDO"; mensagem: string };

// Gera o link para a pessoa escolher uma senha nova. Ao gerar, a senha ATUAL deixa de funcionar na hora e as sessões abertas
// são derrubadas (se o motivo do pedido for suspeita de que alguém descobriu a senha, o acesso já está barrado).
// Links de redefinição anteriores e ainda pendentes dessa conta são revogados. Só contas de COORDENACAO ativas.
export async function criarRedefinicao(dados: { usuarioId: string; criadoPorId: string; agora?: Date }): Promise<ResultadoRedefinicao> {
  const agora = dados.agora ?? new Date();

  const alvo = await prisma.usuario.findUnique({ where: { id: dados.usuarioId }, select: { id: true, nome: true, papel: true, ativo: true } });
  if (!alvo) return { ok: false, motivo: "CONTA_INEXISTENTE", mensagem: "Conta não encontrada." };
  if (alvo.papel === "ADMIN") {
    return { ok: false, motivo: "NAO_PERMITIDO", mensagem: "A senha de um administrador não é redefinida por aqui." };
  }
  if (!alvo.ativo) return { ok: false, motivo: "NAO_PERMITIDO", mensagem: "Reative a conta antes de redefinir a senha." };

  const codigo = gerarCodigo();
  // Uma senha que ninguém conhece: a antiga para de funcionar até a pessoa escolher a nova.
  const senhaInutilizavel = await bcrypt.hash(gerarCodigo(), CUSTO_DA_SENHA);

  const convite = await prisma.$transaction(async (tx) => {
    await tx.convite.updateMany({ where: { usuarioAlvoId: alvo.id, usadoEm: null, revogadoEm: null }, data: { revogadoEm: agora } });
    await tx.usuario.update({ where: { id: alvo.id }, data: { senha: senhaInutilizavel, sessoesValidasDesde: agora } });
    return tx.convite.create({
      data: {
        codigoHash: hashDoCodigo(codigo),
        nomeUsuario: alvo.nome,
        expiraEm: new Date(agora.getTime() + DURACAO_CONVITE_MS),
        criadoPorId: dados.criadoPorId,
        usuarioAlvoId: alvo.id,
      },
    });
  });
  return { ok: true, codigo, convite };
}

// ---------- consultar ----------

export async function consultarConvite(
  codigo: string,
  agora: Date = new Date()
): Promise<{ estado: EstadoConvite; convite: Convite | null }> {
  if (!codigo || codigo.length > 200) return { estado: "INEXISTENTE", convite: null };
  const convite = await prisma.convite.findUnique({ where: { codigoHash: hashDoCodigo(codigo) } });
  if (!convite) return { estado: "INEXISTENTE", convite: null };
  return { estado: estadoDoConvite(convite, agora), convite };
}

// ---------- aceitar ----------

export type ResultadoAceite =
  | { ok: true; usuario: { id: string; nome: string } }
  | { ok: false; motivo: "INVALIDO" | "SENHA_INVALIDA" | "NOME_EM_USO"; mensagem: string };

const CONVITE_INVALIDO: ResultadoAceite = { ok: false, motivo: "INVALIDO", mensagem: "Este convite é inválido ou expirou." };
const NOME_EM_USO: ResultadoAceite = { ok: false, motivo: "NOME_EM_USO", mensagem: "Esse usuário já foi criado. Fale com quem enviou o convite." };

// Cria a conta e gasta o convite numa única transação. O "gasto" é uma atualização condicional (só vale se o convite
// ainda estiver livre), então dois cliques ao mesmo tempo no mesmo link criam, no máximo, uma conta.
export async function aceitarConvite(codigo: string, senha: string, agora: Date = new Date()): Promise<ResultadoAceite> {
  const { estado, convite } = await consultarConvite(codigo, agora);
  if (estado !== "VALIDO" || !convite) return CONVITE_INVALIDO;

  const problema = validarSenha(senha);
  if (problema) return { ok: false, motivo: "SENHA_INVALIDA", mensagem: problema };

  const senhaCriptografada = await bcrypt.hash(senha, CUSTO_DA_SENHA);

  class NomeEmUso extends Error {}
  class ContaIndisponivel extends Error {}
  try {
    return await prisma.$transaction(async (tx): Promise<ResultadoAceite> => {
      const gasto = await tx.convite.updateMany({
        where: { id: convite.id, usadoEm: null, revogadoEm: null, expiraEm: { gt: agora } },
        data: { usadoEm: agora },
      });
      if (gasto.count !== 1) return CONVITE_INVALIDO;

      // Link de REDEFINIÇÃO: a conta já existe e só ganha a senha nova (nada de criar outra conta).
      if (convite.usuarioAlvoId) {
        const alvo = await tx.usuario.findUnique({ where: { id: convite.usuarioAlvoId }, select: { id: true, nome: true, ativo: true, papel: true } });
        if (!alvo || !alvo.ativo || alvo.papel === "ADMIN") throw new ContaIndisponivel(); // desfaz: o link não gasta
        // Derruba também qualquer sessão aberta desde que o link foi gerado.
        await tx.usuario.update({ where: { id: alvo.id }, data: { senha: senhaCriptografada, sessoesValidasDesde: agora, primeiroAcesso: false } });
        return { ok: true, usuario: { id: alvo.id, nome: alvo.nome } };
      }

      const existente = await tx.usuario.findFirst({ where: { nome: { equals: convite.nomeUsuario, mode: "insensitive" } }, select: { id: true } });
      if (existente) throw new NomeEmUso(); // desfaz a transação: o convite continua livre

      const usuario = await tx.usuario.create({
        data: { nome: convite.nomeUsuario, senha: senhaCriptografada, papel: "COORDENACAO", ativo: true, primeiroAcesso: false },
        select: { id: true, nome: true },
      });
      await tx.convite.update({ where: { id: convite.id }, data: { usadoPorId: usuario.id } });
      return { ok: true, usuario };
    });
  } catch (erro) {
    if (erro instanceof NomeEmUso) return NOME_EM_USO;
    if (erro instanceof ContaIndisponivel) return CONVITE_INVALIDO;
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") return NOME_EM_USO;
    throw erro;
  }
}

// ---------- revogar ----------

// Só revoga convite que ainda não foi usado nem revogado. Devolve se revogou.
export async function revogarConvite(id: string, agora: Date = new Date()): Promise<boolean> {
  const resultado = await prisma.convite.updateMany({ where: { id, usadoEm: null, revogadoEm: null }, data: { revogadoEm: agora } });
  return resultado.count === 1;
}
