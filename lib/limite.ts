import prisma from "@/lib/prisma";

// Limitador de tentativas, guardado no Postgres (a memória do servidor não é compartilhada entre as execuções na Vercel).
// Cada "chave" (ex.: "inscricao:203.0.113.5") tem uma contagem numa janela de tempo fixa. Passou do máximo na janela, recusa.
// O relógio usado é o do banco, para todas as execuções concordarem.

export type ResultadoLimite = { permitido: boolean; tentarEmSegundos: number };

// Limites de cada ação (valores combinados; generosos de propósito, pois muita gente pode se inscrever do mesmo Wi-Fi).
export const LIMITES = {
  inscricao: { maximo: 10, janelaSegundos: 10 * 60 }, // por IP
  preCadastro: { maximo: 5, janelaSegundos: 10 * 60 }, // por IP
  convite: { maximo: 10, janelaSegundos: 15 * 60 }, // por IP (cada tentativa de criar conta pelo link)
  // Erros de senha no login. O teto por IP é maior que o de um usuário só: na coordenação todos usam o mesmo Wi-Fi, e
  // um usuário que erra a senha não deve travar os outros; mas um IP que tenta vários nomes ainda é bloqueado.
  loginFalhasUsuario: { maximo: 5, janelaSegundos: 15 * 60 },
  loginFalhasIp: { maximo: 10, janelaSegundos: 15 * 60 },
} as const;

export function mensagemLimite(tentarEmSegundos: number): string {
  const minutos = Math.max(1, Math.ceil(tentarEmSegundos / 60));
  return `Muitas tentativas. Tente novamente em ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`;
}

const UMA_CHANCE_EM_100 = 0.01;

// Soma 1 na chave (ou recomeça em 1 se a janela venceu), numa única operação atômica:
// envios simultâneos não conseguem furar o limite.
async function registrar(chave: string, janelaSegundos: number): Promise<{ contagem: number; decorrido: number }> {
  const [linha] = await prisma.$queryRaw<{ contagem: number; decorrido: number }[]>`
    INSERT INTO "LimiteTentativa" ("chave", "janelaInicio", "contagem")
    VALUES (${chave}, (now() AT TIME ZONE 'UTC'), 1)
    ON CONFLICT ("chave") DO UPDATE SET
      "contagem" = CASE
        WHEN "LimiteTentativa"."janelaInicio" <= (now() AT TIME ZONE 'UTC') - make_interval(secs => ${janelaSegundos}::double precision)
        THEN 1 ELSE "LimiteTentativa"."contagem" + 1 END,
      "janelaInicio" = CASE
        WHEN "LimiteTentativa"."janelaInicio" <= (now() AT TIME ZONE 'UTC') - make_interval(secs => ${janelaSegundos}::double precision)
        THEN (now() AT TIME ZONE 'UTC') ELSE "LimiteTentativa"."janelaInicio" END
    RETURNING "contagem", extract(epoch from ((now() AT TIME ZONE 'UTC') - "janelaInicio"))::float8 AS "decorrido"`;

  // De vez em quando, aproveita para apagar contagens antigas (as janelas são de minutos; guardamos um dia).
  if (Math.random() < UMA_CHANCE_EM_100) void limparVencidas().catch(() => {});

  return linha;
}

// Conta esta tentativa. Permitido enquanto a contagem na janela não passar de `maximo`.
export async function limitar(chave: string, maximo: number, janelaSegundos: number): Promise<ResultadoLimite> {
  const { contagem, decorrido } = await registrar(chave, janelaSegundos);
  if (contagem <= maximo) return { permitido: true, tentarEmSegundos: 0 };
  return { permitido: false, tentarEmSegundos: Math.max(1, Math.ceil(janelaSegundos - decorrido)) };
}

// Só registra uma tentativa (sem decidir nada). Usado para contar apenas as FALHAS do login.
export async function registrarTentativa(chave: string, janelaSegundos: number): Promise<void> {
  await registrar(chave, janelaSegundos);
}

// Só consulta (não conta): a chave já atingiu o máximo dentro da janela?
export async function estaBloqueado(chave: string, maximo: number, janelaSegundos: number): Promise<ResultadoLimite> {
  const [linha] = await prisma.$queryRaw<{ contagem: number; decorrido: number }[]>`
    SELECT "contagem", extract(epoch from ((now() AT TIME ZONE 'UTC') - "janelaInicio"))::float8 AS "decorrido"
    FROM "LimiteTentativa" WHERE "chave" = ${chave}`;

  if (!linha || linha.decorrido >= janelaSegundos || linha.contagem < maximo) {
    return { permitido: true, tentarEmSegundos: 0 };
  }
  return { permitido: false, tentarEmSegundos: Math.max(1, Math.ceil(janelaSegundos - linha.decorrido)) };
}

// Zera a contagem de uma chave (ex.: login bem-sucedido).
export async function limpar(chave: string): Promise<void> {
  await prisma.limiteTentativa.deleteMany({ where: { chave } });
}

export async function limparVencidas(): Promise<void> {
  await prisma.limiteTentativa.deleteMany({ where: { janelaInicio: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
}
