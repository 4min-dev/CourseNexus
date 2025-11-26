import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import type { LandingContent } from "@shared/schema";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import {
  LandingHeader,
  HeroSection,
  PriceSection,
  FreeFeaturesSection,
  PlatformFeaturesSection,
  EarningSection,
  StatsSection,
  CTASection,
} from "@/components/landing-sections";

export default function Landing() {
  const { data: content, isLoading, isError, refetch } = useQuery<LandingContent>({
    queryKey: ['/api/landing-content'],
  });
  
  const { getRegisterUrl } = useReferralTracking();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (isError || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto p-8">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">Не удалось загрузить контент</h2>
          <p className="text-muted-foreground">
            Произошла ошибка при загрузке контента главной страницы. Пожалуйста, попробуйте снова.
          </p>
          <Button onClick={() => refetch()} data-testid="button-retry">
            Повторить попытку
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader registerUrl={getRegisterUrl()} />
      <main>
        <HeroSection content={content} registerUrl={getRegisterUrl()} />
        <PriceSection content={content} registerUrl={getRegisterUrl()} />
        <FreeFeaturesSection content={content} registerUrl={getRegisterUrl()} />
        <PlatformFeaturesSection content={content} registerUrl={getRegisterUrl()} />
        <EarningSection />
        <StatsSection />
        <CTASection registerUrl={getRegisterUrl()} />
      </main>
      <Footer />
    </div>
  );
}
