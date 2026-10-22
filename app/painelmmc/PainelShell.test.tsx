// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import PainelShell from "./PainelShell";

// O menu lateral do painel: o item "Usuários" só existe para o ADMIN.
const { rota } = vi.hoisted(() => ({ rota: { atual: "/painelmmc" } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => rota.atual,
}));

afterEach(() => {
  cleanup();
  rota.atual = "/painelmmc";
});

const abrir = (papel: string | null, nomeUsuario: string | null = "derick") =>
  render(
    <PainelShell papel={papel} nomeUsuario={nomeUsuario}>
      <p>conteúdo da página</p>
    </PainelShell>
  );

describe("menu do painel", () => {
  it("o administrador vê o item Usuários, apontando para a página de gestão", () => {
    abrir("ADMIN");
    const link = screen.getByRole("link", { name: "Usuários" });
    expect(link.getAttribute("href")).toBe("/painelmmc/usuarios");
  });

  it("a coordenação NÃO vê o item Usuários, mas vê o resto do menu", () => {
    abrir("COORDENACAO");
    expect(screen.queryByRole("link", { name: "Usuários" })).toBeNull();
    for (const item of ["Gerenciar Eventos", "Inscrições", "Inscrições Kids", "Lista de Espera", "Galeria de Fotos", "Frequência e Presença"]) {
      expect(screen.getByRole("link", { name: item })).toBeTruthy();
    }
  });

  it("mostra quem está logado e o cargo", () => {
    abrir("ADMIN", "derick");
    expect(screen.getByText("derick · Administrador")).toBeTruthy();
    cleanup();
    abrir("COORDENACAO", "ana");
    expect(screen.getByText("ana · Coordenação")).toBeTruthy();
  });

  it("sem sessão (papel nulo), também não há item Usuários", () => {
    abrir(null, null);
    expect(screen.queryByRole("link", { name: "Usuários" })).toBeNull();
  });

  it("o item Usuários fica destacado quando a página está aberta", () => {
    rota.atual = "/painelmmc/usuarios";
    abrir("ADMIN");
    expect(screen.getByRole("link", { name: "Usuários" }).className).toContain("bg-cenaculo-gold");
  });

  it("na tela de login não há menu: só o conteúdo", () => {
    rota.atual = "/painelmmc/login";
    abrir("ADMIN");
    expect(screen.getByText("conteúdo da página")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Usuários" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Sair do Sistema/ })).toBeNull();
  });
});
