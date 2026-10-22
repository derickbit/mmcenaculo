// Botão de baixar a planilha: é só um link para a rota de exportação no servidor, que confere o login e monta o .xlsx.
// (Antes, a planilha era montada no navegador, e a página precisava carregar todos os dados só para isso.)
export default function BotaoExportar({ href }: { href: string }) {
  return (
    <a
      href={href}
      download
      className="bg-green-600 text-white font-bold px-4 py-2 rounded-lg shadow hover:bg-green-700 transition flex items-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
      </svg>
      Exportar Excel
    </a>
  );
}
