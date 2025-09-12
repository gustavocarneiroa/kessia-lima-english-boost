import React from 'react';
import { Highlighter } from '@/components/ui/highliter-magic-ui';

interface TranslationWithHighlight {
  text: string;
  highlight?: string;
  color?: string;
  action?: "highlight" | "underline" | "box" | "circle" | "strike-through" | "crossed-off" | "bracket";
}

export const renderTranslationWithHighlight = (
  translation: string | TranslationWithHighlight
): React.ReactNode => {
  if (typeof translation === 'string') {
    return translation;
  }

  const { text, highlight, color = '#ffd700', action = 'highlight' } = translation;

  if (!highlight) {
    return text;
  }

  const parts = text.split(highlight);
  if (parts.length === 1) {
    return text;
  }

  return (
    <>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <Highlighter action={action} color={color} isView={true}>
              {highlight}
            </Highlighter>
          )}
        </React.Fragment>
      ))}
    </>
  );
};