import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import teacherHero1 from '@/assets/teacher-hero-1.png';
import teacherHero2 from '@/assets/teacher-hero-2.png';

const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useLanguage();

  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScJP5G5kG3TrRc8YU_1hrSLvFf4TVUtI0ezkwjPzZhaqmLL_g/viewform";

  const handleFormClick = () => {
    window.open(formUrl, '_blank');
  };

  const slides = [
    {
      title: t('hero.title1'),
      buttonText: t('hero.button1'),
      image: teacherHero1,
      action: handleFormClick
    },
    {
      title: t('hero.title2'),
      buttonText: t('hero.button2'),
      image: teacherHero2,
      action: handleFormClick
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative bg-gradient-to-br from-secondary via-background to-secondary/50 min-h-[600px] overflow-hidden">
      <div className="container mx-auto px-4 py-16">
        <div className="relative">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`transition-all duration-500 ease-in-out ${
                index === currentSlide 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 absolute inset-0 translate-x-full'
              }`}
            >
              <div className="flex flex-col lg:flex-row items-center gap-12">
                {/* Text Content */}
                <div className="flex-1 text-center lg:text-left">
                  <h1 className="text-4xl lg:text-6xl font-bold text-primary mb-8 leading-tight">
                    {slide.title}
                  </h1>
                  <Button 
                    size="lg" 
                    onClick={slide.action}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    {slide.buttonText}
                  </Button>
                </div>

                {/* Image */}
                <div className="flex-1 relative">
                  <div className="relative max-w-md mx-auto">
                    <img 
                      src={slide.image}
                      alt="Teacher Késsia Lima"
                      className="w-full h-auto object-contain drop-shadow-2xl"
                    />
                    {/* Decorative background */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-full blur-3xl -z-10 scale-110"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Navigation Arrows */}
          <Button
            variant="ghost"
            size="sm"
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border border-border rounded-full p-2"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border border-border rounded-full p-2"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {/* Dots Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;