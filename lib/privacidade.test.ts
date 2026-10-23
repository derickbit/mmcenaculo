import { describe, it, expect } from "vitest";
import { EMAIL_PRIVACIDADE, PRAZO_GUARDA_MESES, PRAZO_GUARDA_TEXTO, TEXTO_CONSENTIMENTO_ADULTO } from "./privacidade";
import { TEXTO_CONSENTIMENTO } from "./kids";

// O texto que o responsável aceita no Kids tem que dizer a mesma coisa que o resto do sistema faz:
// o e-mail de contato e o prazo de guarda vêm das mesmas constantes usadas na página de privacidade.
describe("texto de consentimento do Kids", () => {
  it("diz como pedir correção ou exclusão (e-mail de contato)", () => {
    expect(TEXTO_CONSENTIMENTO).toContain(EMAIL_PRIVACIDADE);
  });

  it("diz por quanto tempo os dados ficam guardados", () => {
    expect(TEXTO_CONSENTIMENTO).toContain(PRAZO_GUARDA_TEXTO);
  });

  it("limita o uso das informações de saúde ao cuidado no evento", () => {
    expect(TEXTO_CONSENTIMENTO).toMatch(/cuidado da criança durante o evento/);
  });
});

describe("texto de consentimento do adulto", () => {
  it("diz o e-mail de contato, o prazo e que a saúde só serve para o cuidado no evento", () => {
    expect(TEXTO_CONSENTIMENTO_ADULTO).toContain(EMAIL_PRIVACIDADE);
    expect(TEXTO_CONSENTIMENTO_ADULTO).toContain(PRAZO_GUARDA_TEXTO);
    expect(TEXTO_CONSENTIMENTO_ADULTO).toMatch(/apenas para o cuidado comigo durante o evento/);
  });
});

describe("prazo de guarda", () => {
  it("o texto e o número de meses concordam (1 ano = 12 meses)", () => {
    expect(PRAZO_GUARDA_TEXTO).toBe("1 ano");
    expect(PRAZO_GUARDA_MESES).toBe(12);
  });
});
