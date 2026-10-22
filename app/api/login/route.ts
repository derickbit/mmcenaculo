import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { COOKIE_SESSAO, criarToken, opcoesCookieSessao } from "@/lib/session";
import { LIMITES, estaBloqueado, limpar, mensagemLimite, registrarTentativa } from "@/lib/limite";
import { ipDoCliente } from "@/lib/ip";

// Hash descartável: gasta o mesmo tempo quando o usuário não existe,
// para não revelar quais usuários estão cadastrados.
const HASH_FALSO = bcrypt.hashSync("senha-invalida", 10);

export async function POST(request: Request) {
  try {
    const { nome, senha } = await request.json();

    if (typeof nome !== "string" || typeof senha !== "string" || !nome || !senha) {
      return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
    }

    // Bloqueio temporário depois de várias senhas erradas, por IP e por nome digitado (exista ou não o usuário,
    // para não revelar quais usuários existem).
    const { loginFalhasIp: limiteIp, loginFalhasUsuario: limiteUsuario } = LIMITES;
    const chaveIp = `login:ip:${ipDoCliente(request.headers)}`;
    const chaveUsuario = `login:user:${nome.trim().toLowerCase().slice(0, 64)}`;
    const [porIp, porUsuario] = await Promise.all([
      estaBloqueado(chaveIp, limiteIp.maximo, limiteIp.janelaSegundos),
      estaBloqueado(chaveUsuario, limiteUsuario.maximo, limiteUsuario.janelaSegundos),
    ]);
    if (!porIp.permitido || !porUsuario.permitido) {
      const espera = Math.max(porIp.tentarEmSegundos, porUsuario.tentarEmSegundos);
      return NextResponse.json(
        { error: mensagemLimite(espera) },
        { status: 429, headers: { "Retry-After": String(espera) } }
      );
    }

    const usuario = await prisma.usuario.findFirst({ where: { nome: { equals: nome.trim(), mode: "insensitive" } } });

    let senhaValida = false;
    if (!usuario || !usuario.ativo) {
      // Conta que não existe ou desativada: gasta o mesmo tempo e dá a mesma resposta de senha errada.
      await bcrypt.compare(senha, HASH_FALSO);
    } else {
      senhaValida = await bcrypt.compare(senha, usuario.senha);
    }

    if (!usuario || !usuario.ativo || !senhaValida) {
      await Promise.all([
        registrarTentativa(chaveIp, limiteIp.janelaSegundos),
        registrarTentativa(chaveUsuario, limiteUsuario.janelaSegundos),
      ]);
      // Mesma mensagem nos dois casos.
      return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
    }

    await limpar(chaveUsuario); // login certo zera as falhas desse usuário
    const token = await criarToken(usuario.id);

    const response = NextResponse.json(
      { message: "Login realizado com sucesso" },
      { status: 200 }
    );
    response.cookies.set(COOKIE_SESSAO, token, opcoesCookieSessao());
    return response;
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
