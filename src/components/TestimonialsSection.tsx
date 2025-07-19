import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';

const TestimonialsSection = () => {
  const { t, language } = useLanguage();
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedTestimonial, setSelectedTestimonial] = useState<any>(null);
  const [testimonialLanguage, setTestimonialLanguage] = useState<'pt' | 'en'>('pt');

  const testimonials = [
    {
      id: 1,
      name: "Maria Silva",
      timeAgo: "há 2 meses",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b9c5a49c?w=150&h=150&fit=crop&crop=face",
      shortFeedback: {
        pt: "As aulas da Teacher Késsia são incríveis! Meu inglês melhorou muito...",
        en: "Teacher Késsia's classes are amazing! My English improved a lot..."
      },
      fullFeedback: {
        pt: "As aulas da Teacher Késsia são incríveis! Meu inglês melhorou muito em apenas 3 meses. Ela tem uma metodologia única que torna o aprendizado divertido e eficaz. Recomendo muito!",
        en: "Teacher Késsia's classes are amazing! My English improved a lot in just 3 months. She has a unique methodology that makes learning fun and effective. I highly recommend it!"
      }
    },
    {
      id: 2,
      name: "João Santos",
      timeAgo: "há 1 mês",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      shortFeedback: {
        pt: "Excelente professora! Consegui passar no TOEFL graças às aulas...",
        en: "Excellent teacher! I managed to pass the TOEFL thanks to the classes..."
      },
      fullFeedback: {
        pt: "Excelente professora! Consegui passar no TOEFL graças às aulas dela. O material é muito bem estruturado e ela sempre está disponível para tirar dúvidas. Super recomendo!",
        en: "Excellent teacher! I managed to pass the TOEFL thanks to her classes. The material is very well structured and she is always available to answer questions. I highly recommend it!"
      }
    },
    {
      id: 3,
      name: "Ana Costa",
      timeAgo: "há 3 semanas",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      shortFeedback: {
        pt: "Método incrível! Finalmente consegui falar inglês com confiança...",
        en: "Amazing method! I finally managed to speak English with confidence..."
      },
      fullFeedback: {
        pt: "Método incrível! Finalmente consegui falar inglês com confiança. As aulas de conversação me ajudaram muito a perder a timidez. A Teacher Késsia é muito paciente e dedicada!",
        en: "Amazing method! I finally managed to speak English with confidence. The conversation classes helped me a lot to overcome my shyness. Teacher Késsia is very patient and dedicated!"
      }
    },
    {
      id: 4,
      name: "Carlos Mendes",
      timeAgo: "há 2 semanas",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      shortFeedback: {
        pt: "Aulas de inglês para negócios foram fundamentais para minha carreira...",
        en: "Business English classes were fundamental for my career..."
      },
      fullFeedback: {
        pt: "Aulas de inglês para negócios foram fundamentais para minha carreira. Aprendi vocabulário específico e agora me sinto confiante em reuniões internacionais. Muito obrigado!",
        en: "Business English classes were fundamental for my career. I learned specific vocabulary and now I feel confident in international meetings. Thank you so much!"
      }
    },
    {
      id: 5,
      name: "Luana Oliveira",
      timeAgo: "há 1 semana",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
      shortFeedback: {
        pt: "Superou todas minhas expectativas! Metodologia dinâmica e eficaz...",
        en: "Exceeded all my expectations! Dynamic and effective methodology..."
      },
      fullFeedback: {
        pt: "Superou todas minhas expectativas! Metodologia dinâmica e eficaz. Em 4 meses já consigo assistir filmes em inglês sem legendas. A Teacher Késsia é simplesmente fantástica!",
        en: "Exceeded all my expectations! Dynamic and effective methodology. In 4 months I can already watch movies in English without subtitles. Teacher Késsia is simply fantastic!"
      }
    },
    {
      id: 6,
      name: "Pedro Lima",
      timeAgo: "há 4 dias",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150&h=150&fit=crop&crop=face",
      shortFeedback: {
        pt: "Melhor investimento que fiz! Aulas personalizadas e atenção individual...",
        en: "Best investment I made! Personalized classes and individual attention..."
      },
      fullFeedback: {
        pt: "Melhor investimento que fiz! Aulas personalizadas e atenção individual fazem toda a diferença. Consegui minha promoção na empresa graças ao inglês que aprendi com ela!",
        en: "Best investment I made! Personalized classes and individual attention make all the difference. I got my promotion at the company thanks to the English I learned with her!"
      }
    }
  ];

  const itemsPerPage = 3;
  const totalPages = Math.ceil(testimonials.length / itemsPerPage);

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const getCurrentTestimonials = () => {
    const startIndex = currentPage * itemsPerPage;
    return testimonials.slice(startIndex, startIndex + itemsPerPage);
  };

  useEffect(() => {
    const timer = setInterval(nextPage, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setTestimonialLanguage(language.startsWith('en') ? 'en' : 'pt');
  }, [language]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-6">
            {t('testimonials.title')}
          </h2>
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {getCurrentTestimonials().map((testimonial) => (
              <div 
                key={testimonial.id}
                className="bg-card border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.timeAgo}</p>
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  {renderStars(testimonial.rating)}
                </div>

                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {testimonial.shortFeedback[testimonialLanguage]}
                </p>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTestimonial(testimonial)}
                      className="w-full"
                    >
                      {t('testimonials.viewMore')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-4">
                        <img 
                          src={testimonial.avatar}
                          alt={testimonial.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div>
                          <h3 className="text-xl font-bold">{testimonial.name}</h3>
                          <div className="flex items-center gap-2">
                            {renderStars(testimonial.rating)}
                            <span className="text-sm text-muted-foreground">• {testimonial.timeAgo}</span>
                          </div>
                        </div>
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button 
                          variant={testimonialLanguage === 'pt' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTestimonialLanguage('pt')}
                        >
                          {t('testimonials.portuguese')}
                        </Button>
                        <Button 
                          variant={testimonialLanguage === 'en' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTestimonialLanguage('en')}
                        >
                          {t('testimonials.english')}
                        </Button>
                      </div>
                      
                      <p className="text-foreground leading-relaxed text-lg">
                        {testimonial.fullFeedback[testimonialLanguage]}
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4">
            <Button 
              variant="outline"
              size="sm"
              onClick={prevPage}
              className="rounded-full p-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    i === currentPage ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <Button 
              variant="outline"
              size="sm"
              onClick={nextPage}
              className="rounded-full p-2"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;