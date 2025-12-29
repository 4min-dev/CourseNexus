import { CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Shield } from "lucide-react";
import { Link } from "wouter";
import { formatPrice } from "@/lib/formatPrice";
import { Diamond } from "@/components/Diamond";
import { GlassCard } from "@/components/GlassCard";
import { htmlToText } from "@/lib/utils";
import { Course } from "@shared/schema";
import React from "react";
import { VipTier } from "@/pages/shop";

type VipCardProps = {
    purchasedCourseIds: Set<string>,
    vip: Course,
    hoveredVipId: string | null,
    vipTiers?: VipTier[]
    setHoveredVipId: React.Dispatch<React.SetStateAction<string | null>>
}

const VipCard: React.FC<VipCardProps> = ({ purchasedCourseIds, vip, hoveredVipId, vipTiers, setHoveredVipId }) => {

    const isPurchased = purchasedCourseIds.has(vip.id);
    const tier = vip.vipTier || 'bronze';
    const isHovered = hoveredVipId === vip.id;

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
            className="relative h-full group"
            onMouseEnter={() => setHoveredVipId(vip.id)}
            onMouseLeave={() => setHoveredVipId(null)}
        >
            <Link href={`/course/${vip.id}`} className="h-full">
                <GlassCard
                    variant="premium"
                    glowColor={config.glowColor}
                    hover={true}
                    className={`relative overflow-visible cursor-pointer flex flex-col h-full min-h-[390px] ${isHovered ? 'absolute top-0 left-0 w-[400px] min-h-0 z-40 shadow-2xl scale-[1.02] transition-[width,height,transform,box-shadow] duration-300 ease-out' : 'transition-[width,height,transform,box-shadow] duration-300 ease-out'
                        }`}
                    data-testid={`card-vip-${tier}`}
                >
                    <div
                        className="flex flex-col flex-1"
                    >

                        <CardHeader className="space-y-3 pb-4 relative z-10 min-h-[120px]">
                            <div className="flex items-center justify-between">
                                {config.isDiamond ? (
                                    <Diamond className="diamond-sparkle" />
                                ) : (
                                    <div className={`h-10 w-10 rounded-full ${config.sphereClass}`} />
                                )}
                                {isPurchased && (
                                    <Badge variant="default" className="bg-green-600 text-sm">
                                        <Shield className="h-3 w-3 mr-1" />
                                        Активна
                                    </Badge>
                                )}
                            </div>
                            <h3 className="font-bold text-3xl tracking-tight">
                                {tierData?.displayName || vip.title}
                            </h3>
                            {isHovered && (
                                <p className="text-base text-muted-foreground/90 leading-relaxed">
                                    {tierData?.description || (vip.description ? htmlToText(vip.description) : 'Эксклюзивный доступ к премиум контенту и персональной поддержке')}
                                </p>
                            )}
                        </CardHeader>

                        <CardContent className="space-y-4 pb-4 flex-1 relative z-10 min-h-[180px]">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                                    {formatPrice(tierData?.price || vip.price || "0")}
                                </span>
                            </div>

                            {!isHovered ? (
                                <p className="text-base text-muted-foreground/90 line-clamp-3 leading-relaxed">
                                    {tierData?.description || (vip.description ? htmlToText(vip.description) : 'Эксклюзивный доступ к премиум контенту и персональной поддержке')}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-base font-semibold text-muted-foreground">Что входит:</p>
                                    {(tierData?.features || []).map((feature: string, idx: number) => (
                                        <div key={idx} className="flex items-start gap-2">
                                            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                            <span className="text-base">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="pt-0 relative z-10">
                            <Button
                                className={`w-full relative overflow-hidden backdrop-blur-sm font-semibold shadow-lg transition-all duration-300 group ${isPurchased
                                    ? 'bg-white/5 border-2 border-green-500/30 text-white'
                                    : 'bg-white/5 border-2 border-yellow-500/30 text-white hover:shadow-yellow-500/50'
                                    }`}
                                size="lg"
                                disabled={isPurchased}
                            >
                                <div className={`absolute inset-0 transition-opacity duration-700 ${isPurchased
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 opacity-100'
                                    : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-600 opacity-0 group-hover:opacity-100'
                                    }`} />
                                <span className="relative flex items-center justify-center">
                                    {isPurchased ? (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            У вас есть подписка
                                        </>
                                    ) : (
                                        <>
                                            <Crown className="mr-2 h-4 w-4" />
                                            Оформить подписку
                                        </>
                                    )}
                                </span>
                            </Button>
                        </CardFooter>
                    </div>
                </GlassCard>
            </Link>
        </div>
    )
}

export default VipCard
