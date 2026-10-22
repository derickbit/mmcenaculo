import type { NextConfig } from "next";

// O painel da coordenação não deve aparecer em buscadores. (Não usamos o robots.txt de propósito: ele anunciaria o endereço.)
const semBuscadores = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/painelmmc/:path*", headers: semBuscadores },
      { source: "/api/painelmmc/:path*", headers: semBuscadores },
    ];
  },
};

export default nextConfig;
