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
      
      {/* Bottom wave effect */}
      <div className="absolute -bottom-px left-0 right-0">
        <svg viewBox="0 0 1440 120" className="w-full h-8 sm:h-12 text-background fill-current">
          <path d="M0,64L48,69.3C96,75,192,85,288,85.3C384,85,480,75,576,64C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
        </svg>
      </div>
    </section>
  );
};

export default CTASection;