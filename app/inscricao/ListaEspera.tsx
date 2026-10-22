"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CAMPO_ABERTURA } from "@/lib/honeypot";
import { mascararTelefone, telefoneValido } from "@/lib/telefone";
import { salvarPreCadastro } from "./actions";
import { CampoIsca, useAberturaDoFormulario } from "./antiRobo";

const campo = "mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold outline-none";

// Lista de espera: aparece quando não há evento aberto.
export default function ListaEspera() {
  const [estado, enviar] = useActionState(salvarPreCadastro, null);
  const abertura = useAberturaDoFormulario();

  // Campos controlados: o que a pessoa digitou fica na tela mesmo quando há um aviso para corrigir.
  const [tipo, setTipo] = useState("CENACULO");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erroTelefone, setErroTelefone] = useState("");

  if (estado?.status === "ok") {
    return (
      <div className="text-center py-6">
        <h2 className="text-3xl font-extrabold text-cenaculo-blue mb-4">Interesse Registrado!</h2>
        <p className="text-gray-600 mb-8">
          Obrigado! Entraremos em contato por e-mail ou WhatsApp assim que abrirmos as vagas para o próximo retiro.
        </p>
        <Link href="/" className="bg-cenaculo-blue text-white font-bold py-3 px-8 rounded-full hover:bg-[#1a1d7a] transition">
          Voltar ao Início
        </Link>
      </div>
    );
  }

  const erros = estado?.erros ?? {};
  const erro = (nomeDoCampo: string, local = "") => {
    const texto = local || erros[nomeDoCampo];
    return texto ? (
      <p role="alert" className="mt-1 text-sm text-red-600">
        {texto}
      </p>
    ) : null;
  };

  // Confere o telefone antes de enviar: a pessoa corrige só o campo errado.
  function aoEnviar(dados: FormData) {
    if (!telefoneValido(telefone)) {
      setErroTelefone("Telefone inválido. Use DDD + número.");
      return;
    }
    dados.set(CAMPO_ABERTURA, String(abertura.current)); // momento em que o formulário foi aberto (anti-robô)
    enviar(dados);
  }

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-800">
          Próximos <span className="text-cenaculo-blue">Retiros</span>
        </h2>
        <p className="text-gray-600 mt-3 text-sm md:text-base">
          No momento as inscrições oficiais estão fechadas. Deixe seu contato abaixo na nossa <strong>Lista de Espera</strong> para ser avisado em primeira mão assim que abrirmos as próximas inscrições!
        </p>
      </div>

      {estado?.status === "erro" && estado.mensagem && Object.keys(estado.erros).length === 0 && (
        <div role="alert" className="mb-4 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {estado.mensagem}
        </div>
      )}

      <form action={aoEnviar} className="space-y-4">
        <CampoIsca />
        <div>
          <label className="block text-sm font-medium text-gray-700">Qual retiro você tem interesse?</label>
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${campo} bg-white`}>
            <option value="CENACULO">Cenáculo (Tradicional)</option>
            <option value="KIDS">Cenáculo Kids</option>
            <option value="CENACULAO">Cenaculão</option>
          </select>
          {erro("tipo")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
          <input type="text" name="nome" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} className={campo} />
          {erro("nome")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">E-mail</label>
          <input type="email" name="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
          {erro("email")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
          <input
            type="text"
            name="telefone"
            required
            inputMode="tel"
            value={telefone}
            onChange={(e) => {
              setTelefone(mascararTelefone(e.target.value));
              setErroTelefone("");
            }}
            placeholder="(00) 00000-0000"
            className={campo}
            aria-invalid={!!(erroTelefone || erros.telefone)}
          />
          {erro("telefone", erroTelefone)}
        </div>
        <button type="submit" className="w-full bg-cenaculo-blue text-white font-bold py-3.5 rounded-md hover:bg-[#1a1d7a] transition shadow-md mt-2">
          Quero ser Avisado!
        </button>
      </form>

      <div className="text-center mt-6">
        <Link href="/" className="text-xs text-gray-400 hover:text-cenaculo-gold transition">Voltar para a página inicial</Link>
      </div>
    </>
  );
}
