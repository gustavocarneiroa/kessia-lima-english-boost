import { Instagram, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import logo from '@/assets/logo.png';

const Footer = () => {
  const { t, language, setLanguage } = useLanguage();

  const handleLanguageChange = (newLanguage: any) => {
    setLanguage(newLanguage);
    // Force smooth scroll to top with a small delay
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScJP5G5kG3TrRc8YU_1hrSLvFf4TVUtI0ezkwjPzZhaqmLL_g/viewform";
  const instagramHandle = "teacherkessialima";
  const linkedinHandle = "kessialima";

  const handleFormClick = () => {
    window.open(formUrl, '_blank');
  };

  const handleInstagramClick = () => {
    window.open(`https://instagram.com/${instagramHandle}`, '_blank');
  };

  const handleLinkedInClick = () => {
    window.open(`https://br.linkedin.com/in/${linkedinHandle}`, '_blank');
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex-shrink-0">
            <img 
              src={logo} 
              alt="Teacher Késsia Lima" 
              className="h-16 w-auto filter brightness-0 invert"
            />
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm opacity-90 mb-2">{t('footer.language')}</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLanguageChange('pt')}
                  className={`text-primary-foreground hover:bg-white/20 px-3 py-2 rounded-md ${
                    language === 'pt' ? 'bg-white/20' : ''
                  }`}
                >
                  PT
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLanguageChange('en-basic')}
                  className={`text-primary-foreground hover:bg-white/20 px-3 py-2 rounded-md ${
                    language === 'en-basic' ? 'bg-white/20' : ''
                  }`}
                >
                  EN
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLanguageChange('en-intermediate')}
                  className={`text-primary-foreground hover:bg-white/20 px-3 py-2 rounded-md ${
                    language === 'en-intermediate' ? 'bg-white/20' : ''
                  }`}
                >
                  EN+
                </Button>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="text-center md:text-left">
              <p className="text-sm opacity-90 mb-2">{t('footer.followUs')}</p>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInstagramClick}
                  className="text-primary-foreground hover:bg-white/20 p-2 rounded-full"
                >
                  <Instagram className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLinkedInClick}
                  className="text-primary-foreground hover:bg-white/20 p-2 rounded-full"
                >
                  <Linkedin className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/20 mt-8 pt-8 text-center">
          <p className="text-sm opacity-75">
            © {new Date().getFullYear()} Teacher Késsia Lima. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;