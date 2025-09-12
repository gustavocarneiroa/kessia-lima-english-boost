import { LanguageProvider } from '@/contexts/LanguageContext';
import HeroSection from '@/components/v1.1/HeroSection';
import CTASection from '@/components/CTASection';
import AboutSection from '@/components/AboutSection';
import ServicesSection from '@/components/ServicesSection';
import PricingSection from '@/components/PricingSection';
import FAQSection from '@/components/FAQSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import Footer from '@/components/Footer';
import { ScrollProgress } from '@/components/ui/animated-scroll-spy';

const IndexContent = () => {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <main>
        <HeroSection />
        <CTASection />
        <section id="about">
          <AboutSection />
        </section>
        <section id="services">
          <ServicesSection />
        </section>
        <section id="pricing">
          <PricingSection />
        </section>
        <TestimonialsSection />
        <FAQSection />
      </main>
      <Footer />
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
