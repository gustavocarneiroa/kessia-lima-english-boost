import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import serviceGeneral from '@/assets/service-general.png';
import serviceBusiness from '@/assets/service-business.png';
import serviceConversation from '@/assets/service-conversation.png';
import { AnimatedTestimonials } from "@/components/ui/animated-testemonials";

const ServicesSection = () => {
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

  const testimonials = [
      {
      src: serviceGeneral,
      name: t('services.general.title'),
      designation: "",
      quote: t('services.general.description')
    },
    {
      src: serviceBusiness,
      name: t('services.business.title'),
      designation: "",
      quote: t('services.business.description')
    },
    {
      src: serviceConversation,
      name: t('services.conversation.title'),
      designation: "",
      quote: t('services.conversation.description')
    },
  ];

  return (
    <section id="services" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-6">
            {t('services.title')}
          </h2>
        </div>

        <AnimatedTestimonials testimonials={testimonials} autoplay={true} />;
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

export default ServicesSection;