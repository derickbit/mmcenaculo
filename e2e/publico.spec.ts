import { test, expect, type Page } from "@playwright/test";
import { consulta, definirStatusDosEventos, resetar, type Cenario } from "./banco";

// A parte pública do site, como uma pessoa usa: escolher o retiro, preencher, aceitar o termo e se inscrever.
// Conferem também o que ficou gravado no banco (inclusive o aceite do consentimento).

test.describe.configure({ mode: "serial" });

let cenario: Cenario;
test.beforeAll(async () => {
  cenario = await resetar();
});

// O formulário só aceita envios que levaram mais de 1 segundo desde que foi aberto (proteção contra robôs).
const comoUmaPessoa = (page: Page) => page.waitForTimeout(1500);

test("com dois retiros abertos, a pessoa escolhe qual", async ({ page }) => {
  await page.goto("/inscricao");
  await expect(page.getByText("Cenáculo E2E")).toBeVisible();
  await expect(page.getByText("Kids E2E")).toBeVisible();
  await expect(page.locator('a[href^="/inscricao?e="]')).toHaveCount(2);
});

test("adulto: sem o consentimento não envia; com ele, a inscrição é gravada com a data do aceite", async ({ page }) => {
  await page.goto(`/inscricao?e=${cenario.adultoId}`);
  await page.locator('input[name="nomeCompleto"]').fill("Maria da Silva");
  await page.locator('input[name="email"]').fill("Maria.E2E@Teste.com");
  await page.locator('input[name="telefone"]').fill("53999999999");
  await page.locator('input[name="cidade"]').fill("Pelotas");
  await page.getByPlaceholder("DD/MM/AAAA").fill("20051990");
  await page.locator('input[name="problemaSaude"]').fill("asma");
  await comoUmaPessoa(page);

  const enviar = page.getByRole("button", { name: "Enviar Inscrição" });

  // sem marcar a caixinha: o navegador barra, nada é enviado
  await enviar.click();
  await expect(page.getByText("Inscrição Confirmada!")).toHaveCount(0);
  expect(await consulta(`SELECT 1 FROM "Inscricao"`)).toHaveLength(0);

  // marcando: envia
  await page.locator('input[name="consentimento"]').check();
  await enviar.click();
  await expect(page.getByText("Inscrição Confirmada!")).toBeVisible();

  const gravadas = await consulta<{ email: string; problemaSaude: string; consentimentoEm: Date | null; eventoId: string }>(
    `SELECT email, "problemaSaude", "consentimentoEm", "eventoId" FROM "Inscricao"`
  );
  expect(gravadas).toHaveLength(1);
  expect(gravadas[0].email).toBe("maria.e2e@teste.com"); // e-mail normalizado
  expect(gravadas[0].problemaSaude).toBe("asma");
  expect(gravadas[0].eventoId).toBe(cenario.adultoId);
  expect(gravadas[0].consentimentoEm).not.toBeNull();
});

test("o link da política de privacidade abre a página de privacidade", async ({ page, context }) => {
  await page.goto(`/inscricao?e=${cenario.adultoId}`);
  const [aba] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("link", { name: "Política de Privacidade" }).click(),
  ]);
  await expect(aba.getByRole("heading", { name: "Privacidade e proteção de dados" })).toBeVisible();
  await expect(aba.getByText("mmcenaculopel@gmail.com").first()).toBeVisible();
});

test("robô que preenche o campo escondido recebe 'sucesso', mas nada é gravado", async ({ page }) => {
  const antes = (await consulta(`SELECT 1 FROM "Inscricao"`)).length;

  await page.goto(`/inscricao?e=${cenario.adultoId}`);
  await page.locator('input[name="nomeCompleto"]').fill("Robo Spammer");
  await page.locator('input[name="email"]').fill("robo.e2e@teste.com");
  await page.locator('input[name="telefone"]').fill("53999999999");
  await page.locator('input[name="cidade"]').fill("Pelotas");
  await page.getByPlaceholder("DD/MM/AAAA").fill("20051990");
  await page.locator('input[name="consentimento"]').check();
  await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => {
    el.value = "http://spam.example"; // um robô preenche tudo, inclusive o que a pessoa não vê
  });
  await comoUmaPessoa(page);
  await page.getByRole("button", { name: "Enviar Inscrição" }).click();

  await expect(page.getByText("Inscrição Confirmada!")).toBeVisible(); // o robô não percebe que foi barrado
  expect(await consulta(`SELECT 1 FROM "Inscricao"`)).toHaveLength(antes);
});

test("Kids: o responsável aceita o termo e a inscrição da criança é gravada", async ({ page }) => {
  const anoNascimento = new Date().getFullYear() - 9;

  await page.goto(`/inscricao?e=${cenario.kidsId}`);
  await page.locator('input[name="criancaNome"]').fill("Pedro");
  await page.getByPlaceholder("DD/MM/AAAA").fill(`1003${anoNascimento}`);
  await page.locator('input[name="responsavelNome"]').fill("Ana Souza");
  await page.locator('select[name="parentesco"]').selectOption("MAE");
  await page.getByPlaceholder("(00) 00000-0000").fill("53988887777");
  await page.locator('input[name="responsavelEmail"]').fill("ana.e2e@teste.com");
  await comoUmaPessoa(page);

  const enviar = page.getByRole("button", { name: "Enviar Inscrição" });
  await enviar.click(); // sem o termo: barrado
  await expect(page.getByText("Inscrição Confirmada!")).toHaveCount(0);
  expect(await consulta(`SELECT 1 FROM "InscricaoKids"`)).toHaveLength(0);

  await page.locator('input[type="checkbox"]').check();
  await enviar.click();
  await expect(page.getByText("Inscrição Confirmada!")).toBeVisible();

  const gravadas = await consulta<{ criancaNome: string; responsavelEmail: string; consentimentoEm: Date | null }>(
    `SELECT "criancaNome", "responsavelEmail", "consentimentoEm" FROM "InscricaoKids"`
  );
  expect(gravadas).toHaveLength(1);
  expect(gravadas[0].criancaNome).toBe("Pedro");
  expect(gravadas[0].responsavelEmail).toBe("ana.e2e@teste.com");
  expect(gravadas[0].consentimentoEm).not.toBeNull();
});

test("sem nenhum retiro aberto, aparece a lista de espera e o cadastro é gravado", async ({ page }) => {
  await definirStatusDosEventos("FECHADO");
  try {
    await page.goto("/inscricao");
    await page.locator('input[name="nome"]').fill("Joana Espera");
    await page.locator('input[name="email"]').fill("joana.e2e@teste.com");
    await page.locator('input[name="telefone"]').fill("53977776666");
    await comoUmaPessoa(page);
    await page.getByRole("button", { name: "Quero ser Avisado!" }).click();

    await expect(page.getByText("Interesse Registrado!")).toBeVisible();
    const gravados = await consulta<{ nome: string; tipo: string }>(`SELECT nome, tipo FROM "PreCadastro"`);
    expect(gravados).toEqual([{ nome: "Joana Espera", tipo: "CENACULO" }]);
  } finally {
    await definirStatusDosEventos("ABERTO");
  }
});
