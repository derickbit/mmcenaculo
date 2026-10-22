import { describe, it, expect, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Guarda de segurança do painel: NENHUMA página que mostra dados pode abrir sem conferir a sessão no banco (conta ativa,
// cookie não derrubado). O proxy só olha o cookie; sem esta conferência, uma conta desativada continuaria vendo as páginas.

const RAIZ_PAGINAS = path.join(process.cwd(), "app", "painelmmc");
const RAIZ_API = path.join(process.cwd(), "app", "api", "painelmmc");

const EXCECOES_DE_PAGINA: Record<string, string> = {
  "login/page.tsx": "tela pública de entrada",
  "setup/page.tsx": "tem o próprio fluxo (conta com senha provisória) e sai na parte D",
};

function achar(dir: string, nomeDoArquivo: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = path.join(dir, e.name);
    if (e.isDirectory()) return achar(caminho, nomeDoArquivo);
    return e.name === nomeDoArquivo ? [caminho] : [];
  });
}
const relativo = (base: string, arquivo: string) => path.relative(base, arquivo).split(path.sep).join("/");

describe("todas as páginas do painel conferem a sessão", () => {
  const paginas = achar(RAIZ_PAGINAS, "page.tsx");

  it("encontra as páginas do painel (para o teste não passar à toa)", () => {
    const nomes = paginas.map((p) => relativo(RAIZ_PAGINAS, p));
    for (const esperada of ["page.tsx", "eventos/page.tsx", "kids/page.tsx", "usuarios/page.tsx", "login/page.tsx"]) {
      expect(nomes).toContain(esperada);
    }
  });

  it.each(paginas.map((p) => [relativo(RAIZ_PAGINAS, p), p]))("%s", (nome, arquivo) => {
    if (EXCECOES_DE_PAGINA[nome]) return; // exceção declarada acima, com o motivo
    const fonte = readFileSync(arquivo, "utf8");

    const guarda = /await (exigirSessaoPagina|exigirAdminPagina)\(\)/.exec(fonte);
    expect(guarda, `${nome} precisa chamar exigirSessaoPagina() ou exigirAdminPagina()`).not.toBeNull();

    // e a conferência vem ANTES de qualquer uso do banco
    const primeiroUsoDoBanco = fonte.indexOf("prisma.");
    if (primeiroUsoDoBanco >= 0) expect(guarda!.index).toBeLessThan(primeiroUsoDoBanco);
  });
});

describe("toda rota de API do painel confere a sessão", () => {
  const rotas = achar(RAIZ_API, "route.ts");

  it("encontra as rotas (para o teste não passar à toa)", () => {
    expect(rotas.length).toBeGreaterThan(0);
  });

  it.each(rotas.map((r) => [relativo(RAIZ_API, r), r]))("%s", (nome, arquivo) => {
    const fonte = readFileSync(arquivo, "utf8");
    const guarda = /await lerSessao\(\)/.exec(fonte);
    expect(guarda, `${nome} precisa conferir a sessão`).not.toBeNull();
    const primeiroUsoDoBanco = fonte.indexOf("prisma.");
    if (primeiroUsoDoBanco >= 0) expect(guarda!.index).toBeLessThan(primeiroUsoDoBanco);
  });
});

describe("a lista de inscritos não carrega nada sem sessão válida", () => {
  it("conta desativada ou sem sessão: a página é interrompida antes de consultar o banco", async () => {
    const consultas = { inscricao: vi.fn(), evento: vi.fn() };
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({ default: { inscricao: { findMany: consultas.inscricao }, evento: { findMany: consultas.evento } } }));
    vi.doMock("@/lib/auth", () => ({
      exigirSessao: vi.fn(),
      exigirSessaoPagina: vi.fn().mockRejectedValue(new Error("REDIRECT:/painelmmc/login")),
    }));

    const { default: Pagina } = await import("./page");
    await expect(Pagina({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/painelmmc/login");
    expect(consultas.inscricao).not.toHaveBeenCalled();
    expect(consultas.evento).not.toHaveBeenCalled();

    vi.doUnmock("@/lib/prisma");
    vi.doUnmock("@/lib/auth");
  });
});
