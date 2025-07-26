import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import teacherKessia from '@/assets/teacher-kessia.png';

const HeroSection = () => {
  const { t } = useLanguage();

  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScJP5G5kG3TrRc8YU_1hrSLvFf4TVUtI0ezkwjPzZhaqmLL_g/viewform";

  const handleFormClick = () => {
    window.open(formUrl, '_blank');
  };

  return (
    <section className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden md:flex h-screen">
        {/* Left Content */}
        <div className="flex-1 flex items-center justify-center px-8 lg:px-16">
          <div className="max-w-xl">
            <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Teacher Késsia Lima
            </h1>
            <h2 className="text-2xl lg:text-3xl font-semibold text-primary mb-6">
              Para você aprender inglês de uma vez por todas!
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Com o nosso método único você estuda e aprende em um ambiente prático e dinâmico. 
              Estude inglês através de aulas online ao vivo e material de apoio físico.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Button 
                size="lg" 
                onClick={handleFormClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg rounded-full"
              >
                Quero aprender inglês
              </Button>
              <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-full text-sm font-semibold">
                VAGAS LIMITADAS
              </div>
            </div>
          </div>
        </div>

        {/* Right Image */}
        <div className="flex-1 flex items-center justify-center">
          <img 
            src={teacherKessia} 
            alt="Teacher Késsia Lima" 
            className="max-h-full w-auto object-contain"
          />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-6">
            Teacher Késsia Lima
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
          <h2 className="text-xl font-semibold text-primary mb-4">
            Para você aprender inglês de uma vez por todas!
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Com o nosso método único você estuda e aprende em um ambiente prático e dinâmico. 
            Estude inglês através de aulas online ao vivo e material de apoio físico.
          </p>
          <div className="flex flex-col gap-4 items-center">
            <Button 
              size="lg" 
              onClick={handleFormClick}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg rounded-full w-full max-w-xs"
            >
              Quero aprender inglês
            </Button>
            <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-full text-sm font-semibold">
              VAGAS LIMITADAS
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;