import { test, expect, type Page } from "@playwright/test";
import { ADMIN } from "./ambiente";
import { criarInscricaoAdulto, resetar, type Cenario } from "./banco";

// O painel da coordenação, como uma pessoa usa: painel escondido sem login, entrar, ver as inscrições, baixar a planilha,
// convidar uma conta nova e conferir que a coordenação não enxerga a gestão de usuários.

test.describe.configure({ mode: "serial" });

let cenario: Cenario;
test.beforeAll(async () => {
  cenario = await resetar();
  await criarInscricaoAdulto(cenario.adultoId, "Maria Painel", "maria.painel@teste.com");
});

async function entrar(page: Page, usuario: string, senha: string) {
  await page.goto("/painelmmc/login");
  await page.getByPlaceholder("Ex: Joao").fill(usuario);
  await page.locator('input[type="password"]').fill(senha);
  await page.getByRole("button", { name: "Entrar no Painel" }).click();
}

test("sem login, o painel parece não existir (404), inclusive a planilha", async ({ page }) => {
  for (const caminho of ["/painelmmc", "/painelmmc/usuarios", "/painelmmc/kids"]) {
    const resposta = await page.goto(caminho);
    expect(resposta?.status(), caminho).toBe(404);
  }
  const planilha = await page.request.get("/api/painelmmc/exportar/inscritos");
  expect([401, 404]).toContain(planilha.status());
});

test("senha errada não entra e mostra a mensagem genérica", async ({ page }) => {
  await entrar(page, ADMIN.nome, "senha-errada-123");
  await expect(page.getByText("Usuário ou senha incorretos.")).toBeVisible();
  await expect(page).toHaveURL(/\/painelmmc\/login/);
});

test("administrador entra e vê as inscrições com o evento de cada uma", async ({ page }) => {
  await entrar(page, ADMIN.nome, ADMIN.senha);
  await expect(page).toHaveURL(/\/painelmmc$/);
  await expect(page.getByRole("heading", { name: "Inscrições Recebidas" })).toBeVisible();

  await expect(page.getByRole("columnheader", { name: "Evento" })).toBeVisible();
  const linha = page.getByRole("row", { name: /Maria Painel/ });
  await expect(linha).toContainText("Cenáculo E2E");
  await expect(linha).toContainText("maria.painel@teste.com");
});

test("já logado, o endereço do login leva direto ao painel", async ({ page }) => {
  await entrar(page, ADMIN.nome, ADMIN.senha);
  await expect(page).toHaveURL(/\/painelmmc$/);

  await page.goto("/painelmmc/login");
  await expect(page).toHaveURL(/\/painelmmc$/);
});

test("a busca acha por e-mail e avisa quando não há resultado", async ({ page }) => {
  await entrar(page, ADMIN.nome, ADMIN.senha);
  const busca = page.getByPlaceholder("Digite para buscar...");

  await busca.fill("maria.painel@");
  await expect(page.getByRole("row", { name: /Maria Painel/ })).toBeVisible();

  await busca.fill("ninguem-com-esse-nome");
  await expect(page.getByText("Nenhum inscrito corresponde aos filtros selecionados.")).toBeVisible();
});

test("a planilha de inscritos baixa como um arquivo do Excel", async ({ page }) => {
  await entrar(page, ADMIN.nome, ADMIN.senha);
  await expect(page).toHaveURL(/\/painelmmc$/);

  const resposta = await page.request.get("/api/painelmmc/exportar/inscritos");
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()["content-type"]).toContain("spreadsheetml");
  const corpo = await resposta.body();
  expect(corpo.subarray(0, 2).toString()).toBe("PK"); // um .xlsx é um zip
  expect(corpo.byteLength).toBeGreaterThan(1000);
});

test("sair do sistema fecha o painel de novo", async ({ page }) => {
  await entrar(page, ADMIN.nome, ADMIN.senha);
  await expect(page).toHaveURL(/\/painelmmc$/);

  await page.getByRole("button", { name: "Sair do Sistema" }).click();
  await expect(page).toHaveURL(/\/painelmmc\/login/);

  const resposta = await page.goto("/painelmmc");
  expect(resposta?.status()).toBe(404);
});

test("convite: o admin gera o link, a pessoa cria a conta e a coordenação não vê a gestão de usuários", async ({ page, browser }) => {
  await entrar(page, ADMIN.nome, ADMIN.senha);
  await expect(page).toHaveURL(/\/painelmmc$/); // espera o login terminar antes de seguir para outra página
  await page.goto("/painelmmc/usuarios");
  await page.getByPlaceholder("ex.: mateus").fill("coord-e2e");
  await page.getByRole("button", { name: "Gerar convite" }).click();
  const link = await page.getByLabel("Link", { exact: true }).inputValue();
  expect(link).toMatch(/\/convite\/.+/);

  // a pessoa convidada, noutro navegador (sem a sessão do admin)
  const contexto = await browser.newContext({ baseURL: new URL(link).origin });
  const convidada = await contexto.newPage();
  await convidada.goto(link);
  await expect(convidada.getByRole("heading", { name: /Criar sua conta/ })).toBeVisible();
  await expect(convidada.locator('input[name="usuario"]')).toHaveValue("coord-e2e"); // escolhido pelo admin, não editável
  await convidada.locator('input[name="senha"]').fill("senha-da-coord-123");
  await convidada.locator('input[name="confirmacao"]').fill("senha-da-coord-123");
  await convidada.getByRole("button", { name: "Criar conta e entrar" }).click();
  await expect(convidada).toHaveURL(/\/painelmmc$/);

  // coordenação vê as inscrições, mas não "Usuários"
  await expect(convidada.getByRole("heading", { name: "Inscrições Recebidas" })).toBeVisible();
  await expect(convidada.getByRole("link", { name: "Usuários" })).toHaveCount(0);
  await convidada.goto("/painelmmc/usuarios");
  await expect(convidada).toHaveURL(/\/painelmmc$/);

  // o link só vale uma vez
  const outra = await browser.newContext({ baseURL: new URL(link).origin });
  const reuso = await outra.newPage();
  await reuso.goto(link);
  await expect(reuso.getByRole("heading", { name: "Convite inválido ou expirado" })).toBeVisible();

  await contexto.close();
  await outra.close();
});
