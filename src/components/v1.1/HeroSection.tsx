import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Clock } from 'lucide-react';
import teacherKessia from '@/assets/teacker-kessia-2.png';

const HeroSection = () => {
  const { t } = useLanguage();

  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScJP5G5kG3TrRc8YU_1hrSLvFf4TVUtI0ezkwjPzZhaqmLL_g/viewform";

  const handleFormClick = () => {
    window.open(formUrl, '_blank');
  };

  return (
    <section className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden md:flex h-screen items-center px-4">
        {/* Left Content */}
        <div className="flex-1 flex items-center justify-end pr-8">
          <div className="max-w-2xl">
            <h1 className="text-6xl lg:text-7xl font-bold text-foreground mb-8 leading-tight">
              Teacher Késsia Lima
            </h1>
            <h2 className="text-3xl lg:text-4xl font-semibold text-primary mb-8 leading-tight">
              Para você aprender inglês de uma vez por todas!
            </h2>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-10 leading-relaxed">
              Com o nosso método único você estuda e aprende em um ambiente prático e dinâmico. 
              Estude inglês através de aulas online ao vivo e material de apoio físico.
            </p>
            <div className="flex flex-col gap-6 items-start">
              <Button 
                size="lg" 
                onClick={handleFormClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-5 text-xl rounded-full"
              >
                Quero aprender inglês
              </Button>
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="h-5 w-5" />
                <span className="text-lg font-medium">Vagas limitadas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Image */}
        <div className="flex-1 flex items-center justify-start pl-8">
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
          <h1 className="text-5xl font-bold text-foreground mb-6 leading-tight">
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
          <h2 className="text-2xl font-semibold text-primary mb-6 leading-tight">
            Para você aprender inglês de uma vez por todas!
          </h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Com o nosso método único você estuda e aprende em um ambiente prático e dinâmico. 
            Estude inglês através de aulas online ao vivo e material de apoio físico.
          </p>
          <div className="flex flex-col gap-6 items-center">
            <Button 
              size="lg" 
              onClick={handleFormClick}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg rounded-full w-full max-w-xs"
            >
              Quero aprender inglês
            </Button>
            <div className="flex items-center gap-2 text-orange-600 justify-center">
              <Clock className="h-4 w-4" />
              <span className="text-base font-medium">Vagas limitadas</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;