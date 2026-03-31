import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/useAuth";
import { VipHeader, VipTiersGrid } from "@/components/vip-sections";
import type { Course } from "@shared/schema";

interface VipPageContent {
  pageTitle: string;
  pageSubtitle: string;
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

export default function VipPage() {
  const { isAuthenticated } = useAuth();

  const { data: pageContent } = useQuery<VipPageContent>({
    queryKey: ["/api/vip-page-content"],
    placeholderData: {
      pageTitle: "VIP Пакеты",
      pageSubtitle: "Выберите подходящий тариф и получите эксклюзивный доступ к курсам, персональной поддержке и закрытым материалам для успешного обучения"
    }
  });

  const { data: vipTiers, isLoading } = useQuery<VipTier[]>({
    queryKey: ["/api/vip-tiers"],
  });

  const { data: vipCourses } = useQuery<Course[]>({
    queryKey: ["/api/courses?vipOnly=true"],
  });

  const { data: purchases } = useQuery<{ courseId: string }[]>({
    queryKey: ["/api/purchases"],
    enabled: isAuthenticated,
  });

  const purchasedVipIds = new Set(purchases?.map((p) => p.courseId) || []);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Header />

      <main className="flex-1 container mx-auto px-3 md:px-4 py-4 md:py-8">
        <VipHeader
          pageTitle={pageContent?.pageTitle || "VIP Паыкеты"}
          pageSubtitle={pageContent?.pageSubtitle || "Выберите подходящий тариф и получите эксклюзивный доступ к курсам, персональной поддержке и закрытым материалам для успешного обучения"}
        />

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full mb-4" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : vipTiers && vipTiers.length > 0 ? (
          <VipTiersGrid
            vipTiers={vipTiers}
            vipCourses={vipCourses}
            purchasedVipIds={purchasedVipIds}
            isAuthenticated={isAuthenticated}
          />
        ) : (
          <div className="text-center py-12">
            <Crown className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">VIP подписки пока недоступны</h3>
            <p className="text-muted-foreground">
              Скоро здесь появятся эксклюзивные тарифы для вас
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
