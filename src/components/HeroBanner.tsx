import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import teacherHero1 from '@/assets/teacher-hero-1.png';

const HeroBanner = () => {
  const { t } = useLanguage();

  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScJP5G5kG3TrRc8YU_1hrSLvFf4TVUtI0ezkwjPzZhaqmLL_g/viewform";

  const handleFormClick = () => {
    window.open(formUrl, '_blank');
  };

  return (
    <section 
      className="relative min-h-[600px] bg-cover bg-center bg-no-repeat flex items-center justify-center"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${teacherHero1})`
      }}
    >
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-8 leading-tight">
            {t('hero.title1')}
          </h1>
          <Button 
            size="lg" 
            onClick={handleFormClick}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            {t('hero.button1')}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;