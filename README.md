# Cenáculo — Plataforma de gestão de eventos

Plataforma web desenvolvida para o **Movimento Mariano Cenáculo**, para substituir o controle de inscrições feito com Wix e Google Forms. Reúne a página pública de divulgação e inscrição e um painel administrativo para a coordenação.

- **Site:** https://mmcenaculo.vercel.app
- **Status:** pronta e publicada; ainda sem uso real, previsto para o próximo evento.

## Funcionalidades

**Área pública**
- Calendário de eventos com status calculado automaticamente (aguardando, aberto, fechado, concluído).
- Inscrição online com dados do participante, saúde, restrições e atendimento especial.
- Lista de espera (pré-cadastro) quando as vagas não estão abertas.
- Galeria de fotos por evento e página institucional.

**Painel administrativo** (`/painelmmc`, protegido por login)
- Inscritos: filtro por evento, detalhes, notas internas e exclusão.
- Exportação das inscrições para Excel (`.xlsx`).
- Eventos: criação com imagem de capa, duração de 1 a 3 dias, abertura automática de vagas e status manual.
- Lista de espera dos pré-cadastros.
- Frequência: cadastro de membros e atividades e registro de presença (chamada), sem duplicar a presença da mesma pessoa.
- Galeria: envio de fotos pelo navegador.

## Stack

| Camada | Tecnologias |
|---|---|
| Aplicação | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Estilo | Tailwind CSS 4 |
| Banco de dados | PostgreSQL (Supabase em produção, Docker local) com Prisma 7 |
| Imagens | Cloudinary |
| Planilhas | SheetJS (`xlsx`) |
| Deploy | Vercel |

## Segurança do painel

- Sessão em cookie `httpOnly`, assinado com HMAC-SHA256 e com validade de 8 horas.
- Middleware valida a assinatura em todas as rotas `/painelmmc`, e as Server Actions conferem a sessão novamente.
- Senhas guardadas com bcrypt. O primeiro acesso usa uma senha provisória e obriga a troca antes de qualquer outra tela.
- Login com mensagem de erro genérica, para não revelar quais usuários existem.

## Modelo de dados

`Evento`, `Inscricao`, `Observacao`, `PreCadastro`, `Foto`, `Usuario`, `Membro`, `Atividade` e `Presenca`. O esquema está em [`prisma/schema.prisma`](prisma/schema.prisma).

## Como rodar localmente

Pré-requisitos: Node.js 20+ e Docker.

```bash
git clone https://github.com/derickbit/mmcenaculo.git
cd mmcenaculo
npm install
docker compose up -d          # PostgreSQL local
cp .env.example .env          # preencha as variáveis
npx prisma db push            # cria as tabelas
npm run dev
```

Variáveis de ambiente (veja `.env.example`):

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão com o PostgreSQL |
| `SESSION_SECRET` | Assinatura da sessão do admin (mínimo 32 caracteres) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Envio de imagens (preset `cenaculo_preset`) |
| `DATABASE_URL_TESTE` | Opcional: banco só para testes (o nome precisa terminar em `_test`) |

O primeiro administrador é criado direto no banco, na tabela `Usuario`, com `primeiroAcesso = true`. No primeiro login a pessoa define a própria senha.

## Testes

```bash
npm test
```

Os testes cobrem a regra de status dos eventos e o registro de notas internas, e também rodam automaticamente no GitHub (aba **Actions**) a cada envio de código.
Como funcionam, o que cada um verifica e como criar o banco de testes: [docs/TESTES.md](docs/TESTES.md).

## Autor

**Dérick Bitencourte da Silva** · [GitHub](https://github.com/derickbit) · [LinkedIn](https://www.linkedin.com/in/derick-bitencourte-da-silva/)
