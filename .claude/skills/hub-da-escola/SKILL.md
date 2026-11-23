---
name: hub-da-escola
description: Guia pra fazer o portal da Teacher Kessia crescer como "hub da escola" (report de aula, diário interno, duplas/trios, report card, pacotes, avisos, agenda) seguindo o modelo do hub da Queens Idiomas, mas no sistema que já existe (React + servidor próprio + SQLite). Use quando a Kessia pedir uma funcionalidade nova de gestão da escola/alunos no portal, falar em "hub", report de aula, relatório/report card, turma, dupla, pacote de horas, ou digitar /hub-da-escola.
---

# Hub da escola — adaptado ao portal da Teacher Kessia

Origem: skill "hub-escola-de-ingles" (hub da Queens Idiomas / 4EnglishTeachers), que monta um
hub do zero em Google Planilhas + Apps Script + Netlify. **Aqui a realidade é outra**:

- O portal **já existe** e está no ar (`teacherkessialima.com.br/portal`). Nada de planilha,
  Apps Script ou Netlify — o "banco de dados" é o SQLite do servidor, as telas são o React em
  `frontend/`, o "porteiro" é o servidor Fastify em `server/`. Ver `CLAUDE.md`.
- A escola é **uma professora só** (a Kessia). Não existem papéis "sócia" e "teacher" separados:
  só **professora** (`teacher`, e-mail do domínio `teacherkessialima.com.br`) e **aluno**.
  Ignore tudo da skill original sobre repasse de teacher, disponibilidade da equipe, mural das
  sócias, fechamento do mês — só volte a isso se ela disser que contratou outros professores.
- O modelo de venda é **contrato mensal** (preço por hora/aula dia/noite × individual/dupla/trio,
  desconto por 3/6/9/12 meses), não pacote de horas. Pacote de horas só se ela pedir.
- Publicação é automática: enviar a mudança pro `main` → o site e o servidor se atualizam
  sozinhos em alguns minutos. Não existe "colar código", "nova versão da implantação" nem
  "arrastar arquivo" pra ela fazer.

Use a skill original como **cardápio de ideias e de boas regras**, não como receita técnica.

## Como trabalhar com ela

- Fale em português simples (regras do `CLAUDE.md`). "O registro da aula guarda o que cada aluno
  fez naquela aula" em vez de "tabela com chave estrangeira".
- **Uma coisa por vez.** Se ela pedir várias funcionalidades juntas, proponha a ordem (tabela
  abaixo), explique em uma frase por que, e comece pela primeira. Só passe pra próxima quando ela
  tiver usado a anterior de verdade.
- **Pergunte só o que muda a construção**, com opções concretas (ex.: "o resumo da aula: você
  quer escrever na hora, logo depois da aula, ou no fim do dia pra todas?"). O resto, decida pelos
  padrões abaixo e diga quais usou.
- **Antes de mexer**, confira o que já existe — boa parte do hub da Queens já está pronta aqui
  (tabela "O que já existe"). Reaproveite tela e tabela existentes em vez de criar paralelas.
- **Teste antes de publicar**: rode o servidor e o site localmente (`.claude/launch.json`), teste
  como professora e como aluno, e confira que o aluno **não** recebe o que é só da professora
  (testando a rota direto, não só a tela).
- **Confirme antes de publicar** em termos do resultado ("vou colocar no ar: na página do aluno
  vai aparecer a aba Registro de aulas…") e, depois, diga onde ela vê (link + o que esperar).
- Nunca use dados reais de alunos em exemplos, prints ou demonstrações.

## O que já existe (mapa Queens → portal)

| Hub da Queens | No portal hoje | Onde |
| --- | --- | --- |
| Login, sessão, troca de senha, bloqueio por tentativas | ✅ (+ convite por link, passkey, "sair de todos") | `server/src/modules/auth`, `webauthn`, `lib/rate-limit.ts` |
| Fichas dos alunos (Alunos) | ✅ `users` + `student_profiles` (nível, horário fixo, contrato, pasta do Drive, metas, interesses, observações) | `/portal/alunos`, `/portal/alunos/:id` |
| Aulas | ⚠️ parcial: `lessons` = agendamento (data, assunto, link da aula/atividade, presença sim/não, reposição). **Não tem report pedagógico** | `/portal/aulas`, `modules/lessons` |
| Diário da equipe (notas internas) | ⚠️ só `student_profiles.notes` (um campo livre) | página do aluno |
| Turmas / duplas / curso em grupo | ❌ (o preço tem dupla/trio, mas cada aluno é uma ficha solta) | — |
| Relatórios (report card) | ❌ | — |
| Área do aluno | ✅ atividades, vocabulário/flashcards, trilha, recursos, fórum, calendário, financeiro, teste de nível, Wordle | `/portal/*` |
| Homework | ✅ via Atividades ("Feita por você", listening) + skill `/atividade-do-pdf` | `modules/activities` |
| Pacotes de horas | ❌ (usa contrato mensal) | — |
| Financeiro (parcelas) | ✅ `payments` (+ boleto em PDF, gerar mês) | `/portal/financeiro` |
| Leads / Propostas / Contratos com aceite | ✅ Orçamentos → contrato + ZapSign (sem funil de leads) | `/portal/orcamentos`, `/portal/contratos` |
| Config (listas e valores) | ✅ `app_settings` (preços, teste de nível…) | `/portal/configuracoes` |
| Avisos | ✅ `notices` (sem "ciente"/lidos) | `modules/notices` |
| Calendário / recessos | ✅ `days_off` + feriados automáticos | `/portal/calendario` |
| Aniversários | ✅ `GET /api/birthdays/today` | — |
| Pendências, agenda da semana, Log de alterações | ❌ | — |
| Backup | ⚠️ conferir no VPS antes de prometer (arquivo SQLite em `server/data`) | — |

## Ordem sugerida do que falta

| # | O quê | Pronto quando |
| --- | --- | --- |
| 1 | **Report de aula**: completar `lessons` com o registro pedagógico (abaixo) | ela registrar uma semana inteira de aulas |
| 2 | **Diário interno** por aluno (anotações datadas, só professora) | ela parar de usar o campo "observações" pra isso |
| 3 | **Duplas/trios** (turma que junta fichas) + registrar aula da dupla de uma vez | uma dupla real registrada nos dois alunos de uma vez |
| 4 | **Report card** de um período, em PDF | um relatório de semestre entregue a um aluno |
| 5 | Extras sob pedido: agenda da semana na tela inicial, "alunos sem registro há +8 dias", avisos com "ciente", pendências, pacote de horas, funil de leads | — |

## Regras que não mudam (adaptadas)

1. **O SQLite do servidor é o único banco.** A tela nunca guarda dado "de verdade" só no
   navegador.
2. **O servidor é o porteiro.** Toda rota nova usa `requireTeacher` ou `requireAuth`
   (`server/src/auth/guards.ts`) e, pra aluno, filtra pelo `studentId` da sessão. Esconder na
   tela não é segurança — muitos alunos são desenvolvedores e vão testar a rota direto.
3. **Ligações sempre por id** (`studentId`, `lessonId`…), nunca por nome.
4. **O aluno é o centro**: tudo que é dele aponta pra `users.id` do aluno.
5. **Registrar uma vez, usar em todo lugar**: o report de aula alimenta a página do aluno, o
   histórico, a área do aluno e o report card. Não crie campo duplicado em outro lugar.
6. **Uma ficha por aluno.** Dupla/trio é uma turma que junta fichas, nunca uma ficha com dois
   nomes.
7. **Mudança no banco só acrescenta**: tabela nova com `CREATE TABLE IF NOT EXISTS` e coluna nova
   com `ALTER TABLE … ADD COLUMN` protegido (padrão de `server/src/db/client.ts`), espelhado em
   `schema.ts`. Nunca apagar/renomear coluna com dado.
8. **Interno nunca chega ao aluno**: diário, resumo interno da aula, comentários da professora.
   Separe no servidor o que vai pro aluno (rotas `/api/me/...`) do que é só da professora.
9. **Nada é enviado sozinho**: e-mail/WhatsApp pra aluno só com ação explícita dela na tela.
10. **Backup antes de mudança em massa** (importação, limpeza): cópia do arquivo do banco no
    servidor antes de rodar.
11. Nunca peça nem digite senhas/chaves dela. Chave de serviço vai em secret do GitHub → `.env`
    do servidor (como Resend/ZapSign), e você diz onde ela mesma cola.

## Report de aula (passo 1)

Um registro por aluno por aula. Estender `lessons` (ou tabela `lesson_reports` ligada a
`lessons.id`, se ficar mais limpo). Padrões (listas editáveis em Configurações, `app_settings`):

| Campo | Valores padrão | Quem vê |
| --- | --- | --- |
| status | Aula dada; Reposição; Experimental; Cancelada pelo aluno com antecedência; Cancelada pelo aluno sem antecedência; Cancelada pela professora; Feriado; Férias | aluno vê simplificado |
| duração | 1:00; 1:30; 2:00 | ambos |
| presença | Chegou no horário; Entrou atrasado | professora |
| fez o homework? | Sim; Não; Não se aplica | professora |
| participação | Excelente; Boa; Média; Ruim | professora |
| uso do português | Nulo; Pouco; Médio; Muito | professora |
| skills | Speaking; Listening; Reading; Writing; Grammar; Vocabulary | ambos |
| material / link | texto | ambos |
| resumo interno, comentários | texto | **só professora** |
| homework pro aluno, links, recado | texto | aluno vê na área dele |
| homework feito | marcado pelo aluno | ambos |

- "Realizada" = Aula dada, Reposição, Experimental. Os outros status não pedem presença,
  homework, participação nem skills.
- Não aceita data futura em "Aula dada".
- Hoje o campo `attended` é sim/não — migrar com cuidado: manter `attended` coerente com o status
  novo (o calendário e as reposições dependem dele).
- Homework do aluno pode apontar pra uma Atividade do portal em vez de texto solto.
- Sinais nas listas: atrasado / homework "Não" / participação Média / português Médio = atenção;
  participação Ruim / português Muito = alerta. Placar das últimas 8 aulas na página do aluno
  ("6 de 8 no horário", "5 de 7 com homework").

## Duplas e trios (passo 3)

- Tabela de turmas (`classes`: nome, tipo Dupla/Trio/Grupo, ids dos alunos, horário, link da aula).
- Cada aluno continua com a própria ficha, contrato e cobranças (o contrato já sai por aluno).
- "Registrar aula da dupla": a parte comum (data, status, duração, material, skills, homework,
  recado) uma vez, e um bloco por aluno (presença, homework, participação, português, observação
  → vira entrada do diário). Grava **um registro por aluno**.

## Report card (passo 4)

- Período escolhido (atalhos: este semestre, semestre passado, últimos 3 meses, este ano).
- **Números calculados no servidor, na hora** (nunca digitados): aulas realizadas, horas,
  canceladas pelo aluno / pela professora; presença % = realizadas ÷ (realizadas + canceladas
  pelo aluno); homework % = Sim ÷ (Sim + Não); pontualidade %; % de cada skill; distribuição de
  participação e uso do português (rótulos pro aluno: Nulo = "Só inglês", Pouco = "Quase todo em
  inglês", Médio = "Metade em português", Muito = "Muito português"). Pode cruzar com o nível do
  Teste de nível e atividades feitas.
- Textos editáveis guardados junto (título, frase de abertura, parágrafos, conteúdos, destaques,
  3 focos pro próximo período, fechamento). Rascunho/Finalizado.
- **Texto com o Claude**: em vez de "copiar e colar pedido", o Claude pode ler os registros pelo
  MCP `kessia-portal` (`portal_get`) e escrever o rascunho direto (via `portal_request`), sem
  inventar nada que não esteja nos registros. Ela revisa antes de finalizar.
- Documento A4 pra imprimir/salvar PDF, no mesmo esquema de `/contrato/:id` (página fora do
  layout do portal) e identidade visual dela (lilás/off-white/Montserrat).
- O aluno só vê relatório **finalizado**, e nunca o resumo interno nem o diário.

## Trazer dados de outro lugar (Notion, planilha)

Já existem importadores em `server/src/db/import-notion-*.ts` — reaproveite o padrão.

1. Combine com ela quem manda em cada campo; escreva a regra e confirme.
2. Campo vazio nunca apaga o que já existe.
3. Case registros por id/e-mail; sem isso, por nome normalizado (sem acento, minúsculas) — nome
   curto e repetido nunca casa sozinho.
4. Mostre o plano antes de gravar: quantos mudam, quantos novos, e a lista de casos duvidosos.
   Ela decide cada duvidoso; você não apaga nada.
5. Backup do banco, depois grava tudo de uma vez (transação).
6. Conte a ela o que mudou e o que ficou pra decidir.

## Padrões de tela

- Siga o visual que o portal já usa (shadcn/ui, componentes existentes); nenhuma tela rola pros
  lados no celular (tabela vira cartão).
- Erro dentro do formulário, botão "Salvando…", confirmação antes de apagar (modal, nunca
  `alert()`), datas DD/MM na tela e `YYYY-MM-DD` no banco, listas com contagem e estado vazio
  dizendo o que fazer.
- Item novo de menu só se fizer sentido no dia a dia dela; senão, aba dentro da página do aluno.

## Ao terminar cada passo

- Atualize o `CLAUDE.md` (seção "Decisões e histórico relevante") com o que foi criado.
- Diga a ela, sem jargão, o que mudou, onde ver (link) e o que testar.
