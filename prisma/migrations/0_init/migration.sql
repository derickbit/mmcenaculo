-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AUTOMATICO',
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imagemCapa" TEXT,
    "dataAbertura" TIMESTAMP(3),
    "duracaoDias" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foto" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventoId" TEXT NOT NULL,

    CONSTRAINT "Foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscricao" (
    "id" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "instagram" TEXT,
    "email" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "jaFezCenaculo" TEXT,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "problemaSaude" TEXT,
    "paroquiaAtuante" TEXT,
    "medicacaoControlada" TEXT,
    "restricaoAlimentar" TEXT,
    "atendimentoEspecial" TEXT,
    "comoConheceu" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventoId" TEXT NOT NULL,

    CONSTRAINT "Inscricao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InscricaoKids" (
    "id" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criancaNome" TEXT NOT NULL,
    "criancaNascimento" TIMESTAMP(3) NOT NULL,
    "saudeObservacao" TEXT,
    "saudeComEquipe" BOOLEAN NOT NULL DEFAULT false,
    "responsavelNome" TEXT NOT NULL,
    "responsavelTelefone" TEXT NOT NULL,
    "responsavelEmail" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "consentimentoEm" TIMESTAMP(3) NOT NULL,
    "eventoId" TEXT NOT NULL,

    CONSTRAINT "InscricaoKids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Observacao" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "inscricaoId" TEXT,
    "inscricaoKidsId" TEXT,

    CONSTRAINT "Observacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreCadastro" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'CENACULO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreCadastro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membro" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "cenaculoFeito" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atividade" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Atividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presenca" (
    "id" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "membroId" TEXT NOT NULL,
    "atividadeId" TEXT NOT NULL,

    CONSTRAINT "Presenca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'COORDENACAO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "sessoesValidasDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LimiteTentativa" (
    "chave" TEXT NOT NULL,
    "janelaInicio" TIMESTAMP(3) NOT NULL,
    "contagem" INTEGER NOT NULL,

    CONSTRAINT "LimiteTentativa_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "Convite" (
    "id" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "nomeUsuario" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "revogadoEm" TIMESTAMP(3),
    "criadoPorId" TEXT NOT NULL,
    "usadoPorId" TEXT,
    "usuarioAlvoId" TEXT,

    CONSTRAINT "Convite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Inscricao_email_eventoId_key" ON "Inscricao"("email", "eventoId");

-- CreateIndex
CREATE UNIQUE INDEX "InscricaoKids_eventoId_responsavelEmail_criancaNome_crianca_key" ON "InscricaoKids"("eventoId", "responsavelEmail", "criancaNome", "criancaNascimento");

-- CreateIndex
CREATE UNIQUE INDEX "Presenca_membroId_atividadeId_key" ON "Presenca"("membroId", "atividadeId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_nome_key" ON "Usuario"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Convite_codigoHash_key" ON "Convite"("codigoHash");

-- CreateIndex
CREATE UNIQUE INDEX "Convite_usadoPorId_key" ON "Convite"("usadoPorId");

-- AddForeignKey
ALTER TABLE "Foto" ADD CONSTRAINT "Foto_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscricao" ADD CONSTRAINT "Inscricao_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscricaoKids" ADD CONSTRAINT "InscricaoKids_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observacao" ADD CONSTRAINT "Observacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observacao" ADD CONSTRAINT "Observacao_inscricaoId_fkey" FOREIGN KEY ("inscricaoId") REFERENCES "Inscricao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observacao" ADD CONSTRAINT "Observacao_inscricaoKidsId_fkey" FOREIGN KEY ("inscricaoKidsId") REFERENCES "InscricaoKids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_membroId_fkey" FOREIGN KEY ("membroId") REFERENCES "Membro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_atividadeId_fkey" FOREIGN KEY ("atividadeId") REFERENCES "Atividade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convite" ADD CONSTRAINT "Convite_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convite" ADD CONSTRAINT "Convite_usadoPorId_fkey" FOREIGN KEY ("usadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convite" ADD CONSTRAINT "Convite_usuarioAlvoId_fkey" FOREIGN KEY ("usuarioAlvoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

