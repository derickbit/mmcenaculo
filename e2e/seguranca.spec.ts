import { test, expect, type Page } from "@playwright/test";
import { ADMIN } from "./ambiente";
import { resetar, type Cenario } from "./banco";

// Cabeçalhos de segurança (incluindo a política de conteúdo, CSP) e a prova de que ela não bloqueia nada do que o site precisa:
// páginas públicas e do painel carregam, hidratam e não geram nenhuma violação da política.

test.describe.configure({ mode: "serial" });

let cenario: Cenario;
test.beforeAll(async () => {
  cenario = await resetar();
});

// Junta as mensagens do navegador sobre violações da política de conteúdo.
function vigiarViolacoes(page: Page): string[] {
  const violacoes: string[] = [];
  page.on("console", (m) => {
    const texto = m.text();
    if (/content security policy|refused to (load|execute|connect|frame|apply)/i.test(texto)) violacoes.push(texto);
  });
  page.on("pageerror", (e) => {
    if (/content security policy/i.test(e.message)) violacoes.push(e.message);
  });
  return violacoes;
}

test("as páginas trazem os cabeçalhos de segurança, inclusive a política de conteúdo", async ({ request }) => {
  for (const caminho of ["/", "/privacidade", "/inscricao", "/painelmmc/login", "/api/login"]) {
    const resposta = await request.get(caminho);
    const h = resposta.headers();
    expect(h["x-content-type-options"], caminho).toBe("nosniff");
    expect(h["x-frame-options"], caminho).toBe("DENY");
    expect(h["referrer-policy"], caminho).toBe("strict-origin-when-cross-origin");
    const csp = h["content-security-policy"];
    expect(csp, caminho).toContain("default-src 'self'");
    expect(csp, caminho).toContain("frame-ancestors 'none'");
    expect(csp, caminho).toContain("object-src 'none'");
  }
});

test("o painel continua fora dos buscadores, além dos cabeçalhos de segurança", async ({ page }) => {
  await page.goto("/painelmmc/login");
  await page.getByPlaceholder("Ex: Joao").fill(ADMIN.nome);
  await page.locator('input[type="password"]').fill(ADMIN.senha);
  await page.getByRole("button", { name: "Entrar no Painel" }).click();
  await expect(page).toHaveURL(/\/painelmmc$/);

  const resposta = await page.request.get("/painelmmc");
  expect(resposta.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(resposta.headers()["content-security-policy"]).toContain("default-src 'self'");
});

test("nenhuma página pública é bloqueada pela política de conteúdo", async ({ page }) => {
  const violacoes = vigiarViolacoes(page);
  for (const caminho of ["/", "/sobre", "/calendario", "/galeria", "/privacidade", "/inscricao", `/inscricao?e=${cenario.adultoId}`, `/inscricao?e=${cenario.kidsId}`, "/painelmmc/login"]) {
    await page.goto(caminho);
    await page.waitForLoadState("networkidle");
  }
  expect(violacoes).toEqual([]);
});

test("a hidratação funciona (os scripts do Next não são bloqueados): o formulário reage ao que a pessoa digita", async ({ page }) => {
  await page.goto(`/inscricao?e=${cenario.adultoId}`);
  const telefone = page.locator('input[name="telefone"]');
  await telefone.fill("53999999999");
  await expect(telefone).toHaveValue("(53) 99999-9999"); // a máscara só existe se o JavaScript rodou
});

test("nenhuma página do painel é bloqueada pela política de conteúdo (inclusive onde o Cloudinary carrega)", async ({ page }) => {
  const violacoes = vigiarViolacoes(page);
  await page.goto("/painelmmc/login");
  await page.getByPlaceholder("Ex: Joao").fill(ADMIN.nome);
  await page.locator('input[type="password"]').fill(ADMIN.senha);
  await page.getByRole("button", { name: "Entrar no Painel" }).click();
  await expect(page).toHaveURL(/\/painelmmc$/);

  for (const caminho of ["/painelmmc", "/painelmmc/kids", "/painelmmc/espera", "/painelmmc/eventos", "/painelmmc/galeria", "/painelmmc/frequencia", "/painelmmc/usuarios"]) {
    await page.goto(caminho);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500); // dá tempo de scripts de fora (Cloudinary) tentarem carregar
  }
  expect(violacoes).toEqual([]);
});

test("uma página de fora não consegue embutir o site (anti-clickjacking)", async ({ page }) => {
  await page.setContent(`<iframe id="alvo" src="http://localhost:3100/privacidade" width="400" height="300"></iframe>`);
  await page.waitForTimeout(1500);
  const quadro = page.frames().find((f) => f.url().startsWith("http://localhost:3100"));
  // o navegador recusa mostrar o conteúdo: o quadro fica vazio (sem o título da página de privacidade)
  const conteudo = quadro ? await quadro.content().catch(() => "") : "";
  expect(conteudo).not.toContain("Privacidade e proteção de dados");
});
