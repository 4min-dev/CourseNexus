import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Users, 
  TrendingUp, 
  Repeat, 
  Gift, 
  DollarSign, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Infinity
} from "lucide-react";

export default function ReferralInfo() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <Link href="/bonuses">
          <div 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 hover-elevate px-3 py-2 rounded-md transition-all cursor-pointer"
            data-testid="link-back-to-bonuses"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к бонусам
          </div>
        </Link>

        {/* Hero Section */}
        <div className="relative mb-12 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-purple-600/10 via-pink-500/10 to-orange-500/10 p-8 md:p-12">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/20 backdrop-blur-sm">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
                Реферальная система
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Приводи друзей — получай <span className="font-bold text-primary">пожизненный доход</span> с их покупок
            </p>
          </div>
        </div>

        {/* Main Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-primary/20 bg-gradient-to-br from-purple-500/5 to-transparent">
            <CardHeader>
              <div className="p-2 rounded-lg bg-purple-500/20 w-fit mb-2">
                <Infinity className="h-6 w-6 text-purple-400" />
              </div>
              <CardTitle className="text-lg">Пожизненный доход</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Получайте процент от <strong>каждого</strong> пополнения баланса вашего реферала навсегда
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-pink-500/5 to-transparent">
            <CardHeader>
              <div className="p-2 rounded-lg bg-pink-500/20 w-fit mb-2">
                <TrendingUp className="h-6 w-6 text-pink-400" />
              </div>
              <CardTitle className="text-lg">30% от пополнений</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Каждый раз, когда реферал пополняет баланс, вы получаете <strong>30%</strong> от суммы
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-orange-500/5 to-transparent">
            <CardHeader>
              <div className="p-2 rounded-lg bg-orange-500/20 w-fit mb-2">
                <Gift className="h-6 w-6 text-orange-400" />
              </div>
              <CardTitle className="text-lg">Бонус для друзей</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ваш друг получает <strong>5% скидку</strong> на первую покупку при регистрации по вашей ссылке
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Repeat className="h-6 w-6 text-primary" />
              Как это работает
            </CardTitle>
            <CardDescription>
              Простая схема получения пассивного дохода
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                  1
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Получите вашу реферальную ссылку</h3>
                <p className="text-sm text-muted-foreground">
                  На странице бонусов вы найдёте вашу уникальную реферальную ссылку и промокод. Скопируйте их и поделитесь с друзьями.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                  2
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Друг регистрируется по вашей ссылке</h3>
                <p className="text-sm text-muted-foreground">
                  Когда кто-то переходит по вашей реферальной ссылке и регистрируется, он автоматически становится вашим рефералом. При этом он сразу получает <strong>5% скидку на первую покупку</strong>.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                  3
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Реферал пополняет баланс</h3>
                <p className="text-sm text-muted-foreground">
                  Каждый раз, когда ваш реферал пополняет свой баланс на платформе, вы автоматически получаете <strong>30% от суммы пополнения</strong> на ваш реферальный баланс.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white">
                  ∞
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-primary">Получайте доход пожизненно</h3>
                <p className="text-sm text-muted-foreground">
                  Это не разовая выплата! Вы будете получать 30% от <strong>каждого</strong> пополнения вашего реферала на протяжении всего времени его активности на платформе.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Calculation */}
        <Card className="mb-12 border-primary/30 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              Пример расчёта дохода
            </CardTitle>
            <CardDescription>
              Посмотрите, сколько вы можете заработать
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-card/50 p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Ваш друг пополнил баланс на:</span>
                  <span className="font-bold text-lg">10 000 ₽</span>
                </div>
                <div className="flex justify-between items-center text-primary">
                  <span className="text-sm">Ваш доход (30%):</span>
                  <span className="font-bold text-xl">3 000 ₽</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-card/50 p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Через месяц он снова пополнил:</span>
                  <span className="font-bold text-lg">5 000 ₽</span>
                </div>
                <div className="flex justify-between items-center text-primary">
                  <span className="text-sm">Ваш доход (30%):</span>
                  <span className="font-bold text-xl">1 500 ₽</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Ваш суммарный доход:</span>
                <span className="font-bold text-2xl text-primary">4 500 ₽</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                И это только с одного реферала! Представьте доход с 10, 20 или 50 рефералов.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Breakdown */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Преимущества системы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Пассивный доход</h4>
                <p className="text-sm text-muted-foreground">
                  Вы получаете деньги автоматически при каждом пополнении баланса вашими рефералами
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Нет ограничений по количеству рефералов</h4>
                <p className="text-sm text-muted-foreground">
                  Приглашайте неограниченное количество друзей и наращивайте свой доход
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-600 dark:text-green-500">💳 Деньги выводятся на карту!</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Это реальные деньги!</strong> Весь заработанный реферальный баланс можно вывести на вашу банковскую карту. Не виртуальная валюта — настоящие рубли, которые вы можете использовать как угодно.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Можно использовать для покупок на платформе</h4>
                <p className="text-sm text-muted-foreground">
                  Весь заработанный реферальный баланс также доступен для покупки курсов и подборок без вывода
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Выгода для ваших друзей</h4>
                <p className="text-sm text-muted-foreground">
                  Приглашённые получают 5% скидку на первую покупку — win-win для всех
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Прозрачная система</h4>
                <p className="text-sm text-muted-foreground">
                  На странице бонусов вы видите всю статистику: количество рефералов и заработанный баланс
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="mb-12 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Важные нюансы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">📊 Когда начисляется доход?</h4>
              <p className="text-sm text-muted-foreground">
                Реферальный доход начисляется <strong>только при пополнении баланса</strong> рефералом. Покупки курсов не учитываются — только пополнение счёта.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">♻️ Пожизненная связь</h4>
              <p className="text-sm text-muted-foreground">
                Связь между вами и рефералом устанавливается навсегда. Даже если человек зарегистрировался год назад, вы всё равно будете получать 30% от его пополнений.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">🎁 Скидка для реферала</h4>
              <p className="text-sm text-muted-foreground">
                5% скидка для приглашённого друга применяется <strong>только на первую покупку</strong> после регистрации по реферальной ссылке.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">💰 Использование реферального баланса</h4>
              <p className="text-sm text-muted-foreground">
                Реферальный баланс и баланс фантиков суммируются и доступны для покупок. Вы можете использовать весь накопленный баланс без ограничений.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">🔗 Промокод vs Реферальная ссылка</h4>
              <p className="text-sm text-muted-foreground">
                Вы можете делиться как ссылкой, так и промокодом. При регистрации ваш друг может ввести промокод вручную — эффект будет тот же.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="border-primary/30 bg-gradient-to-br from-purple-600/10 via-pink-500/10 to-orange-500/10">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-3">Начните зарабатывать уже сегодня!</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Получите вашу реферальную ссылку, поделитесь ею с друзьями и начните получать пассивный доход от каждого их пополнения баланса
            </p>
            <Link href="/bonuses">
              <Button 
                size="lg" 
                className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                data-testid="button-get-referral-link"
              >
                <Users className="h-5 w-5" />
                Получить реферальную ссылку
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
