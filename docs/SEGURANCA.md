# Segurança: o que existe, por quê, e quais são os limites

Este documento explica as proteções do site, os valores escolhidos (e o motivo) e o que elas **não** resolvem. Os valores dos limites ficam
em um só lugar, `LIMITES` em [lib/limite.ts](../lib/limite.ts); se mudar um número lá, atualize a tabela abaixo.

## 1. Limite de tentativas

Cada ação tem um contador por "chave" (o IP do visitante, ou o nome de usuário digitado no login). Passou do máximo dentro da janela de tempo,
o site recusa com "Muitas tentativas. Tente novamente em X minutos." A janela é **fixa**: ela abre na primeira tentativa e, vencido o tempo,
a contagem recomeça do zero. O bloqueio não é permanente: é só esperar.

| Ação | Quem é contado | Máximo | Janela | O que é contado |
| --- | --- | --- | --- | --- |
| Inscrição (adulto e Kids) | IP | 10 | 10 min | cada envio do formulário |
| Lista de espera (pré-cadastro) | IP | 5 | 10 min | cada envio |
| Criar conta pelo link de convite | IP | 10 | 15 min | cada tentativa |
| Login | usuário digitado | 5 | 15 min | só as **senhas erradas** |
| Login | IP | 10 | 15 min | só as **senhas erradas** |

### Por que esses números

- **Inscrição e lista de espera são generosas de propósito.** Muita gente pode se inscrever do mesmo Wi-Fi (um grupo de jovens no mesmo
  lugar, uma paróquia). Um limite apertado barraria pessoas de verdade.
- **Login conta só as falhas**, não os acessos certos: entrar certo não gasta tentativa, e um login bem-sucedido zera as falhas daquele usuário.
- **O teto por IP (10) é maior que o por usuário (5).** Decisão do Derick: na coordenação todos usam o mesmo Wi-Fi, então se alguém errar a
  senha várias vezes não deve travar os outros. O limite por usuário ficou igual ao original (5); só o do IP foi aumentado. Mesmo assim, um
  IP que tenta muitos nomes diferentes ainda é bloqueado.
- **O limite por usuário vale para nomes que não existem também.** Assim ninguém descobre, pelo comportamento do bloqueio, quais usuários existem.
  A mensagem de erro do login é sempre a mesma ("Usuário ou senha incorretos") e o tempo de resposta também (o site gasta o mesmo tempo
  conferindo uma senha falsa).

### Como funciona por dentro

- Os contadores ficam na tabela `LimiteTentativa` do Postgres, não na memória do servidor: na Vercel cada execução é separada e não
  compartilha memória, então um contador em memória não funcionaria.
- Cada tentativa é uma única operação atômica no banco (`INSERT ... ON CONFLICT DO UPDATE`): envios simultâneos não conseguem furar o limite.
- O relógio usado é o do banco, para todas as execuções concordarem.
- Contagens com mais de 24 horas são apagadas de vez em quando (1 chance em 100 a cada tentativa).
- O IP vem do cabeçalho `x-forwarded-for`, que na Vercel é preenchido pela própria Vercel (o visitante não consegue forjá-lo). No computador local
  esse cabeçalho não existe e todos contam como "desconhecido".

### Limites conhecidos

- **IP compartilhado:** muita gente atrás do mesmo IP (um Wi-Fi) divide a mesma cota. Por isso os valores são folgados.
- **Quem muda de IP** (rede de celular, VPN) escapa do limite por IP. O limite por usuário no login continua valendo.
- O limite **desacelera** um ataque; não é uma defesa contra um ataque grande e distribuído.

## 2. Proteção contra robôs (honeypot)

Os formulários públicos (inscrição adulto, Kids e lista de espera) têm duas armadilhas que uma pessoa de verdade nunca aciona:

1. **Campo isca:** um campo escondido chamado `website`. Pessoa não vê, mas robôs costumam preencher tudo. Se vier preenchido, é robô.
   Ele fica **fora da tela** (e não com `display:none`, que robôs mais espertos reconhecem), é ignorado por leitores de tela e pelo teclado.
2. **Tempo mínimo:** se o formulário for enviado menos de **1 segundo** depois de aberto, é robô.

Quando parece robô, o servidor **finge que deu certo** e descarta, para o robô não perceber que foi barrado e tentar outro jeito.

### Por que 1 segundo

Decisão do Derick. Um tempo maior (como 3 segundos) barraria pessoas de verdade que usam o **preenchimento automático** do navegador
(nome, e-mail e telefone preenchidos de uma vez, e a pessoa só clica em enviar). Com 1 segundo, a proteção ainda pega envios instantâneos de robô
sem atrapalhar quem usa o autopreenchimento.

### O bug do campo escondido (corrigido)

A primeira versão guardava o horário de abertura num `<input type="hidden">`. O React **apaga o valor de campos escondidos** toda vez que o
formulário atualiza (a cada tecla digitada, por exemplo). Resultado: todo envio chegava ao servidor sem o horário e era tomado por robô, ou seja,
**inscrições de pessoas reais eram descartadas em silêncio**, com a tela dizendo que tinha dado certo.

Correção: o horário agora fica na memória do componente (uma `ref`, em `app/inscricao/antiRobo.tsx`) e é juntado ao envio na hora de enviar.
Há um teste que reproduz o formulário no navegador simulado e confere que o horário chega ao servidor.

**Lição para o futuro:** como o robô é enganado com uma mensagem de "sucesso", um erro nessa proteção é **silencioso**. Depois de mexer em formulários
públicos, sempre faça uma inscrição de verdade e confira que ela apareceu no painel.

### Limites conhecidos

- O horário de abertura vem do navegador, então um robô esperto consegue falsificá-lo. O honeypot barra os robôs simples, que são a maioria; não é
  uma barreira contra um ataque feito de propósito contra este site.
- Se aparecer muito spam passando, o próximo passo seria um desafio estilo CAPTCHA (Cloudflare Turnstile, por exemplo). Hoje não há necessidade.

## 3. Login e contas do painel

- **Sessão:** cookie `httpOnly`, assinado com HMAC-SHA256, válido por 8 horas. Ele guarda só o identificador da conta.
- **Conferência no banco a cada acesso:** cada página, rota de API e ação do painel confere de novo se a conta existe, está ativa e se o cookie não
  foi emitido antes de uma redefinição de senha. Por isso desativar uma conta (ou redefinir a senha) **vale na hora**, mesmo com a pessoa logada.
  Um teste (`app/painelmmc/protecao.test.ts`) falha se alguma página ou rota do painel esquecer essa conferência.
- **Senhas:** bcrypt, mínimo de 10 caracteres (máximo de 72 bytes, que é o que o bcrypt usa). Não existe senha provisória.
- **Contas por convite:** o administrador cria um link de uso único, válido por 48 horas, com o usuário já escolhido; o código do link não é
  guardado (só o hash). Convite só cria conta de coordenação. O único administrador nasce pelo script `npm run admin:criar`.
- **Painel escondido:** quem não está logado vê "não encontrado" em qualquer endereço de `/painelmmc` (só `/painelmmc/login` aparece). O painel não é
  indexado por buscadores (cabeçalho `X-Robots-Tag`; de propósito **não** há `robots.txt`, que serviria de mapa para quem procura o painel).
- **Quem já está logado** e abre `/painelmmc/login` vai direto para o painel.

## 4. Banco de dados

- **RLS ligado em todas as tabelas** do Supabase. O site conecta como dono das tabelas e não é afetado; quem tentar usar a API pública do Supabase
  não consegue ler nem gravar nada. Se uma tabela nova for criada, ligue a trava nela também (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- **Mudanças no banco de produção** só por SQL revisado e testado antes (ver README, seção Deploy). O build da Vercel não mexe no banco.
- **Backup:** manual, ver [BACKUP.md](BACKUP.md).

## 5. O que ainda falta (passos 9 e 11 do cronograma)

- LGPD: texto de consentimento revisado, aviso de privacidade, prazo de guarda e roteiro de exclusão de dados.
- Cabeçalhos de segurança (CSP) e as vulnerabilidades apontadas pelo `npm audit` (nenhuma vem de pacotes adicionados nos passos anteriores).
