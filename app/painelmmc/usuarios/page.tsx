import { exigirAdminPagina } from "@/lib/auth";
import { listarConvites, listarUsuarios } from "@/lib/usuarios";
import GerenciadorUsuarios from "./GerenciadorUsuarios";

export const revalidate = 0;

export default async function UsuariosPage() {
  // Só o ADMIN vê esta página: a coordenação que digitar o endereço volta para o painel.
  await exigirAdminPagina();

  const [usuarios, convites] = await Promise.all([listarUsuarios(), listarConvites()]);

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-cenaculo-blue">Usuários do Painel</h1>
        <p className="text-gray-600 mt-2">
          Convide pessoas da coordenação, redefina senhas e desative acessos. Desativar não apaga nada: o histórico da pessoa continua intacto.
        </p>
      </div>

      <GerenciadorUsuarios usuarios={usuarios} convites={convites} />
    </div>
  );
}
