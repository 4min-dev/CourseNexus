import { CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatPrice } from "@/lib/formatPrice";
import { Diamond } from "@/components/Diamond";
import { GlassCard } from "@/components/GlassCard";
import { htmlToText } from "@/lib/utils";
import { Course } from "@shared/schema";
import React from "react";
import { VipTier } from "@/pages/shop";

type MobileVipCardProps = {
    sortedVips: Course[]
    itemIndex: number,
    activeIndex: number,
    purchasedCourseIds: Set<string>,
    vipTiers?: VipTier[]
}

const MobileVipCard: React.FC<MobileVipCardProps> = ({ sortedVips, itemIndex, activeIndex, purchasedCourseIds, vipTiers }) => {

    const [location, setLocation] = useLocation();

    const vip = sortedVips[itemIndex];
    if (!vip) return null;

    const isExpanded = activeIndex === itemIndex;
    const isPurchased = purchasedCourseIds.has(vip.id);
    const tier = vip.vipTier || 'bronze';

    // Get tier data from vipTiers
    const tierData = vipTiers?.find(t => t.tier === tier);

    const tierConfig: Record<string, {
        sphereClass?: string;
        isDiamond?: boolean;
        glowColor: "purple" | "blue" | "pink" | "gold" | "cyan" | "silver" | "bronze";
    }> = {
        bronze: {
            sphereClass: 'sphere-bronze',
            glowColor: 'bronze',
        },
        silver: {
            sphereClass: 'sphere-silver',
            glowColor: 'silver',
        },
        gold: {
            sphereClass: 'sphere-gold',
            glowColor: 'gold',
        },
        diamond: {
            isDiamond: true,
            glowColor: 'purple',
        },
    };

    const config = tierConfig[tier] || tierConfig.bronze;

    return (
        <div key={vip.id} className="w-full px-2">
            <Link href={`/course/${vip.id}`} className="block">
                <GlassCard
                    variant="premium"
                    glowColor={config.glowColor}
                    hover={false}
                    isActive={isExpanded}
                    className={`
        w-full  transition-all duration-500 ease-out
        min-h-[350px]
      `}
                    data-testid={`card-vip-${tier}`}
                >
                    <div className="flex flex-col h-full">
                        {/* Заголовок всегда одинаковый */}
                        <CardHeader className="space-y-2 pb-3 relative z-10">
                            <div className="flex items-center justify-between">
                                {config.isDiamond ? (
                                    <Diamond className="diamond-sparkle w-7 h-7" />
                                ) : (
                                    <div className={`h-7 w-7 rounded-full ${config.sphereClass}`} />
                                )}
                                {isPurchased && (
                                    <Badge variant="default" className="bg-green-600 text-xs">
                                        <Shield className="h-3 w-3 mr-1" />
                                        Активна
                                    </Badge>
                                )}
                            </div>
                            <h3 className="font-bold tracking-tight text-2xl">
                                {tierData?.displayName || vip.title}
                            </h3>
                        </CardHeader>

                        {/* Контент с анимацией расширения */}
                        <div className="flex-1 flex flex-col justify-between px-6 pb-6">
                            <div className={`space-y-4 transition-all duration-500 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent text-3xl">
                                        {formatPrice(tierData?.price || vip.price || "0")}
                                    </span>
                                </div>

                                <p className={`text-sm text-muted-foreground/90 leading-snug transition-all duration-500 ${isExpanded ? 'line-clamp-none' : 'line-clamp-3'
                                    }`}>
                                    {tierData?.description || (vip.description ? htmlToText(vip.description) : 'Эксклюзивный доступ к премиум контенту и персональной поддержке')}
                                </p>

                                {/* Список фич — показывается только при расширении */}
                                <div className={`space-y-2 overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                    }`}>
                                    <p className="text-xs font-semibold text-muted-foreground">Что входит:</p>
                                    {(tierData?.features || []).map((feature: string, idx: number) => (
                                        <div key={idx} className="flex items-start gap-1.5">
                                            <Check className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                            <span className="text-xs leading-snug">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Кнопка всегда внизу */}
                            <Button
                                className={`w-full relative overflow-hidden backdrop-blur-sm font-semibold transition-all duration-300 group mt-6 ${isPurchased
                                    ? 'bg-white/5 border-2 border-green-500/30 text-white shadow-lg'
                                    : 'bg-white/5 border-2 border-yellow-500/30 text-white shadow-yellow-500/50'
                                    }`}
                                size="lg"
                                disabled={isPurchased}
                                onClick={(e) => {
                                    if (isPurchased) e.preventDefault();
                                }}
                            >
                                <div className={`absolute inset-0 transition-opacity duration-700 ${isPurchased
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 opacity-100'
                                    : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-600 opacity-100'
                                    }`} />
                                <span className="relative flex items-center justify-center">
                                    {isPurchased ? (
                                        <> <Check className="mr-2 h-5 w-5" /> У вас есть подписка </>
                                    ) : (
                                        <> <Crown className="mr-2 h-5 w-5" /> Оформить подписку </>
                                    )}
                                </span>
                            </Button>
                        </div>
                    </div>
                </GlassCard>
            </Link>
        </div>
    )
}

export default MobileVipCard
