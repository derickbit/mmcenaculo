import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const raiz = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => ({
  resolve: {
    // Mesmo atalho "@/..." do tsconfig.
    alias: { "@": raiz },
  },
  test: {
    // Só a variável do banco de testes é lida do .env; as demais (inclusive DATABASE_URL) ficam de fora.
    env: loadEnv(mode, raiz, "DATABASE_URL_TESTE"),
  },
}));
