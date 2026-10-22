import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "@prisma/client";

// Estes testes usam um banco de verdade (DATABASE_URL_TESTE). Sem a variável, são pulados.
const urlTeste = process.env.DATABASE_URL_TESTE;

if (urlTeste && !new URL(urlTeste).pathname.slice(1).endsWith("_test")) {
  // Trava de segurança: nunca rodar testes em um banco que não seja de testes.
  throw new Error("DATABASE_URL_TESTE precisa apontar para um banco cujo nome termina em _test.");
}

describe.skipIf(!urlTeste)("gestão de contas (banco de testes)", () => {
  const sufixo = Date.now().toString(36);
  let prisma: PrismaClient;
  let usuarios: typeof import("./usuarios");
  let convites: typeof import("./convite");
  let adminId: string;
  let n = 0;
  const nome = () => `g${sufixo}x${++n}`;

  const novaConta = (extra: { nome?: string; papel?: string; ativo?: boolean } = {}) =>
    prisma.usuario.create({ data: { nome: extra.nome ?? nome(), senha: "hash-qualquer", papel: extra.papel ?? "COORDENACAO", ativo: extra.ativo ?? true } });

  beforeAll(async () => {
    // O lib/prisma lê DATABASE_URL ao ser importado, então apontamos para o banco de testes antes.
    process.env.DATABASE_URL = urlTeste;
    prisma = (await import("@/lib/prisma")).default;
    usuarios = await import("./usuarios");
    convites = await import("./convite");
    adminId = (await novaConta({ nome: `admin-g${sufixo}`, papel: "ADMIN" })).id;
  });

  afterAll(async () => {
    await prisma.convite.deleteMany({ where: { criadoPorId: adminId } });
    await prisma.usuario.deleteMany({ where: { nome: { startsWith: `g${sufixo}`, mode: "insensitive" } } });
    await prisma.usuario.deleteMany({ where: { nome: { startsWith: `novo-g${sufixo}`, mode: "insensitive" } } });
    await prisma.usuario.delete({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  describe("renomear", () => {
    it("troca o nome, e as notas antigas passam a mostrar o nome novo (o histórico fica intacto)", async () => {
      const conta = await novaConta();
      const evento = await prisma.evento.create({ data: { nome: `Evento ${sufixo}`, tipo: "CENACULO", dataInicio: new Date() } });
      try {
        const inscricao = await prisma.inscricao.create({
          data: { nomeCompleto: "Maria", email: `g${sufixo}@teste.com`, cidade: "Pelotas", telefone: "53999999999", dataNascimento: new Date("1990-01-01"), eventoId: evento.id },
        });
        await prisma.observacao.create({ data: { texto: "nota antiga", inscricaoId: inscricao.id, usuarioId: conta.id } });

        const novoNome = `novo-g${sufixo}-${n}`;
        expect(await usuarios.renomearUsuario(conta.id, novoNome)).toEqual({ ok: true });

        const nota = await prisma.observacao.findFirstOrThrow({ where: { usuarioId: conta.id }, include: { usuario: { select: { nome: true } } } });
        expect(nota.texto).toBe("nota antiga"); // a nota continua lá
        expect(nota.usuario.nome).toBe(novoNome); // com o nome novo
      } finally {
        await prisma.evento.delete({ where: { id: evento.id } });
      }
    });

    it("recusa nome inválido", async () => {
      const conta = await novaConta();
      for (const ruim of ["ab", "com espaço", "joão", ""]) {
        const r = await usuarios.renomearUsuario(conta.id, ruim);
        expect(r.ok === false && r.motivo).toBe("NOME_INVALIDO");
      }
    });

    it("recusa nome de outra conta (sem diferenciar maiúsculas), mas aceita mudar só as maiúsculas da própria conta", async () => {
      const a = await novaConta();
      const b = await novaConta();
      const ocupado = await usuarios.renomearUsuario(b.id, a.nome.toUpperCase());
      expect(ocupado.ok === false && ocupado.motivo).toBe("NOME_EM_USO");

      expect((await usuarios.renomearUsuario(a.id, a.nome.toUpperCase())).ok).toBe(true); // a própria conta
    });

    it("recusa um nome reservado por um convite pendente de conta nova", async () => {
      const conta = await novaConta();
      const reservado = `g${sufixo}r${++n}`;
      const convite = await convites.criarConvite({ nomeUsuario: reservado, criadoPorId: adminId });
      expect(convite.ok).toBe(true);
      const r = await usuarios.renomearUsuario(conta.id, reservado);
      expect(r.ok === false && r.motivo).toBe("NOME_EM_USO");
    });

    it("não altera a conta de administrador nem uma conta que não existe", async () => {
      const doAdmin = await usuarios.renomearUsuario(adminId, `novo-g${sufixo}-adm`);
      expect(doAdmin.ok === false && doAdmin.motivo).toBe("NAO_PERMITIDO");
      expect((await prisma.usuario.findUniqueOrThrow({ where: { id: adminId } })).nome).toBe(`admin-g${sufixo}`);

      const inexistente = await usuarios.renomearUsuario("00000000-0000-0000-0000-000000000000", `novo-g${sufixo}-x`);
      expect(inexistente.ok === false && inexistente.motivo).toBe("CONTA_INEXISTENTE");
    });

    it("um link de redefinição pendente passa a mostrar o nome novo", async () => {
      const conta = await novaConta();
      const link = await convites.criarRedefinicao({ usuarioId: conta.id, criadoPorId: adminId });
      if (!link.ok) throw new Error(link.mensagem);

      const novoNome = `novo-g${sufixo}-${++n}`;
      await usuarios.renomearUsuario(conta.id, novoNome);

      const { convite } = await convites.consultarConvite(link.codigo);
      expect(convite?.nomeUsuario).toBe(novoNome);
    });
  });

  describe("desativar e reativar", () => {
    it("desativar: a conta deixa de entrar, as sessões caem e nada é apagado", async () => {
      const conta = await novaConta();
      const agora = new Date(Date.now() + 2_000);
      expect(await usuarios.desativarUsuario(conta.id, agora)).toEqual({ ok: true });

      const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: conta.id } });
      expect(depois.ativo).toBe(false);
      expect(depois.sessoesValidasDesde.getTime()).toBe(agora.getTime());
      expect(depois.nome).toBe(conta.nome); // continua existindo, com o mesmo nome
    });

    it("desativar revoga os links de redefinição pendentes dessa conta", async () => {
      const conta = await novaConta();
      const link = await convites.criarRedefinicao({ usuarioId: conta.id, criadoPorId: adminId });
      if (!link.ok) throw new Error(link.mensagem);

      await usuarios.desativarUsuario(conta.id);
      expect((await convites.consultarConvite(link.codigo)).estado).toBe("REVOGADO");
    });

    it("reativar devolve o acesso, mas as sessões de antes da desativação continuam mortas", async () => {
      const conta = await novaConta();
      const agora = new Date(Date.now() + 1_000);
      await usuarios.desativarUsuario(conta.id, agora);
      expect(await usuarios.reativarUsuario(conta.id)).toEqual({ ok: true });

      const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: conta.id } });
      expect(depois.ativo).toBe(true);
      expect(depois.sessoesValidasDesde.getTime()).toBe(agora.getTime()); // cookies anteriores seguem inválidos
    });

    it("não desativa nem reativa o administrador, nem conta que não existe", async () => {
      const desativar = await usuarios.desativarUsuario(adminId);
      expect(desativar.ok === false && desativar.motivo).toBe("NAO_PERMITIDO");
      expect((await prisma.usuario.findUniqueOrThrow({ where: { id: adminId } })).ativo).toBe(true);

      const reativar = await usuarios.reativarUsuario("00000000-0000-0000-0000-000000000000");
      expect(reativar.ok === false && reativar.motivo).toBe("CONTA_INEXISTENTE");
    });
  });

  describe("listas da tela", () => {
    it("listarUsuarios traz o admin primeiro e nunca devolve a senha", async () => {
      await novaConta({ nome: `g${sufixo}-lista-b` });
      await novaConta({ nome: `g${sufixo}-lista-a` });
      const lista = await usuarios.listarUsuarios();

      expect(lista[0].papel).toBe("ADMIN");
      const nossos = lista.filter((u) => u.nome.startsWith(`g${sufixo}-lista`)).map((u) => u.nome);
      expect(nossos).toEqual([`g${sufixo}-lista-a`, `g${sufixo}-lista-b`]); // por ordem alfabética
      for (const u of lista) expect(Object.keys(u).sort()).toEqual(["ativo", "criadoEm", "id", "nome", "papel"]);
    });

    it("listarConvites mostra o tipo, o estado, quem criou e quem usou", async () => {
      const novo = await convites.criarConvite({ nomeUsuario: `g${sufixo}c${++n}`, criadoPorId: adminId });
      if (!novo.ok) throw new Error(novo.mensagem);
      const usado = await convites.criarConvite({ nomeUsuario: `g${sufixo}c${++n}`, criadoPorId: adminId });
      if (!usado.ok) throw new Error(usado.mensagem);
      await convites.aceitarConvite(usado.codigo, "uma-senha-boa-123");

      const conta = await novaConta();
      const redefinicao = await convites.criarRedefinicao({ usuarioId: conta.id, criadoPorId: adminId });
      if (!redefinicao.ok) throw new Error(redefinicao.mensagem);

      const lista = await usuarios.listarConvites();
      const por = (id: string) => lista.find((l) => l.id === id)!;

      expect(por(novo.convite.id)).toMatchObject({ tipo: "NOVA_CONTA", estado: "VALIDO", criadoPor: `admin-g${sufixo}`, usadoPor: null });
      expect(por(usado.convite.id)).toMatchObject({ tipo: "NOVA_CONTA", estado: "USADO", usadoPor: usado.convite.nomeUsuario });
      expect(por(redefinicao.convite.id)).toMatchObject({ tipo: "REDEFINICAO", estado: "VALIDO", usuario: conta.nome });
      expect(JSON.stringify(lista)).not.toContain(novo.codigo); // o código do link nunca aparece na lista
    });
  });
});
