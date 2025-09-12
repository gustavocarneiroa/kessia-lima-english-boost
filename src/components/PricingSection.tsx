import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DayNightSwitch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { Check, Star, Sun, Moon } from 'lucide-react';
import { NumberTicker } from './ui/number-ticket';

const PricingSection = () => {
  const { t } = useLanguage();
  
  const handleFormClick = (_package: string, months: number, shift: string) => {
    const formUrl = `https://wa.me/5585997362806?text=Quero%20aprender%20ingl%C3%AAs%2C%20teacher!%0APlano escolhido: ${_package} - ${months} meses%20%0ATurno: ${shift}%20`;
    return () => window.open(formUrl, '_blank');
  };
  const [isNightTime, setIsNightTime] = useState(false);
  const [daysPerWeek, setDaysPerWeek] = useState(1);

  const morningPlans = [
    {
      package: 'Start',
      classes: 12,
      months: 3,
      originalPrice: 840,
      discountPrice: null,
      discount: null,
      isRecommended: false
    },
    {
      package: 'Progress',
      classes: 24,
      months: 6,
      originalPrice: 1680,
      discountPrice: 1596,
      discount: '5%',
      isRecommended: true
    },
    {
      package: 'Advance',
      classes: 36,
      months: 9,
      originalPrice: 2520,
      discountPrice: 2268,
      discount: '10%',
      isRecommended: false
    },
    {
      package: 'Master',
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
      package: 'Start',
      classes: 12,
      months: 3,
      originalPrice: 1080,
      discountPrice: null,
      discount: null,
      isRecommended: false
    },
    {
      package: 'Progress',
      classes: 24,
      months: 6,
      originalPrice: 2160,
      discountPrice: 2052,
      discount: '5%',
      isRecommended: true
    },
    {
      package: 'Advance',
      classes: 36,
      months: 9,
      originalPrice: 3240,
      discountPrice: 2916,
      discount: '10%',
      isRecommended: false
    },
    {
      package: 'Master',
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

  const PricingCard = ({ plan, isNight }: { plan: typeof morningPlans[0], isNight: boolean }) => {
    const otherPlan = (isNight ? morningPlans : nightPlans).find( pl => pl.package == plan.package);

    const finalPrice = (plan.discountPrice || plan.originalPrice) * daysPerWeek;
    const otherFinalPrice = (otherPlan.discountPrice || otherPlan.originalPrice) * daysPerWeek;
    
    const monthlyPrice = Math.round(finalPrice / plan.months);
    const otherMonthlyPrice = Math.round(otherFinalPrice / plan.months)
    
    const totalClasses = plan.classes * daysPerWeek;
    const direction = isNight ? "up" : "down";

    let finalTickerStartValue = finalPrice; 
    let finalTickerValue =  otherFinalPrice;

    let monthlyTickerStartValue = monthlyPrice;
    let monthlyTickerValue = otherMonthlyPrice;
    

    if (isNight) {
      finalTickerStartValue = otherFinalPrice;
      finalTickerValue = finalPrice;

      monthlyTickerStartValue = otherMonthlyPrice;
      monthlyTickerValue = monthlyPrice;
    }
    

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
            <div className="text-3xl font-bold text-primary">
              {plan.months}<span className='font-light'>x</span> R$<NumberTicker startValue={monthlyTickerStartValue} direction={direction} value={monthlyTickerValue}/>
            </div>
            <div className="text-xl text-muted-foreground">
              Total: R$ <NumberTicker startValue={finalTickerStartValue} direction={direction} value={finalTickerValue}/>
            </div>
            {plan.discountPrice && (
              <div className="text-sm text-muted-foreground/70 line-through">
                {formatPrice((plan.originalPrice * daysPerWeek))}
                {plan.discount && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 mx-auto">
                    {plan.discount} OFF
                  </Badge>
                )}
              </div>
            )}
          </div>
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
          
          <Button onClick={handleFormClick(plan.package ,plan.months, isNightTime ? "Noite": "Manhã")} className="w-full" size="lg">
            {t('pricing.selectPlan')}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('pricing.subtitle')}
          </p>
          
          {/* Days per Week Selector */}
          {/* <div className="flex items-center justify-center gap-4 mb-6">
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
          </div> */}

          {/* Time Toggle */}
          {
            isNightTime ? t("pricing.night") : t("pricing.morningAfternoon")
          }
          <div className="flex items-center justify-center gap-4 mb-8">
            <DayNightSwitch
              checked={isNightTime}
              onCheckedChange={setIsNightTime}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {currentPlans.map((plan, index) => (
            <PricingCard key={index} plan={plan} isNight={isNightTime} />
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