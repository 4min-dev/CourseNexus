import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Building2, ArrowRight, Handshake } from "lucide-react";
import type { Partner } from "@shared/schema";

export default function Partners() {
  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/partners"],
  });

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center space-y-3 md:space-y-4 mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-3">
            <Handshake className="h-10 w-10 md:h-12 md:w-12 text-purple-500" />
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Наши партнеры
            </h1>
          </div>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Проверенные специалисты и сервисы, которые помогут вам в развитии бизнеса на маркетплейсах
          </p>
        </div>

        {/* Partners Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : partners && partners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {partners.map((partner) => (
              <Card 
                key={partner.id} 
                className="overflow-hidden flex flex-col group hover:shadow-lg transition-shadow no-default-hover-elevate no-default-active-elevate"
                data-testid={`card-partner-${partner.id}`}
              >
                {/* Cover Image or Fallback */}
                <div className="relative h-40 md:h-48 w-full overflow-hidden bg-muted">
                  {partner.coverImageUrl ? (
                    <img 
                      src={partner.coverImageUrl} 
                      alt={partner.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                      {partner.logoUrl ? (
                        <img 
                          src={partner.logoUrl} 
                          alt={partner.name}
                          className="h-24 w-24 object-contain"
                        />
                      ) : (
                        <Building2 className="h-24 w-24 text-purple-500/30" />
                      )}
                    </div>
                  )}
                  {/* Overlay with logo */}
                  {partner.coverImageUrl && partner.logoUrl && (
                    <div className="absolute top-3 right-3 bg-white dark:bg-card rounded-full p-2 shadow-lg border-2 border-purple-500/20">
                      <img 
                        src={partner.logoUrl} 
                        alt={partner.name}
                        className="h-12 w-12 object-contain"
                      />
                    </div>
                  )}
                </div>

                <CardContent className="flex-1 p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-bold mb-2 line-clamp-1" data-testid={`text-partner-name-${partner.id}`}>
                    {partner.name}
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground line-clamp-2">
                    {partner.description}
                  </p>
                </CardContent>

                <CardFooter className="p-4 pt-0 gap-2">
                  <Link href={`/partners/${partner.id}`} className="flex-1">
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      data-testid={`button-details-${partner.id}`}
                    >
                      Подробнее
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 md:p-12">
            <div className="text-center space-y-4">
              <Handshake className="h-12 w-12 md:h-16 md:w-16 mx-auto text-muted-foreground" />
              <h3 className="text-lg md:text-xl font-semibold">Партнёров пока нет</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Мы работаем над добавлением проверенных партнеров
              </p>
            </div>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
