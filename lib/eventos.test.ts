import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getStatusReal } from "./eventos";

// Como o painel grava: início = meia-noite de Brasília (-03:00), abertura com hora, também em -03:00.
const evento = {
  status: "AUTOMATICO",
  dataAbertura: new Date("2026-11-01T08:00:00-03:00"),
  dataInicio: new Date("2026-11-10T00:00:00-03:00"),
  duracaoDias: 3,
};

const em = (iso: string) => new Date(iso);

// Roda o mesmo conjunto de testes em fusos diferentes: UTC é o da Vercel, São Paulo é o da máquina local.
describe.each([
  { tz: "UTC", offsetMin: 0 },
  { tz: "America/Sao_Paulo", offsetMin: 180 },
])("getStatusReal com TZ=$tz", ({ tz, offsetMin }) => {
  const tzOriginal = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = tz;
  });
  afterEach(() => {
    if (tzOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = tzOriginal;
  });

  it("o fuso do teste foi mesmo aplicado", () => {
    expect(new Date(2026, 10, 10).getTimezoneOffset()).toBe(offsetMin);
  });

  it("status manual vale sempre, sem olhar as datas", () => {
    for (const status of ["ABERTO", "FECHADO", "CONCLUIDO", "AGUARDANDO"]) {
      expect(getStatusReal({ ...evento, status }, em("2030-01-01T00:00:00-03:00"))).toBe(status);
    }
  });

  it("antes da abertura: AGUARDANDO", () => {
    expect(getStatusReal(evento, em("2026-11-01T07:59:59-03:00"))).toBe("AGUARDANDO");
  });

  it("na abertura exata: ABERTO", () => {
    expect(getStatusReal(evento, em("2026-11-01T08:00:00-03:00"))).toBe("ABERTO");
  });

  it("no último segundo antes do início: ABERTO", () => {
    expect(getStatusReal(evento, em("2026-11-09T23:59:59-03:00"))).toBe("ABERTO");
  });

  it("no início exato (meia-noite de Brasília): FECHADO", () => {
    expect(getStatusReal(evento, em("2026-11-10T00:00:00-03:00"))).toBe("FECHADO");
  });

  it("durante o evento, no último dia: FECHADO", () => {
    expect(getStatusReal(evento, em("2026-11-12T23:59:59-03:00"))).toBe("FECHADO");
  });

  it("depois de 3 dias (meia-noite de Brasília): CONCLUIDO", () => {
    expect(getStatusReal(evento, em("2026-11-13T00:00:00-03:00"))).toBe("CONCLUIDO");
  });

  it("evento de 1 dia termina na meia-noite seguinte", () => {
    const umDia = { ...evento, duracaoDias: 1 };
    expect(getStatusReal(umDia, em("2026-11-10T23:59:59-03:00"))).toBe("FECHADO");
    expect(getStatusReal(umDia, em("2026-11-11T00:00:00-03:00"))).toBe("CONCLUIDO");
  });

  it("duração 0 é tratada como 1 dia", () => {
    const zero = { ...evento, duracaoDias: 0 };
    expect(getStatusReal(zero, em("2026-11-11T00:00:00-03:00"))).toBe("CONCLUIDO");
  });

  it("sem data de abertura nunca fica ABERTO (a abertura vira o próprio início)", () => {
    const semAbertura = { ...evento, dataAbertura: null };
    expect(getStatusReal(semAbertura, em("2026-11-09T23:59:59-03:00"))).toBe("AGUARDANDO");
    expect(getStatusReal(semAbertura, em("2026-11-10T00:00:00-03:00"))).toBe("FECHADO");
  });
});
