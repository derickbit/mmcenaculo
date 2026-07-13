"use client";

import { FormEvent, useState } from "react";
import { listaParoquias } from "@/lib/paroquias";

// Aqui está a correção: A função agora recebe as variáveis corretamente!
export default function Formulario({ 
  eventoId, 
  eventoNome, 
  eventoTipo 
}: { 
  eventoId: string, 
  eventoNome: string, 
  eventoTipo: string 
}) {
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [jaFezCenaculo, setJaFezCenaculo] = useState("Não");
  const [qualCenaculo, setQualCenaculo] = useState("");

  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = `(${value.slice(0,2)}) ${value.slice(2)}`;
    if (value.length > 10) value = `${value.slice(0,10)}-${value.slice(10)}`;
    setTelefone(value);
  };

  const handleDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 2) value = `${value.slice(0,2)}/${value.slice(2)}`;
    if (value.length > 5) value = `${value.slice(0,5)}/${value.slice(5)}`;
    setDataNascimento(value);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Injeta o ID do evento atual para o backend saber onde salvar
    data.eventoId = eventoId;
    
    if (jaFezCenaculo === "Sim") {
      data.jaFezCenaculo = `Fez o ${qualCenaculo}º`;
    } else {
      data.jaFezCenaculo = "Não fez";
    }

    const partesData = dataNascimento.split('/');
    if (partesData.length === 3) {
      data.dataNascimento = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;
    }

    try {
      const response = await fetch('/api/inscricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (response.ok) {
        setSucesso(true);
      } else {
        alert(result.error || "Ops! Houve um erro ao salvar sua inscrição.");
      }
    } catch (error) {
      alert("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (sucesso) {
    return (
      <div className="bg-white p-10 rounded-xl shadow-lg text-center max-w-lg mx-auto border-t-8 border-cenaculo-gold mt-12">
        <h2 className="text-3xl font-bold text-cenaculo-blue mb-4">Inscrição Confirmada!</h2>
        <p className="text-gray-600 mb-8">Sua vaga para o <strong>{eventoNome}</strong> foi reservada com sucesso.</p>
        <button onClick={() => window.location.href = '/'} className="bg-cenaculo-blue text-white font-bold py-3 px-8 rounded-full">
          Voltar para o Início
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg border-t-8 border-cenaculo-blue">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-cenaculo-blue">
          Inscreva-se no <span className="text-cenaculo-gold">{eventoNome}</span>
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome Completo *</label>
            <input type="text" name="nomeCompleto" required className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">E-mail *</label>
            <input type="email" name="email" required className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Instagram</label>
            <input type="text" name="instagram" placeholder="@seuusuario" className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone (WhatsApp) *</label>
            <input type="text" name="telefone" required value={telefone} onChange={handlePhone} placeholder="(00) 00000-0000" className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cidade *</label>
            <input type="text" name="cidade" required className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data de Nascimento *</label>
            <input type="text" value={dataNascimento} onChange={handleDate} placeholder="DD/MM/AAAA" required className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold" />
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        <div className="space-y-6">
          
          {/* Lógica condicional: Só pergunta se já fez cenáculo SE for um evento do tipo CENACULO */}
          {eventoTipo === "CENACULO" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Já fez Cenáculo?</label>
                <select value={jaFezCenaculo} onChange={(e) => setJaFezCenaculo(e.target.value)} className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold bg-white">
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </div>

              {jaFezCenaculo === "Sim" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Qual edição?</label>
                  <select value={qualCenaculo} onChange={(e) => setQualCenaculo(e.target.value)} required className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold bg-white">
                    <option value="">Selecione...</option>
                    {Array.from({ length: 81 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num}º Cenáculo</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

  <div>
  <label className="block text-sm font-medium text-gray-700">Paróquia Atuante</label>
  <select 
    name="paroquiaAtuante" 
    className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold bg-white outline-none"
  >
    <option value="">Selecione a sua paróquia...</option>
    {listaParoquias.map((paroquia) => (
      <option key={paroquia} value={paroquia}>
        {paroquia}
      </option>
    ))}
  </select>
</div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Problema de saúde? Se sim, qual?</label>
            <input type="text" name="problemaSaude" className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Usa medicação controlada? Se sim, qual?</label>
            <input type="text" name="medicacaoControlada" className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Possui restrição alimentar? Se sim, qual?</label>
            <input type="text" name="restricaoAlimentar" className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold" />
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Necessita de algum atendimento especial?</label>
            <select name="atendimentoEspecial" className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold bg-white">
              <option value="">Nenhum / Selecione</option>
              <option value="Baixa Visão">Baixa Visão</option>
              <option value="Baixa Audição">Baixa Audição</option>
              <option value="Dificuldade Motora">Dificuldade Motora</option>
              <option value="Outra">Outra</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Como conheceu o Cenáculo?</label>
            <select name="comoConheceu" className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:ring-cenaculo-gold bg-white">
              <option value="">Selecione</option>
              <option value="Comunidade/Paróquia">Comunidade/Paróquia</option>
              <option value="Internet/Redes Sociais">Internet/Redes Sociais</option>
              <option value="Folder/Cartaz">Folder/Cartaz</option>
              <option value="Outro Movimento">Outro Movimento</option>
              <option value="Alguém indicou">Alguém indicou</option>
            </select>
          </div>
        </div>

        <div className="pt-4">
          <button type="submit" disabled={loading} className="w-full bg-cenaculo-blue text-white font-bold py-4 px-8 rounded-md hover:bg-[#1a1d7a] disabled:opacity-50 shadow-md text-lg">
            {loading ? "Enviando..." : "Enviar Inscrição"}
          </button>
        </div>
      </form>
    </div>
  );
}