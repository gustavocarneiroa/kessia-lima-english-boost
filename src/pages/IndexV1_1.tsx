import { LanguageProvider } from '@/contexts/LanguageContext';
import { useVersion } from '@/contexts/VersionContext';
import HeroSection from '@/components/v1.1/HeroSection';
import CTASection from '@/components/CTASection';
import AboutSection from '@/components/AboutSection';
import ServicesSection from '@/components/ServicesSection';
import FAQSection from '@/components/FAQSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';

const IndexV1_1 = () => {
  const { showHidden } = useVersion();
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background">
        <main>
          <HeroSection />
          <CTASection />
          <section id="about">
            <AboutSection />
          </section>
          <section id="services">
            <ServicesSection />
          </section>
          {showHidden && <FAQSection />}
          <TestimonialsSection />
        </main>
        <Footer />
        <WhatsAppFloat />
      </div>
    </LanguageProvider>
  );
};

export default IndexV1_1;