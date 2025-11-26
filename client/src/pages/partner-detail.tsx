import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Building2, ExternalLink, ArrowLeft, Sparkles } from "lucide-react";
import type { Partner } from "@shared/schema";

export default function PartnerDetail() {
  const { id } = useParams();
  
  const { data: partner, isLoading, error } = useQuery<Partner>({
    queryKey: [`/api/partners/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Partner not found");
      }
      return res.json();
    },
    enabled: !!id,
  });

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <Card className="p-12">
            <div className="text-center space-y-4">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">Партнёр не найден</h3>
              <p className="text-muted-foreground">
                Партнёр с таким ID не существует или был удалён
              </p>
              <Link href="/partners">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Вернуться к списку
                </Button>
              </Link>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <Link href="/partners">
          <Button variant="ghost" className="gap-2 mb-6" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Назад к партнёрам
          </Button>
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : partner ? (
          <div className="space-y-6">
            {/* Cover Image */}
            {partner.coverImageUrl && (
              <div className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden border-2 border-purple-500/20">
                <img 
                  src={partner.coverImageUrl} 
                  alt={partner.name}
                  className="w-full h-full object-cover"
                  data-testid="img-partner-cover"
                />
              </div>
            )}

            {/* Header with Logo and Title */}
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                {partner.logoUrl ? (
                  <img 
                    src={partner.logoUrl} 
                    alt={partner.name}
                    className="h-24 w-24 md:h-32 md:w-32 object-contain rounded-2xl border-2 border-purple-500/20 bg-white dark:bg-card p-2"
                    data-testid="img-partner-logo"
                  />
                ) : (
                  <div className="h-24 w-24 md:h-32 md:w-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl flex items-center justify-center border-2 border-purple-500/20">
                    <Building2 className="h-12 w-12 md:h-16 md:w-16 text-purple-500" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-partner-name">
                  {partner.name}
                </h1>
                
                <div className="flex flex-wrap gap-2">
                  <Badge className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Проверенный партнёр
                  </Badge>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-500" />
                    О партнёре
                  </h2>
                  <p className="text-foreground leading-relaxed whitespace-pre-line" data-testid="text-partner-description">
                    {partner.description}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    Чем могут помочь
                  </h2>
                  <p className="text-foreground leading-relaxed whitespace-pre-line" data-testid="text-partner-services">
                    {partner.services}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Button */}
            <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Готовы начать сотрудничество?</h3>
                    <p className="text-sm text-muted-foreground">
                      Свяжитесь с {partner.name} для получения подробной информации
                    </p>
                  </div>
                  <Button 
                    className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white shrink-0"
                    onClick={() => window.open(partner.contactUrl, '_blank')}
                    data-testid="button-contact"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Связаться
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
