import { describe, it, expect } from "vitest";
import { digitosDoTelefone, mascararTelefone, telefoneValido } from "./telefone";

describe("telefone", () => {
  it("aceita 10 ou 11 dígitos, com ou sem formatação", () => {
    for (const t of ["5333334444", "53999999999", "(53) 99999-9999", "(53) 3333-4444", "53 99999 9999"]) {
      expect(telefoneValido(t)).toBe(true);
    }
  });

  it("aceita o código do país (55) na frente", () => {
    for (const t of ["+55 53 99999-9999", "5553999999999", "55 53 3333-4444"]) expect(telefoneValido(t)).toBe(true);
    expect(digitosDoTelefone("+55 53 99999-9999")).toBe("53999999999");
  });

  it("recusa números curtos, longos demais ou sem dígitos", () => {
    for (const t of ["", "123", "(12) 3", "533333444", "539999999999999", "abcdefghij"]) expect(telefoneValido(t)).toBe(false);
  });

  it("formata enquanto digita", () => {
    expect(mascararTelefone("5")).toBe("5");
    expect(mascararTelefone("539")).toBe("(53) 9");
    expect(mascararTelefone("539999")).toBe("(53) 9999");
    expect(mascararTelefone("5399999")).toBe("(53) 9999-9");
    expect(mascararTelefone("5333334444")).toBe("(53) 3333-4444"); // fixo
    expect(mascararTelefone("53999999999")).toBe("(53) 99999-9999"); // celular
    expect(mascararTelefone("55999999999")).toBe("(55) 99999-9999"); // DDD 55 não é confundido com o código do país
  });

  it("não deixa o código do país estragar a formatação ao colar um número", () => {
    expect(mascararTelefone("+55 53 99999-9999")).toBe("(53) 99999-9999");
    expect(mascararTelefone("539999999999999")).toBe("(53) 99999-9999"); // dígitos a mais são cortados
  });
});
