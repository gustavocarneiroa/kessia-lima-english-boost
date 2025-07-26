import { LanguageProvider } from '@/contexts/LanguageContext';
import HeroSection from '@/components/v1.1/HeroSection';
import WhatsAppFloat from '@/components/WhatsAppFloat';

const IndexV1_1 = () => {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background">
        <main>
          <HeroSection />
        </main>
        <WhatsAppFloat />
      </div>
    </LanguageProvider>
  );
};

export default IndexV1_1;