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
 Test Files  27 passed (27)
      Tests  298 passed (298)
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

### 2. Painel de admin: `app/painelmmc/actions.test.ts` (7 testes)

Testa a ação `adicionarNota` (`app/painelmmc/actions.ts`), usada no painel para registrar uma observação sobre uma inscrição.

- **Grava a nota com o usuário logado e lista com o nome do autor.** A nota deve ficar ligada ao `id` do usuário da sessão e, ao listar, o nome dele deve aparecer.
- **Recusa e não grava nada se o usuário da sessão não existe.**
- **Texto vazio não cria nota.**
- **Notas e exclusão no Kids:** a nota de uma criança fica ligada só à inscrição Kids (nunca também a uma de adulto). Excluir uma
  inscrição Kids apaga também as notas dela, sem tocar nas outras.
- **Sem login, nada acontece:** sem sessão, as ações do painel recusam e não gravam nem apagam nada.

Este teste usa um **banco de dados de verdade**. O motivo: o bug que ele protege (a nota apontava para uma tabela
errada) era uma regra do banco (chave estrangeira), e só um banco real reproduz isso. Foi confirmado que o teste
falha se esse bug voltar.

### 3. Regras de entrada das inscrições: `lib/inscricao.test.ts` (29 testes, sem banco)

Testam os schemas de `lib/inscricao.ts` (feitos com a biblioteca `zod`), que decidem o que a API aceita.

- **Adulto:** campos obrigatórios, e-mail normalizado (minúsculas, sem espaços), telefone com 10 ou 11 dígitos, tamanho máximo dos
  textos, data inválida (`2020-02-31`, futuro, antes de 1900) vira mensagem de erro e não erro 500. Campos desconhecidos são ignorados.
- **Kids:** só os campos combinados são aceitos; **qualquer campo extra é rejeitado** (assim nada além do mínimo da criança entra).
  Só o primeiro nome da criança, parentesco de uma lista fechada, consentimento do responsável obrigatório.
  Se o responsável marca "prefiro falar com a equipe", o texto de saúde é descartado.
- **Lista de espera:** nome, e-mail e telefone válidos, e o retiro só pode ser Cenáculo, Kids ou Cenaculão. O telefone aceita o
  código do país (`+55`) na frente.
- **Faixa de 8 a 10 anos:** a criança fora da faixa é aceita (podem existir exceções), e `foraDaFaixaKids` calcula o aviso para a
  equipe usando a idade **na data do evento**.

### 4. API de inscrição: `app/api/inscricao/route.test.ts` (21 testes, com banco)

Chamam a rota `POST /api/inscricao` de verdade, contra o banco de testes.

- **O servidor confere se o evento está aberto** (evento fechado responde 403 e não grava nada; evento inexistente, 404).
- **Resposta sem dados:** o sucesso devolve só uma mensagem, nunca os dados da inscrição nem de saúde.
- **Duplicidade garantida pelo banco:** adulto por e-mail (mesmo com letras maiúsculas diferentes); Kids por evento + e-mail do
  responsável + nome + nascimento da criança. Irmãos podem se inscrever; a mesma criança, não. O aviso é genérico e **não confirma**
  que um e-mail ou uma criança já está inscrita.
- **Limite de tentativas:** a 11ª tentativa do mesmo IP em 10 minutos recebe erro 429 e não grava; outro IP continua liberado;
  envios inválidos também contam.
- **Robôs (honeypot):** campo escondido preenchido, formulário enviado em menos de 1 segundo ou envio direto sem o formulário recebem
  um sucesso falso e **nada é gravado**.
- **Kids:** campo extra, falta de consentimento ou cadastro de adulto em evento Kids são recusados (400) e nada é gravado.
  O momento do aceite é registrado pelo servidor.

### 5. Lista de espera: `app/inscricao/actions.test.ts` (8 testes, com banco)

Testa `salvarPreCadastro`, que devolve um resultado (`ok` ou `erro` com o aviso de cada campo): grava e normaliza o e-mail; repetir o
mesmo e-mail e retiro não cria outra linha (e responde igual); dados inválidos não gravam nada e devolvem o aviso do campo errado; a
6ª tentativa do mesmo IP é recusada; robôs (campo escondido preenchido, envio rápido demais ou sem o horário de abertura) recebem
sucesso falso sem gravar.

### 6. Limitador de tentativas: `lib/limite.test.ts` (8 testes, com banco) e `lib/ip.test.ts` (4 testes)

O limitador (`lib/limite.ts`) conta tentativas por chave (por exemplo, o IP) numa janela de tempo, no Postgres.

- Permite até o máximo e recusa a tentativa seguinte, dizendo em quantos segundos tentar de novo.
- Chaves diferentes não interferem entre si; depois da janela volta a liberar.
- **20 envios simultâneos não furam o limite** (a contagem é feita numa única operação do banco).
- `estaBloqueado` só consulta, sem contar; `limpar` zera; `limparVencidas` apaga só o que tem mais de um dia.
- `lib/ip.ts` lê o IP do visitante (primeiro IP do `x-forwarded-for`; valor padrão se não houver).

### 7. Login: `app/api/login/route.test.ts` (11 testes, com banco)

O login conta só as senhas **erradas**, em duas contagens separadas, ambas numa janela de 15 minutos (valores em `LIMITES`, em
`lib/limite.ts`):

- **Por usuário: 5 erros.**
- **Por IP: 10 erros.** Um teto maior que o de um usuário só: na coordenação todos usam o mesmo Wi-Fi, e um usuário que erra bastante
  **não** trava os outros do mesmo IP. Já um IP que erra com vários nomes diferentes esbarra nos 15 e fica bloqueado para todos.

O que os testes conferem:

- Login certo entra e entrega o cookie; senha errada e usuário inexistente dão a mesma resposta.
- Depois do máximo de erros no mesmo usuário, bloqueia (429) mesmo com a senha certa, e o bloqueio vale em qualquer IP.
- O bloqueio de um usuário **não** trava outros usuários do mesmo IP.
- Um IP que erra com muitos nomes diferentes é bloqueado para todos os usuários.
- O bloqueio vale também para nomes que não existem, sem revelar quais usuários existem.
- Um login certo zera as falhas daquele usuário.
- **Conta desativada não entra**, mesmo com a senha certa, e a resposta é igual à de senha errada (não revela que a conta existe).
  Reativada, volta a entrar.
- O nome do usuário vale em maiúsculas ou minúsculas (e com espaços nas pontas).
- O cookie de sessão guarda o **identificador da conta**, e não o nome.
- **Não existe senha provisória:** uma conta cuja senha foi gravada em texto puro (sem criptografia) **não entra**, nem digitando
  exatamente essa senha. Foi confirmado que o teste falha se esse caminho voltar.

### 8. Honeypot: `lib/honeypot.test.ts` (7 testes, sem banco)

Campo escondido preenchido é robô; formulário enviado em menos de 1 segundo é robô; sem o horário de abertura só é robô quando
o horário é exigido; pessoa de verdade passa.

### 9. Telefone: `lib/telefone.test.ts` (7 testes, sem banco)

A regra do telefone (DDD + número, 10 ou 11 dígitos, aceita o `55` do país na frente) e a máscara que formata enquanto a pessoa
digita: fixo vira `(53) 3333-4444` e celular `(53) 99999-9999`. O DDD 55 (Santa Maria) não é confundido com o código do país.

### 10. Telas dos formulários: `app/inscricao/formularios.test.tsx` (11 testes, sem banco)

Abrem o formulário de verdade (num navegador simulado, o `jsdom`), digitam como uma pessoa e conferem **o que seria enviado** e **o
que aparece na tela**, para adulto, Kids e lista de espera.

- **O horário em que o formulário foi aberto vai junto no envio**, mesmo depois de a pessoa digitar. Foi esse teste que reproduziu um
  bug sério: o horário era apagado a cada tecla, e o servidor tratava todo mundo como robô e descartava a inscrição.
- **Telefone inválido não é enviado:** o aviso aparece ao lado do campo e o que foi digitado continua na tela. Corrigindo só o
  telefone, o aviso some e o envio passa.
- **Avisos do servidor** aparecem ao lado do campo certo, sem apagar o resto.
- **Kids:** só os campos combinados são enviados; o botão "prefiro informar à equipe" desabilita o texto de saúde e vira um aviso.

Esses testes não precisam de banco.

### 11. Planilhas exportadas: `lib/planilha.test.ts` (15 testes, sem banco)

Testam `lib/planilha.ts`, que monta as planilhas `.xlsx` do painel: inscritos adultos, inscritos Kids e frequência.

- **O conteúdo:** cabeçalho em negrito e uma linha por inscrição, com os dados como foram digitados; `-` nos campos vazios; notas
  internas juntas com ` | `; número de colunas igual ao do cabeçalho.
- **Datas sem erro de fuso:** a data de nascimento não anda um dia, e a hora da inscrição aparece no horário de Brasília mesmo com o
  servidor em UTC (a Vercel).
- **Kids:** idade **na data do evento**, aviso "fora da faixa 8-10", saúde como texto, como "Falar com a equipe no dia" ou `-`, e o
  parentesco por extenso ("Mãe").

- **Cabeçalhos claros:** na planilha do Kids, telefone e e-mail aparecem como "Telefone do responsável" e "E-mail do responsável".
- **Nome do arquivo:** sem acentos nem símbolos (inclusive quebras de linha, que poderiam atrapalhar o cabeçalho do download) e com o
  dia de hoje em Brasília.

**O teste de segurança (importante).** Um texto digitado no formulário público como `=HYPERLINK("http://golpe.example","clique")`,
`=1+1`, `@SUM(1,2)`, `+55 53 99999-9999` ou `-2+3` poderia ser executado por um programa de planilha **se** fosse gravado como
fórmula. O teste gera uma planilha com todos esses textos, **abre o arquivo `.xlsx` por dentro** (ele é um zip; o teste tem um
leitor mínimo, sem bibliotecas) e confere três coisas:

1. não existe nenhuma célula de fórmula no arquivo (a marca `<f>`);
2. toda célula é do tipo **texto**;
3. o conteúdo está lá **exatamente como foi digitado** (os dados não são alterados, nada de apóstrofo na frente).

Isso vale para as três planilhas. Foi confirmado que o teste **falha** se uma célula virar fórmula de verdade.

*Por que não "neutralizamos" os dados:* o conselho comum de colocar um `'` na frente de textos que começam com `=`, `+`, `-` ou `@`
vale para arquivos **CSV**. Num `.xlsx`, texto é gravado como texto, e só vira fórmula se o código pedir de propósito. Colocar o
apóstrofo estragaria dados de verdade (por exemplo, um telefone começando com `+55`) para evitar um risco que não existe. O teste
acima é a garantia no lugar disso: se uma troca futura de biblioteca mudar esse comportamento, ele avisa.

### 12. Rotas de exportação: `app/api/painelmmc/exportar/[tipo]/route.test.ts` (9 testes, com banco)

Chamam `GET /api/painelmmc/exportar/inscritos`, `/kids` e `/frequencia` de verdade, contra o banco de testes, e **abrem o `.xlsx` que
voltou** para conferir o conteúdo.

- **Quem pode baixar:** sem login, nenhuma das três planilhas é entregue (erro 401). A rota confere o login por conta própria, sem depender só do proxy.
- **Inscritos adultos:** entrega o evento escolhido, com as notas e o nome de quem escreveu, sem as inscrições de outros eventos e sem
  nenhuma criança. Sem escolher evento, entrega todos. O nome do arquivo e o tipo (`.xlsx`) vêm certos, e a resposta não fica em cache.
- **Texto perigoso** digitado no formulário (`=1+1`, `=HYPERLINK(...)`) sai como texto, sem fórmula, também por este caminho.
- **Kids:** entrega a criança com o contato do responsável (telefone e e-mail), o aviso "Falar com a equipe no dia" e o parentesco por
  extenso, e nenhum adulto.
- **Frequência:** entrega os membros com as presenças, e filtra por grupo.
- Evento inexistente e relatório desconhecido dão 404.

### 13. Convites para contas do painel: `lib/convite-regras.test.ts` (24 testes, sem banco) e `lib/convite.test.ts` (21 testes, com banco)

O admin gera um **link de uso único** para uma pessoa criar a conta dela: ele escolhe o **usuário** e a pessoa só define a senha.

*Regras sem banco* (`lib/convite-regras.ts`):

- O **código do link** é aleatório (256 bits), nunca se repete e só usa caracteres seguros para um link. No banco fica apenas o **hash**
  do código.
- **Usuário** reservado: 3 a 30 caracteres, só letras sem acento, números, ponto, hífen e sublinhado.
- **Senha:** no mínimo 10 caracteres e, no máximo, 72 *bytes* (o bcrypt ignoraria o resto em silêncio).
- O convite vale **48 horas** e vence exatamente na hora marcada; "usado" e "revogado" valem mais que o prazo.

*Com banco* (`lib/convite.ts`):

- **Criar:** o código aparece só no retorno; o banco guarda o hash (o teste confirma que o código não está em nenhum campo). Recusa
  usuário inválido, usuário que já existe (**sem diferenciar maiúsculas de minúsculas**) e um segundo convite pendente para o mesmo
  usuário (que volta a ser possível depois de revogar ou de vencer).
- **Aceitar:** cria a conta **COORDENACAO**, ativa, com a senha em hash, e marca o convite como usado. O mesmo link não funciona duas
  vezes; convite vencido, revogado ou com código errado não cria nada.
- **Senha fraca** é recusada e o convite continua livre para tentar de novo. Se o usuário foi ocupado no meio do caminho, a conta não é
  criada e o convite **não é gasto** (a transação é desfeita).
- **Vários cliques ao mesmo tempo** no mesmo link criam, no máximo, uma conta.
- **Revogar:** só convites livres (não os já usados nem os já revogados).

*Redefinição de senha* (o admin gera um link para uma conta que já existe):

- **Gerar o link já invalida a senha atual** (a antiga para de funcionar na hora) e **derruba as sessões abertas** da conta.
- Aceitar o link dá a senha nova à **mesma conta** (nenhuma conta nova é criada), o link não funciona de novo, e as sessões abertas
  desde que o link foi gerado também caem.
- Gerar outro link revoga o anterior que ainda estava pendente.
- Não redefine senha de **administrador**, de conta **desativada** nem de conta que não existe (e nesses casos a senha fica intacta).
- Se a conta for desativada depois de gerado o link, o link não vale e a senha não muda.

Há duas proteções sobrepostas contra reuso de convite (a checagem do estado e a condição dentro da transação). Foi confirmado que os
testes falham se **as duas** forem removidas.

### 14. Página do convite: `app/convite/[codigo]/actions.test.ts` (5 testes, com banco) e `convite.test.tsx` (9 testes, de tela)

A pessoa convidada abre o link, vê o **usuário que o admin escolheu** já preenchido (só para leitura) e define apenas a senha.

*A ação do servidor (com banco):*

- Cria a conta, **já entra no painel** (o cookie de sessão gravado é válido e é do usuário certo) e manda para `/painelmmc`.
- Senhas diferentes ou senha curta: o aviso volta ao lado do campo e o convite **não é gasto**.
- Link inválido ou já usado: a mesma mensagem, sem conta e sem cookie.
- **Limite de tentativas** por IP (10 a cada 15 minutos): a 11ª é recusada mesmo com um convite válido, que continua livre; outro IP não é afetado.

*As telas (num navegador simulado):*

- O formulário mostra o usuário só para leitura; senha curta ou senhas diferentes **avisam ao lado do campo sem enviar nada**; uma senha
  boa envia o código do convite e a senha; o aviso do servidor aparece **sem apagar o que foi digitado**.
- A página mostra o formulário para um convite válido. Para link inexistente, vencido, já usado ou revogado, mostra **exatamente a
  mesma mensagem**, sem o nome do usuário e sem formulário: ninguém descobre se um código já existiu.

- O **link de redefinição** usa a mesma página, com o texto "Definir nova senha" e o usuário que já existe (em vez de "Criar sua conta").

A página também pede ao navegador para **não repassar o código do endereço** a outros sites (`no-referrer`) e fica fora dos buscadores.
O link inválido responde com o mesmo status de um válido (200), para o código de resposta também não entregar nada.

### 15. Sessão e contas: `lib/session.test.ts` (7 testes, sem banco) e `lib/auth.test.ts` (10 testes, com banco)

O cookie de login (a "sessão") guarda o **identificador da conta**, o momento em que foi emitido e quando vence, tudo assinado.

*O cookie (`lib/session.ts`):*

- Não aceita cookie ausente, malformado, **adulterado** (trocar a conta dentro dele invalida a assinatura), assinado com **outro
  segredo**, vencido, ou de formato antigo (assinado direito, mas sem o momento de emissão). Sem o segredo configurado, falha de forma
  explícita.

*Conferência no banco (`lib/auth.ts`):*

- **Conta desativada não tem sessão**, mesmo com o cookie dentro da validade, e isso vale **na hora**; reativar devolve o acesso.
- Cookie de conta que não existe não vale.
- **Redefinir a senha derruba os cookies anteriores:** um cookie emitido antes não vale mais; um novo login vale.
- **Renomear não passa o acesso para outra pessoa:** como o cookie guarda a conta (e não o nome), quem ficar com o nome antigo de alguém
  não herda a sessão dele.
- `exigirSessao` barra quem não entrou e conta desativada.
- **Só o ADMIN:** `exigirAdmin` (ações) barra a coordenação; `exigirAdminPagina` leva a coordenação de volta ao painel e quem não entrou
  ao login.

### 16. Painel escondido: `proxy.test.ts` (5 testes, sem banco)

O proxy é a primeira porta do painel (`/painelmmc`). Ele confere só o cookie; a conferência completa, no banco, é feita em cada página
e em cada ação.

- **Sem sessão, o painel finge que não existe:** qualquer endereço do painel (menos a tela de login) responde "não encontrado", igual a
  um endereço que nunca existiu, e **não redireciona ao login**. Assim, quem digita um endereço do painel não descobre que ele existe.
  Só a tela de login (`/painelmmc/login`) se mostra. Foi conferido com o site compilado: a resposta é idêntica, byte a byte, à de uma
  rota inexistente.
- Cookie falso, vazio ou **adulterado** (trocar a conta dentro dele) é tratado como sem sessão.
- Com sessão válida, o painel abre.
- **Fora dos buscadores:** as páginas e a API do painel mandam o cabeçalho `X-Robots-Tag: noindex, nofollow`. (Não se usa o
  `robots.txt` de propósito: ele anunciaria o endereço do painel.) As páginas públicas não recebem esse cabeçalho.

Efeito a ter em mente: quem estiver deslogado e abrir um endereço salvo do painel (por exemplo `/painelmmc`) vê "não encontrado"; o
caminho de entrada é `/painelmmc/login` (é para onde o cadeado do rodapé aponta).

### 17. Gestão de contas: `lib/usuarios.test.ts` (12), `app/painelmmc/usuarios/actions.test.ts` (6), `usuarios.test.tsx` (16), `page.test.tsx` (2) e `app/painelmmc/PainelShell.test.tsx` (6)

A tela `/painelmmc/usuarios`, **só para o ADMIN**: convidar pessoas, redefinir senhas, renomear e desativar contas. Os nomes em maiúsculas,
como ADMIN, são o cargo no banco; "excluir" uma conta é **desativar**: o histórico dela fica intacto.

*Lógica (`lib/usuarios.ts`, com banco):*

- **Renomear:** as notas antigas passam a mostrar o nome novo (o histórico continua lá). Recusa nome inválido, nome de outra conta (sem
  diferenciar maiúsculas; mudar só as maiúsculas da própria conta é permitido) e nome reservado por um convite pendente. Um link de
  redefinição ainda pendente passa a mostrar o nome novo.
- **Desativar:** a conta deixa de entrar na hora, as sessões abertas caem, os links de redefinição pendentes são revogados e **nada é
  apagado**. **Reativar** devolve o acesso, mas os cookies de antes da desativação **continuam mortos**.
- A conta de **administrador nunca é alterada** por aqui (renomear, desativar, reativar), nem conta que não existe.
- As listas da tela: o admin vem primeiro, **a senha nunca é devolvida**, e o código do link de convite nunca aparece (no banco há só o hash).

*As ações do servidor (`actions.test.ts`, com banco):*

- **Sem login ou como coordenação, NENHUMA ação funciona e nada muda no banco** (nem convite novo, nem senha, nem desativação). Cada
  ação confere o ADMIN antes de qualquer coisa; foi confirmado, uma a uma, que o teste falha se uma delas deixar de conferir.
- Como ADMIN: gerar convite devolve o link **uma vez**; redefinir a senha devolve o link e a senha antiga para de funcionar; revogar,
  renomear, desativar e reativar fazem o que dizem e recusam a conta de administrador.

*A tela (`usuarios.test.tsx`, num navegador simulado):*

- A conta de administrador aparece **protegida, sem botões**; as de coordenação têm Renomear, Redefinir senha e Desativar; a desativada
  oferece Reativar.
- O **link aparece uma única vez** (com o endereço do site e o aviso), o botão Copiar usa a área de transferência, e "Fechar" faz o link
  sumir. Erros (por exemplo, usuário que já existe) aparecem ao lado do campo, sem apagar o que foi digitado.
- Redefinir senha e desativar **perguntam antes**, avisando que a senha atual deixa de valer e que o histórico fica intacto; cancelar
  não faz nada. Renomear abre um campo com o nome atual e, se o servidor recusar, mostra o motivo na linha e mantém o campo aberto.
- A lista de convites mostra tipo, situação e quem usou; **só o pendente tem Revogar**.
- **A página** só abre para o ADMIN: quem não é ADMIN é mandado embora **sem sequer carregar a lista de usuários**.
- **O menu** mostra o item **"Usuários" só para o ADMIN** (a coordenação vê o resto do menu), mostra quem está logado e o cargo, e na
  tela de login não há menu.

### 18. Todas as páginas conferem a sessão: `app/painelmmc/protecao.test.ts` (12 testes, sem banco)

O proxy só olha o cookie. Se uma página não conferir a sessão **no banco**, uma conta desativada (com a pessoa logada) continua vendo
os dados. Isso aconteceu de verdade e foi descoberto num teste com o site compilado: a lista de inscritos, eventos, lista de espera,
galeria e frequência abriam mesmo com a conta desativada, enquanto a exportação e as ações já barravam. Foi corrigido, e este teste
**impede que volte**:

- **Varre todas as páginas do painel** e exige que cada uma (menos a de login, que é pública) chame
  `exigirSessaoPagina()` ou `exigirAdminPagina()` **antes de qualquer uso do banco**. Uma página nova, criada sem essa conferência, faz o
  teste falhar com uma mensagem apontando qual.
- Faz o mesmo para toda **rota de API** do painel (exige `lerSessao()` antes do banco).
- Prova, na lista de inscritos, que sem sessão válida a página é interrompida **antes de consultar o banco**.

### 19. Script do primeiro administrador: `lib/primeiro-admin.test.ts` (7 testes, sem banco)

O administrador é o dono do sistema: **só um**, e ele **não** nasce por convite nem pelo painel, só pelo terminal (`npm run admin:criar`).
Para esquecer a senha dele, há `npm run admin:redefinir-senha` (a tela de usuários não mexe na conta de administrador, de propósito).
A lógica (`lib/primeiro-admin.ts`) é testada contra um banco **falso, em memória**: um banco de verdade compartilhado com os outros
testes já tem administradores criados por eles, e o que se testa aqui é a regra.

- **Criar:** a conta é ADMIN, ativa, com a senha em **hash** (nunca em texto puro). Recusa se **já existe** um administrador (só pode
  haver um), usuário inválido, senha fraca (menos de 10 caracteres) e usuário já usado por outra conta (sem diferenciar maiúsculas); nesses
  casos nada é criado.
- **Redefinir:** troca a senha, **derruba as sessões abertas** e não mexe em outras contas. Recusa senha fraca; avisa quando não há
  administrador ou quando há mais de um (pede para informar qual); e **nunca altera uma conta que não seja ADMIN**.

*O script de terminal em si* (`scripts/primeiro-admin.ts`) foi conferido rodando de verdade, com as respostas simuladas, contra um banco
temporário: responder "não" na confirmação não muda nada; senhas diferentes ou curtas são recusadas; criar funciona; o **segundo admin é
recusado**; redefinir funciona. Depois, com o site compilado, a senha nova entra, a antiga não, e a tela de gestão de usuários abre para
esse administrador. O script mostra qual banco vai mexer e pede confirmação antes.

## O banco de testes

Os testes de banco **não usam o seu banco de desenvolvimento** nem o de produção. Usam um banco separado, `cenaculodb_test`,
no mesmo Postgres do Docker.

**Criar uma vez** (com o Docker rodando):

```bash
docker exec mmcenaculo_postgres psql -U admin -d postgres -c "CREATE DATABASE cenaculodb_test;"
```

Depois aplicar o schema nele (ajuste usuário e senha se os seus forem diferentes):

```bash
DATABASE_URL="postgresql://painelmmc:adminpassword@localhost:5432/cenaculodb_test" npx prisma db push
```

(No PowerShell: `$env:DATABASE_URL="..."; npx prisma db push`.)

**Ligar nos testes:** no `.env`, adicionar

```
DATABASE_URL_TESTE="postgresql://painelmmc:adminpassword@localhost:5432/cenaculodb_test"
```

Se alguma tabela mudar no `prisma/schema.prisma`, rode o `db push` de novo também no banco de testes.

**Proteções:**

- Se `DATABASE_URL_TESTE` não existir, os testes de banco são **pulados** (o `npm test` continua passando).
- Se o nome do banco **não terminar em `_test`**, o teste se recusa a rodar. Isso impede de apontar, sem querer, para o banco real.
- Cada teste cria os próprios dados e apaga tudo no final. O banco de testes fica vazio entre as execuções.

## Como os testes de banco funcionam (por dentro)

Todos os testes com banco seguem o mesmo roteiro:

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
**todos os 298 testes rodam lá**, inclusive os de notas. Os valores de banco e de `SESSION_SECRET` no `ci.yml` são falsos,
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
