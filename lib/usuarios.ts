import prisma from "@/lib/prisma";
import { estadoDoConvite, validarNomeUsuario, type EstadoConvite } from "@/lib/convite-regras";

// Gestão das contas do painel (só o ADMIN usa, pelas ações de app/painelmmc/usuarios).
// Só contas de COORDENACAO podem ser alteradas por aqui: a conta de administrador fica protegida.
// "Excluir" uma conta é DESATIVAR: ela some do acesso, mas o histórico (as notas que escreveu) continua intacto.

export type Resultado =
  | { ok: true }
  | { ok: false; motivo: "CONTA_INEXISTENTE" | "NAO_PERMITIDO" | "NOME_INVALIDO" | "NOME_EM_USO"; mensagem: string };

async function contaDeCoordenacao(id: string) {
  const conta = await prisma.usuario.findUnique({ where: { id }, select: { id: true, nome: true, papel: true, ativo: true } });
  if (!conta) return { erro: { ok: false, motivo: "CONTA_INEXISTENTE", mensagem: "Conta não encontrada." } as Resultado };
  if (conta.papel !== "COORDENACAO") {
    return { erro: { ok: false, motivo: "NAO_PERMITIDO", mensagem: "A conta de administrador não é alterada por aqui." } as Resultado };
  }
  return { conta };
}

// ---------- renomear ----------

export async function renomearUsuario(id: string, novoNome: string): Promise<Resultado> {
  const nome = novoNome.trim();
  const problema = validarNomeUsuario(nome);
  if (problema) return { ok: false, motivo: "NOME_INVALIDO", mensagem: problema };

  const { conta, erro } = await contaDeCoordenacao(id);
  if (erro) return erro;

  // Sem diferenciar maiúsculas de minúsculas (mudar "mateus" para "Mateus" na mesma conta é permitido).
  const ocupado = await prisma.usuario.findFirst({ where: { nome: { equals: nome, mode: "insensitive" }, id: { not: id } }, select: { id: true } });
  if (ocupado) return { ok: false, motivo: "NOME_EM_USO", mensagem: "Já existe um usuário com esse nome." };

  // Também não vale um nome já reservado por um convite pendente de conta nova (esse convite falharia depois).
  const reservado = await prisma.convite.findFirst({
    where: { nomeUsuario: { equals: nome, mode: "insensitive" }, usuarioAlvoId: null, usadoEm: null, revogadoEm: null, expiraEm: { gt: new Date() } },
    select: { id: true },
  });
  if (reservado) return { ok: false, motivo: "NOME_EM_USO", mensagem: "Esse usuário está reservado por um convite pendente." };

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: conta.id }, data: { nome } }),
    // Os links de redefinição ainda pendentes dessa conta passam a mostrar o nome novo.
    prisma.convite.updateMany({ where: { usuarioAlvoId: conta.id, usadoEm: null, revogadoEm: null }, data: { nomeUsuario: nome } }),
  ]);
  return { ok: true };
}

// ---------- desativar e reativar ----------

// A conta deixa de entrar na hora. As sessões abertas caem (e não voltam se a conta for reativada) e os links de
// redefinição pendentes são revogados. Nada é apagado: o histórico fica intacto.
export async function desativarUsuario(id: string, agora: Date = new Date()): Promise<Resultado> {
  const { conta, erro } = await contaDeCoordenacao(id);
  if (erro) return erro;

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: conta.id }, data: { ativo: false, sessoesValidasDesde: agora } }),
    prisma.convite.updateMany({ where: { usuarioAlvoId: conta.id, usadoEm: null, revogadoEm: null }, data: { revogadoEm: agora } }),
  ]);
  return { ok: true };
}

export async function reativarUsuario(id: string): Promise<Resultado> {
  const { conta, erro } = await contaDeCoordenacao(id);
  if (erro) return erro;
  await prisma.usuario.update({ where: { id: conta.id }, data: { ativo: true } });
  return { ok: true };
}

// ---------- listas da tela ----------

export type LinhaUsuario = { id: string; nome: string; papel: string; ativo: boolean; criadoEm: Date };

// Nunca devolve a senha (nem o hash): só o que a tela precisa. O admin vem primeiro.
export async function listarUsuarios(): Promise<LinhaUsuario[]> {
  return prisma.usuario.findMany({
    select: { id: true, nome: true, papel: true, ativo: true, criadoEm: true },
    orderBy: [{ papel: "asc" }, { nome: "asc" }],
  });
}

export type LinhaConvite = {
  id: string;
  usuario: string;
  tipo: "NOVA_CONTA" | "REDEFINICAO";
  estado: Exclude<EstadoConvite, "INEXISTENTE">;
  criadoEm: Date;
  expiraEm: Date;
  usadoEm: Date | null;
  revogadoEm: Date | null;
  criadoPor: string;
  usadoPor: string | null;
};

// Os 100 mais recentes. O código do link NÃO existe aqui (no banco só há o hash): o link só aparece uma vez, ao gerar.
export async function listarConvites(agora: Date = new Date()): Promise<LinhaConvite[]> {
  const convites = await prisma.convite.findMany({
    orderBy: { criadoEm: "desc" },
    take: 100,
    include: { criadoPor: { select: { nome: true } }, usadoPor: { select: { nome: true } } },
  });
  return convites.map((c) => ({
    id: c.id,
    usuario: c.nomeUsuario,
    tipo: c.usuarioAlvoId ? "REDEFINICAO" : "NOVA_CONTA",
    estado: estadoDoConvite(c, agora),
    criadoEm: c.criadoEm,
    expiraEm: c.expiraEm,
    usadoEm: c.usadoEm,
    revogadoEm: c.revogadoEm,
    criadoPor: c.criadoPor.nome,
    usadoPor: c.usadoPor?.nome ?? null,
  }));
}
