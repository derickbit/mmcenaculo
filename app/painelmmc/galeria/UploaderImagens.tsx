"use client";

import { CldUploadWidget, type CloudinaryUploadWidgetResults } from "next-cloudinary";
import { useRouter } from "next/navigation";

export default function UploaderImagens({ 
  eventoId, 
  salvarNoBanco 
}: { 
  eventoId: string; 
  salvarNoBanco: (eventoId: string, url: string) => Promise<void>;
}) {
  const router = useRouter();

  return (
    <CldUploadWidget
      uploadPreset="cenaculo_preset"
      options={{ 
        multiple: true,
        maxFiles: 50,
        clientAllowedFormats: ["png", "jpeg", "jpg", "webp"],
        // 🔴 A MÁGICA DA COMPRESSÃO AQUI:
        maxImageWidth: 1280,   // Reduz fotos gigantes para tamanho HD antes de subir
        maxImageHeight: 1280,  // Mantém a proporção limitando a altura
        maxFileSize: 10000000, // Impede que tentem subir um arquivo maior que 10MB
      }}
      onSuccess={(result: CloudinaryUploadWidgetResults) => {
        // Quando a foto termina de subir, salva a URL segura no banco de dados
        if (typeof result.info !== "object") return;
        salvarNoBanco(eventoId, result.info.secure_url);
      }}
      onQueuesEnd={() => {
        // Atualiza a página quando todas as fotos da fila terminarem
        router.refresh();
      }}
    >
      {({ open }) => (
        <button 
          onClick={(e) => { e.preventDefault(); open(); }} 
          className="w-full bg-cenaculo-blue text-white font-bold py-3 px-4 rounded-lg hover:bg-[#1a1d7a] transition shadow-md flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Selecionar Fotos do PC
        </button>
      )}
    </CldUploadWidget>
  );
}