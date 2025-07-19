import { useState } from 'react';
import { Menu, Instagram, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import logo from '@/assets/logo.png';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const whatsappNumber = "5585997362806";
  const instagramHandle = "teacherkessialima";

  const handleWhatsAppClick = () => {
    window.open(`https://wa.me/${whatsappNumber}`, '_blank');
  };

  const handleInstagramClick = () => {
    window.open(`https://instagram.com/${instagramHandle}`, '_blank');
  };

  const languageOptions = [
    { value: 'pt', label: 'Português' },
    { value: 'en-basic', label: 'English (Basic)' },
    { value: 'en-intermediate', label: 'English (Intermediate)' }
  ];

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <img src={logo} alt="Teacher Késsia Lima" className="h-12 w-auto" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#home" className="text-foreground hover:text-primary transition-colors">
              {t('header.home')}
            </a>
            <a href="#services" className="text-foreground hover:text-primary transition-colors">
              {t('header.services')}
            </a>
            <a href="#about" className="text-foreground hover:text-primary transition-colors">
              {t('header.about')}
            </a>
            <a href="#contact" className="text-foreground hover:text-primary transition-colors">
              {t('header.contact')}
            </a>
          </nav>

          {/* Right side actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Selector */}
            <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
              <SelectTrigger className="w-40 bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Instagram */}
            <Button variant="ghost" size="sm" onClick={handleInstagramClick}>
              <Instagram className="h-5 w-5" />
            </Button>

            {/* WhatsApp CTA */}
            <Button onClick={handleWhatsAppClick} className="bg-primary hover:bg-primary/90">
              {t('header.talkToMe')}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border">
            <nav className="flex flex-col space-y-4 mt-4">
              <a href="#home" className="text-foreground hover:text-primary transition-colors">
                {t('header.home')}
              </a>
              <a href="#services" className="text-foreground hover:text-primary transition-colors">
                {t('header.services')}
              </a>
              <a href="#about" className="text-foreground hover:text-primary transition-colors">
                {t('header.about')}
              </a>
              <a href="#contact" className="text-foreground hover:text-primary transition-colors">
                {t('header.contact')}
              </a>
              
              <div className="flex flex-col space-y-3 pt-4 border-t border-border">
                <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
                  <SelectTrigger className="w-full bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex flex-col space-y-2">
                  <Button variant="ghost" size="sm" onClick={handleInstagramClick} className="w-full">
                    <Instagram className="h-5 w-5 mr-2" />
                    Instagram
                  </Button>
                  <Button onClick={handleWhatsAppClick} className="w-full">
                    {t('header.talkToMe')}
                  </Button>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;