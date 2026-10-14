import { cn } from "@/lib/utils";
import { splitPrompt } from "@/lib/levelTest";

// Enunciado de uma pergunta do teste de nível. Se tiver uma linha em branco, o que vem
// antes é um texto de leitura (reading comprehension) e aparece num quadro à parte;
// o que vem depois da última linha em branco é a pergunta.
export default function LevelTestPrompt({
  prompt,
  className,
  passageClassName,
}: {
  prompt: string;
  className?: string;
  passageClassName?: string;
}) {
  const { passage, question } = splitPrompt(prompt);
  return (
    <div className="space-y-3">
      {passage && (
        <div className={cn("whitespace-pre-line rounded-md border-l-4 border-primary/40 bg-muted/60 p-3 leading-relaxed", passageClassName)}>
          {passage}
        </div>
      )}
      <p className={cn("whitespace-pre-line", className)}>{question}</p>
    </div>
  );
}
