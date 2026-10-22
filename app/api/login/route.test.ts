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
  let limites: typeof import("@/lib/limite").LIMITES;
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
    limites = (await import("@/lib/limite")).LIMITES;
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

  it("depois de muitos erros no mesmo usuário, bloqueia por um tempo, mesmo com a senha certa", async () => {
    const nome = await novoUsuario();
    const ip = novoIp();
    await errar(nome, ip, limites.loginFalhasUsuario.maximo);

    const bloqueada = await entrar(nome, SENHA, ip);
    expect(bloqueada.status).toBe(429);
    expect(Number(bloqueada.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await bloqueada.json()).error).toMatch(/Muitas tentativas/);
  });

  it("o bloqueio do usuário vale em qualquer IP, mas não trava os outros usuários do mesmo IP", async () => {
    const alvo = await novoUsuario();
    const outro = await novoUsuario();
    const ip = novoIp();
    await errar(alvo, ip, limites.loginFalhasUsuario.maximo);

    expect((await entrar(alvo, SENHA, novoIp())).status).toBe(429); // mesmo usuário, IP novo: bloqueado
    expect((await entrar(outro, SENHA, ip)).status).toBe(200); // outro usuário, mesmo IP: livre (o IP tem teto maior)
  });

  it("o IP que erra com vários nomes diferentes é bloqueado para todos os usuários", async () => {
    const outro = await novoUsuario();
    const ipVarredura = novoIp();
    for (let i = 0; i < limites.loginFalhasIp.maximo; i++) {
      expect((await entrar(`varredura-${sufixo}-${i}`, "qualquer", ipVarredura)).status).toBe(401);
    }

    expect((await entrar(outro, SENHA, ipVarredura)).status).toBe(429); // mesmo IP: bloqueado, mesmo com a senha certa
    expect((await entrar(outro, SENHA, novoIp())).status).toBe(200); // outro IP: livre
  });

  it("o bloqueio também vale para nomes que não existem, sem revelar se existem", async () => {
    const fantasma = `fantasma-${sufixo}`;
    const ip = novoIp();
    await errar(fantasma, ip, limites.loginFalhasUsuario.maximo);
    expect((await entrar(fantasma, "qualquer", ip)).status).toBe(429);
  });

  it("um login certo zera as falhas daquele usuário", async () => {
    const nome = await novoUsuario();
    await errar(nome, novoIp(), 3);
    expect((await entrar(nome, SENHA, novoIp())).status).toBe(200);

    // depois do login certo, quase o máximo de erros (de IPs diferentes) ainda não bloqueia: a contagem recomeçou
    for (let i = 0; i < limites.loginFalhasUsuario.maximo - 1; i++) {
      expect((await entrar(nome, "senha-errada", novoIp())).status).toBe(401);
    }
    expect((await entrar(nome, SENHA, novoIp())).status).toBe(200);
  });
});
