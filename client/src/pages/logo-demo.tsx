import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NeonLogo } from "@/components/NeonLogo";
import { Header } from "@/components/header";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function LogoDemo() {
  const [selectedVariant, setSelectedVariant] = useState<"flicker" | "pulse" | "gradient">("pulse");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <Link href="/shop">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад в магазин
          </Button>
        </Link>

        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Выберите стиль логотипа</h1>
            <p className="text-muted-foreground">
              Попробуйте разные варианты неоновой анимации и выберите тот, который вам больше нравится
            </p>
          </div>

          <Card className="bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Предварительный просмотр</CardTitle>
              <CardDescription>Текущий выбранный вариант</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-12 bg-gradient-to-br from-background to-muted/20">
              <NeonLogo variant={selectedVariant} className="scale-150" />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            <Card 
              className={`cursor-pointer transition-all ${selectedVariant === 'flicker' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedVariant('flicker')}
            >
              <CardHeader>
                <CardTitle className="text-lg">🔥 Мерцание</CardTitle>
                <CardDescription>Классический эффект старой неоновой вывески</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-8 bg-gradient-to-br from-background to-muted/20">
                <NeonLogo variant="flicker" />
              </CardContent>
              <div className="px-6 pb-4">
                <Button 
                  className="w-full" 
                  variant={selectedVariant === 'flicker' ? 'default' : 'outline'}
                  onClick={() => setSelectedVariant('flicker')}
                >
                  {selectedVariant === 'flicker' ? 'Выбрано' : 'Выбрать'}
                </Button>
              </div>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${selectedVariant === 'pulse' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedVariant('pulse')}
            >
              <CardHeader>
                <CardTitle className="text-lg">✨ Пульсация</CardTitle>
                <CardDescription>Плавное неоновое свечение (рекомендуется)</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-8 bg-gradient-to-br from-background to-muted/20">
                <NeonLogo variant="pulse" />
              </CardContent>
              <div className="px-6 pb-4">
                <Button 
                  className="w-full" 
                  variant={selectedVariant === 'pulse' ? 'default' : 'outline'}
                  onClick={() => setSelectedVariant('pulse')}
                >
                  {selectedVariant === 'pulse' ? 'Выбрано' : 'Выбрать'}
                </Button>
              </div>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${selectedVariant === 'gradient' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedVariant('gradient')}
            >
              <CardHeader>
                <CardTitle className="text-lg">🌈 Градиент</CardTitle>
                <CardDescription>Переливающиеся цвета в фиолетовых тонах</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-8 bg-gradient-to-br from-background to-muted/20">
                <NeonLogo variant="gradient" />
              </CardContent>
              <div className="px-6 pb-4">
                <Button 
                  className="w-full" 
                  variant={selectedVariant === 'gradient' ? 'default' : 'outline'}
                  onClick={() => setSelectedVariant('gradient')}
                >
                  {selectedVariant === 'gradient' ? 'Выбрано' : 'Выбрать'}
                </Button>
              </div>
            </Card>
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>Как изменить стиль?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Чтобы изменить стиль логотипа на сайте, откройте файл <code className="bg-muted px-2 py-1 rounded">client/src/components/header.tsx</code>
              </p>
              <p>
                Найдите строку: <code className="bg-muted px-2 py-1 rounded">&lt;NeonLogo variant="pulse" /&gt;</code>
              </p>
              <p>
                Замените <code className="bg-muted px-2 py-1 rounded">pulse</code> на выбранный вариант:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><code className="bg-muted px-2 py-1 rounded">flicker</code> - для эффекта мерцания</li>
                <li><code className="bg-muted px-2 py-1 rounded">pulse</code> - для плавной пульсации</li>
                <li><code className="bg-muted px-2 py-1 rounded">gradient</code> - для градиентного эффекта</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
