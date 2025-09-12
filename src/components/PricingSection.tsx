import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DayNightSwitch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { Check, Star } from 'lucide-react';
import { NumberTicker } from './ui/number-ticket';
import { siteConfig } from '@/config/siteConfig';
import { Modal, ModalBody, ModalContent, ModalFooter, useModal } from '@/components/ui/animated-modal';
import { motion } from 'motion/react';

const PricingSection = () => {
  const { t } = useLanguage();
  const images = [
    "/share200.jpeg",
    "/images/kiara.png",
  ];
  const [showWaitingListModal, setShowWaitingListModal] = useState(false);

  const handleWaitingList = () => {
    window.open(siteConfig.waitingListUrl, '_blank');
    setShowWaitingListModal(false);
  };
  const [isNightTime, setIsNightTime] = useState(false);
  const [daysPerWeek, setDaysPerWeek] = useState(1);

  const ModalOpenSync = ({ open }: { open: boolean }) => {
    const { setOpen } = useModal();
    useEffect(() => {
      setOpen(open);
    }, [open, setOpen]);
    return null;
  };

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
    const otherPlan = (isNight ? morningPlans : nightPlans).find(pl => pl.package == plan.package);

    const finalPrice = (plan.discountPrice || plan.originalPrice) * daysPerWeek;
    const otherFinalPrice = (otherPlan.discountPrice || otherPlan.originalPrice) * daysPerWeek;

    const monthlyPrice = Math.round(finalPrice / plan.months);
    const otherMonthlyPrice = Math.round(otherFinalPrice / plan.months)

    const totalClasses = plan.classes * daysPerWeek;
    const direction = isNight ? "up" : "down";

    let finalTickerStartValue = finalPrice;
    let finalTickerValue = otherFinalPrice;

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
              {plan.months}<span className='font-light'>x</span> R$<NumberTicker startValue={monthlyTickerStartValue} direction={direction} value={monthlyTickerValue} />
            </div>
            <div className="text-xl text-muted-foreground">
              Total: R$ <NumberTicker startValue={finalTickerStartValue} direction={direction} value={finalTickerValue} />
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

          <Button onClick={() => {
            if (siteConfig.waitingListOnly) {
              setShowWaitingListModal(true);
            } else {
              const formUrl = `https://wa.me/5585997362806?text=Quero%20aprender%20ingl%C3%AAs%2C%20teacher!%0APlano escolhido: ${plan.package} - ${plan.months} meses%20%0ATurno: ${isNightTime ? "Noite" : "Manhã"}%20`;
              window.open(formUrl, '_blank');
            }
          }} className="w-full" size="lg">
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


          {/* Time Toggle */}
          <div className="flex items-center justify-center mb-8">
            <DayNightSwitch
              checked={isNightTime}
              onCheckedChange={setIsNightTime}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          <div className="text-center mb-6">
            <span className="text-lg font-medium text-foreground">
              {isNightTime ? t("pricing.night") : t("pricing.morningAfternoon")}
            </span>
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

      {/* Waiting List Modal */}
      <Modal onChange={setShowWaitingListModal}>
        <ModalOpenSync open={showWaitingListModal} />
        <ModalBody>
          <ModalContent>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                {t('waitingList.title')}
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {t('waitingList.description')}
              </p>
            </div>
            <div className="flex justify-center items-center">
              {images.map((image, idx) => (
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
          <ModalFooter className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => setShowWaitingListModal(false)}
            >
              {t('waitingList.close')}
            </Button>
            <Button onClick={handleWaitingList}>
              {t('waitingList.button')}
            </Button>
          </ModalFooter>
        </ModalBody>
      </Modal>
    </section>
  );
};

export default PricingSection;