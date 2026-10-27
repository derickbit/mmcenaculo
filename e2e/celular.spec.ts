import { test, expect, type Page } from "@playwright/test";
import { ADMIN } from "./ambiente";
import { criarInscricaoAdulto, resetar, type Cenario } from "./banco";

// O site numa tela de celular (390 x 844, como um iPhone): os menus viram lista suspensa e nenhuma página "estoura" para os lados.

test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

let cenario: Cenario;
test.beforeAll(async () => {
  cenario = await resetar();
  await criarInscricaoAdulto(cenario.adultoId, "Maria Celular", "maria.celular@teste.com");
});

// A página não pode ser mais larga que a tela (senão aparece rolagem para o lado).
async function semRolagemLateral(page: Page, caminho: string) {
  const { largura, tela } = await page.evaluate(() => ({ largura: document.documentElement.scrollWidth, tela: window.innerWidth }));
  expect(largura, `${caminho} é mais larga que a tela`).toBeLessThanOrEqual(tela);
}

async function entrar(page: Page) {
  await page.goto("/painelmmc/login");
  await page.getByPlaceholder("Ex: Joao").fill(ADMIN.nome);
  await page.locator('input[type="password"]').fill(ADMIN.senha);
  await page.getByRole("button", { name: "Entrar no Painel" }).click();
  await expect(page).toHaveURL(/\/painelmmc$/);
}

test("site público: o menu é uma lista suspensa que abre, leva à página e fecha sozinha", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Calendário" })).toBeHidden(); // fechado: os links não ocupam a barra

  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("link", { name: "Calendário" })).toBeVisible();
  await page.getByRole("link", { name: "Calendário" }).click();

  await expect(page).toHaveURL(/\/calendario$/);
  await expect(page.getByRole("link", { name: "Galeria" })).toBeHidden(); // trocou de página: a lista fechou
});

test("site público: nenhuma página passa da largura da tela", async ({ page }) => {
  for (const caminho of ["/", "/sobre", "/calendario", "/galeria", "/privacidade", "/inscricao", `/inscricao?e=${cenario.adultoId}`, `/inscricao?e=${cenario.kidsId}`, "/painelmmc/login"]) {
    await page.goto(caminho);
    await page.waitForLoadState("networkidle");
    await semRolagemLateral(page, caminho);
  }
});

test("painel: o menu é uma lista suspensa e a lista de inscritos vira cartões", async ({ page }) => {
  await entrar(page);
  await expect(page.getByRole("link", { name: "Lista de Espera" })).toBeHidden();

  // as colunas da tabela não aparecem; cada inscrito é um cartão com os dados à mostra
  await expect(page.getByRole("columnheader", { name: "Nome / Contato" })).toBeHidden();
  await expect(page.getByText("Maria Celular")).toBeVisible();
  await expect(page.getByText("maria.celular@teste.com")).toBeVisible();

  await page.getByRole("button", { name: "Abrir menu do painel" }).click();
  await expect(page.getByRole("link", { name: "Lista de Espera" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair do Sistema" })).toBeVisible();
  await page.getByRole("link", { name: "Lista de Espera" }).click();
  await expect(page).toHaveURL(/\/painelmmc\/espera$/);
});

test("painel: nenhuma página passa da largura da tela", async ({ page }) => {
  await entrar(page);
  for (const caminho of ["/painelmmc", "/painelmmc/kids", "/painelmmc/espera", "/painelmmc/eventos", "/painelmmc/galeria", "/painelmmc/frequencia", "/painelmmc/usuarios"]) {
    await page.goto(caminho);
    await page.waitForLoadState("networkidle");
    await semRolagemLateral(page, caminho);
  }
});
