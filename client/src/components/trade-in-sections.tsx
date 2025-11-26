import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import * as Icons from "lucide-react";
import { ReactNode } from "react";
import type { TradeInPageContent } from "@shared/schema";
import handshakeImage1 from "@assets/generated_images/Purple_gradient_handshake_illustration_671d0493.png";
import handshakeImage2 from "@assets/generated_images/Purple_gradient_partnership_handshake_68072f51.png";
import celebrationImage from "@assets/generated_images/Purple_gradient_celebration_illustration_9495ffb1.png";
import exchangeImage from "@assets/generated_images/Purple_gradient_exchange_arrows_illustration_1f779610.png";

interface EditableWrapperProps {
  children: ReactNode;
  fieldPath: string[];
  label: string;
  onEdit?: (fieldPath: string[], label: string) => void;
  editMode?: boolean;
}

// Editable wrapper component for inline editing
function EditableWrapper({ children, fieldPath, label, onEdit, editMode = false }: EditableWrapperProps) {
  if (!editMode || !onEdit) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative group cursor-pointer"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit(fieldPath, label);
      }}
    >
      <div className="group-hover:outline group-hover:outline-2 group-hover:outline-primary/50 group-hover:outline-dashed rounded transition-all">
        {children}
      </div>
      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Badge className="text-xs px-2 py-0.5 bg-primary pointer-events-none">
          ✏️ {label}
        </Badge>
      </div>
    </div>
  );
}

interface TradeInSectionProps {
  content: TradeInPageContent;
  editMode?: boolean;
  onEdit?: (fieldPath: string[], label: string) => void;
}

// Hero Section
export function TradeInHero({ content, editMode = false, onEdit }: TradeInSectionProps) {
  const handleTelegramContact = () => {
    window.open(content.telegramUrl, "_blank");
  };

  const scrollToFaq = () => {
    const faqSection = document.getElementById("faq-section");
    if (faqSection) {
      faqSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-background to-orange-900/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(147,51,234,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(249,115,22,0.1),transparent_50%)]" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="text-center space-y-6 md:space-y-8">
          <EditableWrapper fieldPath={["heroBadgeText"]} label="Badge текст" onEdit={onEdit} editMode={editMode}>
            <Badge className="mx-auto gap-1 bg-gradient-to-r from-purple-500/10 to-orange-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300" data-testid="badge-trade-in">
              <Icons.Sparkles className="h-3 w-3" />
              {content.heroBadgeText}
            </Badge>
          </EditableWrapper>
          
          <div className="space-y-4">
            <EditableWrapper fieldPath={["heroTitle"]} label="Заголовок" onEdit={onEdit} editMode={editMode}>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-purple-600 via-orange-500 to-pink-600 bg-clip-text text-transparent" data-testid="text-hero-title">
                  {content.heroTitle}
                </span>
              </h1>
            </EditableWrapper>
            
            <EditableWrapper fieldPath={["heroSubtitle"]} label="Подзаголовок" onEdit={onEdit} editMode={editMode}>
              <p className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-hero-subtitle">
                {content.heroSubtitle}
              </p>
            </EditableWrapper>
          </div>
          
          <EditableWrapper fieldPath={["heroDescription"]} label="Описание" onEdit={onEdit} editMode={editMode}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-hero-description">
              {content.heroDescription}
            </p>
          </EditableWrapper>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <EditableWrapper fieldPath={["heroButton"]} label="Настройки кнопки Hero" onEdit={onEdit} editMode={editMode}>
              <Button 
                size="lg" 
                className="text-base md:text-lg px-8 py-6 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 border-0"
                onClick={handleTelegramContact}
                data-testid="button-telegram-contact"
              >
                <Icons.MessageCircle className="mr-2 h-5 w-5" />
                {content.heroCtaPrimary}
              </Button>
            </EditableWrapper>
            
            <EditableWrapper fieldPath={["heroCtaSecondary"]} label="Текст вторичной кнопки" onEdit={onEdit} editMode={editMode}>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base md:text-lg px-8 py-6 border-2"
                onClick={scrollToFaq}
                data-testid="button-learn-more"
              >
                <Icons.ArrowRight className="mr-2 h-5 w-5" />
                {content.heroCtaSecondary}
              </Button>
            </EditableWrapper>
          </div>
        </div>
        
        {/* Images grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-12 md:mt-16">
          <Card className="group hover-elevate overflow-hidden border-purple-500/20" data-testid="card-image-1">
            <CardContent className="p-0">
              <div className="relative aspect-square overflow-hidden">
                <img 
                  src={handshakeImage1}
                  alt="Trade-In Partnership"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 text-white">
                  <EditableWrapper fieldPath={["heroImage1Title"]} label="Название изображения 1" onEdit={onEdit} editMode={editMode}>
                    <p className="font-bold text-sm md:text-base">{content.heroImage1Title}</p>
                  </EditableWrapper>
                  <EditableWrapper fieldPath={["heroImage1Description"]} label="Описание изображения 1" onEdit={onEdit} editMode={editMode}>
                    <p className="text-xs md:text-sm text-white/80">{content.heroImage1Description}</p>
                  </EditableWrapper>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group hover-elevate overflow-hidden border-orange-500/20" data-testid="card-image-2">
            <CardContent className="p-0">
              <div className="relative aspect-square overflow-hidden">
                <img 
                  src={celebrationImage}
                  alt="Success Stories"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 text-white">
                  <EditableWrapper fieldPath={["heroImage2Title"]} label="Название изображения 2" onEdit={onEdit} editMode={editMode}>
                    <p className="font-bold text-sm md:text-base">{content.heroImage2Title}</p>
                  </EditableWrapper>
                  <EditableWrapper fieldPath={["heroImage2Description"]} label="Описание изображения 2" onEdit={onEdit} editMode={editMode}>
                    <p className="text-xs md:text-sm text-white/80">{content.heroImage2Description}</p>
                  </EditableWrapper>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group hover-elevate overflow-hidden border-pink-500/20" data-testid="card-image-3">
            <CardContent className="p-0">
              <div className="relative aspect-square overflow-hidden">
                <img 
                  src={handshakeImage2}
                  alt="Mutual Benefits"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="group hover-elevate overflow-hidden border-yellow-500/20" data-testid="card-image-4">
            <CardContent className="p-0">
              <div className="relative aspect-square overflow-hidden">
                <img 
                  src={exchangeImage}
                  alt="Exchange Process"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

// How It Works Section
export function TradeInHowItWorks({ content, editMode = false, onEdit }: TradeInSectionProps) {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-12 md:mb-16">
          <EditableWrapper fieldPath={["howWorksBadgeText"]} label="Badge текст секции" onEdit={onEdit} editMode={editMode}>
            <Badge className="gap-1 bg-primary/10 border-primary/20 text-primary" data-testid="badge-how-works">
              <Icons.Zap className="h-3 w-3" />
              {content.howWorksBadgeText}
            </Badge>
          </EditableWrapper>
          
          <EditableWrapper fieldPath={["howWorksTitle"]} label="Заголовок секции" onEdit={onEdit} editMode={editMode}>
            <h2 className="text-3xl md:text-5xl font-black" data-testid="text-how-works-title">
              {content.howWorksTitle}
            </h2>
          </EditableWrapper>
          
          <EditableWrapper fieldPath={["howWorksSubtitle"]} label="Подзаголовок секции" onEdit={onEdit} editMode={editMode}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-how-works-subtitle">
              {content.howWorksSubtitle}
            </p>
          </EditableWrapper>
        </div>
        
        <EditableWrapper fieldPath={["steps"]} label="Шаги процесса" onEdit={onEdit} editMode={editMode}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {content.steps.map((step, index) => {
              const IconComponent = (Icons as any)[step.icon] || Icons.Circle;
              return (
                <Card key={index} className="group hover-elevate text-center" data-testid={`card-step-${index}`}>
                  <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                    <div className={`mx-auto w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-3 md:mb-4`}>
                      <IconComponent className="h-7 w-7 md:h-8 md:w-8 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg md:text-xl font-bold">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </EditableWrapper>
      </div>
    </section>
  );
}

// Benefits Section
export function TradeInBenefits({ content, editMode = false, onEdit }: TradeInSectionProps) {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-12 md:mb-16">
          <EditableWrapper fieldPath={["benefitsBadgeText"]} label="Badge текст секции" onEdit={onEdit} editMode={editMode}>
            <Badge className="gap-1 bg-gradient-to-r from-purple-500/10 to-orange-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300" data-testid="badge-benefits">
              <Icons.Trophy className="h-3 w-3" />
              {content.benefitsBadgeText}
            </Badge>
          </EditableWrapper>
          
          <EditableWrapper fieldPath={["benefitsTitle"]} label="Заголовок секции" onEdit={onEdit} editMode={editMode}>
            <h2 className="text-3xl md:text-5xl font-black" data-testid="text-benefits-title">
              {content.benefitsTitle}
            </h2>
          </EditableWrapper>
        </div>
        
        <EditableWrapper fieldPath={["benefits"]} label="Список преимуществ" onEdit={onEdit} editMode={editMode}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {content.benefits.map((benefit, index) => {
              const IconComponent = (Icons as any)[benefit.icon] || Icons.Star;
              return (
                <Card key={index} className="group hover-elevate text-center" data-testid={`card-benefit-${index}`}>
                  <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                    <div className="mx-auto w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-orange-500/10 flex items-center justify-center mb-3 md:mb-4">
                      <IconComponent className="h-7 w-7 md:h-8 md:w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg md:text-xl font-bold">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </EditableWrapper>
      </div>
    </section>
  );
}

// CTA Section
export function TradeInCTA({ content, editMode = false, onEdit }: TradeInSectionProps) {
  const handleTelegramContact = () => {
    window.open(content.telegramUrl, "_blank");
  };

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="relative overflow-hidden border-2 border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-background to-orange-500/10" />
          <CardContent className="relative p-8 md:p-12 text-center space-y-6">
            <EditableWrapper fieldPath={["ctaTitle"]} label="Заголовок CTA" onEdit={onEdit} editMode={editMode}>
              <h2 className="text-3xl md:text-4xl font-black" data-testid="text-cta-title">
                {content.ctaTitle}
              </h2>
            </EditableWrapper>
            
            <EditableWrapper fieldPath={["ctaDescription"]} label="Описание CTA" onEdit={onEdit} editMode={editMode}>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-cta-description">
                {content.ctaDescription}
              </p>
            </EditableWrapper>
            
            <EditableWrapper fieldPath={["ctaButton"]} label="Настройки кнопки CTA" onEdit={onEdit} editMode={editMode}>
              <Button 
                size="lg" 
                className="text-base md:text-lg px-8 py-6 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 border-0"
                onClick={handleTelegramContact}
                data-testid="button-cta-telegram"
              >
                <Icons.MessageCircle className="mr-2 h-5 w-5" />
                {content.ctaButtonText}
              </Button>
            </EditableWrapper>
            
            <div className="space-y-4 max-w-md mx-auto pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Icons.MessageCircle className="h-5 w-5 text-primary" />
                  <EditableWrapper fieldPath={["contactTelegram"]} label="Telegram контакт" onEdit={onEdit} editMode={editMode}>
                    <span className="text-sm font-medium" data-testid="text-contact-telegram">{content.contactTelegram}</span>
                  </EditableWrapper>
                </div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Icons.Clock className="h-5 w-5 text-primary" />
                  <EditableWrapper fieldPath={["contactWorkingHours"]} label="Часы работы" onEdit={onEdit} editMode={editMode}>
                    <span className="text-sm text-muted-foreground" data-testid="text-working-hours">{content.contactWorkingHours}</span>
                  </EditableWrapper>
                </div>
              </div>
              
              <div className="flex items-center gap-2 justify-center border-t pt-4">
                <Icons.Link className="h-4 w-4 text-muted-foreground" />
                <EditableWrapper fieldPath={["telegramUrl"]} label="Ссылка на Telegram" onEdit={onEdit} editMode={editMode}>
                  <a 
                    href={content.telegramUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    data-testid="link-telegram-url"
                  >
                    {content.telegramUrl}
                  </a>
                </EditableWrapper>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// FAQ Section
export function TradeInFAQ({ content, editMode = false, onEdit }: TradeInSectionProps) {
  return (
    <section id="faq-section" className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-12">
          <EditableWrapper fieldPath={["faqTitle"]} label="Заголовок FAQ" onEdit={onEdit} editMode={editMode}>
            <h2 className="text-3xl md:text-4xl font-black" data-testid="text-faq-title">
              {content.faqTitle}
            </h2>
          </EditableWrapper>
          
          <EditableWrapper fieldPath={["faqSubtitle"]} label="Подзаголовок FAQ" onEdit={onEdit} editMode={editMode}>
            <p className="text-lg text-muted-foreground" data-testid="text-faq-subtitle">
              {content.faqSubtitle}
            </p>
          </EditableWrapper>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {content.faqItems.map((item, index) => (
            <EditableWrapper 
              key={index} 
              fieldPath={["faqItems", String(index)]} 
              label={`FAQ вопрос ${index + 1}`} 
              onEdit={onEdit} 
              editMode={editMode}
            >
              <Card className="overflow-hidden" data-testid={`card-faq-${index}`}>
                <AccordionItem value={`item-${index}`} className="border-0">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover-elevate">
                    <span className="text-left font-bold">{item.q}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4">
                    <p className="text-muted-foreground leading-relaxed">{item.a}</p>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            </EditableWrapper>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
