import React from "react";
import { AceternityButton } from "./AceternityButton";
import { TextHoverEffect } from "./TextHoverEffect";

export const AceternityDemo = () => {
  return (
    <div className="min-h-screen bg-background p-8 space-y-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Componentes Aceternity UI
        </h1>
        
        {/* Botões */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Botões Estilizados</h2>
          <div className="flex flex-wrap gap-4">
            <AceternityButton variant="sketch">
              Sketch Button
            </AceternityButton>
            
            <AceternityButton variant="simple">
              Simple Button
            </AceternityButton>
            
            <AceternityButton variant="gradient">
              Gradient Button
            </AceternityButton>
            
            <AceternityButton variant="shimmer">
              Shimmer Button
            </AceternityButton>
            
            <AceternityButton variant="outline">
              Outline Button
            </AceternityButton>
            
            <AceternityButton variant="brutal">
              Brutal Button
            </AceternityButton>
          </div>
        </section>

        {/* Text Hover Effect */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Efeito de Texto com Hover</h2>
          <div className="h-32 w-full">
            <TextHoverEffect text="ACETERNITY" duration={0.5} />
          </div>
        </section>

        {/* Instruções */}
        <section className="space-y-4 bg-muted p-6 rounded-lg">
          <h2 className="text-2xl font-semibold">Como usar</h2>
          <div className="text-sm space-y-2">
            <p>1. Os componentes Aceternity UI estão configurados e prontos para usar</p>
            <p>2. Copie componentes de <a href="https://ui.aceternity.com/components" className="text-primary underline" target="_blank" rel="noopener noreferrer">ui.aceternity.com</a></p>
            <p>3. As dependências necessárias já estão instaladas: motion, clsx, tailwind-merge</p>
            <p>4. Use a função `cn` de `@/lib/utils` para combinar classes</p>
          </div>
        </section>
      </div>
    </div>
  );
};