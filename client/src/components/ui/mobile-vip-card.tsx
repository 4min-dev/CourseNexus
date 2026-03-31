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
    isActive: boolean,
    purchasedCourseIds: Set<string>,
    vipTiers?: VipTier[]
    disableExpand?: boolean
    maxWidthPx?: number
}

const MobileVipCard: React.FC<MobileVipCardProps> = ({
    sortedVips,
    itemIndex,
    isActive,
    purchasedCourseIds,
    vipTiers,
    disableExpand = false,
    maxWidthPx
}) => {

    const [location, setLocation] = useLocation();

    const vip = sortedVips[itemIndex];
    if (!vip) return null;

    const isExpanded = disableExpand ? false : isActive;
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
        <div
            key={vip.id}
            className="w-full px-2 pt-2 mx-auto"
            style={maxWidthPx ? { maxWidth: `${maxWidthPx}px` } : undefined}
        >
            <Link href={`/course/${vip.id}`} className="block">
                <GlassCard
                    variant="premium"
                    glowColor={config.glowColor}
                    hover={false}
                    isActive={isExpanded}
                    className={`
        w-full  transition-all duration-500 ease-out
        min-h-[305px]
      `}
                    data-testid={`card-vip-${tier}`}
                >
                    <div className="flex flex-col h-full">
                        {/* Заголовок всегда одинаковый */}
                        <CardHeader className="space-y-0.5 pb-1 !px-4 !py-3 relative z-10">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    {config.isDiamond ? (
                                        <Diamond className="diamond-sparkle w-6 h-6 flex-shrink-0" />
                                    ) : (
                                        <div className={`h-6 w-6 rounded-full ${config.sphereClass} flex-shrink-0`} />
                                    )}
                                    <h3 className="font-bold tracking-tight text-xl leading-tight break-words">
                                        {tierData?.displayName || vip.title}
                                    </h3>
                                </div>
                                {isPurchased && (
                                    <Badge variant="default" className="bg-green-600 text-xs whitespace-nowrap">
                                        <Shield className="h-3 w-3 mr-1" />
                                        Активна
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>

                        {/* Контент с анимацией расширения */}
                        <div className="flex-1 flex flex-col justify-between px-4 pb-4">
                            <div className="space-y-1.5">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent text-3xl">
                                        {formatPrice(tierData?.price || vip.price || "0")}
                                    </span>
                                </div>

                                <p className={`text-sm text-muted-foreground/90 leading-snug ${!isExpanded ? 'line-clamp-3' : ''}`}>
                                    {tierData?.description || (vip.description ? htmlToText(vip.description) : 'Эксклюзивный доступ к премиум контенту и персональной поддержке')}
                                </p>

                                {isExpanded && (
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-muted-foreground">Что входит:</p>
                                        {(tierData?.features || []).map((feature: string, idx: number) => (
                                            <div key={idx} className="flex items-start gap-1">
                                                <Check className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                                <span className="text-xs leading-snug">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Кнопка всегда внизу */}
                            <Button
                                className={`w-full relative overflow-hidden backdrop-blur-sm font-semibold transition-all duration-300 group mt-3 ${isPurchased
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

export default React.memo(MobileVipCard)
