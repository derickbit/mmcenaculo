import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { criarPrimeiroAdmin, redefinirSenhaDoAdmin } from "./primeiro-admin";

// A lógica do script do primeiro admin, contra um banco FALSO em memória. (Um banco de verdade compartilhado com os outros testes
// já tem administradores criados por eles; o que está em teste aqui é a regra, não o Prisma.)

type Linha = { id: string; nome: string; senha: string; papel: string; ativo: boolean; sessoesValidasDesde: Date };

function bancoFalso(inicial: Partial<Linha>[] = []) {
  const linhas: Linha[] = inicial.map((l, i) => ({ id: `id${i}`, nome: "x", senha: "hash", papel: "COORDENACAO", ativo: true, sessoesValidasDesde: new Date(0), ...l }));
  const casa = (l: Linha, where: { papel?: string; nome?: { equals: string } }) =>
    (where.papel === undefined || l.papel === where.papel) && (where.nome === undefined || l.nome.toLowerCase() === where.nome.equals.toLowerCase());

  const prisma = {
    usuario: {
      findFirst: async ({ where }: { where: { papel?: string; nome?: { equals: string } } }) => linhas.find((l) => casa(l, where)) ?? null,
      findMany: async ({ where }: { where: { papel?: string; nome?: { equals: string } } }) => linhas.filter((l) => casa(l, where)),
      create: async ({ data }: { data: Partial<Linha> }) => {
        const nova = { id: `novo${linhas.length}`, sessoesValidasDesde: new Date(0), ...data } as Linha;
        linhas.push(nova);
        return nova;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Linha> }) => Object.assign(linhas.find((l) => l.id === where.id)!, data),
    },
  } as unknown as PrismaClient;
  return { prisma, linhas };
}

const SENHA = "uma-senha-boa-123";

describe("criar o primeiro administrador", () => {
  it("cria a conta ADMIN, ativa, com a senha em hash (nunca em texto puro)", async () => {
    const { prisma, linhas } = bancoFalso();
    expect(await criarPrimeiroAdmin(prisma, { nome: "  derick ", senha: SENHA })).toEqual({ ok: true, nome: "derick" });

    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ nome: "derick", papel: "ADMIN", ativo: true });
    expect(linhas[0].senha).not.toContain(SENHA);
    expect(await bcrypt.compare(SENHA, linhas[0].senha)).toBe(true);
  });

  it("recusa se JÁ existe um administrador (só pode haver um), e não cria nada", async () => {
    const { prisma, linhas } = bancoFalso([{ nome: "dono", papel: "ADMIN" }]);
    const r = await criarPrimeiroAdmin(prisma, { nome: "outro", senha: SENHA });
    expect(r.ok === false && r.mensagem).toMatch(/Já existe um administrador \(dono\)/);
    expect(linhas).toHaveLength(1);
  });

  it("recusa usuário inválido, senha fraca ou usuário já usado por outra conta (sem diferenciar maiúsculas)", async () => {
    const { prisma, linhas } = bancoFalso([{ nome: "Ana", papel: "COORDENACAO" }]);
    expect((await criarPrimeiroAdmin(prisma, { nome: "ab", senha: SENHA })).ok).toBe(false);
    expect((await criarPrimeiroAdmin(prisma, { nome: "com espaço", senha: SENHA })).ok).toBe(false);
    expect((await criarPrimeiroAdmin(prisma, { nome: "derick", senha: "curta" })).ok).toBe(false);

    const emUso = await criarPrimeiroAdmin(prisma, { nome: "ANA", senha: SENHA });
    expect(emUso.ok === false && emUso.mensagem).toMatch(/Já existe uma conta/);
    expect(linhas).toHaveLength(1); // nada foi criado
  });
});

describe("redefinir a senha do administrador", () => {
  it("troca a senha, derruba as sessões abertas e não mexe em outras contas", async () => {
    const antiga = await bcrypt.hash("senha-esquecida-1", 4);
    const { prisma, linhas } = bancoFalso([
      { nome: "dono", papel: "ADMIN", senha: antiga },
      { nome: "ana", papel: "COORDENACAO", senha: "hash-da-ana" },
    ]);
    const antes = Date.now();

    expect(await redefinirSenhaDoAdmin(prisma, { senha: SENHA })).toEqual({ ok: true, nome: "dono" });

    expect(await bcrypt.compare(SENHA, linhas[0].senha)).toBe(true);
    expect(await bcrypt.compare("senha-esquecida-1", linhas[0].senha)).toBe(false);
    expect(linhas[0].sessoesValidasDesde.getTime()).toBeGreaterThanOrEqual(antes); // cookies anteriores caem
    expect(linhas[1].senha).toBe("hash-da-ana"); // a coordenação não foi tocada
  });

  it("recusa senha fraca e não altera nada", async () => {
    const { prisma, linhas } = bancoFalso([{ nome: "dono", papel: "ADMIN", senha: "hash-antigo" }]);
    expect((await redefinirSenhaDoAdmin(prisma, { senha: "curta" })).ok).toBe(false);
    expect(linhas[0].senha).toBe("hash-antigo");
  });

  it("sem nenhum administrador, avisa; com mais de um, pede para escolher", async () => {
    const sem = bancoFalso([{ nome: "ana", papel: "COORDENACAO" }]);
    const r1 = await redefinirSenhaDoAdmin(sem.prisma, { senha: SENHA });
    expect(r1.ok === false && r1.mensagem).toMatch(/Nenhum administrador/);

    const varios = bancoFalso([{ nome: "um", papel: "ADMIN" }, { nome: "dois", papel: "ADMIN" }]);
    const r2 = await redefinirSenhaDoAdmin(varios.prisma, { senha: SENHA });
    expect(r2.ok === false && r2.mensagem).toMatch(/mais de um administrador \(um, dois\)/);

    expect((await redefinirSenhaDoAdmin(varios.prisma, { senha: SENHA, nome: "DOIS" })).ok).toBe(true); // escolhendo, funciona
    expect(await bcrypt.compare(SENHA, varios.linhas[1].senha)).toBe(true);
    expect(varios.linhas[0].senha).toBe("hash"); // o outro não foi tocado
  });

  it("nunca mexe numa conta que não é ADMIN, mesmo pedindo o nome dela", async () => {
    const { prisma, linhas } = bancoFalso([{ nome: "ana", papel: "COORDENACAO", senha: "hash-da-ana" }]);
    const r = await redefinirSenhaDoAdmin(prisma, { senha: SENHA, nome: "ana" });
    expect(r.ok).toBe(false);
    expect(linhas[0].senha).toBe("hash-da-ana");
  });
});
