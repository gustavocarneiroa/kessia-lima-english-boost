import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { Check, Star, Sun, Moon } from 'lucide-react';

const PricingSection = () => {
  const { t } = useLanguage();
  const [isNightTime, setIsNightTime] = useState(false);
  const [daysPerWeek, setDaysPerWeek] = useState(1);

  const morningPlans = [
    {
      package: '3 meses',
      duration: '1x por semana',
      classes: 12,
      months: 3,
      originalPrice: 840,
      discountPrice: null,
      discount: null,
      isRecommended: false
    },
    {
      package: '6 meses',
      duration: '1x por semana',
      classes: 24,
      months: 6,
      originalPrice: 1680,
      discountPrice: 1596,
      discount: '5%',
      isRecommended: true
    },
    {
      package: '9 meses',
      duration: '1x por semana',
      classes: 36,
      months: 9,
      originalPrice: 2520,
      discountPrice: 2268,
      discount: '10%',
      isRecommended: false
    },
    {
      package: '12 meses',
      duration: '1x por semana',
      classes: 48,
      months: 12,
      originalPrice: 3360,
      discountPrice: 2856,
      discount: '15%',
      isRecommended: false
    }
  ];

  const nightPlans = [
    {
      package: '3 meses',
      duration: '1x por semana',
      classes: 12,
      months: 3,
      originalPrice: 1080,
      discountPrice: null,
      discount: null,
      isRecommended: false
    },
    {
      package: '6 meses',
      duration: '1x por semana',
      classes: 24,
      months: 6,
      originalPrice: 2160,
      discountPrice: 2052,
      discount: '5%',
      isRecommended: true
    },
    {
      package: '9 meses',
      duration: '1x por semana',
      classes: 36,
      months: 9,
      originalPrice: 3240,
      discountPrice: 2916,
      discount: '10%',
      isRecommended: false
    },
    {
      package: '12 meses',
      duration: '1x por semana',
      classes: 48,
      months: 12,
      originalPrice: 4320,
      discountPrice: 3672,
      discount: '15%',
      isRecommended: false
    }
  ];

  const formatPrice = (price: number) => {
    return `R$${price.toLocaleString('pt-BR')}`;
  };

  const currentPlans = isNightTime ? nightPlans : morningPlans;

  const PricingCard = ({ plan }: { plan: typeof morningPlans[0] }) => {
    const finalPrice = (plan.discountPrice || plan.originalPrice) * daysPerWeek;
    const monthlyPrice = Math.round(finalPrice / plan.months);
    const totalClasses = plan.classes * daysPerWeek;
    
    return (
      <Card className={`relative h-full ${plan.isRecommended ? 'ring-2 ring-primary shadow-lg scale-105' : ''}`}>
        {plan.isRecommended && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground px-3 py-1 flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              {t('pricing.bestValue')}
            </Badge>
          </div>
        )}
        
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold">{plan.package}</CardTitle>
          <div className="space-y-2">
            <div className="text-4xl font-bold text-primary">
              {plan.months}x de {formatPrice(monthlyPrice)}
            </div>
            <div className="text-xl text-muted-foreground">
              Total: {formatPrice(finalPrice)}
            </div>
            {plan.discountPrice && (
              <div className="text-sm text-muted-foreground/70 line-through">
                De: {formatPrice((plan.originalPrice * daysPerWeek))}
              </div>
            )}
          </div>
          {plan.discount && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 mx-auto">
              {plan.discount} OFF
            </Badge>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>{totalClasses} {t('pricing.classesUnit')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>{daysPerWeek}x {t('pricing.perWeek')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>{t('pricing.individualClasses')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>{t('pricing.personalizedMaterial')}</span>
            </div>
          </div>
          
          <Button className="w-full" size="lg">
            {t('pricing.selectPlan')}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('pricing.subtitle')}
          </p>
          
          {/* Days per Week Selector */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="font-medium text-muted-foreground">{t('pricing.daysPerWeek')}:</span>
            <div className="flex gap-2">
              {[1, 2, 3].map((days) => (
                <Button
                  key={days}
                  variant={daysPerWeek === days ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDaysPerWeek(days)}
                  className="min-w-[40px]"
                >
                  {days}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-orange-400" />
              <span className={`font-medium ${!isNightTime ? 'text-primary' : 'text-muted-foreground'}`}>
                {t('pricing.morningAfternoon')}
              </span>
            </div>
            <Switch
              checked={isNightTime}
              onCheckedChange={setIsNightTime}
              className="data-[state=checked]:bg-primary"
            />
            <div className="flex items-center gap-2">
              <span className={`font-medium ${isNightTime ? 'text-primary' : 'text-muted-foreground'}`}>
                {t('pricing.night')}
              </span>
              <Moon className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {currentPlans.map((plan, index) => (
            <PricingCard key={index} plan={plan} />
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            {t('pricing.note')}
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;