// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen, waitFor } from "@testing-library/react";
import FormularioConvite from "./FormularioConvite";
import ConvitePage from "./page";
import { aceitarConviteAction } from "./actions";
import { consultarConvite } from "@/lib/convite";

// Telas do convite "por fora": o formulário (digitar e enviar) e a página (o que aparece para cada tipo de link).
// A ação do servidor e a consulta ao banco são trocadas por versões simuladas.
vi.mock("./actions", () => ({ aceitarConviteAction: vi.fn() }));
vi.mock("@/lib/convite", () => ({ consultarConvite: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.mocked(aceitarConviteAction).mockReset();
  vi.mocked(consultarConvite).mockReset();
});

const campo = (container: HTMLElement, nome: string) => container.querySelector(`input[name="${nome}"]`) as HTMLInputElement;
const digitar = (container: HTMLElement, nome: string, valor: string) => fireEvent.change(campo(container, nome), { target: { value: valor } });
const enviar = (container: HTMLElement) => fireEvent.submit(container.querySelector("form") as HTMLFormElement);

describe("formulário do convite", () => {
  const abrir = () => render(<FormularioConvite codigo="abc123" nomeUsuario="mateus" />);

  it("mostra o usuário já preenchido, só para leitura", () => {
    const { container } = abrir();
    const usuario = campo(container, "usuario");
    expect(usuario.value).toBe("mateus");
    expect(usuario.readOnly).toBe(true);
  });

  it("senha curta: o aviso aparece ao lado do campo e nada é enviado", async () => {
    const { container } = abrir();
    digitar(container, "senha", "curta");
    digitar(container, "confirmacao", "curta");
    enviar(container);

    expect(await screen.findByText(/pelo menos 10 caracteres/)).toBeTruthy();
    expect(aceitarConviteAction).not.toHaveBeenCalled();
    expect(campo(container, "senha").value).toBe("curta"); // o que foi digitado continua lá
  });

  it("senhas diferentes: o aviso aparece ao lado do campo e nada é enviado", async () => {
    const { container } = abrir();
    digitar(container, "senha", "uma-senha-boa-123");
    digitar(container, "confirmacao", "outra-senha-boa-456");
    enviar(container);

    expect(await screen.findByText("As senhas não coincidem.")).toBeTruthy();
    expect(aceitarConviteAction).not.toHaveBeenCalled();
  });

  it("senha boa: envia o código do convite e a senha", async () => {
    vi.mocked(aceitarConviteAction).mockResolvedValue(null);
    const { container } = abrir();
    digitar(container, "senha", "uma-senha-boa-123");
    digitar(container, "confirmacao", "uma-senha-boa-123");
    enviar(container);

    await waitFor(() => expect(aceitarConviteAction).toHaveBeenCalledTimes(1));
    const dados = vi.mocked(aceitarConviteAction).mock.calls[0][1];
    expect(dados.get("codigo")).toBe("abc123");
    expect(dados.get("senha")).toBe("uma-senha-boa-123");
    expect(dados.get("confirmacao")).toBe("uma-senha-boa-123");
  });

  it("o aviso do servidor aparece sem apagar o que foi digitado", async () => {
    vi.mocked(aceitarConviteAction).mockResolvedValue({ mensagem: "Este convite é inválido ou expirou.", erros: {} });
    const { container } = abrir();
    digitar(container, "senha", "uma-senha-boa-123");
    digitar(container, "confirmacao", "uma-senha-boa-123");
    enviar(container);

    expect(await screen.findByText("Este convite é inválido ou expirou.")).toBeTruthy();
    expect(campo(container, "senha").value).toBe("uma-senha-boa-123");
  });
});

describe("página do convite", () => {
  const consulta = (estado: "VALIDO" | "INEXISTENTE" | "EXPIRADO" | "USADO" | "REVOGADO") =>
    vi.mocked(consultarConvite).mockResolvedValue({
      estado,
      convite: estado === "INEXISTENTE" ? null : ({ nomeUsuario: "mateus" } as never),
    });
  const abrirPagina = async () => render(await ConvitePage({ params: Promise.resolve({ codigo: "abc123" }) }));

  it("convite válido: mostra o formulário com o usuário escolhido pelo admin", async () => {
    consulta("VALIDO");
    const { container } = await abrirPagina();
    expect(campo(container, "usuario").value).toBe("mateus");
    expect(screen.queryByText(/inválido ou expirado/)).toBeNull();
  });

  it("link inválido, vencido, usado ou revogado: a MESMA mensagem, sem revelar o usuário", async () => {
    const textos = new Set<string>();
    for (const estado of ["INEXISTENTE", "EXPIRADO", "USADO", "REVOGADO"] as const) {
      consulta(estado);
      const { container, unmount } = await abrirPagina();
      textos.add(container.textContent ?? "");
      expect(container.textContent).toContain("Convite inválido ou expirado");
      expect(container.textContent).not.toContain("mateus");
      expect(container.querySelector("form")).toBeNull();
      unmount();
    }
    expect(textos.size).toBe(1); // idênticas: ninguém descobre se um código já existiu
  });
});
