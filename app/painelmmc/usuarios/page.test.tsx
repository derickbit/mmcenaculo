// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import UsuariosPage from "./page";
import { exigirAdminPagina } from "@/lib/auth";
import { listarConvites, listarUsuarios } from "@/lib/usuarios";

// A página de gestão de contas: só o ADMIN a vê, e quem não é ADMIN nem chega a carregar a lista de usuários.
vi.mock("@/lib/auth", () => ({ exigirAdminPagina: vi.fn() }));
vi.mock("@/lib/usuarios", () => ({ listarUsuarios: vi.fn(), listarConvites: vi.fn() }));
vi.mock("./GerenciadorUsuarios", () => ({
  default: ({ usuarios, convites }: { usuarios: unknown[]; convites: unknown[] }) => (
    <p>gerenciador: {usuarios.length} contas e {convites.length} convites</p>
  ),
}));

afterEach(() => {
  cleanup();
  vi.mocked(exigirAdminPagina).mockReset();
  vi.mocked(listarUsuarios).mockReset();
  vi.mocked(listarConvites).mockReset();
});

describe("página /painelmmc/usuarios", () => {
  it("quem não é ADMIN é mandado embora e a lista de usuários nem é carregada", async () => {
    vi.mocked(exigirAdminPagina).mockRejectedValue(new Error("REDIRECT:/painelmmc"));

    await expect(UsuariosPage()).rejects.toThrow("REDIRECT:/painelmmc");
    expect(listarUsuarios).not.toHaveBeenCalled();
    expect(listarConvites).not.toHaveBeenCalled();
  });

  it("o ADMIN vê a página com as contas e os convites", async () => {
    vi.mocked(exigirAdminPagina).mockResolvedValue({ sub: "a", nome: "derick", papel: "ADMIN", pa: false });
    vi.mocked(listarUsuarios).mockResolvedValue([{ id: "1", nome: "derick", papel: "ADMIN", ativo: true, criadoEm: new Date() }]);
    vi.mocked(listarConvites).mockResolvedValue([]);

    render(await UsuariosPage());

    expect(screen.getByText("Usuários do Painel")).toBeTruthy();
    expect(screen.getByText("gerenciador: 1 contas e 0 convites")).toBeTruthy();
    expect(screen.getByText(/Desativar não apaga nada/)).toBeTruthy();
  });
});
