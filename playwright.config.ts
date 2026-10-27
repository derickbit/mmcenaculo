import { defineConfig, devices } from "@playwright/test";
import { urlBancoE2E } from "./e2e/ambiente";

// Testes de ponta a ponta: um navegador de verdade abre o site (build de produção, num servidor próprio na porta 3100) e faz o que uma
// pessoa faz. Rodam num banco SÓ para isso (cenaculodb_e2e_test), que o próprio comando cria e apaga a cada rodada. Não toca no seu banco local.
const PORTA = 3100;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  // Um teste por vez, em ordem: todos usam o mesmo banco e o limite de tentativas é por IP.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // 1) cria/atualiza o banco do e2e; 2) compila o site; 3) sobe o servidor.
    command: `npx tsx e2e/preparar-banco.ts && npm run build && npx next start -p ${PORTA}`,
    url: `http://localhost:${PORTA}/calendario`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      DATABASE_URL: urlBancoE2E(),
      SESSION_SECRET: "segredo-falso-so-para-o-e2e-0123456789abcdef0123456789",
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "e2e",
    },
  },
});
