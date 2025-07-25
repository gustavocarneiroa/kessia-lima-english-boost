import { useLanguage } from '@/contexts/LanguageContext';
import serviceGeneral from '@/assets/service-general.png';
import serviceBusiness from '@/assets/service-business.png';
import serviceConversation from '@/assets/service-conversation.png';
import serviceExam from '@/assets/service-exam.png';

const ServicesSection = () => {
  const { t } = useLanguage();

  const services = [
    {
      image: serviceGeneral,
      title: t('services.general.title'),
      description: t('services.general.description')
    },
    {
      image: serviceBusiness,
      title: t('services.business.title'),
      description: t('services.business.description')
    },
    {
      image: serviceConversation,
      title: t('services.conversation.title'),
      description: t('services.conversation.description')
    },
    {
      image: serviceExam,
      title: t('services.exam.title'),
      description: t('services.exam.description')
    }
  ];

  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-6">
            {t('services.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <div 
              key={index}
              className="group border border-border rounded-2xl overflow-hidden shadow-lg transition-all duration-300 bg-black"
            >
              {/* Image with fade overlay */}
              <div className="relative h-56 overflow-hidden bg-black">
                <img 
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 bg-black"
                />
                {/* Fade overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/100 via-black/30 to-transparent"></div>
                
                {/* Title over image */}
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-xl font-bold text-white leading-tight">
                    {service.title}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <div className="p-6 bg-black">
                <p className="text-background leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;