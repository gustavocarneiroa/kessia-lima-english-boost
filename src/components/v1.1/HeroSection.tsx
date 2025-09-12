import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Clock } from 'lucide-react';
import teacherKessia from '@/assets/teacker-kessia-2.png';
import { Highlighter } from '../ui/highliter-magic-ui';

const HeroSection = () => {
  const { t } = useLanguage();

  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScJP5G5kG3TrRc8YU_1hrSLvFf4TVUtI0ezkwjPzZhaqmLL_g/viewform";

  const handleFormClick = () => {
    window.open(formUrl, '_blank');
  };

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden md:flex h-screen items-center px-4">
        {/* Left Content */}
        <div className="flex-1 flex items-center justify-end pr-8">
          <div className="max-w-2xl">
            <h1 className="text-6xl lg:text-7xl font-bold text-foreground mb-8 leading-tight">
              {t('hero.title')}
            </h1>
            <h2 className="text-3xl lg:text-4xl font-semibold text-primary mb-8 leading-tight">
              {t('hero.subtitle')}
            </h2>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-10 leading-relaxed">
              {t('hero.description')}
            </p>
            <div className="flex flex-col gap-6 items-start">
              <div className="flex gap-4">
                <Button 
                  size="lg" 
                  onClick={scrollToPricing}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-5 text-xl rounded-full"
                >
                  {t('hero.button')}
                </Button>
                {/* <Button 
                  size="lg" 
                  variant="outline"
                  onClick={handleFormClick}
                  className="px-8 py-5 text-xl rounded-full"
                >
                  {t('hero.contactButton')}
                </Button> */}
              </div>
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="h-5 w-5" />
                <span className="text-lg font-medium">{t('hero.limitedSpots')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Image */}
        <div className="flex-1 flex items-center justify-start pl-8">
          <img 
            src={teacherKessia} 
            alt="Teacher Késsia Lima" 
            className="max-h-[90vh] w-auto object-contain"
          />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-foreground mb-6 leading-tight">
            {t('hero.title')}
          </h1>
        </div>

        <div className="flex justify-center mb-8">
          <img 
            src={teacherKessia} 
            alt="Teacher Késsia Lima" 
            className="max-w-full h-auto object-contain"
          />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold text-primary mb-6 leading-tight">
            {t('hero.subtitle')}
          </h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {t('hero.description')}
          </p>
          <div className="flex flex-col gap-6 items-center">
            <Button 
              size="lg" 
              onClick={scrollToPricing}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg rounded-full w-full max-w-xs"
            >
              {t('hero.button')}
            </Button>
            {/* <Button 
              size="lg" 
              variant="outline"
              onClick={handleFormClick}
              className="px-8 py-4 text-lg rounded-full w-full max-w-xs"
            >
              {t('hero.contactButton')}
            </Button> */}
            <div className="flex items-center gap-2 text-orange-600 justify-center">
              <Clock className="h-4 w-4" />
              <span className="text-base font-medium">{t('hero.limitedSpots')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;