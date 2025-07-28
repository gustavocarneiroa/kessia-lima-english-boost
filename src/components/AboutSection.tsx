import { useLanguage } from '@/contexts/LanguageContext';
import teacherKessia from '@/assets/teacher-kessia-3.jpeg';

const AboutSection = () => {
  const { t } = useLanguage();

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
        </div>
      </div>
    </section>
  );
};

export default AboutSection;