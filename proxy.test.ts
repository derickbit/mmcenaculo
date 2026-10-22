import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import nextConfig from "./next.config";
import { criarToken } from "@/lib/session";

// O proxy é a primeira porta do painel: confere só o cookie (a conferência completa, no banco, é feita em cada página/ação).

beforeAll(() => {
  process.env.SESSION_SECRET = "segredo-so-para-os-testes-0123456789abcdef";
});

const pedido = (caminho: string, cookie?: string) =>
  new NextRequest(`http://localhost${caminho}`, { headers: cookie ? { cookie: `cenaculo-session=${cookie}` } : {} });

const eNaoEncontrado = (r: Response) => (r.headers.get("x-middleware-rewrite") ?? "").endsWith("/pagina-que-nao-existe");
const passa = (r: Response) => r.headers.get("x-middleware-next") === "1";

describe("proxy do painel", () => {
  it("a tela de login é a única que aparece sem sessão", async () => {
    expect(passa(await proxy(pedido("/painelmmc/login")))).toBe(true);
  });

  it("sem sessão, qualquer outro endereço do painel finge que não existe (não encontrado, sem redirecionar ao login)", async () => {
    for (const caminho of ["/painelmmc", "/painelmmc/eventos", "/painelmmc/kids", "/painelmmc/usuarios", "/painelmmc/qualquer-coisa"]) {
      const resposta = await proxy(pedido(caminho));
      expect(eNaoEncontrado(resposta), caminho).toBe(true);
      expect(resposta.headers.get("location")).toBeNull(); // nada de "vá para o login": não revela que existe um painel
    }
  });

  it("cookie falso, vazio ou adulterado é tratado como sem sessão", async () => {
    for (const cookie of ["abc.def", "lixo", "a.b.c"]) {
      expect(eNaoEncontrado(await proxy(pedido("/painelmmc", cookie))), cookie).toBe(true);
    }
    const [corpo, assinatura] = (await criarToken("conta")).split(".");
    const outraConta = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(corpo, "base64url").toString()), sub: "outra" })).toString("base64url");
    expect(eNaoEncontrado(await proxy(pedido("/painelmmc", `${outraConta}.${assinatura}`)))).toBe(true);
  });

  it("com sessão válida, o painel abre", async () => {
    const token = await criarToken("conta");
    for (const caminho of ["/painelmmc", "/painelmmc/eventos", "/painelmmc/usuarios"]) {
      expect(passa(await proxy(pedido(caminho, token))), caminho).toBe(true);
    }
  });

});

describe("painel fora dos buscadores", () => {
  it("as páginas e a API do painel mandam o cabeçalho noindex", async () => {
    const regras = await nextConfig.headers!();
    const origens = regras.map((r) => r.source);
    expect(origens).toContain("/painelmmc/:path*");
    expect(origens).toContain("/api/painelmmc/:path*");
    for (const regra of regras) {
      expect(regra.headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });
    }
  });
});
