import type { Prisma } from "@prisma/client";

// Inscrição como o painel admin a recebe: com o evento e as notas internas (e o autor de cada nota).
export type InscricaoAdmin = Prisma.InscricaoGetPayload<{
  include: { evento: true; observacoes: { include: { admin: true } } };
}>;
