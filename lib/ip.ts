// IP do visitante, a partir dos cabeçalhos da requisição.
// Na Vercel, o x-forwarded-for é preenchido pela própria Vercel (o visitante não consegue forjá-lo).
// Sem proxy (ex.: no seu computador) pode vir vazio; nesse caso usamos "desconhecido".
export function ipDoCliente(cabecalhos: { get(nome: string): string | null }): string {
  const encaminhado = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = encaminhado || cabecalhos.get("x-real-ip")?.trim() || "desconhecido";
  return ip.slice(0, 64);
}
