// Banco fixo de palavras de 5 letras em inglês, com dica em português — a palavra
// do dia é escolhida deterministicamente pela data, sem precisar cadastrar nada.
export const WORDLE_WORDS: { word: string; hint: string }[] = [
  { word: "APPLE", hint: "Fruta vermelha ou verde, bem comum" },
  { word: "BEACH", hint: "Lugar de areia e mar" },
  { word: "BREAD", hint: "Vai na torradeira de manhã" },
  { word: "BRAIN", hint: "Órgão que fica dentro da cabeça" },
  { word: "CHAIR", hint: "Móvel pra sentar" },
  { word: "CLOCK", hint: "Mostra as horas" },
  { word: "CLOUD", hint: "Fica no céu, antes da chuva" },
  { word: "DANCE", hint: "O que você faz numa festa com música" },
  { word: "EARTH", hint: "O planeta onde a gente vive" },
  { word: "FIELD", hint: "Onde se joga futebol" },
  { word: "FRUIT", hint: "Categoria de alimento: maçã, banana, uva..." },
  { word: "GHOST", hint: "Assombra casas em filmes de terror" },
  { word: "GRAPE", hint: "Fruta pequena e redonda, usada no vinho" },
  { word: "HEART", hint: "Órgão que bombeia sangue" },
  { word: "HOUSE", hint: "Onde uma família mora" },
  { word: "HAPPY", hint: "Sentimento de alegria" },
  { word: "LIGHT", hint: "O contrário de escuro" },
  { word: "MONEY", hint: "Usado para comprar coisas" },
  { word: "MONTH", hint: "Período como janeiro ou fevereiro" },
  { word: "MUSIC", hint: "Arte feita de sons e melodias" },
  { word: "NIGHT", hint: "Período do dia em que está escuro" },
  { word: "OCEAN", hint: "Grande massa de água salgada" },
  { word: "PAPER", hint: "Onde se escreve ou imprime" },
  { word: "PARTY", hint: "Comemoração com convidados" },
  { word: "PHONE", hint: "Aparelho para ligar e mandar mensagem" },
  { word: "PLANT", hint: "Precisa de água e sol pra crescer" },
  { word: "RIVER", hint: "Água que corre até o mar" },
  { word: "SMILE", hint: "Expressão facial de alegria" },
  { word: "SOUND", hint: "O que os ouvidos percebem" },
  { word: "SPACE", hint: "Onde ficam as estrelas e planetas" },
  { word: "STORM", hint: "Chuva forte com trovões" },
  { word: "SUGAR", hint: "Deixa o café doce" },
  { word: "TABLE", hint: "Móvel onde se faz refeições" },
  { word: "TEACH", hint: "O que uma professora faz" },
  { word: "TIGER", hint: "Grande felino listrado" },
  { word: "TRAIN", hint: "Anda sobre trilhos" },
  { word: "WATER", hint: "Essencial pra vida, bebemos todo dia" },
  { word: "WORLD", hint: "O planeta Terra e tudo que existe nele" },
  { word: "WRITE", hint: "O que você faz com uma caneta" },
  { word: "YOUTH", hint: "Fase da vida entre a infância e a idade adulta" },
  { word: "ANGRY", hint: "Sentimento de raiva" },
  { word: "BROWN", hint: "Cor da terra e do chocolate" },
  { word: "CANDY", hint: "Doce que crianças adoram" },
  { word: "CLEAN", hint: "O contrário de sujo" },
  { word: "DREAM", hint: "O que acontece quando você dorme" },
  { word: "EMPTY", hint: "O contrário de cheio" },
  { word: "FRESH", hint: "Recém feito, não velho" },
  { word: "GREEN", hint: "Cor da grama" },
  { word: "HOTEL", hint: "Lugar para se hospedar em viagens" },
  { word: "JUICE", hint: "Bebida feita de frutas" },
  { word: "KNIFE", hint: "Usado pra cortar comida" },
  { word: "LEMON", hint: "Fruta amarela e azeda" },
  { word: "MOUTH", hint: "Parte do rosto usada pra falar e comer" },
  { word: "NURSE", hint: "Trabalha em hospital cuidando de pacientes" },
  { word: "OFFER", hint: "Propor algo a alguém" },
  { word: "PEACE", hint: "O contrário de guerra" },
  { word: "QUEEN", hint: "Governante mulher de um reino" },
  { word: "RADIO", hint: "Aparelho que toca música e notícias" },
  { word: "SHARE", hint: "Dividir algo com alguém" },
  { word: "SHIRT", hint: "Peça de roupa pra parte de cima do corpo" },
  { word: "SLEEP", hint: "O que você faz à noite na cama" },
  { word: "SMART", hint: "Inteligente" },
  { word: "SNAKE", hint: "Réptil sem pernas" },
  { word: "SOUTH", hint: "Direção oposta ao norte" },
  { word: "SPORT", hint: "Atividade física como futebol ou natação" },
  { word: "STONE", hint: "Pedra" },
  { word: "SWEET", hint: "Sabor do açúcar" },
  { word: "THANK", hint: "O que você diz quando alguém te ajuda" },
  { word: "TOOTH", hint: "Fica dentro da boca, usado pra mastigar" },
  { word: "TOUCH", hint: "Sentido usado com as mãos" },
  { word: "UNCLE", hint: "Irmão do seu pai ou da sua mãe" },
  { word: "VOICE", hint: "O som que sai quando você fala" },
  { word: "WATCH", hint: "Relógio de pulso, ou assistir algo" },
  { word: "WHEEL", hint: "Peça redonda que gira, tem em carros" },
  { word: "WOMAN", hint: "Mulher adulta" },
];

function dailyIndex(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }
  return hash % WORDLE_WORDS.length;
}

export function getWordOfTheDay(date: string): { word: string; hint: string; letterCount: number } {
  const entry = WORDLE_WORDS[dailyIndex(date)];
  return { word: entry.word, hint: entry.hint, letterCount: entry.word.length };
}

// O servidor roda num fuso diferente do Brasil — calcula a data sempre pelo
// horário de Brasília, senão a palavra do dia troca no horário errado.
const BRAZIL_TZ = "America/Sao_Paulo";

export function todayDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BRAZIL_TZ }).format(new Date());
}
