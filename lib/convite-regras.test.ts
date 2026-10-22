import { describe, it, expect } from "vitest";
import {
  DURACAO_CONVITE_MS,
  SENHA_MINIMA,
  estadoDoConvite,
  gerarCodigo,
  hashDoCodigo,
  validarNomeUsuario,
  validarSenha,
} from "./convite-regras";

describe("código do convite", () => {
  it("é longo, aleatório e seguro para usar num link", () => {
    const codigos = new Set(Array.from({ length: 200 }, () => gerarCodigo()));
    expect(codigos.size).toBe(200); // nenhum repetido
    for (const codigo of codigos) {
      expect(codigo.length).toBeGreaterThanOrEqual(43); // 256 bits em base64url
      expect(codigo).toMatch(/^[A-Za-z0-9_-]+$/); // sem caracteres que quebrem um link
    }
  });

  it("o hash é sempre o mesmo para o mesmo código, e diferente do código", () => {
    const codigo = gerarCodigo();
    expect(hashDoCodigo(codigo)).toBe(hashDoCodigo(codigo));
    expect(hashDoCodigo(codigo)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashDoCodigo(codigo)).not.toContain(codigo);
    expect(hashDoCodigo(codigo)).not.toBe(hashDoCodigo(gerarCodigo()));
  });
});

describe("usuário reservado no convite", () => {
  it.each(["mateus", "Mateus", "maria.silva", "joao_2", "ana-paula", "abc", "a".repeat(30)])("aceita %s", (nome) => {
    expect(validarNomeUsuario(nome)).toBeNull();
  });

  it.each(["", "ab", "a".repeat(31), "com espaço", "joão", "mateus!", "ma@teus", "=1+1", "../etc"])("recusa %j", (nome) => {
    expect(validarNomeUsuario(nome)).toBeTruthy();
  });
});

describe("senha", () => {
  it("exige pelo menos 10 caracteres", () => {
    expect(SENHA_MINIMA).toBe(10);
    expect(validarSenha("123456789")).toBeTruthy();
    expect(validarSenha("1234567890")).toBeNull();
  });

  it("recusa senha acima de 72 bytes, que o bcrypt cortaria em silêncio", () => {
    expect(validarSenha("a".repeat(72))).toBeNull();
    expect(validarSenha("a".repeat(73))).toBeTruthy();
    expect(validarSenha("ç".repeat(40))).toBeTruthy(); // 40 caracteres, 80 bytes
  });
});

describe("estado do convite", () => {
  const agora = new Date("2026-11-01T12:00:00Z");
  const livre = { usadoEm: null, revogadoEm: null, expiraEm: new Date(agora.getTime() + DURACAO_CONVITE_MS) };

  it("vale 48 horas", () => {
    expect(DURACAO_CONVITE_MS).toBe(48 * 3600 * 1000);
  });

  it("válido enquanto não foi usado, revogado nem venceu", () => {
    expect(estadoDoConvite(livre, agora)).toBe("VALIDO");
  });

  it("vence exatamente na hora marcada", () => {
    expect(estadoDoConvite({ ...livre, expiraEm: new Date(agora.getTime() + 1) }, agora)).toBe("VALIDO");
    expect(estadoDoConvite({ ...livre, expiraEm: agora }, agora)).toBe("EXPIRADO");
  });

  it("usado ou revogado vale mais que o prazo", () => {
    expect(estadoDoConvite({ ...livre, usadoEm: agora }, agora)).toBe("USADO");
    expect(estadoDoConvite({ ...livre, revogadoEm: agora }, agora)).toBe("REVOGADO");
    expect(estadoDoConvite({ usadoEm: agora, revogadoEm: agora, expiraEm: new Date(0) }, agora)).toBe("USADO");
  });
});
