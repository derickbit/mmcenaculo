import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { fazerBackup, ordenar, restaurarBackup, tabelasEmOrdem, type Backup } from "./backup";

// Backup e restauração contra um banco FALSO em memória (a ida e volta com um banco de verdade foi conferida à mão, num banco temporário).
// O que está em teste aqui é a regra: ordem das tabelas, datas, recusar banco com dados, não deixar nada pela metade.

const TABELAS_DO_SCHEMA = Prisma.dmmf.datamodel.models.map((m) => m.name).filter((n) => n !== "LimiteTentativa");

type Linhas = Record<string, Record<string, unknown>[]>;

function bancoFalso(inicial: Linhas = {}, chaves: { filha: string; pai: string }[] = []) {
  const dados: Linhas = {};
  const criadas: string[] = [];
  const delegado = (tabela: string) => ({
    findMany: async () => dados[tabela] ?? [],
    count: async () => (dados[tabela] ?? []).length,
    createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
      criadas.push(tabela);
      dados[tabela] = [...(dados[tabela] ?? []), ...data];
    },
  });
  for (const [t, l] of Object.entries(inicial)) dados[t] = l;
  const minuscula = (n: string) => n.charAt(0).toLowerCase() + n.slice(1);
  const tabelas = Object.fromEntries(TABELAS_DO_SCHEMA.map((t) => [minuscula(t), delegado(t)]));
  const prisma = {
    ...tabelas,
    $queryRaw: async () => chaves,
    $transaction: async (fn: (tx: unknown) => Promise<void>) => {
      const antes = JSON.stringify(dados);
      try {
        await fn(prisma);
      } catch (e) {
        for (const k of Object.keys(dados)) delete dados[k];
        Object.assign(dados, JSON.parse(antes));
        throw e;
      }
    },
  };
  return { prisma: prisma as unknown as PrismaClient, dados, criadas };
}

describe("ordenar", () => {
  it("coloca cada tabela depois da tabela a que ela aponta", () => {
    const ordem = ordenar(["Observacao", "Usuario", "Inscricao"], [["Observacao", "Usuario"], ["Observacao", "Inscricao"]]);
    expect(ordem.indexOf("Usuario")).toBeLessThan(ordem.indexOf("Observacao"));
    expect(ordem.indexOf("Inscricao")).toBeLessThan(ordem.indexOf("Observacao"));
  });

  it("aceita tabela que aponta para ela mesma", () => {
    expect(ordenar(["A"], [["A", "A"]])).toEqual(["A"]);
  });

  it("recusa dependência circular em vez de travar", () => {
    expect(() => ordenar(["A", "B"], [["A", "B"], ["B", "A"]])).toThrow(/circular/);
  });
});

describe("fazerBackup", () => {
  it("inclui todas as tabelas do schema (menos os contadores de limite)", async () => {
    const { prisma } = bancoFalso();
    const backup = await fazerBackup(prisma);
    expect(Object.keys(backup.tabelas).sort()).toEqual([...TABELAS_DO_SCHEMA].sort());
    expect(backup.tabelas).not.toHaveProperty("LimiteTentativa");
  });

  it("guarda as datas como texto, para ir ao arquivo", async () => {
    const { prisma } = bancoFalso({ Evento: [{ id: "e1", criadoEm: new Date("2026-05-01T12:00:00Z") }] });
    const backup = await fazerBackup(prisma);
    expect(backup.tabelas.Evento[0].criadoEm).toBe("2026-05-01T12:00:00.000Z");
  });
});

describe("restaurarBackup", () => {
  const backupDe = (tabelas: Backup["tabelas"]): Backup => ({ versao: 1, criadoEm: "2026-05-01T00:00:00.000Z", tabelas });

  it("devolve as datas como Date e restaura na ordem de dependência", async () => {
    const { prisma, dados, criadas } = bancoFalso({}, [{ filha: "Foto", pai: "Evento" }]);
    const r = await restaurarBackup(
      prisma,
      backupDe({ Foto: [{ id: "f1", criadoEm: "2026-05-01T12:00:00.000Z" }], Evento: [{ id: "e1", criadoEm: "2026-05-01T12:00:00.000Z" }] })
    );
    expect(r).toMatchObject({ ok: true, linhas: { Evento: 1, Foto: 1 } });
    expect(dados.Evento[0].criadoEm).toBeInstanceOf(Date);
    expect(criadas.indexOf("Evento")).toBeLessThan(criadas.indexOf("Foto"));
  });

  it("recusa banco que já tem dados e não altera nada", async () => {
    const { prisma, dados, criadas } = bancoFalso({ Evento: [{ id: "antigo" }] });
    const r = await restaurarBackup(prisma, backupDe({ Evento: [{ id: "novo" }] }));
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.mensagem).toMatch(/não está vazio/);
    expect(criadas).toEqual([]);
    expect(dados.Evento).toEqual([{ id: "antigo" }]);
  });

  it("recusa arquivo inválido ou com tabela desconhecida", async () => {
    const { prisma } = bancoFalso();
    expect((await restaurarBackup(prisma, { versao: 2 } as unknown as Backup)).ok).toBe(false);
    expect((await restaurarBackup(prisma, {} as Backup)).ok).toBe(false);
    const r = await restaurarBackup(prisma, backupDe({ TabelaInventada: [{ id: "x" }] }));
    expect(r.ok === false && r.mensagem).toMatch(/TabelaInventada/);
  });

  it("não deixa dados pela metade se algo falhar no meio", async () => {
    const { prisma, dados } = bancoFalso();
    const original = (prisma as unknown as { foto: { createMany: () => Promise<void> } }).foto;
    original.createMany = async () => {
      throw new Error("falha simulada");
    };
    await expect(restaurarBackup(prisma, backupDe({ Evento: [{ id: "e1" }], Foto: [{ id: "f1" }] }))).rejects.toThrow("falha simulada");
    expect(Object.values(dados).every((l) => l.length === 0)).toBe(true);
  });
});

describe("tabelasEmOrdem", () => {
  it("usa as chaves estrangeiras que o banco devolve", async () => {
    const { prisma } = bancoFalso({}, [{ filha: "Observacao", pai: "Usuario" }, { filha: "Convite", pai: "Usuario" }]);
    const ordem = await tabelasEmOrdem(prisma);
    expect(ordem.indexOf("Usuario")).toBeLessThan(ordem.indexOf("Observacao"));
    expect(ordem).toHaveLength(TABELAS_DO_SCHEMA.length);
  });
});
