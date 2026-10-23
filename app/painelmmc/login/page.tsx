import { redirect } from "next/navigation";
import { lerSessao } from "@/lib/auth";
import FormLogin from "./FormLogin";

export const revalidate = 0;

export default async function LoginPage() {
  // Quem já está logado não precisa ver o login: vai direto para o painel.
  if (await lerSessao()) redirect("/painelmmc");
  return <FormLogin />;
}
