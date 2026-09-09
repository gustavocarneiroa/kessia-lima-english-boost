import { useState, useEffect, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalTrigger } from './ui/animated-modal';
import { motion } from 'motion/react';
import teacherKessia from '@/assets/teacher-kessia-3.jpeg';
import alunoPhoto from '@/assets/teacher-hero-1.png';
import camilaCarina from '@/assets/testimonials/c15978.png';
import lucasDuarte from '@/assets/testimonials/l159753.jpg';
type TestimonialType = { 
  id?: number; 
  name: string; 
  timeAgo: string; 
  avatar?: string; 
  rating: number; 
  shortFeedback: { pt: string; en?: string }; 
  fullFeedback: { pt: string; en?: string }
  photos?: string[]
};

const TestimonialsSection = () => {
  const { t, language } = useLanguage();

  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScJP5G5kG3TrRc8YU_1hrSLvFf4TVUtI0ezkwjPzZhaqmLL_g/viewform";

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const [currentPage, setCurrentPage] = useState(0);
  const [testimonialLanguage, setTestimonialLanguage] = useState<'pt' | 'en'>('pt');
  const [expandedCards] = useState<Set<number>>(new Set());
  const textRefs = useRef<{ [key: number]: HTMLParagraphElement | null }>({});
  const images = [
    teacherKessia,
    "/share200.jpeg",
  ];
  const testimonials: TestimonialType[] = [
    {
      name: "Camila Carina",
      timeAgo: "17/09/2025",
      avatar: camilaCarina,
      rating: 5,
      shortFeedback: {
        pt: "Desde que comecei as aulas de inglês online, percebi uma grande evolução na minha confiança para falar e compreender a língua...",
      },
      fullFeedback: {
        pt: "Desde que comecei as aulas de inglês online, percebi uma grande evolução na minha confiança para falar e compreender a língua. As aulas são personalizadas, interativas e sempre trazem conteúdos práticos que consigo aplicar no meu dia a dia. Além de aprender a estrutura da língua, me sinto cada vez mais à vontade em situações de conversação.",
      }
    },
    {
      name: "Lucas Duarte",
      timeAgo: "20/09/2025",
      rating: 5,
      avatar: lucasDuarte,
      shortFeedback: {
        pt: "Eu consegui evoluir bastante, atualmente me sinto mais confiança para falar em inglês, além de ter melhorado muito meu vocabulário...",
      },
      fullFeedback: {
        pt: "Eu consegui evoluir bastante, atualmente me sinto mais confiança para falar em inglês, além de ter melhorado muito meu vocabulário. Em 3 meses consegui participar de uma entrevista em inglês e com isso tive total noção da evolução que as aulas me proporcionaram.",
      }
    },
    {
      name: "Aluno anônimo",
      timeAgo: "09/12/2025",
      rating: 5,
      shortFeedback: {
        pt: "Minha experiência depois que eu comecei as aulas com kessia meu inglês melhorou demais...",
      },
      fullFeedback: {
        pt: "Minha experiência depois que eu comecei as aulas com kessia meu inglês melhorou demaisss, consegui evoluir muito leitura, gramática e me ajudou demais no dia a dia do trabalho.",
      }
    },
    {
      name: "Cassiano",
      timeAgo: "09/12/2025",
      rating: 5,
      shortFeedback: {
        pt: "Quando comecei a ter aula com você, meu principal problema era falar com os outros...",
        en: "When I started to take class with you, my mainly problem was to speak with others...",
      },
      fullFeedback: {
        pt: "Quando comecei a ter aula com você, meu principal problema era falar com os outros, e agora estou muito melhor com meu speaking. Obrigado por me ajudar com isso!!!",
        en: "When I started to take class with you, my mainly problem was to speak with others, and now  I'm much better with my speaking. Thanks for help me with this!!!",
      }
    },
    {
      name: "Ingryd Marques",
      timeAgo: "09/12/2025",
      rating: 5,
      shortFeedback: {
        pt: "",
      },
      fullFeedback: {
        pt: "",
      }
    },
    {
      name: "Isabelle Bezerra",
      timeAgo: "há mais de 1 ano",
      rating: 5,
      shortFeedback: {
        pt: "Gosto da interação e mescla do nosso gosto pessoal com o conteúdo da aula...",
      },
      fullFeedback: {
        pt: "Gosto da interação e mescla do nosso gosto pessoal com o conteúdo da aula. Assim deixa a aula mais dinâmica e divertida.",
      }
    },
    {
      name: "Maria Iza",
      timeAgo: "há mais de 1 ano",
      rating: 5,
      shortFeedback: {
        pt: "Adoro como vc fica atenta com o q gostamos e coloca na aula",
      },
      fullFeedback: {
        pt: "Adoro como vc fica atenta com o q gostamos e coloca na aula",
      }
    },
    {
      name: "Pedro Lucas",
      timeAgo: "há mais de 1 ano",
      rating: 5,
      shortFeedback: {
        pt: "",
      },
      fullFeedback: {
        pt: "Já fui aluno da teacher Késsia há alguns anos e posso afirma, vale muito a pena. A Késsia além de deixar as aulas muito divertidas, ensinava super bem. Devo meu bilinguísmo a teacher Késsia :)",
      }
    },
    {
      name: "Bianca Olveira",
      timeAgo: "há mais de 1 ano",
      rating: 5,
      shortFeedback: {
        pt: "",
      },
      fullFeedback: {
        pt: "Sou aluna e posso afirmar, já aprendi muitoo em poucos meses ❤️ Valeu teacher!",
      }
    },
    {
      name: "Felipe Cabral",
      timeAgo: "há mais de 1 ano",
      rating: 5,
      shortFeedback: {
        pt: "",
      },
      fullFeedback: {
        pt: "Professora, agora nas minhas férias vi o quanto evolui nesses últimos meses com as suas aulas e didática. Fiquei muito feliz, pois não tinha a noção exata da minha evolução no Inglês. Ajudou muito e consegui resolver situações antes impossíveis! Parabéns e muito obrigado!!",
      }
    },
    {
      name: "Aluno anônimo",
      timeAgo: "há mais de 1 ano",
      rating: 5,
      shortFeedback: {
        pt: "",
      },
      fullFeedback: {
        pt: "As aulas são excelentes de verdade! Nunca tinha feito algo tão legal.",
      }
    },
    {
      name: "Aluno anônimo",
      timeAgo: "há mais de 1 ano",
      rating: 5,
      shortFeedback: {
        pt: "",
      },
      fullFeedback: {
        pt: "Aulas maravilhosas 😍 Apaixonado desde sempre na sua página e agora tive a oportunidade de ver como suas aulas são. Professora de altíssimo patamar, aulas interessanter e conteúdo perfeito",
      }
    }
  ]

  for (const [index, testimonial] of testimonials.entries()) {
    testimonial.id = index;
  }

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
    setTestimonialLanguage(language.startsWith('en') ? 'en' : 'pt');
  }, [language]);

  const checkTextTruncation = (testimonialId: number) => {
    const element = textRefs.current[testimonialId];
    if (!element) return false;

    const lineHeight = parseInt(getComputedStyle(element).lineHeight);
    const maxHeight = lineHeight * 3; // 3 lines
    return element.scrollHeight > maxHeight;
  };


  const renderStars = (star_id: string, rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={star_id + i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <section className="py-20 bg-muted/30">
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
              <Modal>
                <ModalTrigger>
                  <div
                    key={"testimonial" + testimonial.id}
                    className="bg-card border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
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
                      {renderStars("star" + testimonial.id, testimonial.rating)}
                    </div>

                    <div className="relative">
                      <p
                        ref={(el) => textRefs.current[testimonial.id] = el}
                        className={`text-muted-foreground leading-relaxed ${!expandedCards.has(testimonial.id) ? 'line-clamp-3' : ''
                          }`}
                      >
                        {testimonial.fullFeedback[testimonialLanguage] ?? testimonial.fullFeedback['pt']}
                      </p>
                      {checkTextTruncation(testimonial.id) && (
                        <button
                          className="text-primary text-sm mt-2 hover:underline"
                        >
                          {expandedCards.has(testimonial.id) ? 'Ver menos' : 'Ver mais'}
                        </button>
                      )}
                    </div>
                  </div>
                </ModalTrigger>
                <ModalBody>
                  <ModalContent>
                    <div className="py-10 flex flex-wrap gap-x-4 gap-y-6 items-start justify-start max-w-sm mx-auto">
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
                      <div className="flex items-center mb-4">
                        {renderStars("star" + testimonial.id, testimonial.rating)}
                      </div>
                      {testimonial.fullFeedback[testimonialLanguage] ?? testimonial.fullFeedback['pt']}
                    </div>
                    <div className="flex justify-center items-center">
                      {[...images, testimonial.avatar, ...(testimonial.photos ?? [])].filter( p => p).map((image, idx) => (
                        <motion.div
                          key={"images" + idx}
                          style={{
                            rotate: Math.random() * 20 - 10,
                          }}
                          whileHover={{
                            scale: 1.1,
                            rotate: 0,
                            zIndex: 100,
                          }}
                          whileTap={{
                            scale: 1.1,
                            rotate: 0,
                            zIndex: 100,
                          }}
                          className="rounded-xl -mr-4 mt-4 p-1 bg-white dark:bg-neutral-800 dark:border-neutral-700 border border-neutral-100 shrink-0 overflow-hidden"
                        >
                          <img
                            src={image}
                            width="500"
                            height="500"
                            className="rounded-lg h-20 w-20 md:h-40 md:w-40 object-cover shrink-0"
                          />
                        </motion.div>
                      ))}
                    </div>
                  </ModalContent>
                  <ModalFooter className="gap-4">
                    <Button
                      variant={testimonialLanguage === 'pt' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTestimonialLanguage('pt')}
                    >
                      {t('testimonials.portuguese')}
                    </Button>
                    {
                      testimonial.fullFeedback.en &&
                      <Button
                        variant={testimonialLanguage === 'en' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTestimonialLanguage('en')}
                      >
                        {t('testimonials.english')}
                      </Button>
                    }
                  </ModalFooter>
                </ModalBody>
              </Modal>
            ))}
          </div>
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
                key={"page" + i}
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

        {/* CTA Button */}
        <div className="text-center mt-16">
          <Button
            size="lg"
            onClick={scrollToPricing}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg rounded-full"
          >
            {t('cta.button')}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;