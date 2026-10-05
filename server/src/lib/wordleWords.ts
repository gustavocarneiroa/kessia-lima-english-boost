// Banco fixo de palavras de 5 letras em inglês, com dica em inglês — a palavra
// do dia é escolhida deterministicamente pela data, sem precisar cadastrar nada.
export const WORDLE_WORDS: { word: string; hint: string }[] = [
  { word: "APPLE", hint: "A common red or green fruit" },
  { word: "BEACH", hint: "A sandy place next to the sea" },
  { word: "BREAD", hint: "You toast it for breakfast" },
  { word: "BRAIN", hint: "The organ inside your head that you think with" },
  { word: "CHAIR", hint: "Furniture you sit on" },
  { word: "CLOCK", hint: "It shows you the time" },
  { word: "CLOUD", hint: "White or gray, floats in the sky before rain" },
  { word: "DANCE", hint: "What you do at a party when music plays" },
  { word: "EARTH", hint: "The planet we live on" },
  { word: "FIELD", hint: "A grassy area where you can play football" },
  { word: "FRUIT", hint: "Apples, bananas and grapes are all this" },
  { word: "GHOST", hint: "A spirit that haunts houses in scary movies" },
  { word: "GRAPE", hint: "A small round fruit used to make wine" },
  { word: "HEART", hint: "The organ that pumps blood" },
  { word: "HOUSE", hint: "A place where a family lives" },
  { word: "HAPPY", hint: "The feeling of joy" },
  { word: "LIGHT", hint: "The opposite of dark" },
  { word: "MONEY", hint: "You use it to buy things" },
  { word: "MONTH", hint: "January and February are each one" },
  { word: "MUSIC", hint: "Art made of sounds and melodies" },
  { word: "NIGHT", hint: "The dark part of the day when you sleep" },
  { word: "OCEAN", hint: "A huge body of salt water" },
  { word: "PAPER", hint: "You write or print on it" },
  { word: "PARTY", hint: "A celebration with guests, food and music" },
  { word: "PHONE", hint: "A device for calling and texting" },
  { word: "PLANT", hint: "It needs water and sun to grow" },
  { word: "RIVER", hint: "Flowing water that runs to the sea" },
  { word: "SMILE", hint: "A happy expression on your face" },
  { word: "SOUND", hint: "What your ears can hear" },
  { word: "SPACE", hint: "Where the stars and planets are" },
  { word: "STORM", hint: "Heavy rain with thunder and lightning" },
  { word: "SUGAR", hint: "It makes coffee sweet" },
  { word: "TABLE", hint: "Furniture where you eat meals" },
  { word: "TEACH", hint: "What a teacher does" },
  { word: "TIGER", hint: "A large striped wild cat" },
  { word: "TRAIN", hint: "It travels on rails" },
  { word: "WATER", hint: "You drink it every day to live" },
  { word: "WORLD", hint: "The Earth and everything on it" },
  { word: "WRITE", hint: "What you do with a pen" },
  { word: "YOUTH", hint: "The time of life between childhood and adulthood" },
  { word: "ANGRY", hint: "The feeling when you are very mad" },
  { word: "BROWN", hint: "The color of chocolate and soil" },
  { word: "CANDY", hint: "A sweet treat kids love" },
  { word: "CLEAN", hint: "The opposite of dirty" },
  { word: "DREAM", hint: "What you see in your mind while sleeping" },
  { word: "EMPTY", hint: "The opposite of full" },
  { word: "FRESH", hint: "Newly made, not old or stale" },
  { word: "GREEN", hint: "The color of grass" },
  { word: "HOTEL", hint: "A place to stay when you travel" },
  { word: "JUICE", hint: "A drink made from fruit" },
  { word: "KNIFE", hint: "You use it to cut food" },
  { word: "LEMON", hint: "A yellow, sour fruit" },
  { word: "MOUTH", hint: "The part of your face you eat and speak with" },
  { word: "NURSE", hint: "Works in a hospital taking care of patients" },
  { word: "OFFER", hint: "To propose to give something to someone" },
  { word: "PEACE", hint: "The opposite of war" },
  { word: "QUEEN", hint: "A woman who rules a kingdom" },
  { word: "RADIO", hint: "A device that plays music and news" },
  { word: "SHARE", hint: "To give part of what you have to someone else" },
  { word: "SHIRT", hint: "Clothing you wear on your upper body" },
  { word: "SLEEP", hint: "What you do at night in bed" },
  { word: "SMART", hint: "Intelligent and quick to learn" },
  { word: "SNAKE", hint: "A reptile with no legs" },
  { word: "SOUTH", hint: "The direction opposite to north" },
  { word: "SPORT", hint: "Football and swimming are examples" },
  { word: "STONE", hint: "A hard piece of rock" },
  { word: "SWEET", hint: "The taste of sugar" },
  { word: "THANK", hint: "What you say when someone helps you" },
  { word: "TOOTH", hint: "It's in your mouth and helps you chew" },
  { word: "TOUCH", hint: "The sense you use with your hands" },
  { word: "UNCLE", hint: "Your parent's brother" },
  { word: "VOICE", hint: "The sound that comes out when you speak or sing" },
  { word: "WATCH", hint: "To look at something, or a clock on your wrist" },
  { word: "WHEEL", hint: "A round part that turns, found on cars" },
  { word: "WOMAN", hint: "An adult female person" },
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
