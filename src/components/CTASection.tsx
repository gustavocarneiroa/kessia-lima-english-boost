import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const CTASection = () => {
  const { t } = useLanguage();
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScJP5G5kG3TrRc8YU_1hrSLvFf4TVUtI0ezkwjPzZhaqmLL_g/viewform";

  const handleFormClick = () => {
    window.open(formUrl, '_blank');
  };

  return (
    <section className="relative py-16 bg-gradient-to-r from-primary to-primary/80 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-white rounded-full"></div>
        <div className="absolute bottom-16 left-1/4 w-12 h-12 bg-white rounded-full"></div>
        <div className="absolute bottom-20 right-16 w-14 h-14 bg-white rounded-full"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-background/10 backdrop-blur-sm rounded-3xl p-12 pulse-subtle border-2 border-white/20">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-8 leading-tight">
              {t('cta.title')}
            </h2>
            
            <Button 
              size="lg"
              onClick={handleFormClick}
              className="bg-white text-primary hover:bg-white/90 px-6 sm:px-12 py-3 sm:py-4 text-lg sm:text-xl rounded-full shadow-2xl hover:shadow-white/20 hover:scale-105 transition-all duration-300 font-semibold w-auto"
            >
              {t('cta.button')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;