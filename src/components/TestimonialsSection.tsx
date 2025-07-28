import { useState, useEffect, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';

type TestimonialType = { id: number; name: string; timeAgo: string; avatar?: string; rating: number; shortFeedback: { pt: string; en?: string }; fullFeedback: { pt: string; en?: string } };

const TestimonialsSection = () => {
  const { t, language } = useLanguage();
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedTestimonial, setSelectedTestimonial] = useState<any>(null);
  const [testimonialLanguage, setTestimonialLanguage] = useState<'pt' | 'en'>('pt');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const textRefs = useRef<{ [key: number]: HTMLParagraphElement | null }>({});

  const testimonials : TestimonialType[] = [
    {
      id: 1,
      name: "Pedro Lucas",
      timeAgo: "há mais de 1 ano",
      rating: 5,
      shortFeedback: {
        pt: "Já fui aluno da teacher Késsia há alguns anos e posso afirma, vale...",
      },
      fullFeedback: {
        pt: "Já fui aluno da teacher Késsia há alguns anos e posso afirma, vale muito a pena. A Késsia além de deixar as aulas muito divertidas, ensinava super bem. Devo meu bilinguísmo a teacher Késsia :)",
      }
    },
    {
      id: 2,
      name: "Bianca Olveira",
      timeAgo: "há mais de 1 ano",
      rating: 5,
      shortFeedback: {
        pt: "Sou aluna e posso afirmar, já aprendi muitoo em poucos meses ❤️ Valeu teacher!",
      },
      fullFeedback: {
        pt: "Sou aluna e posso afirmar, já aprendi muitoo em poucos meses ❤️ Valeu teacher!",
      }
    },
    {
      id: 3,
      name: "Felipe Cabral",
      timeAgo: "há mais de 1 ano",
      rating: 5,
      shortFeedback: {
        pt: "Professora, agora nas minhas férias vi o quanto evolui nesses últimos...",
      },
      fullFeedback: {
        pt: "Professora, agora nas minhas férias vi o quanto evolui nesses últimos meses com as suas aulas e didática. Fiquei muito feliz, pois não tinha a noção exata da minha evolução no Inglês. Ajudou muito e consegui resolver situações antes impossíveis! Parabéns e muito obrigado!!",
      }
    },
    {
      id: 4,
      name: "Aluno anônimo",
      timeAgo: "há mais de 1 ano",
      rating: 5,
      shortFeedback: {
        pt: "As aulas são excelentes de verdade! Nunca tinha feito algo tão legal.",
      },
      fullFeedback: {
        pt: "As aulas são excelentes de verdade! Nunca tinha feito algo tão legal.",
      }
    },
    {
      id: 5,
      name: "Aluno anônimo",
      timeAgo: "há mais de 1 ano",
      rating: 5,
      shortFeedback: {
        pt: "Aulas maravilhosas 😍 Apaixonado desde sempre na sua página e agora...",
      },
      fullFeedback: {
        pt: "Aulas maravilhosas 😍 Apaixonado desde sempre na sua página e agora tive a oportunidade de ver como suas aulas são. Professora de altíssimo patamar, aulas interessanter e conteúdo perfeito",
      }
    }
  ]



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

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isModalOpen) return; // Don't auto-advance when modal is open

    const timer = setInterval(nextPage, 5000);
    return () => clearInterval(timer);
  }, [isModalOpen]);

  useEffect(() => {
    setTestimonialLanguage(language.startsWith('en') ? 'en' : 'pt');
  }, [language]);

  const checkTextTruncation = (testimonialId: number) => {
    const element = textRefs.current[testimonialId];
    if (!element) return false;
    
    const lineHeight = parseInt(getComputedStyle(element).lineHeight);
    const maxHeight = lineHeight * 3; // 3 lines
    return element.scrollHeight > maxHeight;
  };

  const toggleExpanded = (testimonialId: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testimonialId)) {
        newSet.delete(testimonialId);
      } else {
        newSet.add(testimonialId);
      }
      return newSet;
    });
  };

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
                className="bg-card border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => {
                  setSelectedTestimonial(testimonial);
                  setIsModalOpen(true);
                }}
              >
                <div className="flex items-center mb-4">
                  <Avatar className="w-12 h-12 mr-4">
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback className="bg-muted">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.timeAgo}</p>
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  {renderStars(testimonial.rating)}
                </div>

                <div className="relative">
                  <p 
                    ref={(el) => textRefs.current[testimonial.id] = el}
                    className={`text-muted-foreground leading-relaxed ${
                      !expandedCards.has(testimonial.id) ? 'line-clamp-3' : ''
                    }`}
                  >
                    {testimonial.shortFeedback[testimonialLanguage]}
                  </p>
                  {checkTextTruncation(testimonial.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(testimonial.id);
                      }}
                      className="text-primary text-sm mt-2 hover:underline"
                    >
                      {expandedCards.has(testimonial.id) ? 'Ver menos' : 'Ver mais'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedTestimonial && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={selectedTestimonial.avatar} alt={selectedTestimonial.name} />
                      <AvatarFallback className="bg-muted">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold">{selectedTestimonial.name}</h3>
                      <div className="flex items-center gap-2">
                        {renderStars(selectedTestimonial.rating)}
                        <span className="text-sm text-muted-foreground">• {selectedTestimonial.timeAgo}</span>
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
                    {
                      selectedTestimonial.fullFeedback.en && 
                      <Button
                        variant={testimonialLanguage === 'en' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTestimonialLanguage('en')}
                      >
                        {t('testimonials.english')}
                      </Button>
                    }
                  </div>

                  <p className="text-foreground leading-relaxed text-lg">
                    {selectedTestimonial.fullFeedback[testimonialLanguage]}
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-8">
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
                className={`w-3 h-3 rounded-full transition-all duration-300 ${i === currentPage ? 'bg-primary' : 'bg-muted'
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
    </section>
  );
};

export default TestimonialsSection;