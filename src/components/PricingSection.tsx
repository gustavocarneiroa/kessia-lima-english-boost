import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

const PricingSection = () => {
  const { t } = useLanguage();

  const morningPlans = [
    {
      package: '3 meses',
      duration: '1x por semana',
      classes: 12,
      originalPrice: 840,
      discountPrice: null,
      discount: null
    },
    {
      package: '6 meses',
      duration: '1x por semana',
      classes: 24,
      originalPrice: 1680,
      discountPrice: 1596,
      discount: '5%'
    },
    {
      package: '9 meses',
      duration: '1x por semana',
      classes: 36,
      originalPrice: 2520,
      discountPrice: 2268,
      discount: '10%'
    }
  ];

  const nightPlans = [
    {
      package: '3 meses',
      duration: '1x por semana',
      classes: 12,
      originalPrice: 1080,
      discountPrice: null,
      discount: null
    },
    {
      package: '6 meses',
      duration: '1x por semana',
      classes: 24,
      originalPrice: 2160,
      discountPrice: 2052,
      discount: '5%'
    },
    {
      package: '9 meses',
      duration: '1x por semana',
      classes: 36,
      originalPrice: 3240,
      discountPrice: 2916,
      discount: '10%'
    },
    {
      package: '12 meses',
      duration: '1x por semana',
      classes: 48,
      originalPrice: 3360,
      discountPrice: 2856,
      discount: '15%'
    }
  ];

  const formatPrice = (price: number) => {
    return `R$${price.toLocaleString('pt-BR')}`;
  };

  const PricingTable = ({ plans, title }: { plans: typeof morningPlans, title: string }) => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold text-primary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">{t('pricing.package')}</TableHead>
              <TableHead className="font-semibold">{t('pricing.duration')}</TableHead>
              <TableHead className="font-semibold">{t('pricing.classes')}</TableHead>
              <TableHead className="font-semibold">{t('pricing.originalPrice')}</TableHead>
              <TableHead className="font-semibold">{t('pricing.discountPrice')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{plan.package}</TableCell>
                <TableCell>{plan.duration}</TableCell>
                <TableCell>{plan.classes} {t('pricing.classesUnit')}</TableCell>
                <TableCell>
                  <span className={plan.discountPrice ? 'line-through text-muted-foreground' : 'font-bold text-primary'}>
                    {formatPrice(plan.originalPrice)}
                  </span>
                </TableCell>
                <TableCell>
                  {plan.discountPrice ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">
                        {formatPrice(plan.discountPrice)}
                      </span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {plan.discount} OFF
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <PricingTable 
            plans={morningPlans} 
            title={t('pricing.morningAfternoon')}
          />
          <PricingTable 
            plans={nightPlans} 
            title={t('pricing.night')}
          />
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