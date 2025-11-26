import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Shield, Gem } from "lucide-react";
import { Link } from "wouter";
import { formatPrice } from "@/lib/formatPrice";
import { Diamond } from "@/components/Diamond";
import { SwipeableCarousel } from "@/components/SwipeableCarousel";

export const tierConfig: Record<string, {
  gradient: string;
  sphereClass?: string;
  isDiamond?: boolean;
  borderGlow: string;
}> = {
  bronze: {
    gradient: 'from-amber-900/30 to-amber-600/20',
    sphereClass: 'sphere-bronze',
    borderGlow: 'border-amber-500/40 shadow-xl shadow-amber-500/20',
  },
  silver: {
    gradient: 'from-slate-800/30 to-slate-500/20',
    sphereClass: 'sphere-silver',
    borderGlow: 'border-slate-400/40 shadow-xl shadow-slate-400/20',
  },
  gold: {
    gradient: 'from-yellow-900/30 to-yellow-400/20',
    sphereClass: 'sphere-gold',
    borderGlow: 'border-yellow-500/50 shadow-xl shadow-yellow-500/30',
  },
  diamond: {
    gradient: 'from-cyan-900/30 via-purple-800/20 to-purple-500/20',
    isDiamond: true,
    borderGlow: 'border-purple-500/50 shadow-xl shadow-purple-500/30',
  },
};

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

interface VipHeaderProps {
  pageTitle: string;
  pageSubtitle: string;
  editMode?: boolean;
  onEdit?: (fieldPath: string[], label: string) => void;
}

export function VipHeader({ pageTitle, pageSubtitle, editMode = false, onEdit }: VipHeaderProps) {
  return (
    <div className="mb-6 md:mb-10 text-center">
      <EditableWrapper
        fieldPath={["pageTitle"]}
        label="Заголовок страницы"
        editMode={editMode}
        onEdit={onEdit}
      >
        <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
          <Crown className="h-6 w-6 md:h-10 md:w-10 text-yellow-500 vip-shimmer flex-shrink-0" />
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 bg-clip-text text-transparent">
            {pageTitle}
          </h1>
          <Crown className="h-6 w-6 md:h-10 md:w-10 text-yellow-500 vip-shimmer flex-shrink-0" />
        </div>
      </EditableWrapper>
      <EditableWrapper
        fieldPath={["pageSubtitle"]}
        label="Подзаголовок страницы"
        editMode={editMode}
        onEdit={onEdit}
      >
        <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed px-2">
          {pageSubtitle}
        </p>
      </EditableWrapper>
    </div>
  );
}

interface VipTier {
  id: string;
  tier: string;
  displayName: string;
  description?: string;
  price?: string;
  features: string[];
  displayOrder: number;
}

interface Course {
  id: string;
  vipTier?: string | null;
  [key: string]: any;
}

interface VipTiersGridProps {
  vipTiers: VipTier[];
  vipCourses?: Course[];
  purchasedVipIds?: Set<string>;
  isAuthenticated?: boolean;
  editMode?: boolean;
  onEdit?: (fieldPath: string[], label: string) => void;
}

export function VipTiersGrid({ 
  vipTiers,
  vipCourses = [],
  purchasedVipIds = new Set(), 
  isAuthenticated = false,
  editMode = false,
  onEdit
}: VipTiersGridProps) {
  const sortedTiers = [...vipTiers].sort((a, b) => {
    const order = { bronze: 1, silver: 2, gold: 3, diamond: 4 };
    return (order[a.tier as keyof typeof order] || 0) - (order[b.tier as keyof typeof order] || 0);
  });

  const renderCard = (tier: VipTier) => {
    const config = tierConfig[tier.tier] || tierConfig.bronze;
    const isPurchased = purchasedVipIds.has(tier.id);
    const vipCourse = vipCourses?.find(c => c.vipTier === tier.tier);

    return (
      <Card
        key={tier.id}
        className={`relative overflow-hidden border-2 transition-all duration-300 hover-elevate ${config.borderGlow} flex flex-col w-full scrollbar-hide`}
        data-testid={`card-vip-tier-${tier.tier}`}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} pointer-events-none`} />

        <CardHeader className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            {config.isDiamond ? (
              <Diamond className="diamond-sparkle" />
            ) : config.sphereClass ? (
              <div className={`h-10 w-10 rounded-full ${config.sphereClass}`} />
            ) : null}
            {isPurchased && (
              <Badge variant="default" className="bg-green-600">
                <Shield className="h-3 w-3 mr-1" />
                Активна
              </Badge>
            )}
          </div>
          <EditableWrapper
            fieldPath={["tiers", tier.tier, "displayName"]}
            label={`Название тарифа ${tier.tier}`}
            editMode={editMode}
            onEdit={onEdit}
          >
            <CardTitle className="text-3xl font-bold tracking-tight mt-4">
              {tier.displayName}
            </CardTitle>
          </EditableWrapper>
          <EditableWrapper
            fieldPath={["tiers", tier.tier, "description"]}
            label={`Описание тарифа ${tier.tier}`}
            editMode={editMode}
            onEdit={onEdit}
          >
            <CardDescription className="text-base">
              {tier.description || `Тариф ${tier.displayName}`}
            </CardDescription>
          </EditableWrapper>
        </CardHeader>

        <CardContent className="relative z-10 space-y-4 flex-1 scrollbar-hide">
          <EditableWrapper
            fieldPath={["tiers", tier.tier, "price"]}
            label={`Цена тарифа ${tier.tier}`}
            editMode={editMode}
            onEdit={onEdit}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                {tier.price ? formatPrice(tier.price) : "Бесплатно"}
              </span>
            </div>
          </EditableWrapper>

          <EditableWrapper
            fieldPath={["tiers", tier.tier, "features"]}
            label={`Функции тарифа ${tier.tier}`}
            editMode={editMode}
            onEdit={onEdit}
          >
            <ul className="space-y-2">
              {tier.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </EditableWrapper>
        </CardContent>

        <CardFooter className="relative z-10 pt-0">
          {isPurchased ? (
            <Button 
              className="w-full relative overflow-hidden backdrop-blur-sm bg-white/5 border-2 border-green-500/30 text-white shadow-lg transition-all duration-300 group" 
              disabled 
              data-testid={`button-purchased-${tier.tier}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center justify-center">
                <Check className="mr-2 h-4 w-4" />
                Уже куплено
              </span>
            </Button>
          ) : (
            <Button 
              className="w-full relative overflow-hidden backdrop-blur-sm bg-white/5 border-2 border-yellow-500/30 text-white shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 font-semibold group" 
              size="lg"
              asChild={!!vipCourse}
              data-testid={`button-select-${tier.tier}`}
              disabled={editMode || !vipCourse}
            >
              {vipCourse ? (
                <Link href={`/course/${vipCourse.id}`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <span className="relative flex items-center justify-center">
                    <Crown className="mr-2 h-4 w-4" />
                    Выбрать тариф
                  </span>
                </Link>
              ) : (
                <span className="relative flex items-center justify-center">
                  Временно недоступно
                </span>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <>
      {/* Mobile version with carousel */}
      <div className="md:hidden">
        <SwipeableCarousel>
          {sortedTiers.map((tier) => renderCard(tier))}
        </SwipeableCarousel>
      </div>

      {/* Desktop version with grid */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {sortedTiers.map((tier) => renderCard(tier))}
      </div>
    </>
  );
}
