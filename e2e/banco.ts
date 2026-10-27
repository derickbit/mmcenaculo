// Acesso direto ao banco do e2e, para preparar o cenário de cada teste e conferir o que o site gravou.
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Client } from "pg";
import { ADMIN, urlBancoE2E } from "./ambiente";

export async function consulta<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, parametros: unknown[] = []): Promise<T[]> {
  const cliente = new Client({ connectionString: urlBancoE2E() });
  await cliente.connect();
  try {
    return (await cliente.query(sql, parametros)).rows as T[];
  } finally {
    await cliente.end();
  }
}

const DIA = 24 * 60 * 60 * 1000;

export type Cenario = { adultoId: string; kidsId: string };

// Esvazia o banco e deixa o cenário padrão: um Cenáculo aberto, um Kids aberto e a conta de administrador.
export async function resetar(): Promise<Cenario> {
  await consulta(
    `TRUNCATE "Observacao", "Inscricao", "InscricaoKids", "PreCadastro", "Foto", "Evento", "Convite", "Usuario", "LimiteTentativa", "Presenca", "Membro", "Atividade" CASCADE`
  );

  const adultoId = randomUUID();
  const kidsId = randomUUID();
  const inicio = new Date(Date.now() + 30 * DIA).toISOString();
  await consulta(
    `INSERT INTO "Evento" (id, nome, tipo, status, "dataInicio", "duracaoDias") VALUES ($1, 'Cenáculo E2E', 'CENACULO', 'ABERTO', $3, 2), ($2, 'Kids E2E', 'KIDS', 'ABERTO', $3, 1)`,
    [adultoId, kidsId, inicio]
  );
  await consulta(`INSERT INTO "Usuario" (id, nome, senha, papel) VALUES ($1, $2, $3, 'ADMIN')`, [
    randomUUID(),
    ADMIN.nome,
    await bcrypt.hash(ADMIN.senha, 4), // custo baixo: só para o teste ficar rápido
  ]);
  return { adultoId, kidsId };
}

// Fecha ou reabre as inscrições dos eventos do cenário (para testar a lista de espera, que só aparece sem evento aberto).
export async function definirStatusDosEventos(status: "ABERTO" | "FECHADO") {
  await consulta(`UPDATE "Evento" SET status = $1`, [status]);
}

// Cria uma inscrição de adulto direto no banco (para testar o painel sem passar pelo formulário).
export async function criarInscricaoAdulto(eventoId: string, nomeCompleto: string, email: string) {
  await consulta(
    `INSERT INTO "Inscricao" (id, "nomeCompleto", email, telefone, cidade, "dataNascimento", "eventoId", "consentimentoEm")
     VALUES ($1, $2, $3, '(53) 99999-9999', 'Pelotas', '1990-05-20', $4, now())`,
    [randomUUID(), nomeCompleto, email, eventoId]
  );
}
