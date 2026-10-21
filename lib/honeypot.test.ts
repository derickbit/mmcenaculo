import { describe, it, expect } from "vitest";
import { pareceRobo, TEMPO_MINIMO_MS } from "./honeypot";

const agora = 1_800_000_000_000;
const haMs = (ms: number) => String(agora - ms);

describe("pareceRobo", () => {
  it("pessoa de verdade: campo escondido vazio e formulário aberto há tempo suficiente", () => {
    expect(pareceRobo({ website: "", abertoEm: haMs(10_000) }, { exigirAbertura: true, agora })).toBe(false);
    expect(pareceRobo({ abertoEm: haMs(TEMPO_MINIMO_MS) }, { exigirAbertura: true, agora })).toBe(false); // no limite exato
  });

  it("campo escondido preenchido: é robô, não importa o resto", () => {
    expect(pareceRobo({ website: "http://spam.example", abertoEm: haMs(60_000) }, { agora })).toBe(true);
    expect(pareceRobo({ website: " x " }, { agora })).toBe(true);
    expect(pareceRobo({ website: 0 }, { agora })).toBe(true);
  });

  it("campo escondido só com espaços ou nulo não conta como preenchido", () => {
    expect(pareceRobo({ website: "   ", abertoEm: haMs(10_000) }, { agora })).toBe(false);
    expect(pareceRobo({ website: null, abertoEm: haMs(10_000) }, { agora })).toBe(false);
  });

  it("enviado depressa demais é robô (inclusive horário no futuro)", () => {
    expect(pareceRobo({ abertoEm: haMs(500) }, { agora })).toBe(true);
    expect(pareceRobo({ abertoEm: haMs(TEMPO_MINIMO_MS - 1) }, { agora })).toBe(true);
    expect(pareceRobo({ abertoEm: String(agora + 60_000) }, { agora })).toBe(true);
  });

  it("sem o horário (ou com valor inválido): só é robô se o horário for exigido", () => {
    for (const abertoEm of [undefined, null, "", "abc", NaN]) {
      expect(pareceRobo({ abertoEm }, { exigirAbertura: true, agora })).toBe(true);
      expect(pareceRobo({ abertoEm }, { exigirAbertura: false, agora })).toBe(false);
    }
  });

  it("aceita o horário como número ou como texto", () => {
    expect(pareceRobo({ abertoEm: agora - 10_000 }, { exigirAbertura: true, agora })).toBe(false);
    expect(pareceRobo({ abertoEm: haMs(10_000) }, { exigirAbertura: true, agora })).toBe(false);
  });

  it("entrada vazia ou nula não quebra", () => {
    expect(pareceRobo(null, { exigirAbertura: true, agora })).toBe(true);
    expect(pareceRobo(undefined, { agora })).toBe(false);
    expect(pareceRobo({}, { agora })).toBe(false);
  });
});
