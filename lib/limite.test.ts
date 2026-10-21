import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "@prisma/client";

// Estes testes usam um banco de verdade (DATABASE_URL_TESTE). Sem a variável, são pulados.
const urlTeste = process.env.DATABASE_URL_TESTE;

if (urlTeste && !new URL(urlTeste).pathname.slice(1).endsWith("_test")) {
  // Trava de segurança: nunca rodar testes em um banco que não seja de testes.
  throw new Error("DATABASE_URL_TESTE precisa apontar para um banco cujo nome termina em _test.");
}

describe.skipIf(!urlTeste)("limitador de tentativas (banco de testes)", () => {
  const sufixo = Date.now().toString(36);
  let prisma: PrismaClient;
  let limite: typeof import("./limite");
  let n = 0;
  const chave = () => `teste-${sufixo}-${++n}`;

  beforeAll(async () => {
    // O lib/prisma lê DATABASE_URL ao ser importado, então apontamos para o banco de testes antes.
    process.env.DATABASE_URL = urlTeste;
    prisma = (await import("@/lib/prisma")).default;
    limite = await import("./limite");
  });

  afterAll(async () => {
    await prisma.limiteTentativa.deleteMany({ where: { chave: { startsWith: `teste-${sufixo}-` } } });
    await prisma.$disconnect();
  });

  it("permite até o máximo e recusa a tentativa seguinte, dizendo em quantos segundos tentar de novo", async () => {
    const c = chave();
    for (let i = 0; i < 3; i++) expect((await limite.limitar(c, 3, 600)).permitido).toBe(true);

    const recusada = await limite.limitar(c, 3, 600);
    expect(recusada.permitido).toBe(false);
    expect(recusada.tentarEmSegundos).toBeGreaterThan(0);
    expect(recusada.tentarEmSegundos).toBeLessThanOrEqual(600);
  });

  it("chaves diferentes não interferem entre si", async () => {
    const a = chave();
    const b = chave();
    await limite.limitar(a, 1, 600);
    expect((await limite.limitar(a, 1, 600)).permitido).toBe(false);
    expect((await limite.limitar(b, 1, 600)).permitido).toBe(true);
  });

  it("depois da janela, volta a liberar e recomeça a contagem", async () => {
    const c = chave();
    await limite.limitar(c, 1, 60);
    expect((await limite.limitar(c, 1, 60)).permitido).toBe(false);

    // Simula a passagem do tempo: a janela começou há mais de 60 segundos.
    await prisma.limiteTentativa.update({ where: { chave: c }, data: { janelaInicio: new Date(Date.now() - 61_000) } });

    expect((await limite.limitar(c, 1, 60)).permitido).toBe(true);
    expect((await limite.limitar(c, 1, 60)).permitido).toBe(false);
  });

  it("envios simultâneos não furam o limite", async () => {
    const c = chave();
    const respostas = await Promise.all(Array.from({ length: 20 }, () => limite.limitar(c, 5, 600)));
    expect(respostas.filter((r) => r.permitido)).toHaveLength(5);
    expect(respostas.filter((r) => !r.permitido)).toHaveLength(15);
  });

  it("estaBloqueado só consulta: não conta como tentativa", async () => {
    const c = chave();
    expect((await limite.estaBloqueado(c, 2, 600)).permitido).toBe(true); // chave que nem existe

    await limite.registrarTentativa(c, 600);
    for (let i = 0; i < 5; i++) expect((await limite.estaBloqueado(c, 2, 600)).permitido).toBe(true); // 1 falha, máximo 2

    await limite.registrarTentativa(c, 600); // 2 falhas
    const bloqueado = await limite.estaBloqueado(c, 2, 600);
    expect(bloqueado.permitido).toBe(false);
    expect(bloqueado.tentarEmSegundos).toBeGreaterThan(0);

    // consultar não aumentou a contagem
    expect((await prisma.limiteTentativa.findUniqueOrThrow({ where: { chave: c } })).contagem).toBe(2);
  });

  it("estaBloqueado libera quando a janela venceu", async () => {
    const c = chave();
    await limite.registrarTentativa(c, 60);
    await limite.registrarTentativa(c, 60);
    expect((await limite.estaBloqueado(c, 2, 60)).permitido).toBe(false);

    await prisma.limiteTentativa.update({ where: { chave: c }, data: { janelaInicio: new Date(Date.now() - 61_000) } });
    expect((await limite.estaBloqueado(c, 2, 60)).permitido).toBe(true);
  });

  it("limpar zera a contagem", async () => {
    const c = chave();
    await limite.registrarTentativa(c, 600);
    await limite.registrarTentativa(c, 600);
    await limite.limpar(c);
    expect((await limite.estaBloqueado(c, 2, 600)).permitido).toBe(true);
    expect((await limite.limitar(c, 1, 600)).permitido).toBe(true);
  });

  it("limparVencidas apaga só o que tem mais de um dia", async () => {
    const velha = chave();
    const recente = chave();
    await limite.limitar(velha, 1, 60);
    await limite.limitar(recente, 1, 60);
    await prisma.limiteTentativa.update({ where: { chave: velha }, data: { janelaInicio: new Date(Date.now() - 25 * 3600_000) } });

    await limite.limparVencidas();

    expect(await prisma.limiteTentativa.count({ where: { chave: velha } })).toBe(0);
    expect(await prisma.limiteTentativa.count({ where: { chave: recente } })).toBe(1);
  });
});
