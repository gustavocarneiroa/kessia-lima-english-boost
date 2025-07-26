import { LanguageProvider } from '@/contexts/LanguageContext';
import { VersionProvider, useVersion } from '@/contexts/VersionContext';
import Header from '@/components/Header';
import HeroBanner from '@/components/HeroBanner';
import CTASection from '@/components/CTASection';
import AboutSection from '@/components/AboutSection';
import ServicesSection from '@/components/ServicesSection';
import FAQSection from '@/components/FAQSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import VersionSwitcher from '@/components/VersionSwitcher';
import IndexV1_1 from '@/pages/IndexV1_1';

const IndexContent = () => {
  const { version } = useVersion();

  if (version === '1.1') {
    return <IndexV1_1 />;
  }

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <section id="home">
            <HeroBanner />
          </section>
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

const Index = () => {
  return (
    <VersionProvider>
      <VersionSwitcher />
      <IndexContent />
    </VersionProvider>
  );
};

export default Index;
