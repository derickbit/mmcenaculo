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
 Test Files  4 passed (4)
      Tests  68 passed (68)
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

### 2. Painel de admin: `app/admin/actions.test.ts` (7 testes)

Testa a ação `adicionarNota` (`app/admin/actions.ts`), usada no painel para registrar uma observação sobre uma inscrição.

- **Grava a nota com o usuário logado e lista com o nome do autor.** A nota deve ficar ligada ao `id` do usuário da sessão e, ao listar, o nome dele deve aparecer.
- **Recusa e não grava nada se o usuário da sessão não existe.**
- **Texto vazio não cria nota.**
- **Notas e exclusão no Kids:** a nota de uma criança fica ligada só à inscrição Kids (nunca também a uma de adulto). Excluir uma
  inscrição Kids apaga também as notas dela, sem tocar nas outras.
- **Sem login, nada acontece:** sem sessão, as ações do painel recusam e não gravam nem apagam nada.

Este teste usa um **banco de dados de verdade**. O motivo: o bug que ele protege (a nota apontava para uma tabela
errada) era uma regra do banco (chave estrangeira), e só um banco real reproduz isso. Foi confirmado que o teste
falha se esse bug voltar.

### 3. Regras de entrada das inscrições: `lib/inscricao.test.ts` (25 testes, sem banco)

Testam os schemas de `lib/inscricao.ts` (feitos com a biblioteca `zod`), que decidem o que a API aceita.

- **Adulto:** campos obrigatórios, e-mail normalizado (minúsculas, sem espaços), telefone com 10 ou 11 dígitos, tamanho máximo dos
  textos, data inválida (`2020-02-31`, futuro, antes de 1900) vira mensagem de erro e não erro 500. Campos desconhecidos são ignorados.
- **Kids:** só os campos combinados são aceitos; **qualquer campo extra é rejeitado** (assim nada além do mínimo da criança entra).
  Só o primeiro nome da criança, parentesco de uma lista fechada, consentimento do responsável obrigatório.
  Se o responsável marca "prefiro falar com a equipe", o texto de saúde é descartado.
- **Faixa de 8 a 10 anos:** a criança fora da faixa é aceita (podem existir exceções), e `foraDaFaixaKids` calcula o aviso para a
  equipe usando a idade **na data do evento**.

### 4. API de inscrição: `app/api/inscricao/route.test.ts` (14 testes, com banco)

Chamam a rota `POST /api/inscricao` de verdade, contra o banco de testes.

- **O servidor confere se o evento está aberto** (evento fechado responde 403 e não grava nada; evento inexistente, 404).
- **Resposta sem dados:** o sucesso devolve só uma mensagem, nunca os dados da inscrição nem de saúde.
- **Duplicidade garantida pelo banco:** adulto por e-mail (mesmo com letras maiúsculas diferentes); Kids por evento + e-mail do
  responsável + nome + nascimento da criança. Irmãos podem se inscrever; a mesma criança, não. O aviso é genérico e **não confirma**
  que um e-mail ou uma criança já está inscrita.
- **Kids:** campo extra, falta de consentimento ou cadastro de adulto em evento Kids são recusados (400) e nada é gravado.
  O momento do aceite é registrado pelo servidor.

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

## Como os testes de banco funcionam (por dentro)

Os dois arquivos de teste com banco (`actions.test.ts` e `route.test.ts`) seguem o mesmo roteiro:

1. Apontam o Prisma para o banco de testes (a variável `DATABASE_URL_TESTE`).
2. Criam os dados de que precisam: eventos, um usuário, inscrições. Cada execução usa nomes e e-mails únicos.
3. Chamam o código de verdade, sem servidor:
   - **Notas:** a ação `adicionarNota`. A parte do Next.js que só existe no servidor (a leitura da sessão e o `revalidatePath`)
     é trocada por versões simples ("mocks").
   - **Inscrição:** a função `POST` da rota, com um `Request` montado no teste.
4. Consultam o banco para ver se o resultado é o esperado (o que foi gravado, e o que **não** foi).
5. Apagam tudo no final. Apagar o evento leva junto as inscrições (cascata).

## Verificação automática no GitHub (CI)

O arquivo `.github/workflows/ci.yml` roda a cada push na `main` e a cada Pull Request, numa máquina do GitHub:
sobe um Postgres temporário, instala as dependências, gera o client do Prisma, cria as tabelas (`prisma db push`) e
roda o lint, o `npm test` e o build. O resultado aparece na aba **Actions** do repositório.

Como o CI tem o próprio banco (`DATABASE_URL_TESTE` já vem configurada no arquivo, apontando para um banco `..._test`),
**todos os 68 testes rodam lá**, inclusive os de notas. Os valores de banco e de `SESSION_SECRET` no `ci.yml` são falsos,
só para o build e os testes funcionarem; nenhum segredo real é usado.

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
