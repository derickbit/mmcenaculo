"use client";

import { FormEvent, useState } from "react";
import type { LinhaConvite, LinhaUsuario, Resultado } from "@/lib/usuarios";
import { desativar, gerarConvite, reativar, redefinirSenha, renomear, revogar, type ResultadoLink } from "./actions";

type LinkGerado = Extract<ResultadoLink, { ok: true }>;

const quando = (data: Date | string) =>
  new Date(data).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

const ROTULO_ESTADO: Record<LinhaConvite["estado"], { texto: string; classe: string }> = {
  VALIDO: { texto: "Pendente", classe: "bg-blue-100 text-blue-800" },
  USADO: { texto: "Usado", classe: "bg-green-100 text-green-800" },
  REVOGADO: { texto: "Revogado", classe: "bg-gray-100 text-gray-600" },
  EXPIRADO: { texto: "Vencido", classe: "bg-amber-100 text-amber-800" },
};

const botao = "text-xs font-bold px-3 py-1.5 rounded border transition";

export default function GerenciadorUsuarios({ usuarios, convites }: { usuarios: LinhaUsuario[]; convites: LinhaConvite[] }) {
  const [novoNome, setNovoNome] = useState("");
  const [erroConvite, setErroConvite] = useState("");
  const [link, setLink] = useState<LinkGerado | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [editando, setEditando] = useState<{ id: string; valor: string } | null>(null);
  const [erroLinha, setErroLinha] = useState<{ id: string; mensagem: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Roda uma ação do servidor; se a ação recusar, mostra o motivo na linha da conta.
  async function executar(id: string, acao: () => Promise<Resultado>): Promise<boolean> {
    setErroLinha(null);
    setOcupado(true);
    try {
      const r = await acao();
      if (!r.ok) setErroLinha({ id, mensagem: r.mensagem });
      return r.ok;
    } finally {
      setOcupado(false);
    }
  }

  async function aoGerarConvite(e: FormEvent) {
    e.preventDefault();
    setErroConvite("");
    setOcupado(true);
    try {
      const r = await gerarConvite(novoNome);
      if (r.ok) {
        setLink(r);
        setCopiado(false);
        setNovoNome("");
      } else {
        setErroConvite(r.mensagem);
      }
    } finally {
      setOcupado(false);
    }
  }

  async function aoRedefinirSenha(usuario: LinhaUsuario) {
    const ok = window.confirm(
      `Redefinir a senha de ${usuario.nome}?\n\nA senha atual deixa de funcionar AGORA e as sessões abertas dessa pessoa caem. ` +
        "Você receberá um link (válido por 48 horas) para mandar a ela escolher uma senha nova."
    );
    if (!ok) return;
    setErroLinha(null);
    setOcupado(true);
    try {
      const r = await redefinirSenha(usuario.id);
      if (r.ok) {
        setLink(r);
        setCopiado(false);
      } else {
        setErroLinha({ id: usuario.id, mensagem: r.mensagem });
      }
    } finally {
      setOcupado(false);
    }
  }

  async function aoDesativar(usuario: LinhaUsuario) {
    const ok = window.confirm(
      `Desativar o acesso de ${usuario.nome}?\n\nA pessoa não poderá mais entrar no painel, nem se já estiver logada. ` +
        "O histórico dela (as notas que escreveu) continua intacto, e você pode reativar depois."
    );
    if (ok) await executar(usuario.id, () => desativar(usuario.id));
  }

  async function aoSalvarNome() {
    if (!editando) return;
    const salvou = await executar(editando.id, () => renomear(editando.id, editando.valor));
    if (salvou) setEditando(null);
  }

  async function copiar(endereco: string) {
    try {
      await navigator.clipboard.writeText(endereco);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  const endereco = link ? `${window.location.origin}/convite/${link.codigo}` : "";

  return (
    <div className="space-y-10">
      {/* ---------- link gerado (aparece uma única vez) ---------- */}
      {link && (
        <section className="bg-green-50 border-2 border-green-300 rounded-xl p-6" aria-label="Link gerado">
          <h2 className="text-lg font-bold text-green-900">
            {link.tipo === "REDEFINICAO" ? `Link para ${link.usuario} escolher uma nova senha` : `Convite para ${link.usuario}`}
          </h2>
          <p className="text-sm text-green-900 mt-1">
            Copie e envie à pessoa (por exemplo, pelo WhatsApp). <strong>Este link aparece só agora</strong>, não fica guardado em lugar nenhum.
            Vale até {quando(link.expiraEm)} e só funciona uma vez.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input readOnly value={endereco} aria-label="Link" onFocus={(e) => e.currentTarget.select()} className="flex-1 p-3 border border-green-300 rounded bg-white text-sm" />
            <button type="button" onClick={() => copiar(endereco)} className="bg-green-700 text-white font-bold px-5 py-3 rounded hover:bg-green-800 transition">
              {copiado ? "Copiado!" : "Copiar"}
            </button>
            <button type="button" onClick={() => setLink(null)} className="border border-green-700 text-green-800 font-bold px-5 py-3 rounded hover:bg-green-100 transition">
              Fechar
            </button>
          </div>
        </section>
      )}

      {/* ---------- convidar ---------- */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Convidar uma pessoa</h2>
        <p className="text-sm text-gray-600 mt-1">
          Escolha o usuário que ela vai ter. Ao abrir o link, ela só define a senha. O convite vale 48 horas e cria uma conta de coordenação.
        </p>
        <form onSubmit={aoGerarConvite} className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-start">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-600 mb-1">Usuário</label>
            <input
              type="text"
              value={novoNome}
              onChange={(e) => {
                setNovoNome(e.target.value);
                setErroConvite("");
              }}
              maxLength={30}
              required
              placeholder="ex.: mateus"
              autoComplete="off"
              className="w-full p-2.5 border border-gray-300 rounded outline-none focus:ring-cenaculo-gold"
              aria-invalid={!!erroConvite}
            />
            {erroConvite && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {erroConvite}
              </p>
            )}
          </div>
          <button type="submit" disabled={ocupado} className="sm:mt-5 bg-cenaculo-blue text-white font-bold py-2.5 px-6 rounded hover:bg-[#1a1d7a] disabled:opacity-50 transition">
            Gerar convite
          </button>
        </form>
      </section>

      {/* ---------- contas ---------- */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-3">Contas</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full md:min-w-[760px] text-left block md:table">
            <thead className="bg-gray-50 text-gray-700 text-sm hidden md:table-header-group">
              <tr>
                <th className="p-4 font-bold">Usuário</th>
                <th className="p-4 font-bold">Cargo</th>
                <th className="p-4 font-bold">Situação</th>
                <th className="p-4 font-bold">Criada em</th>
                <th className="p-4 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 block md:table-row-group">
              {usuarios.map((u) => {
                const coordenacao = u.papel === "COORDENACAO";
                const emEdicao = editando?.id === u.id;
                return (
                  <tr key={u.id} className={`block md:table-row py-2 md:py-0 ${u.ativo ? "" : "bg-gray-50 text-gray-500"}`}>
                    <td className="block md:table-cell px-4 py-2 md:p-4 align-top font-bold">
                      {emEdicao ? (
                        <div className="flex gap-2">
                          <input
                            aria-label={`Novo nome de ${u.nome}`}
                            value={editando.valor}
                            onChange={(e) => setEditando({ id: u.id, valor: e.target.value })}
                            maxLength={30}
                            className="p-2 border border-gray-300 rounded text-sm font-normal"
                          />
                          <button type="button" onClick={aoSalvarNome} disabled={ocupado} className={`${botao} bg-cenaculo-blue text-white border-cenaculo-blue`}>
                            Salvar
                          </button>
                          <button type="button" onClick={() => { setEditando(null); setErroLinha(null); }} className={`${botao} border-gray-300 text-gray-700`}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        u.nome
                      )}
                      {erroLinha?.id === u.id && (
                        <p role="alert" className="mt-1 text-sm font-normal text-red-600">
                          {erroLinha.mensagem}
                        </p>
                      )}
                    </td>
                    <td className="block md:table-cell px-4 py-2 md:p-4 align-top text-sm">{coordenacao ? "Coordenação" : "Administrador"}</td>
                    <td className="block md:table-cell px-4 py-2 md:p-4 align-top">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.ativo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                        {u.ativo ? "Ativa" : "Desativada"}
                      </span>
                    </td>
                    <td className="block md:table-cell px-4 py-2 md:p-4 align-top text-sm">{quando(u.criadoEm)}</td>
                    <td className="block md:table-cell px-4 py-2 md:p-4 align-top">
                      {coordenacao ? (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={ocupado} onClick={() => { setErroLinha(null); setEditando({ id: u.id, valor: u.nome }); }} className={`${botao} border-gray-300 text-gray-700 hover:bg-gray-50`}>
                            Renomear
                          </button>
                          {u.ativo && (
                            <button type="button" disabled={ocupado} onClick={() => aoRedefinirSenha(u)} className={`${botao} border-blue-300 text-blue-700 hover:bg-blue-50`}>
                              Redefinir senha
                            </button>
                          )}
                          {u.ativo ? (
                            <button type="button" disabled={ocupado} onClick={() => aoDesativar(u)} className={`${botao} border-red-200 text-red-600 hover:bg-red-50`}>
                              Desativar
                            </button>
                          ) : (
                            <button type="button" disabled={ocupado} onClick={() => executar(u.id, () => reativar(u.id))} className={`${botao} border-green-300 text-green-700 hover:bg-green-50`}>
                              Reativar
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Conta protegida (administrador)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- convites ---------- */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-3">Convites e redefinições de senha</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full md:min-w-[760px] text-left block md:table">
            <thead className="bg-gray-50 text-gray-700 text-sm hidden md:table-header-group">
              <tr>
                <th className="p-4 font-bold">Usuário</th>
                <th className="p-4 font-bold">Tipo</th>
                <th className="p-4 font-bold">Situação</th>
                <th className="p-4 font-bold">Criado</th>
                <th className="p-4 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 block md:table-row-group">
              {convites.map((c) => (
                <tr key={c.id} className="block md:table-row py-2 md:py-0">
                  <td className="block md:table-cell px-4 py-2 md:p-4 align-top font-bold">{c.usuario}</td>
                  <td className="block md:table-cell px-4 py-2 md:p-4 align-top text-sm">{c.tipo === "REDEFINICAO" ? "Redefinição de senha" : "Nova conta"}</td>
                  <td className="block md:table-cell px-4 py-2 md:p-4 align-top">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${ROTULO_ESTADO[c.estado].classe}`}>{ROTULO_ESTADO[c.estado].texto}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      {c.estado === "VALIDO" && `vale até ${quando(c.expiraEm)}`}
                      {c.estado === "USADO" && c.usadoEm && `em ${quando(c.usadoEm)}${c.usadoPor ? ` por ${c.usadoPor}` : ""}`}
                      {c.estado === "REVOGADO" && c.revogadoEm && `em ${quando(c.revogadoEm)}`}
                      {c.estado === "EXPIRADO" && `venceu em ${quando(c.expiraEm)}`}
                    </div>
                  </td>
                  <td className="block md:table-cell px-4 py-2 md:p-4 align-top text-sm">
                    {quando(c.criadoEm)}
                    <div className="text-xs text-gray-500">por {c.criadoPor}</div>
                  </td>
                  <td className="block md:table-cell px-4 py-2 md:p-4 align-top">
                    {c.estado === "VALIDO" && (
                      <button type="button" disabled={ocupado} onClick={() => revogar(c.id)} className={`${botao} border-red-200 text-red-600 hover:bg-red-50`}>
                        Revogar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {convites.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Nenhum convite ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
