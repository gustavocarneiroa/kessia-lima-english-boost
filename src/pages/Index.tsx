import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import HeroSection from '@/components/v1.1/HeroSection';
import CTASection from '@/components/CTASection';
import AboutSection from '@/components/AboutSection';
import ServicesSection from '@/components/ServicesSection';
import FAQSection from '@/components/FAQSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  
  return (''
    // <div className="fixed top-4 right-4 z-50">
    //   <div className="flex gap-2">
    //     <Button
    //       variant={language === 'pt' ? 'default' : 'outline'}
    //       size="sm"
    //       onClick={() => setLanguage('pt')}
    //     >
    //       PT
    //     </Button>
    //     <Button
    //       variant={language === 'en-basic' ? 'default' : 'outline'}
    //       size="sm"
    //       onClick={() => setLanguage('en-basic')}
    //     >
    //       EN
    //     </Button>
    //   </div>
    // </div>
  );
};

const IndexContent = () => {
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const showHiddenParam = urlParams.get('showHidden');
    setShowHidden(showHiddenParam === '1');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <LanguageSwitcher />
      <main>
        <HeroSection />
        <CTASection />
        <section id="about">
          <AboutSection />
        </section>
        <section id="services">
          <ServicesSection />
        </section>
        <FAQSection />
        <TestimonialsSection />
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
};

const Index = () => {
  return (
    <LanguageProvider>
      <IndexContent />
    </LanguageProvider>
  );
};

export default Index;
