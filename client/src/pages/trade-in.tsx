import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { Footer } from "@/components/footer";
import { 
  TradeInHero,
  TradeInHowItWorks,
  TradeInBenefits,
  TradeInCTA,
  TradeInFAQ
} from "@/components/trade-in-sections";
import type { TradeInPageContent } from "@shared/schema";

export default function TradeIn() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<{
    platform?: string;
    level?: string;
    year?: number;
    minRating?: number;
    author?: string;
  }>({});

  // Fetch Trade-In page content
  const { data: content, isLoading } = useQuery<TradeInPageContent>({
    queryKey: ["/api/trade-in-content"],
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex flex-1">
          <Sidebar
            isOpen={sidebarOpen}
            selectedCategories={selectedCategories}
            onCategoryChange={setSelectedCategories}
            showPriceFilter={false}
            catalogPath="/shop"
          />
          <main className="flex-1 overflow-auto bg-background">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-muted-foreground">Загрузка...</p>
              </div>
            </div>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  // Fallback content if API fails
  if (!content) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex flex-1">
          <Sidebar
            isOpen={sidebarOpen}
            selectedCategories={selectedCategories}
            onCategoryChange={setSelectedCategories}
            showPriceFilter={false}
            catalogPath="/shop"
          />
          <main className="flex-1 overflow-auto bg-background">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <p className="text-xl font-semibold text-destructive">Ошибка загрузки контента</p>
                <p className="text-muted-foreground">Пожалуйста, обновите страницу</p>
              </div>
            </div>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          showPriceFilter={false}
          catalogPath="/shop"
        />
        <main className="flex-1 overflow-auto bg-background">
          <TradeInHero content={content} />
          <TradeInHowItWorks content={content} />
          <TradeInBenefits content={content} />
          <TradeInCTA content={content} />
          <TradeInFAQ content={content} />
        </main>
      </div>
      <Footer />
    </div>
  );
}
