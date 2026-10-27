# Go-live: checklist para abrir as inscrições de verdade

Marque cada item quando estiver feito. A ordem importa: dados de teste e backup primeiro, ensaio por último.
O que é do Derick (Supabase, Vercel, SQL) e o que é da coordenação está indicado em cada item.

## 0. Antes de tudo: backup

- [ ] `npm run backup` apontando para a produção ([BACKUP.md](BACKUP.md)). Guarde o arquivo em dois lugares. Isso permite desfazer a limpeza da seção 2 se algo sair errado.

## 1. Textos e conteúdo (coordenação)

- [ ] **Alguém da coordenação (ou quem entenda de LGPD) lê a página `/privacidade`** e confirma que tudo o que está escrito é verdade para o movimento (quais dados, quem vê, prazo de 1 ano, e-mail de contato, resposta em até 15 dias). A página é uma promessa pública.
- [ ] Lê os dois **termos de consentimento**: adulto em `lib/privacidade.ts` (`TEXTO_CONSENTIMENTO_ADULTO`) e Kids em `lib/kids.ts` (`TEXTO_CONSENTIMENTO`). Qualquer mudança de texto é feita por mim/quem mantém o código.
- [ ] Confere a página **Sobre** e a **Home**: os três grupos de pós-Cenáculo ainda dizem "Local a combinar previamente" (em `app/sobre/page.tsx`); veja se é isso mesmo que vocês querem mostrar ao público.
- [ ] O rodapé da Home diz "© 2025": atualizar para o ano certo (ou tirar o ano).
- [ ] O e-mail do rodapé e da `/privacidade` (mmcenaculopel@gmail.com) é lido por alguém com frequência? Esse é o canal dos pedidos de exclusão/correção (resposta em até 15 dias).
- [ ] Os links das redes sociais do rodapé (YouTube, Facebook, Instagram) abrem as páginas certas.

## 2. Limpar os dados de teste (Derick, no Supabase)

Só depois do backup da seção 0. Rode **primeiro os `SELECT`** para ver o que existe; só apague o que for de teste.

```sql
-- O que existe hoje
SELECT id, nome, tipo, status, "dataInicio" FROM "Evento" ORDER BY "dataInicio";
SELECT e.nome,
       (SELECT count(*) FROM "Inscricao" i WHERE i."eventoId" = e.id) AS adultos,
       (SELECT count(*) FROM "InscricaoKids" k WHERE k."eventoId" = e.id) AS kids
FROM "Evento" e ORDER BY e."dataInicio";
SELECT count(*) AS lista_de_espera FROM "PreCadastro";
SELECT nome, papel, ativo, "criadoEm" FROM "Usuario" ORDER BY "criadoEm";
```

- [ ] **Inscrições e lista de espera de teste** (se TODAS forem de teste; as notas internas saem junto):

```sql
DELETE FROM "Inscricao";
DELETE FROM "InscricaoKids";
DELETE FROM "PreCadastro";
DELETE FROM "LimiteTentativa"; -- zera os contadores de tentativas (login e inscrição)
```

- [ ] **Eventos de teste** (apagar um evento apaga também as inscrições e as fotos dele; troque pelo `id` do `SELECT` acima):

```sql
DELETE FROM "Evento" WHERE id IN ('COLE-AQUI-O-ID-DO-EVENTO-DE-TESTE');
```

- [ ] **Contas de teste:** desative pelo painel (**Usuários → Desativar**) em vez de apagar: uma conta que escreveu notas não pode ser apagada sem apagar o histórico. Convites que sobraram aparecem ali como revogáveis.
- [ ] **Fotos de teste na galeria** (como a captura de tela que foi enviada nos testes): remova pelo painel, ou apague o evento de teste.

## 3. Eventos reais (coordenação, pelo painel)

- [ ] Criar cada evento em **Gerenciar Eventos**: nome, tipo (Cenáculo, Kids, Cenaculão), data de início, **duração em dias** (a rotina de limpeza conta pelo fim do evento), **capa** e **data de abertura** das inscrições (ou deixar o status manual).
- [ ] Conferir no **Calendário** público como o cartão aparece (a capa só aparece se enviada na criação; as fotos da galeria entram em "Ver Fotos da Edição" depois do evento).
- [ ] Testar se o status está certo: o evento só aceita inscrição quando está **Aberto** (o servidor confere; esconder o formulário não basta).
- [ ] Kids: confirmar a faixa etária combinada (8 a 10 anos; fora da faixa a inscrição é aceita e a equipe é avisada no painel).

## 4. Contas da coordenação (Derick)

- [ ] Quem vai ver o painel tem conta própria, criada por convite (**Usuários → Gerar convite**; vale 48 horas e só funciona uma vez). Não compartilhe a senha de ninguém.
- [ ] Desativar contas de teste (seção 2).
- [ ] O administrador (só o Derick) tem senha forte e guardada. Se esquecer, `npm run admin:redefinir-senha` (precisa do banco da produção; ver [README](../README.md)).
- [ ] Combinar **quem olha o painel** e com que frequência durante as inscrições (ver seção 7).

## 5. Infraestrutura (Derick)

- [ ] **Vercel:** variáveis de ambiente de produção só estas: `DATABASE_URL`, `SESSION_SECRET` e `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (`ADMIN_PASSWORD` já foi apagada). Build Command padrão (`npm run build`).
- [ ] **Domínio:** hoje o site é `mmcenaculo.vercel.app`. Se for usar um domínio próprio, configurar na Vercel (**Settings → Domains**), esperar o HTTPS ficar ativo e atualizar os links de divulgação. O endereço antigo da Vercel continua funcionando.
- [ ] **Supabase, plano grátis:** o banco não tem backup automático (ver [BACKUP.md](BACKUP.md)). Confira também a regra de **pausa por inatividade** do plano grátis (projetos sem uso por cerca de 1 semana podem ser pausados, e o site para de funcionar até alguém reativar): se houver um período longo sem inscrições, entre no painel do Supabase de vez em quando, ou considere o plano pago perto do evento.
- [ ] **Vercel, plano Hobby:** confira nos termos do plano se o uso pelo movimento se enquadra (o Hobby é para uso pessoal/não comercial).
- [ ] O **CI no GitHub** está verde na `main` (testes e e2e).
- [ ] `npm audit --omit=dev`: só devem restar os 3 avisos conhecidos do `next-cloudinary` ([SEGURANCA.md](SEGURANCA.md)).

## 6. Ensaio final (Derick + 1 pessoa da coordenação)

Faça tudo **no celular**, pela internet comum (não no Wi-Fi do computador), com os eventos reais já criados e abertos:

- [ ] **Inscrição de adulto** de ponta a ponta, marcando o consentimento. Depois confira no painel: a ficha tem a data do consentimento, o evento certo e as informações de saúde.
- [ ] **Inscrição Kids**, com o termo do responsável. Confira no painel (Inscrições Kids) e a flag de "fora da faixa" se a idade for diferente.
- [ ] **Lista de espera** (se houver algum evento fechado ou sem vaga aberta).
- [ ] Tentar se inscrever **sem marcar o consentimento**: não deve enviar.
- [ ] **Planilhas:** baixe Inscritos, Kids e Frequência e abra no Excel: as colunas estão certas e os acentos aparecem direito.
- [ ] Entrar no painel pelo celular: o menu, a busca e os botões funcionam?
- [ ] **Apagar as inscrições do ensaio** (pelo painel, botão Excluir) antes de divulgar.

## 7. Depois de abrir

- [ ] **Todo dia, enquanto as inscrições estiverem abertas:** alguém abre o painel, confere se as inscrições estão chegando e olha a **Lista de Espera** (quem se cadastrou para ser avisado).
- [ ] O site **não envia e-mail de confirmação** ao inscrito: a pessoa só vê a tela de "Inscrição Confirmada". Combinem como a coordenação vai retornar (WhatsApp, e-mail) e em quanto tempo.
- [ ] **Backup** (`npm run backup`): ao fechar as inscrições e depois do evento. Guarde por, no máximo, 1 ano.
- [ ] **Limpeza por prazo** (`npm run lgpd:limpar`): no começo de janeiro e de julho (ver [LGPD.md](LGPD.md)). Marque na agenda.
- [ ] **Pedidos de dados:** o roteiro está em [LGPD.md](LGPD.md), seção 5 (resposta em até 15 dias).
- [ ] **Se algo quebrar:** Vercel → Deployments → o último deploy → *Logs*; no Supabase, a tela de *Logs*. E o `npm run test:e2e` e o `npm test` no computador mostram se foi uma mudança de código.

## 8. Fora do escopo agora (ideias para depois)

Editar inscrições pelo painel, e-mail de confirmação, usar a primeira foto da galeria como capa de evento concluído, relatórios por paróquia. Ver o passo 13 do cronograma.
