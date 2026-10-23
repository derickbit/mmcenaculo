// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor, screen } from "@testing-library/react";
import Formulario from "./Formulario";
import FormularioKids from "./FormularioKids";
import ListaEspera from "./ListaEspera";
import { salvarPreCadastro } from "./actions";

// Testes dos formulários públicos "por fora": abrem o formulário, digitam como uma pessoa e conferem o que seria enviado
// e o que aparece na tela.

// A ação do servidor da lista de espera é trocada por uma simulada (aqui só interessa o que o formulário faz).
vi.mock("./actions", () => ({ salvarPreCadastro: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.mocked(salvarPreCadastro).mockReset();
});

function simularEnvio(resposta: { status: number; corpo: object } = { status: 201, corpo: { message: "ok" } }) {
  const chamada = vi.fn<(url: string, opcoes?: RequestInit) => Promise<Response>>(
    async () => new Response(JSON.stringify(resposta.corpo), { status: resposta.status })
  );
  vi.stubGlobal("fetch", chamada);
  return chamada;
}

const corpoDoEnvio = (chamada: ReturnType<typeof simularEnvio>) =>
  JSON.parse(String(chamada.mock.calls[0][1]?.body)) as Record<string, unknown>;

function digitar(container: HTMLElement, seletor: string, valor: string) {
  const campo = container.querySelector(seletor) as HTMLInputElement;
  fireEvent.change(campo, { target: { value: valor } });
}
const valorDe = (container: HTMLElement, seletor: string) => (container.querySelector(seletor) as HTMLInputElement).value;
const enviarFormulario = (container: HTMLElement) => fireEvent.submit(container.querySelector("form") as HTMLFormElement);

describe("formulário de adulto", () => {
  const preencher = (container: HTMLElement, telefone = "53999999999") => {
    digitar(container, 'input[name="nomeCompleto"]', "Maria da Silva");
    digitar(container, 'input[name="email"]', "maria@email.com");
    digitar(container, 'input[name="telefone"]', telefone);
    digitar(container, 'input[name="cidade"]', "Pelotas");
    digitar(container, 'input[placeholder="DD/MM/AAAA"]', "20051990");
    fireEvent.click(container.querySelector('input[name="consentimento"]') as HTMLInputElement);
  };
  const abrir = () => render(<Formulario eventoId="evento-1" eventoNome="Cenáculo" eventoTipo="CENACULO" />);

  it("envia o horário em que o formulário foi aberto, mesmo depois de a pessoa digitar nos campos", async () => {
    const chamada = simularEnvio();
    const { container } = abrir();

    preencher(container);
    enviarFormulario(container);

    await waitFor(() => expect(chamada).toHaveBeenCalledTimes(1));
    const corpo = corpoDoEnvio(chamada);
    expect(Number(corpo.abertoEm)).toBeGreaterThan(0); // sem isso, o servidor trata a pessoa como robô
    expect(Math.abs(Date.now() - Number(corpo.abertoEm))).toBeLessThan(60_000);
    expect(corpo.website ?? "").toBe(""); // o campo escondido continua vazio
    expect(corpo.dataNascimento).toBe("1990-05-20");
    expect(corpo.consentimento).toBe(true); // o aceite do termo vai junto
  });

  it("sem marcar o consentimento não envia, avisa ao lado da caixinha e mantém o que foi digitado", async () => {
    const chamada = simularEnvio();
    const { container } = abrir();

    preencher(container);
    fireEvent.click(container.querySelector('input[name="consentimento"]') as HTMLInputElement); // desmarca
    enviarFormulario(container);

    expect(await screen.findByText("É necessário concordar com o termo de consentimento.")).toBeTruthy();
    expect(chamada).not.toHaveBeenCalled();
    expect(valorDe(container, 'input[name="nomeCompleto"]')).toBe("Maria da Silva");
  });

  it("telefone inválido não é enviado: o aviso aparece ao lado do campo e o que foi digitado continua lá", async () => {
    const chamada = simularEnvio();
    const { container } = abrir();

    preencher(container, "123");
    enviarFormulario(container);

    expect(await screen.findByText("Telefone inválido. Use DDD + número.")).toBeTruthy();
    expect(chamada).not.toHaveBeenCalled();
    expect(valorDe(container, 'input[name="nomeCompleto"]')).toBe("Maria da Silva");
    expect(valorDe(container, 'input[name="email"]')).toBe("maria@email.com");
    expect(valorDe(container, 'input[name="cidade"]')).toBe("Pelotas");

    // corrigindo só o telefone, o aviso some e o envio passa
    digitar(container, 'input[name="telefone"]', "53999999999");
    expect(screen.queryByText("Telefone inválido. Use DDD + número.")).toBeNull();
    enviarFormulario(container);
    await waitFor(() => expect(chamada).toHaveBeenCalledTimes(1));
  });

  it("data de nascimento incompleta também só avisa no campo", async () => {
    const chamada = simularEnvio();
    const { container } = abrir();

    preencher(container);
    digitar(container, 'input[placeholder="DD/MM/AAAA"]', "2005");
    enviarFormulario(container);

    expect(await screen.findByText("Informe a data no formato DD/MM/AAAA.")).toBeTruthy();
    expect(chamada).not.toHaveBeenCalled();
    expect(valorDe(container, 'input[name="telefone"]')).toBe("(53) 99999-9999");
  });

  it("o aviso do servidor aparece ao lado do campo, sem apagar o que foi digitado", async () => {
    simularEnvio({
      status: 400,
      corpo: { error: "Confira os dados informados: E-mail inválido.", campos: { email: "E-mail inválido." } },
    });
    const { container } = abrir();

    preencher(container);
    enviarFormulario(container);

    expect(await screen.findByText("E-mail inválido.")).toBeTruthy();
    expect(valorDe(container, 'input[name="nomeCompleto"]')).toBe("Maria da Silva");
    expect(valorDe(container, 'input[name="cidade"]')).toBe("Pelotas");
  });

  it("formata o telefone enquanto digita, inclusive fixo", () => {
    const { container } = abrir();
    digitar(container, 'input[name="telefone"]', "5333334444");
    expect(valorDe(container, 'input[name="telefone"]')).toBe("(53) 3333-4444");
  });
});

describe("formulário Kids", () => {
  const abrir = () => render(<FormularioKids eventoId="evento-kids" eventoNome="Cenáculo Kids" dataInicioEvento="2026-11-10T03:00:00.000Z" />);
  const preencher = (container: HTMLElement, telefone = "53988887777") => {
    digitar(container, 'input[name="criancaNome"]', "Pedro");
    digitar(container, 'input[placeholder="DD/MM/AAAA"]', "10032017");
    digitar(container, 'input[name="responsavelNome"]', "Ana Souza");
    fireEvent.change(container.querySelector('select[name="parentesco"]') as HTMLSelectElement, { target: { value: "MAE" } });
    digitar(container, 'input[placeholder="(00) 00000-0000"]', telefone);
    digitar(container, 'input[name="responsavelEmail"]', "ana@email.com");
    fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLInputElement);
  };

  it("envia o horário de abertura e somente os campos combinados", async () => {
    const chamada = simularEnvio();
    const { container } = abrir();

    preencher(container);
    enviarFormulario(container);

    await waitFor(() => expect(chamada).toHaveBeenCalledTimes(1));
    const corpo = corpoDoEnvio(chamada);
    expect(Number(corpo.abertoEm)).toBeGreaterThan(0);
    expect(Object.keys(corpo).sort()).toEqual(
      [
        "abertoEm", "consentimento", "criancaNascimento", "criancaNome", "eventoId", "parentesco",
        "responsavelEmail", "responsavelNome", "responsavelTelefone", "saudeComEquipe", "saudeObservacao", "website",
      ].sort()
    );
    expect(corpo.consentimento).toBe(true);
    expect(corpo.criancaNascimento).toBe("2017-03-10");
  });

  it("telefone do responsável inválido não é enviado e o que foi digitado continua lá", async () => {
    const chamada = simularEnvio();
    const { container } = abrir();

    preencher(container, "123");
    enviarFormulario(container);

    expect(await screen.findByText("Telefone inválido. Use DDD + número.")).toBeTruthy();
    expect(chamada).not.toHaveBeenCalled();
    expect(valorDe(container, 'input[name="criancaNome"]')).toBe("Pedro");
    expect(valorDe(container, 'input[name="responsavelNome"]')).toBe("Ana Souza");
  });

  it("\"prefiro informar à equipe\" desabilita o texto de saúde e vai como aviso para a equipe", async () => {
    const chamada = simularEnvio();
    const { container } = abrir();

    preencher(container);
    fireEvent.click(screen.getByText("Prefiro informar diretamente à equipe no dia do evento"));
    expect((container.querySelector('input[name="saudeObservacao"]') as HTMLInputElement).disabled).toBe(true);

    enviarFormulario(container);
    await waitFor(() => expect(chamada).toHaveBeenCalledTimes(1));
    const corpo = corpoDoEnvio(chamada);
    expect(corpo.saudeComEquipe).toBe(true);
    expect(corpo).not.toHaveProperty("saudeObservacao");
  });
});

describe("lista de espera", () => {
  const abrir = () => render(<ListaEspera />);
  const preencher = (container: HTMLElement, telefone = "53999999999") => {
    digitar(container, 'input[name="nome"]', "Maria da Silva");
    digitar(container, 'input[name="email"]', "maria@email.com");
    digitar(container, 'input[name="telefone"]', telefone);
  };

  it("telefone inválido não é enviado: o aviso aparece ao lado do campo e o que foi digitado continua lá", async () => {
    const { container } = abrir();

    preencher(container, "123");
    enviarFormulario(container);

    expect(await screen.findByText("Telefone inválido. Use DDD + número.")).toBeTruthy();
    expect(salvarPreCadastro).not.toHaveBeenCalled();
    expect(valorDe(container, 'input[name="nome"]')).toBe("Maria da Silva");
    expect(valorDe(container, 'input[name="email"]')).toBe("maria@email.com");
  });

  it("envia os dados com o horário de abertura e mostra a confirmação", async () => {
    vi.mocked(salvarPreCadastro).mockResolvedValue({ status: "ok" });
    const { container } = abrir();

    preencher(container);
    enviarFormulario(container);

    await waitFor(() => expect(salvarPreCadastro).toHaveBeenCalledTimes(1));
    const dados = vi.mocked(salvarPreCadastro).mock.calls[0][1];
    expect(Number(dados.get("abertoEm"))).toBeGreaterThan(0);
    expect(dados.get("email")).toBe("maria@email.com");
    expect(await screen.findByText("Interesse Registrado!")).toBeTruthy();
  });

  it("o aviso do servidor aparece ao lado do campo, sem apagar o que foi digitado", async () => {
    vi.mocked(salvarPreCadastro).mockResolvedValue({
      status: "erro",
      mensagem: "Confira os campos destacados.",
      erros: { email: "E-mail inválido." },
    });
    const { container } = abrir();

    preencher(container);
    enviarFormulario(container);

    expect(await screen.findByText("E-mail inválido.")).toBeTruthy();
    expect(valorDe(container, 'input[name="nome"]')).toBe("Maria da Silva");
    expect(valorDe(container, 'input[name="telefone"]')).toBe("(53) 99999-9999");
  });
});
