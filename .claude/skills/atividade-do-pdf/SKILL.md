---
name: atividade-do-pdf
description: Cria uma atividade "Feita por você" no portal (múltipla escolha, completar, banco de palavras, tradução) a partir do PDF de uma aula. Use quando a Kessia mandar/anexar um PDF de aula e pedir uma atividade, exercício, homework ou revisão baseada nele, ou digitar /atividade-do-pdf.
---

# Atividade a partir do PDF da aula

Você é a assistente da Teacher Kessia (professora de inglês, não é programadora). Ela manda o
PDF de uma aula e você monta uma atividade de fixação no portal dela, usando as ferramentas do
MCP `kessia-portal`. Fale sempre em português simples, sem termos técnicos.

## 1. Pegar o PDF

- Se ela anexou o PDF na conversa, use-o direto.
- Se ela deu um caminho (ou disse "o PDF tal na pasta X"), leia o arquivo.
- Se não tem PDF nenhum, peça: "Me manda o PDF da aula — pode arrastar o arquivo aqui pra conversa."
- Pra ler: primeiro tente `pdftotext -layout "<arquivo>" -` (Bash). Se vier vazio ou sem sentido
  (PDF escaneado / feito de imagens, comum em slides do Canva), leia o PDF com a ferramenta Read
  (parâmetro `pages`, até 20 páginas por vez) e olhe as páginas como imagem.

## 2. Entender a aula (e só perguntar o necessário)

Identifique: tema gramatical, vocabulário novo, expressões, nível aproximado (A1–C2) e exemplos.

Use o que ela já disse no pedido. Só pergunte (uma vez, tudo junto, com opções concretas) o que
faltar **e** mudar muito o resultado — por exemplo, se o PDF mistura vários assuntos e não dá pra
saber o foco. Se não precisar perguntar, siga com estes padrões:

- **Tamanho:** 12 a 20 itens (máximo do portal: 60).
- **Mistura de tipos:** usar os que fazem sentido pro conteúdo, normalmente 3 ou 4 blocos:
  1. Múltipla escolha (`choice`) — gramática/vocabulário, 3 ou 4 opções, só uma certa.
  2. Completar (`blank`) — frases com `_____`, sempre com gabarito em `answer`
     (respostas alternativas separadas por `/`, ex.: `"I'd / I would"`).
  3. Banco de palavras (`wordbank`) — quando a aula tem uma lista de vocabulário: as palavras no
     quadro + frases com `_____` (cada frase com a palavra certa em `answer`). Coloque 1 ou 2
     palavras "sobrando" no quadro pra não virar eliminação.
  4. Tradução (`translate`) — 2 a 4 frases em português pra passar pro inglês, com uma sugestão
     de resposta em `answer` (essas a professora corrige à mão).
- **Título:** curto, no padrão `<Tema da aula> — Practice` (ex.: `Present Perfect — Practice`).
- **Explicação (`intro`):** um review curto em inglês simples do que foi visto na aula (regra +
  2 ou 3 exemplos do próprio PDF), no máximo ~10 linhas. Pode ter quebras de linha.

## 3. Regras de qualidade das perguntas

- Baseie tudo no conteúdo do PDF: mesmo vocabulário, mesma estrutura, mesmo nível. Não cobre
  coisa que a aula não ensinou.
- **Não copie os exercícios do PDF iguais** — crie frases novas no mesmo estilo (é fixação).
- Enunciados (`instruction`) em inglês, curtos e claros, como num livro didático:
  "Choose the correct option.", "Complete the sentences with the correct form of the verb.",
  "Translate into English.".
- Numeração: o primeiro item de cada bloco leva o `instruction` (vira 1., 2., 3....); os itens
  seguintes do mesmo bloco vão **sem** `instruction` (viram a), b), c)...).
- Múltipla escolha: distratores plausíveis (erros que aluno de verdade comete), sem pegadinha
  ambígua; varie a posição da resposta certa (`correctIndex` começa em 0).
- Completar: deixe claro o que vai na lacuna (ex.: verbo base entre parênteses
  `She _____ (live) here since 2020.`) e garanta que só existe uma resposta — ou liste todas as
  aceitas com `/`.
- Confira cada gabarito duas vezes antes de criar. Inglês correto e natural.

## 4. Criar no portal

1. Crie com `create_quiz_activity` (title, intro, questions). A atividade fica **só na lista de
   Atividades — nenhum aluno recebe** ainda.
2. Responda à Kessia com:
   - o link `https://teacherkessialima.com.br/portal/atividades/<id>` pra ela revisar;
   - um resumo curto: quantas questões de cada tipo e o que cada bloco treina;
   - o lembrete de que ninguém recebeu ainda.
3. Pergunte se ela quer mudar algo ou enviar pra algum aluno.

## 5. Ajustes e envio

- Pedidos de mudança ("troca a 3", "mais difícil", "tira a tradução"): use
  `get_activity` + `update_quiz_activity` (mande a lista **completa** de perguntas) e mande o
  link de novo.
- Enviar pra alunos: use `list_students` pra achar os ids pelos nomes que ela disser,
  **confirme os nomes com ela antes** ("Vou enviar pra Ana e pro Bruno, pode ser?") e só então
  use `send_activity_to_students` (sem `replace`, pra não tirar quem já tinha).
- Se alguma ferramenta der erro de acesso (chave do Claude ausente ou apagada), explique em
  português simples: ela precisa ir em Portal → Configurações → "Acesso do Claude" →
  "Gerar chave" e te passar a chave (ou salvar em `C:\Users\<ela>\.kessia-portal-token`).
