"use client";

import { useState } from "react";
import { CldUploadWidget, type CloudinaryUploadWidgetResults } from "next-cloudinary";

export default function FormNovoEvento({ criarEventoAction }: { criarEventoAction: (formData: FormData) => void }) {
  const [imagemCapa, setImagemCapa] = useState("");

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Abrir Novo Evento (Com Automação)</h2>
      
      <form action={criarEventoAction} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* URL Invisível do Cloudinary */}
        <input type="hidden" name="imagemCapa" value={imagemCapa} />

        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-600 mb-1">Nome do Evento</label>
          <input type="text" name="nome" required placeholder="Ex: 83º Cenáculo" className="w-full p-2.5 border border-gray-300 rounded focus:ring-cenaculo-gold outline-none" />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Tipo de Evento</label>
          <select name="tipo" className="w-full p-2.5 border border-gray-300 rounded focus:ring-cenaculo-gold bg-white outline-none">
            <option value="CENACULO">Cenáculo (Tradicional)</option>
            <option value="KIDS">Cenáculo Kids</option>
            <option value="CENACULAO">Cenaculão</option>
            <option value="FESTIVIDADE">Festividade / Missa</option>
            <option value="OUTRO">Outro Evento</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Duração do Evento</label>
          <select name="duracaoDias" className="w-full p-2.5 border border-gray-300 rounded focus:ring-cenaculo-gold bg-white outline-none">
            <option value="1">1 Dia (Kids / Missa)</option>
            <option value="2">2 Dias (Cenaculão)</option>
            <option value="3">3 Dias (Tradicional)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Abertura das Inscrições</label>
          <input type="datetime-local" name="dataAbertura" required className="w-full p-2.5 border border-gray-300 rounded focus:ring-cenaculo-gold outline-none" />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Início do Evento (Fecha Inscrição)</label>
          <input type="date" name="dataInicio" required className="w-full p-2.5 border border-gray-300 rounded focus:ring-cenaculo-gold outline-none" />
        </div>

        {/* UPLOAD DA CAPA COM CLOUDINARY */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-600 mb-1">Imagem de Capa (Opcional)</label>
          <CldUploadWidget
            uploadPreset="cenaculo_preset"
            options={{ maxFiles: 1, clientAllowedFormats: ["png", "jpeg", "jpg", "webp"] }}
            onSuccess={(result: CloudinaryUploadWidgetResults) => {
              if (typeof result.info === "object") setImagemCapa(result.info.secure_url);
            }}
          >
            {({ open }) => (
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => open()} className="bg-gray-100 text-gray-700 border border-gray-300 font-bold py-2.5 px-4 rounded hover:bg-gray-200 transition text-sm">
                  {imagemCapa ? "📸 Trocar Capa" : "📸 Fazer Upload"}
                </button>
                {imagemCapa && <span className="text-xs text-green-600 font-bold">✓ Imagem carregada</span>}
              </div>
            )}
          </CldUploadWidget>
        </div>

        <div className="md:col-span-4 mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <button type="submit" className="bg-cenaculo-blue text-white font-bold py-3 px-8 rounded-lg hover:bg-[#1a1d7a] transition shadow-md">
            + Cadastrar Evento
          </button>
        </div>
      </form>
    </div>
  );
}