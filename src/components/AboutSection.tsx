import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import teacherKessia from '@/assets/teacher-kessia-3.jpeg';

const AboutSection = () => {
  const { t } = useLanguage();

  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScJP5G5kG3TrRc8YU_1hrSLvFf4TVUtI0ezkwjPzZhaqmLL_g/viewform";

  const handleFormClick = () => {
    window.open(formUrl, '_blank');
  };

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-bold text-center text-foreground mb-12">
            {t('about.title')}
          </h2>
          
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Teacher Photo */}
            <div className="flex-shrink-0">
              <div className="relative">
                <img 
                  src={teacherKessia} 
                  alt="Teacher Késsia Lima" 
                  className="w-80 h-80 object-cover rounded-full shadow-2xl"
                />
                <div className="absolute inset-0 rounded-full"></div>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="prose prose-lg max-w-none text-foreground">
                <p className="text-lg leading-relaxed whitespace-break-spaces text-justify mb-6" >
                  {t('about.description')}
                </p>
              </div>
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="text-center mt-12">
            <Button 
              size="lg" 
              onClick={handleFormClick}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg rounded-full"
            >
              {t('cta.button')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;