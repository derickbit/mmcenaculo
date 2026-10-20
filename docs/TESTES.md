# Testes automáticos do projeto

Este documento explica os testes que existem no projeto: para que servem, o que cada um verifica e como rodar.

## Para que servem

Um teste automático é um pequeno programa que usa o código do projeto e confere se o resultado é o esperado.
Eles servem para duas coisas:

1. **Descobrir quebras na hora.** Ao mudar o código, rodar `npm test` mostra em segundos se algo que funcionava parou de funcionar.
2. **Documentar regras.** Cada teste descreve, em português, uma regra do sistema (por exemplo, "evento sem data de abertura nunca fica ABERTO").

## Como rodar

```bash
npm test
```

Isso roda todos os testes uma vez (usa o [Vitest](https://vitest.dev)). Resultado esperado:

```
 Test Files  2 passed (2)
      Tests  25 passed (25)
```

Os arquivos de teste ficam ao lado do código que testam e terminam em `.test.ts`.

## Os testes que existem hoje

### 1. Status do evento: `lib/eventos.test.ts` (22 testes)

Testa a função `getStatusReal` (`lib/eventos.ts`), que decide se um evento está
`AGUARDANDO`, `ABERTO`, `FECHADO` ou `CONCLUIDO`. É ela que define quando o formulário de inscrição aparece.

- Se a coordenação escolheu um status manual (ABERTO, FECHADO, CONCLUIDO…), esse status vale sempre.
- Se o status é `AUTOMATICO`, ele é calculado pelas datas:

| Momento | Status |
|---|---|
| antes da data de abertura | AGUARDANDO |
| da abertura até o início do evento | ABERTO |
| do início até o fim (início + duração em dias) | FECHADO |
| depois do fim | CONCLUIDO |

- Os testes cobrem os **limites exatos** (o segundo da abertura, o segundo do início, o segundo do fim),
  eventos de 1 e de 3 dias, duração 0 (tratada como 1 dia) e evento sem data de abertura.
- Cada teste roda **duas vezes**, uma com o relógio do servidor em `UTC` (é o da Vercel) e outra em
  `America/Sao_Paulo` (a sua máquina), para garantir que o resultado não depende do fuso.
  Um teste extra confirma que o fuso foi mesmo aplicado.
- A função recebe a hora atual como parâmetro opcional (`agora`). Os testes usam isso para "congelar"
  o relógio e não dependerem do dia em que são executados.

### 2. Notas internas: `app/admin/actions.test.ts` (3 testes)

Testa a ação `adicionarNota` (`app/admin/actions.ts`), usada no painel para registrar uma observação sobre uma inscrição.

- **Grava a nota com o usuário logado e lista com o nome do autor.** A nota deve ficar ligada ao `id` do usuário da sessão e, ao listar, o nome dele deve aparecer.
- **Recusa e não grava nada se o usuário da sessão não existe.**
- **Texto vazio não cria nota.**

Este teste usa um **banco de dados de verdade**. O motivo: o bug que ele protege (a nota apontava para uma tabela
errada) era uma regra do banco (chave estrangeira), e só um banco real reproduz isso. Foi confirmado que o teste
falha se esse bug voltar.

## O banco de testes

Os testes de banco **não usam o seu banco de desenvolvimento** nem o de produção. Usam um banco separado, `cenaculodb_test`,
no mesmo Postgres do Docker.

**Criar uma vez** (com o Docker rodando):

```bash
docker exec mmcenaculo_postgres psql -U admin -d postgres -c "CREATE DATABASE cenaculodb_test;"
```

Depois aplicar o schema nele (ajuste usuário e senha se os seus forem diferentes):

```bash
DATABASE_URL="postgresql://admin:adminpassword@localhost:5432/cenaculodb_test" npx prisma db push
```

(No PowerShell: `$env:DATABASE_URL="..."; npx prisma db push`.)

**Ligar nos testes:** no `.env`, adicionar

```
DATABASE_URL_TESTE="postgresql://admin:adminpassword@localhost:5432/cenaculodb_test"
```

Se alguma tabela mudar no `prisma/schema.prisma`, rode o `db push` de novo também no banco de testes.

**Proteções:**

- Se `DATABASE_URL_TESTE` não existir, os testes de banco são **pulados** (o `npm test` continua passando).
- Se o nome do banco **não terminar em `_test`**, o teste se recusa a rodar. Isso impede de apontar, sem querer, para o banco real.
- Cada teste cria os próprios dados e apaga tudo no final. O banco de testes fica vazio entre as execuções.

## Como o teste de notas funciona (por dentro)

1. Troca a parte do Next.js que só existe dentro do servidor (a leitura da sessão e o `revalidatePath`) por versões simples ("mocks").
2. Aponta o Prisma para o banco de testes.
3. Cria um usuário, um evento e uma inscrição de teste.
4. Chama `adicionarNota` como se fosse o painel e consulta o banco para ver o resultado.
5. Apaga tudo no final.

## Verificação automática no GitHub (CI)

O arquivo `.github/workflows/ci.yml` roda a cada push na `main` e a cada Pull Request: instala as dependências, gera o
client do Prisma, roda o lint, o `npm test` e o build. O resultado aparece na aba **Actions** do repositório.

**Limitação atual:** o CI ainda não tem um banco Postgres, então lá os testes de notas são pulados e rodam só na sua
máquina. Os 22 testes de status do evento rodam nos dois lugares.

## Como adicionar um teste novo

1. Crie um arquivo `nome.test.ts` ao lado do código.
2. Escreva casos com `describe` (o grupo), `it` (cada regra, em português) e `expect` (o que se espera).
3. Rode `npm test`.

## Glossário

- **Teste automático:** código que confere se outro código se comporta como esperado.
- **Mock:** versão falsa e simples de algo que não dá para usar no teste (por exemplo, a sessão de login).
- **Chave estrangeira:** regra do banco que obriga um registro a apontar para outro que existe (uma nota precisa ter um autor válido).
- **Fuso horário (TZ):** o relógio do servidor. A Vercel usa UTC; Pelotas é UTC-3.
- **CI:** verificação automática que o GitHub roda a cada envio de código.
- **Lint:** programa que lê o código e avisa de erros e maus hábitos sem executá-lo.
