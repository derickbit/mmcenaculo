// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen, waitFor, within } from "@testing-library/react";
import GerenciadorUsuarios from "./GerenciadorUsuarios";
import * as acoes from "./actions";
import type { LinhaConvite, LinhaUsuario } from "@/lib/usuarios";

// A tela de usuários "por fora". As ações do servidor são trocadas por versões simuladas: aqui interessa o que a tela mostra,
// pergunta e envia. (Que as ações só funcionam para o ADMIN é testado em actions.test.ts.)
vi.mock("./actions", () => ({
  gerarConvite: vi.fn(),
  redefinirSenha: vi.fn(),
  revogar: vi.fn(),
  renomear: vi.fn(),
  desativar: vi.fn(),
  reativar: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  for (const acao of Object.values(acoes)) if (typeof acao === "function" && "mockReset" in acao) (acao as ReturnType<typeof vi.fn>).mockReset();
});

const data = (iso: string) => new Date(iso);
const usuarios: LinhaUsuario[] = [
  { id: "u-admin", nome: "derick", papel: "ADMIN", ativo: true, criadoEm: data("2026-08-18T03:33:20Z") },
  { id: "u-ana", nome: "ana", papel: "COORDENACAO", ativo: true, criadoEm: data("2026-10-01T12:00:00Z") },
  { id: "u-davi", nome: "davi", papel: "COORDENACAO", ativo: false, criadoEm: data("2026-10-02T12:00:00Z") },
];
const convite = (extra: Partial<LinhaConvite>): LinhaConvite => ({
  id: "c1", usuario: "mateus", tipo: "NOVA_CONTA", estado: "VALIDO", criadoEm: data("2026-10-20T12:00:00Z"),
  expiraEm: data("2026-10-22T12:00:00Z"), usadoEm: null, revogadoEm: null, criadoPor: "derick", usadoPor: null, ...extra,
});

const abrir = (convites: LinhaConvite[] = []) => render(<GerenciadorUsuarios usuarios={usuarios} convites={convites} />);
const linhaDe = (nome: string) => screen.getByText(nome, { selector: "td" }).closest("tr") as HTMLElement;
const sucesso = { ok: true as const };

describe("contas", () => {
  it("a conta de administrador aparece protegida, sem nenhum botão; as de coordenação têm os botões", () => {
    abrir();
    const admin = within(linhaDe("derick"));
    expect(admin.getByText("Conta protegida (administrador)")).toBeTruthy();
    expect(admin.queryAllByRole("button")).toHaveLength(0);

    const ana = within(linhaDe("ana"));
    for (const botao of ["Renomear", "Redefinir senha", "Desativar"]) expect(ana.getByRole("button", { name: botao })).toBeTruthy();
  });

  it("conta desativada oferece Reativar (e não Redefinir senha nem Desativar)", () => {
    abrir();
    const davi = within(linhaDe("davi"));
    expect(davi.getByText("Desativada")).toBeTruthy();
    expect(davi.getByRole("button", { name: "Reativar" })).toBeTruthy();
    expect(davi.queryByRole("button", { name: "Redefinir senha" })).toBeNull();
    expect(davi.queryByRole("button", { name: "Desativar" })).toBeNull();
  });
});

describe("convidar", () => {
  const gerar = async (nome: string) => {
    fireEvent.change(screen.getByPlaceholderText("ex.: mateus"), { target: { value: nome } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar convite" }));
  };

  it("mostra o link uma vez, com o endereço do site, e o aviso de que só aparece agora", async () => {
    vi.mocked(acoes.gerarConvite).mockResolvedValue({ ok: true, codigo: "CODIGO-DO-LINK", usuario: "mateus", expiraEm: "2026-10-24T15:00:00.000Z", tipo: "NOVA_CONTA" });
    abrir();
    await gerar("mateus");

    expect(await screen.findByText("Convite para mateus")).toBeTruthy();
    expect((screen.getByLabelText("Link") as HTMLInputElement).value).toBe(`${window.location.origin}/convite/CODIGO-DO-LINK`);
    expect(screen.getByText(/aparece só agora/)).toBeTruthy();
    expect(acoes.gerarConvite).toHaveBeenCalledWith("mateus");
    expect((screen.getByPlaceholderText("ex.: mateus") as HTMLInputElement).value).toBe(""); // campo limpo

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByLabelText("Link")).toBeNull(); // fechou: o link some
  });

  it("copiar manda o link para a área de transferência", async () => {
    vi.mocked(acoes.gerarConvite).mockResolvedValue({ ok: true, codigo: "ABC", usuario: "mateus", expiraEm: "2026-10-24T15:00:00.000Z", tipo: "NOVA_CONTA" });
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText: escrever }, configurable: true });
    abrir();
    await gerar("mateus");

    fireEvent.click(await screen.findByRole("button", { name: "Copiar" }));
    await waitFor(() => expect(escrever).toHaveBeenCalledWith(`${window.location.origin}/convite/ABC`));
    expect(await screen.findByRole("button", { name: "Copiado!" })).toBeTruthy();
  });

  it("erro (por exemplo, usuário já existe) aparece ao lado do campo, sem apagar o que foi digitado", async () => {
    vi.mocked(acoes.gerarConvite).mockResolvedValue({ ok: false, mensagem: "Já existe um usuário com esse nome." });
    abrir();
    await gerar("ana");

    expect(await screen.findByText("Já existe um usuário com esse nome.")).toBeTruthy();
    expect((screen.getByPlaceholderText("ex.: mateus") as HTMLInputElement).value).toBe("ana");
    expect(screen.queryByLabelText("Link")).toBeNull();
  });
});

describe("redefinir senha", () => {
  it("pergunta antes, avisando que a senha atual deixa de valer; ao confirmar, mostra o link", async () => {
    vi.mocked(acoes.redefinirSenha).mockResolvedValue({ ok: true, codigo: "RESET1", usuario: "ana", expiraEm: "2026-10-24T15:00:00.000Z", tipo: "REDEFINICAO" });
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    abrir();

    fireEvent.click(within(linhaDe("ana")).getByRole("button", { name: "Redefinir senha" }));

    expect(await screen.findByText("Link para ana escolher uma nova senha")).toBeTruthy();
    expect(confirmar.mock.calls[0][0]).toMatch(/deixa de funcionar AGORA/);
    expect(acoes.redefinirSenha).toHaveBeenCalledWith("u-ana");
    expect((screen.getByLabelText("Link") as HTMLInputElement).value).toContain("/convite/RESET1");
  });

  it("se a pessoa cancelar a pergunta, nada acontece", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    abrir();
    fireEvent.click(within(linhaDe("ana")).getByRole("button", { name: "Redefinir senha" }));
    expect(acoes.redefinirSenha).not.toHaveBeenCalled();
  });
});

describe("desativar e reativar", () => {
  it("desativar pergunta, explicando que o histórico fica intacto, e só então age", async () => {
    vi.mocked(acoes.desativar).mockResolvedValue(sucesso);
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    abrir();

    fireEvent.click(within(linhaDe("ana")).getByRole("button", { name: "Desativar" }));

    await waitFor(() => expect(acoes.desativar).toHaveBeenCalledWith("u-ana"));
    expect(confirmar.mock.calls[0][0]).toMatch(/histórico dela.*intacto/);
  });

  it("cancelar a pergunta não desativa", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    abrir();
    fireEvent.click(within(linhaDe("ana")).getByRole("button", { name: "Desativar" }));
    expect(acoes.desativar).not.toHaveBeenCalled();
  });

  it("reativar age direto", async () => {
    vi.mocked(acoes.reativar).mockResolvedValue(sucesso);
    abrir();
    fireEvent.click(within(linhaDe("davi")).getByRole("button", { name: "Reativar" }));
    await waitFor(() => expect(acoes.reativar).toHaveBeenCalledWith("u-davi"));
  });
});

describe("renomear", () => {
  it("abre um campo com o nome atual, envia o novo e fecha", async () => {
    vi.mocked(acoes.renomear).mockResolvedValue(sucesso);
    abrir();

    fireEvent.click(within(linhaDe("ana")).getByRole("button", { name: "Renomear" }));
    const campo = screen.getByLabelText("Novo nome de ana") as HTMLInputElement;
    expect(campo.value).toBe("ana");

    fireEvent.change(campo, { target: { value: "ana.silva" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(acoes.renomear).toHaveBeenCalledWith("u-ana", "ana.silva"));
    await waitFor(() => expect(screen.queryByLabelText("Novo nome de ana")).toBeNull());
  });

  it("se o servidor recusar, o motivo aparece na linha e o campo continua aberto com o que foi digitado", async () => {
    vi.mocked(acoes.renomear).mockResolvedValue({ ok: false, motivo: "NOME_EM_USO", mensagem: "Já existe um usuário com esse nome." });
    abrir();

    fireEvent.click(within(linhaDe("ana")).getByRole("button", { name: "Renomear" }));
    fireEvent.change(screen.getByLabelText("Novo nome de ana"), { target: { value: "davi" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Já existe um usuário com esse nome.")).toBeTruthy();
    expect((screen.getByLabelText("Novo nome de ana") as HTMLInputElement).value).toBe("davi");
  });

  it("cancelar fecha sem enviar", () => {
    abrir();
    fireEvent.click(within(linhaDe("ana")).getByRole("button", { name: "Renomear" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByLabelText("Novo nome de ana")).toBeNull();
    expect(acoes.renomear).not.toHaveBeenCalled();
  });
});

describe("convites", () => {
  it("mostra o tipo, a situação e quem usou; só o pendente tem Revogar", () => {
    abrir([
      convite({ id: "c-pendente", usuario: "mateus" }),
      convite({ id: "c-usado", usuario: "joana", estado: "USADO", usadoEm: data("2026-10-21T10:00:00Z"), usadoPor: "joana" }),
      convite({ id: "c-reset", usuario: "ana", tipo: "REDEFINICAO", estado: "REVOGADO", revogadoEm: data("2026-10-21T11:00:00Z") }),
      convite({ id: "c-venceu", usuario: "pedro", estado: "EXPIRADO" }),
    ]);

    expect(screen.getAllByText("Pendente").length).toBeGreaterThan(0);
    expect(screen.getByText("Usado")).toBeTruthy();
    expect(screen.getByText("Revogado")).toBeTruthy();
    expect(screen.getByText("Vencido")).toBeTruthy();
    expect(screen.getByText("Redefinição de senha")).toBeTruthy();
    expect(screen.getByText(/por joana/)).toBeTruthy();

    expect(screen.getAllByRole("button", { name: "Revogar" })).toHaveLength(1); // só o pendente
  });

  it("revogar chama a ação com o convite certo", async () => {
    vi.mocked(acoes.revogar).mockResolvedValue(sucesso);
    abrir([convite({ id: "c-pendente" })]);
    fireEvent.click(screen.getByRole("button", { name: "Revogar" }));
    await waitFor(() => expect(acoes.revogar).toHaveBeenCalledWith("c-pendente"));
  });

  it("avisa quando não há nenhum convite", () => {
    abrir([]);
    expect(screen.getByText("Nenhum convite ainda.")).toBeTruthy();
  });
});
