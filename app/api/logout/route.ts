import { NextResponse } from "next/server";
import { COOKIE_SESSAO } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ message: "Logout realizado" });
  response.cookies.delete(COOKIE_SESSAO);
  // Remove também os cookies do esquema antigo, caso ainda existam no navegador.
  response.cookies.delete("cenaculo-admin-token");
  response.cookies.delete("cenaculo-user-nome");
  return response;
}
