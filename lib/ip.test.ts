import { describe, it, expect } from "vitest";
import { ipDoCliente } from "./ip";

const com = (cabecalhos: Record<string, string>) => new Headers(cabecalhos);

describe("ipDoCliente", () => {
  it("usa o primeiro IP do x-forwarded-for", () => {
    expect(ipDoCliente(com({ "x-forwarded-for": "203.0.113.5, 10.0.0.1, 10.0.0.2" }))).toBe("203.0.113.5");
  });

  it("sem x-forwarded-for, usa o x-real-ip", () => {
    expect(ipDoCliente(com({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("sem nenhum dos dois, usa um valor padrão", () => {
    expect(ipDoCliente(com({}))).toBe("desconhecido");
    expect(ipDoCliente(com({ "x-forwarded-for": "  " }))).toBe("desconhecido");
  });

  it("corta valores absurdamente longos", () => {
    expect(ipDoCliente(com({ "x-forwarded-for": "9".repeat(500) })).length).toBe(64);
  });
});
