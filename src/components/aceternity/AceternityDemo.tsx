import React, { useEffect, useState } from "react";
import { AceternityButton } from "./AceternityButton";
import { GridBackgroundDemo } from "../ui/background-ripple-effect";
import HeroSection2 from "../v1.1/HeroSection";
import CTASection from "../CTASection";
import { LanguageProvider } from "@/contexts/LanguageContext";

export const AceternityDemo = () => {
    const [showHidden, setShowHidden] = useState(false);
  
    useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const showHiddenParam = urlParams.get('showHidden');
      setShowHidden(showHiddenParam === '1');
    }, []);
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background">
        <main>
          <HeroSection2 />
          </main>
      </div>
    </LanguageProvider>
  );
};