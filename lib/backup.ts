import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

// Lógica do backup manual (scripts/backup.ts): copia TODAS as tabelas para um arquivo JSON e devolve os dados para um banco VAZIO.
// A lista de tabelas e a ordem vêm do próprio schema (Prisma.dmmf): uma tabela nova entra no backup sozinha.
// Usa imports relativos (sem "@/") para poder rodar fora do Next, e recebe o Prisma de fora.

// Contadores de tentativas de login/inscrição: dado passageiro, não vale guardar.
const FORA_DO_BACKUP = new Set(["LimiteTentativa"]);

type Modelo = (typeof Prisma.dmmf.datamodel.models)[number];

const minuscula = (nome: string) => nome.charAt(0).toLowerCase() + nome.slice(1);

// Ordena as tabelas: "pais" antes das "filhas" (quem tem chave estrangeira vem depois da tabela que ela aponta).
// É a ordem certa para restaurar. `dependencias` são pares [filha, pai].
export function ordenar(tabelas: string[], dependencias: [string, string][]): string[] {
  const ordem: string[] = [];
  while (ordem.length < tabelas.length) {
    const pronta = tabelas.find(
      (t) => !ordem.includes(t) && dependencias.every(([filha, pai]) => filha !== t || pai === t || !tabelas.includes(pai) || ordem.includes(pai))
    );
    if (!pronta) throw new Error("Tabelas com dependência circular: não dá para ordenar o backup.");
    ordem.push(pronta);
  }
  return ordem;
}

// A lista de tabelas vem do schema; as chaves estrangeiras vêm do próprio banco (é o que de fato manda na ordem).
export async function tabelasEmOrdem(prisma: PrismaClient): Promise<string[]> {
  const tabelas = Prisma.dmmf.datamodel.models.map((m) => m.name).filter((n) => !FORA_DO_BACKUP.has(n));
  const chaves = await prisma.$queryRaw<{ filha: string; pai: string }[]>`
    SELECT cf.relname AS filha, cp.relname AS pai
    FROM pg_constraint c
    JOIN pg_class cf ON cf.oid = c.conrelid
    JOIN pg_class cp ON cp.oid = c.confrelid
    WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace`;
  return ordenar(tabelas, chaves.map((c) => [c.filha, c.pai]));
}

export type Backup = {
  versao: 1;
  criadoEm: string;
  tabelas: Record<string, Record<string, unknown>[]>;
};

// Acesso às tabelas pelo nome ("Evento" -> prisma.evento), sem depender de uma lista escrita à mão.
type Delegado = {
  findMany: () => Promise<Record<string, unknown>[]>;
  count: () => Promise<number>;
  createMany: (args: { data: Record<string, unknown>[] }) => Promise<unknown>;
};
const delegado = (prisma: unknown, tabela: string) => (prisma as Record<string, Delegado>)[minuscula(tabela)];

export async function fazerBackup(prisma: PrismaClient): Promise<Backup> {
  const tabelas: Backup["tabelas"] = {};
  for (const tabela of await tabelasEmOrdem(prisma)) tabelas[tabela] = await delegado(prisma, tabela).findMany();
  // JSON.parse(JSON.stringify(...)): as datas viram texto ISO, como ficarão no arquivo.
  return { versao: 1, criadoEm: new Date().toISOString(), tabelas: JSON.parse(JSON.stringify(tabelas)) };
}

export type ResultadoRestauro = { ok: true; linhas: Record<string, number> } | { ok: false; mensagem: string };

// Devolve as datas (que no arquivo são texto) ao formato que o Prisma espera.
function reviverDatas(modelo: Modelo, linha: Record<string, unknown>): Record<string, unknown> {
  const copia = { ...linha };
  for (const campo of modelo.fields) {
    if (campo.type === "DateTime" && typeof copia[campo.name] === "string") copia[campo.name] = new Date(copia[campo.name] as string);
  }
  return copia;
}

// Restaura num banco VAZIO (nunca por cima de dados): se alguma tabela já tem linhas, recusa e não mexe em nada.
export async function restaurarBackup(prisma: PrismaClient, backup: Backup): Promise<ResultadoRestauro> {
  if (backup?.versao !== 1 || typeof backup.tabelas !== "object" || backup.tabelas === null) {
    return { ok: false, mensagem: "Arquivo de backup inválido ou de uma versão que não conheço." };
  }
  const ordem = await tabelasEmOrdem(prisma);
  const desconhecidas = Object.keys(backup.tabelas).filter((t) => !ordem.includes(t));
  if (desconhecidas.length > 0) return { ok: false, mensagem: `O backup tem tabelas que o sistema não conhece: ${desconhecidas.join(", ")}.` };

  const ocupadas: string[] = [];
  for (const tabela of ordem) if ((await delegado(prisma, tabela).count()) > 0) ocupadas.push(tabela);
  if (ocupadas.length > 0) {
    return { ok: false, mensagem: `O banco de destino não está vazio (${ocupadas.join(", ")}). Restaure só num banco vazio. Nada foi alterado.` };
  }

  const modelos = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
  const linhas: Record<string, number> = {};
  // Tudo numa transação: ou volta tudo, ou não volta nada.
  await prisma.$transaction(
    async (tx) => {
      for (const tabela of ordem) {
        const dados = (backup.tabelas[tabela] ?? []).map((l) => reviverDatas(modelos.get(tabela)!, l));
        if (dados.length > 0) await delegado(tx, tabela).createMany({ data: dados });
        linhas[tabela] = dados.length;
      }
    },
    { timeout: 120_000 }
  );
  return { ok: true, linhas };
}
