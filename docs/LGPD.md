# LGPD: dados pessoais, prazo de guarda e pedidos de exclusão

O que o site guarda, onde, por quanto tempo, e o que a coordenação faz quando alguém pede para apagar ou corrigir os dados. O texto que o
público lê está em `/privacidade` ([app/privacidade/page.tsx](../app/privacidade/page.tsx)); o e-mail de contato e o prazo ficam em
[lib/privacidade.ts](../lib/privacidade.ts), para a página, os termos de consentimento e a rotina de limpeza nunca discordarem.

> Este documento descreve o que o sistema faz. Não substitui orientação jurídica: antes de abrir as inscrições, peça para alguém da
> coordenação (ou quem entenda de LGPD) ler a página `/privacidade` e os dois termos de consentimento.

## 1. Mapa dos dados

| Dado | Onde fica | Quem vê | Prazo de guarda |
| --- | --- | --- | --- |
| Inscrição de adulto: nome, e-mail, telefone, cidade, nascimento, Instagram, paróquia, histórico, como conheceu | Banco (Supabase, São Paulo), tabela `Inscricao` | Coordenação (painel) | 1 ano depois do **fim do evento** |
| Dados de saúde do adulto (problema de saúde, medicação, restrição alimentar, atendimento especial) | `Inscricao` | Coordenação | idem |
| Aceite do adulto (`consentimentoEm`) | `Inscricao` | Coordenação | idem (nulo nas inscrições anteriores à caixinha) |
| Inscrição Kids: criança (primeiro nome, nascimento, saúde) e responsável (nome, telefone, e-mail, parentesco), aceite | `InscricaoKids` | Coordenação | 1 ano depois do fim do evento |
| Lista de espera: nome, e-mail, telefone, tipo de retiro | `PreCadastro` | Coordenação | 1 ano depois do **cadastro** |
| Notas internas da coordenação sobre uma inscrição | `Observacao` | Coordenação | apagadas junto com a inscrição |
| Contas da coordenação: usuário e senha (só o hash) | `Usuario` | Administrador | enquanto a conta existir; conta desativada mantém o histórico das notas |
| Membros e presenças (frequência dos grupos) | `Membro`, `Presenca` | Coordenação | enquanto a pessoa for membro; apagar o membro apaga o histórico dela |
| Fotos da galeria | Cloudinary (o banco guarda só o endereço) | Público | enquanto a coordenação mantiver a foto no ar |
| Cópias de segurança | Arquivos `backups/*.json` do `npm run backup` | Quem guarda o arquivo | 1 ano, depois descartar (ver seção 4) |

**Serviços que guardam dados para nós:** Vercel (hospedagem, não guarda formulários), Supabase (banco, servidor em São Paulo) e Cloudinary (fotos).
O site **não** usa cookies de rastreamento nem ferramentas de estatística; o único cookie é o de sessão da coordenação.

**Quem é o contato:** o e-mail do movimento, mmcenaculopel@gmail.com (aparece na `/privacidade` e nos termos de consentimento).

## 2. Por que 1 ano

Decisão da coordenação: há dois Cenáculos por ano e, no fim do ano, o **Cenaculão**, que é só para quem já fez o curso. Com 1 ano depois do
evento, quem fez um Cenáculo no começo do ano ainda está nos registros quando o Cenaculão acontece. A contagem da inscrição vale a partir
do **fim do evento** (início + duração em dias), e a da lista de espera a partir do cadastro.

## 3. A rotina que apaga o que passou do prazo

Comando (no terminal, na pasta do projeto):

```powershell
npm run lgpd:limpar                 # só MOSTRA o que seria apagado; não apaga nada
npm run lgpd:limpar -- --apagar     # mostra, pede confirmação ("sim") e apaga
```

- Mostra o banco usado (o do `.env`; para a produção, aponte o terminal para ela só naquela janela, como no [BACKUP.md](BACKUP.md)).
- Lista os eventos que já passaram do prazo e quantas inscrições de adultos, inscrições Kids, notas e cadastros da lista de espera seriam apagados.
- Apaga numa transação (ou apaga tudo, ou nada). **O evento em si fica** (nome, data, fotos): não é dado pessoal.
- **Antes de apagar na produção, faça um backup** (`npm run backup`).

**Quando rodar:** uma vez por trimestre, e sempre depois de um evento passar de 1 ano. Sugestão: no começo de janeiro e de julho, depois do Cenaculão e do
primeiro Cenáculo do ano. Se esquecer, nada quebra; os dados só ficam guardados além do prometido, então é bom marcar um lembrete na agenda.

## 4. Cópias de segurança e o prazo

O arquivo de backup é uma foto do banco naquele dia: tem as inscrições (inclusive de crianças) e os hashes de senha. Por isso:

- Guarde só em lugares seguros e **apague os backups com mais de 1 ano**. Assim, qualquer dado apagado do site some também das cópias em até 1 ano.
- Depois de rodar `npm run lgpd:limpar -- --apagar`, os backups **anteriores** ainda têm os dados que acabaram de ser apagados do banco; eles saem quando o
  próprio arquivo for descartado, no máximo 1 ano depois de feito.
- Nunca restaure um backup antigo num banco novo e deixe no ar sem rodar de novo a limpeza (`npm run lgpd:limpar`): ela apaga o que já tinha passado do prazo.

## 5. Roteiro: pedido de exclusão, acesso ou correção

Prazo para responder: **até 15 dias** (está na `/privacidade`). O pedido chega no e-mail mmcenaculopel@gmail.com.

1. **Confirmar quem pede.** Responda ao e-mail pedindo o nome usado na inscrição e o evento. Para criança, só o responsável que fez a inscrição (confira o e-mail e o telefone com os da inscrição). Se o e-mail de quem pede for diferente do cadastrado, peça uma confirmação (por exemplo, uma mensagem pelo telefone cadastrado).
2. **Achar os registros.** No painel (`/painelmmc`): busque em **Inscrições** (nome, e-mail, telefone ou cidade), em **Kids** e na **Lista de Espera**. Lembre de olhar todos os eventos, não só um.
3. **Acesso (a pessoa quer saber o que temos):** copie os dados da ficha completa e envie por e-mail para o endereço **cadastrado**.
4. **Correção:** o painel ainda não edita inscrições. Anote o pedido e, se for um erro simples, apague a inscrição e peça que a pessoa refaça, ou corrija direto no banco com apoio de quem mantém o sistema.
5. **Exclusão:** use o botão **Excluir** da inscrição (adulto ou Kids) e da lista de espera. As notas internas dessa inscrição saem junto, e o painel pede confirmação.
6. **Responder** confirmando o que foi feito. Diga que as cópias de segurança são descartadas em até 1 ano.
7. **Registrar** (planilha ou caderno da coordenação, sem os dados da pessoa): data do pedido, tipo (acesso, correção, exclusão), data da resposta. Serve de prova de que o prazo foi cumprido.

**Atenção:** excluir a inscrição NÃO apaga a pessoa de planilhas já exportadas (Excel) nem de mensagens de grupo. Se a coordenação exportou dados para planilhas, apague os arquivos antigos também.

## 6. O que falta / ideias futuras

- Edição de inscrições pelo painel (hoje a correção é manual).
- Exclusão de uma pessoa em todas as tabelas de uma vez (por e-mail), em vez de buscar em cada tela.
- Lembrete automático (mensal) para rodar a limpeza.
