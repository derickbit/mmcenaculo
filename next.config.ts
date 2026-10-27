import type { NextConfig } from "next";

// O painel da coordenação não deve aparecer em buscadores. (Não usamos o robots.txt de propósito: ele anunciaria o endereço.)
const semBuscadores = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

// Política de conteúdo (CSP): o navegador só carrega scripts, imagens, estilos e conexões do próprio site e do Cloudinary
// (galeria e envio de fotos, que a coordenação usa no painel). Ninguém consegue embutir o site em outra página (frame-ancestors),
// e um script de fora injetado por algum erro nosso não carrega. 'unsafe-inline' é necessário porque o Next injeta pequenos scripts
// e estilos na própria página; um passo a mais (nonce por requisição) tornaria isso mais rígido, mas exigiria mudar todas as páginas.
// Só vale na versão de produção: o servidor de desenvolvimento do Next precisa de 'unsafe-eval'.
const cloudinary = "https://*.cloudinary.com";
const politicaDeConteudo = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${cloudinary}`,
  `style-src 'self' 'unsafe-inline' ${cloudinary}`,
  `img-src 'self' data: blob: ${cloudinary}`,
  `font-src 'self' data: ${cloudinary}`,
  `connect-src 'self' ${cloudinary}`,
  `frame-src ${cloudinary}`,
  `media-src 'self' ${cloudinary}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const seguranca = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), payment=(), usb=()" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: politicaDeConteudo }] : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: seguranca },
      { source: "/painelmmc/:path*", headers: semBuscadores },
      { source: "/api/painelmmc/:path*", headers: semBuscadores },
    ];
  },
};

export default nextConfig;
