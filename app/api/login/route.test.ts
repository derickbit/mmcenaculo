import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

// Estes testes usam um banco de verdade (DATABASE_URL_TESTE). Sem a variável, são pulados.
const urlTeste = process.env.DATABASE_URL_TESTE;

if (urlTeste && !new URL(urlTeste).pathname.slice(1).endsWith("_test")) {
  // Trava de segurança: nunca rodar testes em um banco que não seja de testes.
  throw new Error("DATABASE_URL_TESTE precisa apontar para um banco cujo nome termina em _test.");
}

describe.skipIf(!urlTeste)("POST /api/login (banco de testes)", () => {
  const sufixo = Date.now().toString(36);
  const SENHA = "senha-certa-123";
  let prisma: PrismaClient;
  let POST: (request: Request) => Promise<Response>;
  let ipN = 0;
  let nomeN = 0;
  const nomesCriados: string[] = [];

  // Cada teste usa o próprio IP e o próprio usuário, para um não bloquear o outro.
  const novoIp = () => `ip-${sufixo}-${++ipN}`;
  const novoUsuario = async () => {
    const nome = `u${sufixo}-${++nomeN}`;
    await prisma.usuario.create({
      data: { nome, senha: bcrypt.hashSync(SENHA, 4), primeiroAcesso: false },
    });
    nomesCriados.push(nome);
    return nome;
  };

  const entrar = (nome: string, senha: string, ip: string) =>
    POST(
      new Request("http://localhost/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ nome, senha }),
      })
    );

  const errar = async (nome: string, ip: string, vezes: number) => {
    for (let i = 0; i < vezes; i++) expect((await entrar(nome, "senha-errada", ip)).status).toBe(401);
  };

  beforeAll(async () => {
    // O lib/prisma lê DATABASE_URL ao ser importado, então apontamos para o banco de testes antes.
    process.env.DATABASE_URL = urlTeste;
    process.env.SESSION_SECRET = "segredo-so-para-os-testes-0123456789abcdef";
    prisma = (await import("@/lib/prisma")).default;
    POST = (await import("./route")).POST;
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { nome: { in: nomesCriados } } });
    await prisma.limiteTentativa.deleteMany({
      // todas as chaves de login desta execução (inclusive de nomes que não existem), pelo sufixo único
      where: { chave: { startsWith: "login:", contains: sufixo } },
    });
    await prisma.$disconnect();
  });

  it("login certo entra e entrega o cookie de sessão", async () => {
    const nome = await novoUsuario();
    const resposta = await entrar(nome, SENHA, novoIp());
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("set-cookie")).toContain("cenaculo-session=");
  });

  it("senha errada ou usuário inexistente dão a mesma resposta (401)", async () => {
    const nome = await novoUsuario();
    const errada = await entrar(nome, "senha-errada", novoIp());
    const inexistente = await entrar(`nao-existe-${sufixo}`, "qualquer", novoIp());
    expect(errada.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(await errada.json()).toEqual(await inexistente.json());
  });

  it("depois de 5 senhas erradas, bloqueia por um tempo, mesmo com a senha certa", async () => {
    const nome = await novoUsuario();
    const ip = novoIp();
    await errar(nome, ip, 5);

    const bloqueada = await entrar(nome, SENHA, ip);
    expect(bloqueada.status).toBe(429);
    expect(Number(bloqueada.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await bloqueada.json()).error).toMatch(/Muitas tentativas/);
  });

  it("o bloqueio vale para o usuário em qualquer IP, e para o IP com qualquer usuário", async () => {
    const alvo = await novoUsuario();
    const outro = await novoUsuario();
    const ipAtacante = novoIp();
    await errar(alvo, ipAtacante, 5);

    expect((await entrar(alvo, SENHA, novoIp())).status).toBe(429); // mesmo usuário, IP novo
    expect((await entrar(outro, SENHA, ipAtacante)).status).toBe(429); // mesmo IP, outro usuário
    expect((await entrar(outro, SENHA, novoIp())).status).toBe(200); // outro usuário, outro IP: livre
  });

  it("o bloqueio também vale para nomes que não existem, sem revelar se existem", async () => {
    const fantasma = `fantasma-${sufixo}`;
    const ip = novoIp();
    await errar(fantasma, ip, 5);
    const sexta = await entrar(fantasma, "qualquer", ip);
    expect(sexta.status).toBe(429);
  });

  it("um login certo zera as falhas daquele usuário", async () => {
    const nome = await novoUsuario();
    await errar(nome, novoIp(), 3);
    expect((await entrar(nome, SENHA, novoIp())).status).toBe(200);

    // depois do login certo, mais 4 erros (de IPs diferentes) não bloqueiam: a contagem recomeçou
    for (let i = 0; i < 4; i++) expect((await entrar(nome, "senha-errada", novoIp())).status).toBe(401);
    expect((await entrar(nome, SENHA, novoIp())).status).toBe(200);
  });
});
