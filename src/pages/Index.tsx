import { LanguageProvider } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import HeroCarousel from '@/components/HeroCarousel';
import CTASection from '@/components/CTASection';
import ServicesSection from '@/components/ServicesSection';
import FAQSection from '@/components/FAQSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';

const Index = () => {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <section id="home">
            <HeroCarousel />
          </section>
          <CTASection />
          <ServicesSection />
          <FAQSection />
          <TestimonialsSection />
        </main>
        <Footer />
        <WhatsAppFloat />
      </div>
    </LanguageProvider>
  );
};

export default Index;
