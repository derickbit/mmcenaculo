"use client";

import { FormEvent, useMemo, useState } from "react";
import CamposAntiRobo from "./CamposAntiRobo";
import { FAIXA_KIDS, PARENTESCOS, PARENTESCO_ROTULOS, TEXTO_CONSENTIMENTO, foraDaFaixaKids } from "@/lib/kids";

const campo = "mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold outline-none";

export default function FormularioKids({
  eventoId,
  eventoNome,
  dataInicioEvento,
}: {
  eventoId: string;
  eventoNome: string;
  dataInicioEvento: string; // ISO; a faixa etária é conferida pela idade na data do evento
}) {
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});

  const [nascimento, setNascimento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [saudeComEquipe, setSaudeComEquipe] = useState(false);
  const [consentimento, setConsentimento] = useState(false);

  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    if (value.length > 10) value = `${value.slice(0, 10)}-${value.slice(10)}`;
    setTelefone(value);
  };

  const handleDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 2) value = `${value.slice(0, 2)}/${value.slice(2)}`;
    if (value.length > 5) value = `${value.slice(0, 5)}/${value.slice(5)}`;
    setNascimento(value);
  };

  // Aviso (não bloqueia): criança fora da faixa de 8 a 10 anos na data do evento.
  const foraDaFaixa = useMemo(() => {
    if (nascimento.length !== 10) return false;
    const [d, m, a] = nascimento.split("/").map(Number);
    const data = new Date(Date.UTC(a, m - 1, d));
    if (a < 1900 || data.getUTCDate() !== d || data.getUTCMonth() !== m - 1) return false;
    return foraDaFaixaKids(data, new Date(dataInicioEvento));
  }, [nascimento, dataInicioEvento]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErros({});
    setMensagem("");

    const partes = nascimento.split("/");
    if (partes.length !== 3 || partes[2].length !== 4) {
      setErros({ criancaNascimento: "Informe a data no formato DD/MM/AAAA." });
      return;
    }

    const form = new FormData(event.currentTarget);
    const texto = (nome: string) => String(form.get(nome) ?? "");

    // Monta o envio campo a campo: só segue o que está combinado (o servidor rejeita qualquer campo a mais).
    const dados = {
      eventoId,
      criancaNome: texto("criancaNome"),
      criancaNascimento: `${partes[2]}-${partes[1]}-${partes[0]}`,
      saudeComEquipe,
      ...(saudeComEquipe ? {} : { saudeObservacao: texto("saudeObservacao") }),
      responsavelNome: texto("responsavelNome"),
      responsavelTelefone: telefone,
      responsavelEmail: texto("responsavelEmail"),
      parentesco: texto("parentesco"),
      consentimento,
      website: texto("website"),
      abertoEm: texto("abertoEm"),
    };

    setLoading(true);
    try {
      const response = await fetch("/api/inscricao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      const resultado = await response.json().catch(() => ({}));

      if (response.ok) {
        setSucesso(true);
      } else {
        const campos: Record<string, string> = resultado.campos ?? {};
        setErros(campos);
        setMensagem(
          campos._geral ?? (Object.keys(campos).length > 0
            ? "Confira os campos destacados."
            : resultado.error || "Ops! Houve um erro ao salvar a inscrição.")
        );
      }
    } catch {
      setMensagem("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (sucesso) {
    return (
      <div className="bg-white p-8 sm:p-10 rounded-xl shadow-lg text-center max-w-xl mx-auto border-t-8 border-cenaculo-gold mt-12">
        <h2 className="text-3xl font-bold text-cenaculo-blue mb-4">Inscrição Confirmada!</h2>
        <p className="text-gray-600 mb-8">
          A vaga para o <strong>{eventoNome}</strong> foi reservada. A equipe entrará em contato com o responsável, se precisar.
        </p>
        <button onClick={() => (window.location.href = "/")} className="bg-cenaculo-blue text-white font-bold py-3 px-8 rounded-full">
          Voltar para o Início
        </button>
      </div>
    );
  }

  const erro = (nome: string) =>
    erros[nome] ? (
      <p role="alert" className="mt-1 text-sm text-red-600">
        {erros[nome]}
      </p>
    ) : null;

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-lg border-t-8 border-cenaculo-blue">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-cenaculo-blue">
          Inscreva a criança no <span className="text-cenaculo-gold">{eventoNome}</span>
        </h2>
        <p className="mt-3 text-gray-600">
          O Cenáculo Kids é para crianças de {FAIXA_KIDS.min} a {FAIXA_KIDS.max} anos. Para proteger a criança, pedimos apenas o
          mínimo necessário.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <CamposAntiRobo />
        {mensagem && (
          <div role="alert" className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {mensagem}
          </div>
        )}

        {/* ---------- CRIANÇA ---------- */}
        <section className="space-y-6">
          <h3 className="text-xl font-bold text-cenaculo-blue border-b border-gray-200 pb-2">Dados da criança</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Primeiro nome *</label>
              <input type="text" name="criancaNome" required maxLength={40} className={campo} aria-invalid={!!erros.criancaNome} />
              {erro("criancaNome")}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data de nascimento *</label>
              <input
                type="text"
                inputMode="numeric"
                value={nascimento}
                onChange={handleDate}
                placeholder="DD/MM/AAAA"
                required
                className={campo}
                aria-invalid={!!erros.criancaNascimento}
              />
              {erro("criancaNascimento")}
              {foraDaFaixa && (
                <p className="mt-1 text-sm text-amber-700">
                  A criança está fora da faixa de {FAIXA_KIDS.min} a {FAIXA_KIDS.max} anos. Você pode continuar: a equipe vai avaliar e
                  entrar em contato.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Alergia, restrição alimentar ou medicação <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              name="saudeObservacao"
              maxLength={300}
              disabled={saudeComEquipe}
              placeholder={saudeComEquipe ? "Será informado à equipe no dia do evento" : "Se houver, escreva qual"}
              className={`${campo} disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
            />
            {erro("saudeObservacao")}
            <button
              type="button"
              onClick={() => setSaudeComEquipe((atual) => !atual)}
              aria-pressed={saudeComEquipe}
              className={`mt-3 w-full sm:w-auto text-sm font-semibold px-4 py-2 rounded-md border transition ${
                saudeComEquipe
                  ? "bg-cenaculo-blue text-white border-cenaculo-blue"
                  : "bg-white text-cenaculo-blue border-cenaculo-blue hover:bg-blue-50"
              }`}
            >
              {saudeComEquipe ? "✓ Vou informar diretamente à equipe (clique para desfazer)" : "Prefiro informar diretamente à equipe no dia do evento"}
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Você não precisa registrar informações de saúde aqui. Se preferir, converse com a equipe no dia do evento.
            </p>
          </div>
        </section>

        {/* ---------- RESPONSÁVEL ---------- */}
        <section className="space-y-6">
          <h3 className="text-xl font-bold text-cenaculo-blue border-b border-gray-200 pb-2">Dados do responsável</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome completo *</label>
              <input type="text" name="responsavelNome" required maxLength={120} className={campo} aria-invalid={!!erros.responsavelNome} />
              {erro("responsavelNome")}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Parentesco *</label>
              <select name="parentesco" required defaultValue="" className={`${campo} bg-white`} aria-invalid={!!erros.parentesco}>
                <option value="" disabled>
                  Selecione...
                </option>
                {PARENTESCOS.map((p) => (
                  <option key={p} value={p}>
                    {PARENTESCO_ROTULOS[p]}
                  </option>
                ))}
              </select>
              {erro("parentesco")}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Telefone (WhatsApp) *</label>
              <input
                type="text"
                inputMode="tel"
                value={telefone}
                onChange={handlePhone}
                placeholder="(00) 00000-0000"
                required
                className={campo}
                aria-invalid={!!erros.responsavelTelefone}
              />
              {erro("responsavelTelefone")}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail *</label>
              <input type="email" name="responsavelEmail" required maxLength={254} className={campo} aria-invalid={!!erros.responsavelEmail} />
              {erro("responsavelEmail")}
            </div>
          </div>
        </section>

        {/* ---------- CONSENTIMENTO ---------- */}
        <section className="space-y-3">
          <label className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-md cursor-pointer">
            <input
              type="checkbox"
              checked={consentimento}
              onChange={(e) => setConsentimento(e.target.checked)}
              required
              className="mt-1 h-5 w-5 shrink-0"
            />
            <span className="text-sm text-gray-700">{TEXTO_CONSENTIMENTO}</span>
          </label>
          {erro("consentimento")}
        </section>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cenaculo-blue text-white font-bold py-4 px-8 rounded-md hover:bg-[#1a1d7a] disabled:opacity-50 shadow-md text-lg"
        >
          {loading ? "Enviando..." : "Enviar Inscrição"}
        </button>
      </form>
    </div>
  );
}
