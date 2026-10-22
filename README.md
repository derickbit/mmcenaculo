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

**Painel da coordenação** (`/painelmmc`, protegido por login)
- Inscritos: filtro por evento, detalhes, notas internas e exclusão.
- Exportação das inscrições para Excel (`.xlsx`).
- Eventos: criação com imagem de capa, duração de 1 a 3 dias, abertura automática de vagas e status manual.
- Lista de espera dos pré-cadastros.
- Frequência: cadastro de membros e atividades e registro de presença (chamada), sem duplicar a presença da mesma pessoa.
- Galeria: envio de fotos pelo navegador.
- Usuários (só o administrador): convites por link, redefinição de senha, renomear e desativar contas.

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
- O proxy valida a assinatura do cookie em todas as rotas `/painelmmc`; **cada página, rota de API e Server Action confere a sessão de novo no banco** (conta existe, está ativa e o cookie não foi derrubado). Desativar uma conta vale na hora.
- Quem não entrou vê "não encontrado" em qualquer endereço do painel (só `/painelmmc/login` aparece), e o painel não é indexado por buscadores.
- Senhas guardadas com bcrypt, mínimo de 10 caracteres. Não existe senha provisória.
- Limite de tentativas no login (por usuário e por IP), na inscrição e na lista de espera; proteção contra robôs nos formulários públicos.
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

## Contas do painel

Há dois cargos: **administrador** (o dono do sistema, **só um**) e **coordenação** (usa o painel inteiro e vê todos os dados). Não existe cadastro público.

- **Primeiro administrador:** criado uma única vez pelo terminal, que pede o usuário e a senha (a senha não aparece nem fica em arquivo):

  ```bash
  npm run admin:criar
  ```

  O script mostra qual banco vai usar e pede confirmação. Ele recusa se já existir um administrador. Para rodar contra a produção, defina o `DATABASE_URL` apenas naquele terminal (a variável do terminal vale mais que o `.env`).
- **Esqueci a senha do administrador:** `npm run admin:redefinir-senha` (encerra as sessões abertas dessa conta).
- **Novas pessoas da coordenação:** o administrador abre **Usuários** no painel, escolhe o usuário e gera um **link de convite** (uso único, vale 48 horas). A pessoa abre o link, define a própria senha e já entra. O link aparece uma única vez; no banco fica só o hash.
- **Senha esquecida (coordenação):** o administrador clica em **Redefinir senha**; a senha atual deixa de funcionar na hora e ele envia um novo link para a pessoa escolher outra.
- **Desligar alguém:** **Desativar** bloqueia o acesso na hora e não apaga nada (o histórico, como as notas, continua intacto). Dá para reativar.

## Testes

```bash
npm test
```

Os testes cobrem a regra de status dos eventos e o registro de notas internas, e também rodam automaticamente no GitHub (aba **Actions**) a cada envio de código.
Como funcionam, o que cada um verifica e como criar o banco de testes: [docs/TESTES.md](docs/TESTES.md).

## Autor

**Dérick Bitencourte da Silva** · [GitHub](https://github.com/derickbit) · [LinkedIn](https://www.linkedin.com/in/derick-bitencourte-da-silva/)
