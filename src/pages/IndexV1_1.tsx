import { LanguageProvider } from '@/contexts/LanguageContext';
import HeroSection from '@/components/v1.1/HeroSection';
import CTASection from '@/components/CTASection';
import AboutSection from '@/components/AboutSection';
import ServicesSection from '@/components/ServicesSection';
import FAQSection from '@/components/FAQSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import VersionSwitcher from '@/components/VersionSwitcher';

const IndexV1_1 = () => {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background">
        <VersionSwitcher />
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
    </LanguageProvider>
  );
};

export default IndexV1_1;