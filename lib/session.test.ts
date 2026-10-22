import { createHmac } from "node:crypto";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { criarToken, verificarToken, DURACAO_SESSAO_SEGUNDOS } from "./session";

const SEGREDO = "segredo-so-para-os-testes-0123456789abcdef";

beforeAll(() => {
  process.env.SESSION_SECRET = SEGREDO;
});
afterEach(() => {
  vi.restoreAllMocks();
});

const decodificar = (parte: string) => JSON.parse(Buffer.from(parte, "base64url").toString("utf8"));
const codificar = (objeto: unknown) => Buffer.from(JSON.stringify(objeto)).toString("base64url");

describe("cookie de sessão", () => {
  it("guarda o identificador da conta, quando foi emitido e quando vence", async () => {
    const antes = Date.now();
    const token = await criarToken("id-da-conta-123", false);
    const sessao = await verificarToken(token);

    expect(sessao?.sub).toBe("id-da-conta-123");
    expect(sessao?.pa).toBe(false);
    expect(sessao!.iat).toBeGreaterThanOrEqual(antes);
    expect(sessao!.iat).toBeLessThanOrEqual(Date.now());
    expect(sessao!.exp - Math.floor(sessao!.iat / 1000)).toBe(DURACAO_SESSAO_SEGUNDOS);
  });

  it("não aceita cookie ausente ou com formato errado", async () => {
    for (const ruim of [undefined, null, "", "so-uma-parte", "a.b.c", "....", "abc.def"]) {
      expect(await verificarToken(ruim)).toBeNull();
    }
  });

  it("não aceita cookie adulterado (trocar a conta dentro do cookie invalida a assinatura)", async () => {
    const [corpo, assinatura] = (await criarToken("conta-comum", false)).split(".");
    const adulterado = codificar({ ...decodificar(corpo), sub: "conta-do-admin" });
    expect(await verificarToken(`${adulterado}.${assinatura}`)).toBeNull();
  });

  it("não aceita cookie assinado com outro segredo", async () => {
    process.env.SESSION_SECRET = "outro-segredo-completamente-diferente-0123456789";
    const token = await criarToken("conta-comum", false);
    process.env.SESSION_SECRET = SEGREDO;
    expect(await verificarToken(token)).toBeNull();
  });

  it("não aceita cookie vencido", async () => {
    const token = await criarToken("conta-comum", false);
    const agora = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(agora + (DURACAO_SESSAO_SEGUNDOS + 60) * 1000);
    expect(await verificarToken(token)).toBeNull();
  });

  it("recusa um cookie de formato antigo: assinado direitinho, mas sem o momento de emissão", async () => {
    // Assina de verdade (HMAC-SHA256 sobre o corpo, como o servidor faz), para a assinatura NÃO ser o motivo da recusa.
    const assinar = (conteudo: object) => {
      const corpo = codificar(conteudo);
      return `${corpo}.${createHmac("sha256", SEGREDO).update(corpo).digest("base64url")}`;
    };
    const exp = Math.floor(Date.now() / 1000) + 3600;

    const comIat = await verificarToken(assinar({ sub: "conta", pa: false, iat: Date.now(), exp }));
    expect(comIat?.sub).toBe("conta"); // prova que a assinatura do teste está certa

    expect(await verificarToken(assinar({ sub: "conta", pa: false, exp }))).toBeNull(); // sem iat: recusado
  });

  it("sem o segredo configurado, falha de forma explícita (não existe sessão segura sem ele)", async () => {
    delete process.env.SESSION_SECRET;
    await expect(criarToken("conta", false)).rejects.toThrow(/SESSION_SECRET/);
    process.env.SESSION_SECRET = SEGREDO;
  });
});
