import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { COOKIE_SESSAO, criarToken, opcoesCookieSessao } from "@/lib/session";
import { LIMITES, estaBloqueado, limpar, mensagemLimite, registrarTentativa } from "@/lib/limite";
import { ipDoCliente } from "@/lib/ip";

// Hash descartável: gasta o mesmo tempo quando o usuário não existe,
// para não revelar quais usuários estão cadastrados.
const HASH_FALSO = bcrypt.hashSync("senha-invalida", 10);

function iguaisEmTempoConstante(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

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

    const usuario = await prisma.usuario.findUnique({ where: { nome } });

    let senhaValida = false;
    if (!usuario) {
      await bcrypt.compare(senha, HASH_FALSO);
    } else if (usuario.primeiroAcesso) {
      // Senha provisória cadastrada à mão no banco (texto puro) ou já em hash.
      senhaValida =
        iguaisEmTempoConstante(senha, usuario.senha) ||
        (await bcrypt.compare(senha, usuario.senha));
    } else {
      senhaValida = await bcrypt.compare(senha, usuario.senha);
    }

    if (!usuario || !senhaValida) {
      await Promise.all([
        registrarTentativa(chaveIp, limiteIp.janelaSegundos),
        registrarTentativa(chaveUsuario, limiteUsuario.janelaSegundos),
      ]);
      // Mesma mensagem nos dois casos.
      return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
    }

    await limpar(chaveUsuario); // login certo zera as falhas desse usuário
    const token = await criarToken(usuario.nome, usuario.primeiroAcesso);

    const response = NextResponse.json(
      { message: "Login realizado com sucesso", primeiroAcesso: usuario.primeiroAcesso },
      { status: 200 }
    );
    response.cookies.set(COOKIE_SESSAO, token, opcoesCookieSessao());
    return response;
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
