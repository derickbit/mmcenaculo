import { lerSessao } from "@/lib/auth";
import PainelShell from "./PainelShell";

// Layout do painel (no servidor): lê quem está logado e entrega ao menu, que mostra "Usuários" só para o ADMIN.
// Na tela de login não há sessão, e o menu nem aparece.
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await lerSessao();
  return (
    <PainelShell papel={sessao?.papel ?? null} nomeUsuario={sessao?.nome ?? null}>
      {children}
    </PainelShell>
  );
}
