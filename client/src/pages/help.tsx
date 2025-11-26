import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingCart, 
  BookOpen, 
  Crown, 
  Heart, 
  Filter, 
  Search,
  Sparkles,
  CheckCircle2,
  Star,
  TrendingUp,
  Package,
  Library,
  Award,
  LogIn,
  UserPlus,
  Users,
  Coins,
  Wallet,
  CreditCard,
  Play,
  Video,
  Code,
  Download,
  Box,
  RefreshCw,
  ArrowLeftRight,
  Target,
  Crosshair,
  Trophy,
  Bell,
  MessageCircle,
  Handshake,
  Building,
  User,
  Settings,
  Gift,
  Lightbulb,
  AlertCircle,
  DollarSign,
  ThumbsUp,
  Mail,
  Phone,
  ShieldAlert,
  ExternalLink
} from "lucide-react";

export default function Help() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-background relative">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="relative flex">
        <Sidebar
          selectedCategories={{}}
          onCategoryChange={() => {}}
          isOpen={sidebarOpen}
          showPriceFilter={false}
        />
        
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-3 md:p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2 mb-8">
              <h1 className="text-4xl font-bold">Руководство пользователя</h1>
              <p className="text-muted-foreground text-lg">
                Полное описание функций платформы и как ими пользоваться
              </p>
            </div>

            {/* Platform Overview */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">О платформе</CardTitle>
                    <CardDescription>Образовательная платформа для всех направлений</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  Наша платформа — это образовательный центр с широким выбором курсов по различным направлениям: 
                  маркетплейсы (<strong>Wildberries</strong>, <strong>Ozon</strong>, <strong>Yandex Market</strong>), 
                  бизнес, IT, маркетинг, дизайн и многое другое. 
                  Здесь вы найдёте актуальные знания от экспертов в различных областях.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Актуальные курсы
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Award className="h-3 w-3" />
                    Сертифицированные эксперты
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Library className="h-3 w-3" />
                    Постоянный доступ
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Main Features Accordion */}
            <Accordion type="single" collapsible className="w-full space-y-4">
              {/* Shop Section */}
              <AccordionItem value="shop" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-shop">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Магазин курсов</h3>
                      <p className="text-sm text-muted-foreground">Выбор и покупка курсов</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как пользоваться магазином:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Откройте раздел "Магазин" в боковом меню</li>
                      <li><strong className="text-foreground">2.</strong> Просматривайте доступные курсы в каталоге</li>
                      <li><strong className="text-foreground">3.</strong> Используйте фильтры слева для поиска нужных курсов</li>
                      <li><strong className="text-foreground">4.</strong> Нажмите на карточку курса, чтобы увидеть подробное описание</li>
                      <li><strong className="text-foreground">5.</strong> Нажмите кнопку "Купить" для приобретения курса</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Карточки курсов содержат:
                    </h4>
                    <ul className="space-y-2 text-muted-foreground ml-6 list-disc">
                      <li>Название и описание курса</li>
                      <li>Категорию и направление курса</li>
                      <li>Год выпуска курса</li>
                      <li>Уровень сложности (Для новичков, Продвинутый)</li>
                      <li>Автора курса</li>
                      <li>Рейтинг курса (если доступен)</li>
                      <li>Цену курса</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Filters Section */}
              <AccordionItem value="filters" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-filters">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Filter className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Фильтры и поиск</h3>
                      <p className="text-sm text-muted-foreground">Быстрый поиск нужных курсов</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Search className="h-4 w-4 text-primary" />
                      Доступные фильтры:
                    </h4>
                    <div className="space-y-3 ml-6">
                      <div>
                        <p className="font-semibold text-foreground mb-1">Поиск по тексту</p>
                        <p className="text-sm text-muted-foreground">
                          Найдите курсы по названию, автору или описанию. Поле поиска находится в шапке сайта.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Категория</p>
                        <p className="text-sm text-muted-foreground">
                          Фильтруйте курсы по категориям и направлениям: маркетплейсы, бизнес, IT, маркетинг и другие.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Уровень сложности</p>
                        <p className="text-sm text-muted-foreground">
                          Выберите курсы для новичков или продвинутого уровня.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Год выпуска</p>
                        <p className="text-sm text-muted-foreground">
                          Отфильтруйте курсы по году выпуска для получения актуальной информации.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Автор курса</p>
                        <p className="text-sm text-muted-foreground">
                          Найдите курсы конкретного эксперта. Нажмите на поле поиска авторов, чтобы увидеть полный список.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Цена (только в магазине)</p>
                        <p className="text-sm text-muted-foreground">
                          Установите минимальную и максимальную цену для поиска курсов в вашем бюджете.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Совет:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Используйте несколько фильтров одновременно для более точного поиска. 
                      Например, выберите категорию + уровень "Для новичков" + год "2025".
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Favorites Section */}
              <AccordionItem value="favorites" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-favorites">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-red-500/10 p-2">
                      <Heart className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Избранное</h3>
                      <p className="text-sm text-muted-foreground">Сохраняйте интересные курсы</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      Как пользоваться избранным:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Нажмите на иконку сердечка в углу карточки курса</li>
                      <li><strong className="text-foreground">2.</strong> Курс будет добавлен в ваш список избранного</li>
                      <li><strong className="text-foreground">3.</strong> Повторное нажатие удалит курс из избранного</li>
                      <li><strong className="text-foreground">4.</strong> Избранные курсы отображаются с красной иконкой сердечка</li>
                    </ol>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Зачем использовать избранное?
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                      <li>Сохраните курсы для последующего изучения</li>
                      <li>Быстро найдите понравившиеся курсы при выборе VIP пакета</li>
                      <li>Создайте свою коллекцию интересных материалов</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Library Section */}
              <AccordionItem value="library" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-library">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Библиотека</h3>
                      <p className="text-sm text-muted-foreground">Ваши купленные курсы</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Что находится в библиотеке:
                    </h4>
                    <ul className="space-y-2 text-muted-foreground ml-6 list-disc">
                      <li>Все курсы, которые вы купили в магазине</li>
                      <li>Курсы, полученные через VIP пакеты</li>
                      <li>Активные VIP подписки с информацией о доступных курсах</li>
                    </ul>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как пользоваться библиотекой:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Откройте раздел "Библиотека" в боковом меню</li>
                      <li><strong className="text-foreground">2.</strong> Просматривайте все ваши курсы</li>
                      <li><strong className="text-foreground">3.</strong> Используйте фильтры для поиска конкретного курса</li>
                      <li><strong className="text-foreground">4.</strong> Нажмите на карточку курса для начала обучения</li>
                      <li><strong className="text-foreground">5.</strong> Если у вас есть VIP пакет, вы увидите карточку с возможностью выбора курсов</li>
                    </ol>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Особенность:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Все купленные курсы остаются с вами навсегда. Вы можете вернуться к ним в любое время.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* VIP Packages Section */}
              <AccordionItem value="vip" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-vip">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-yellow-500/10 p-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">VIP пакеты</h3>
                      <p className="text-sm text-muted-foreground">Премиум доступ к курсам</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Что такое VIP пакеты:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      VIP пакеты — это специальные подписки, которые дают вам право выбрать определённое 
                      количество курсов из каталога. Существует три уровня VIP пакетов:
                    </p>
                    <div className="ml-6 space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">SILVER</Badge>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            5 курсов текущего года + 5 курсов предыдущих лет
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">GOLD</Badge>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            10 курсов текущего года + 10 курсов предыдущих лет
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">DIAMOND</Badge>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            20 курсов текущего года + 30 курсов предыдущих лет
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как купить и активировать VIP пакет:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Найдите VIP пакет в магазине (они помечены значком короны)</li>
                      <li><strong className="text-foreground">2.</strong> Купите понравившийся VIP пакет</li>
                      <li><strong className="text-foreground">3.</strong> Откройте раздел "Библиотека"</li>
                      <li><strong className="text-foreground">4.</strong> Найдите карточку вашего VIP пакета</li>
                      <li><strong className="text-foreground">5.</strong> Нажмите кнопку "Выбрать курсы"</li>
                      <li><strong className="text-foreground">6.</strong> Выберите нужные курсы из каталога (нажимайте на карточки)</li>
                      <li><strong className="text-foreground">7.</strong> Следите за лимитами выбора в верхней части страницы</li>
                      <li><strong className="text-foreground">8.</strong> Нажмите кнопку "Активировать", когда завершите выбор</li>
                      <li><strong className="text-foreground">9.</strong> Выбранные курсы появятся в вашей библиотеке</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Особенности выбора курсов:
                    </h4>
                    <ul className="space-y-2 text-muted-foreground ml-6 list-disc">
                      <li>Используйте все доступные фильтры для поиска нужных курсов</li>
                      <li>Обратите внимание на раздел "Избранные курсы" — там ваши сохранённые курсы</li>
                      <li>Вы можете менять выбор до нажатия кнопки "Активировать"</li>
                      <li>После активации выбор нельзя изменить</li>
                      <li>Есть отдельные лимиты для курсов текущего года и предыдущих лет</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Важно:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      После активации VIP пакета выбор курсов изменить нельзя. Тщательно выбирайте курсы 
                      перед активацией!
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Registration and Login Section */}
              <AccordionItem value="registration" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-registration">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <LogIn className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Регистрация и вход</h3>
                      <p className="text-sm text-muted-foreground">Как создать аккаунт и войти</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-primary" />
                      Что такое регистрация:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Регистрация — это создание вашего личного кабинета на платформе. 
                      Это как получить ключ от собственной квартиры: только вы сможете зайти в свой профиль, 
                      видеть свои курсы и управлять своими покупками.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как создать аккаунт через email:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Найдите кнопку "Регистрация" в правом верхнем углу страницы</li>
                      <li><strong className="text-foreground">2.</strong> Нажмите на неё</li>
                      <li><strong className="text-foreground">3.</strong> Введите вашу электронную почту (например: ivan@mail.ru)</li>
                      <li><strong className="text-foreground">4.</strong> Придумайте пароль (не менее 6 символов, лучше использовать буквы и цифры)</li>
                      <li><strong className="text-foreground">5.</strong> Введите пароль ещё раз для проверки</li>
                      <li><strong className="text-foreground">6.</strong> Если у вас есть реферальный код от друга — введите его (необязательно)</li>
                      <li><strong className="text-foreground">7.</strong> Нажмите кнопку "Зарегистрироваться"</li>
                      <li><strong className="text-foreground">8.</strong> Готово! Вы автоматически войдёте в систему</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <LogIn className="h-4 w-4 text-primary" />
                      Как войти в аккаунт:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Найдите кнопку "Войти" в правом верхнем углу</li>
                      <li><strong className="text-foreground">2.</strong> Введите вашу электронную почту</li>
                      <li><strong className="text-foreground">3.</strong> Введите ваш пароль</li>
                      <li><strong className="text-foreground">4.</strong> Нажмите кнопку "Войти"</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Что такое реферальный код:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Реферальный код — это специальный код, который ваш друг может вам дать. 
                      Если вы введёте его при регистрации, ваш друг будет получать бонусы от ваших покупок, 
                      а вы можете получить приветственный бонус. Это как сказать: "Меня пригласил мой друг".
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Совет:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Запишите свой пароль на бумажку и храните в надёжном месте. 
                      Лучше всего использовать пароль, который вы легко запомните, например, имя любимого города и год рождения.
                    </p>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Важно:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Никому не сообщайте свой пароль! Даже сотрудники платформы никогда не попросят у вас пароль.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Referral Program Section */}
              <AccordionItem value="referral" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-referral">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-green-500/10 p-2">
                      <Users className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Реферальная программа</h3>
                      <p className="text-sm text-muted-foreground">Приглашайте друзей и зарабатывайте</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Coins className="h-4 w-4 text-green-500" />
                      Что такое реферальная программа:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Реферальная программа — это возможность зарабатывать деньги, приглашая друзей на платформу. 
                      Когда ваш друг пополняет баланс, вы получаете до 45% от суммы пополнения на свой реферальный баланс. 
                      Это работает НАВСЕГДА — каждый раз, когда ваш друг пополняет баланс, вы получаете бонус!
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как получить свою реферальную ссылку:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Войдите в свой профиль (нажмите на иконку человечка вверху справа)</li>
                      <li><strong className="text-foreground">2.</strong> Найдите раздел "Реферальная программа"</li>
                      <li><strong className="text-foreground">3.</strong> Там вы увидите вашу реферальную ссылку и промокод</li>
                      <li><strong className="text-foreground">4.</strong> Нажмите кнопку "Копировать", чтобы скопировать ссылку</li>
                      <li><strong className="text-foreground">5.</strong> Отправьте эту ссылку друзьям через WhatsApp, Telegram или другие мессенджеры</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Coins className="h-4 w-4 text-green-500" />
                      Сколько можно заработать:
                    </h4>
                    <div className="ml-6 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">До 45% от каждого пополнения!</strong> Например:
                      </p>
                      <ul className="space-y-1 text-sm text-muted-foreground list-disc ml-4">
                        <li>Друг пополнил баланс на 10,000 рублей → вы получаете до 4,500 рублей</li>
                        <li>Друг пополнил баланс на 50,000 рублей → вы получаете до 22,500 рублей</li>
                        <li>И так каждый раз, когда друг пополняет баланс!</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      Как использовать реферальный баланс:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Реферальный баланс — это отдельный "кошелёк" на платформе. Вы можете:
                    </p>
                    <ul className="space-y-2 text-muted-foreground ml-6 list-disc">
                      <li>Использовать его для покупки курсов на платформе</li>
                      <li>Вывести деньги на свою карту (минимальная сумма для вывода указана в правилах)</li>
                    </ul>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Выгода:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Чем больше друзей вы пригласите, тем больше заработаете! 
                      Некоторые пользователи приглашают по 10-20 друзей и получают тысячи рублей ежемесячно.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Fantiks Bonuses Section */}
              <AccordionItem value="fantiks" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-fantiks">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-purple-500/10 p-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Бонусы Fantiks</h3>
                      <p className="text-sm text-muted-foreground">Накапливайте и получайте скидки</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Gift className="h-4 w-4 text-purple-500" />
                      Что такое Fantiks:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Fantiks — это бонусные баллы, как "спасибо" от платформы за вашу активность. 
                      Представьте их как наклейки в магазине: собираете наклейки — получаете скидку. 
                      Только здесь вместо наклеек — Fantiks, а вместо скидки в магазине — скидка до 20% на курсы!
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как получить Fantiks:
                    </h4>
                    <div className="ml-6 space-y-3">
                      <div>
                        <p className="font-semibold text-foreground mb-1">1. За покупку курсов</p>
                        <p className="text-sm text-muted-foreground">
                          Купили курс — получили 100 Fantiks! Купили 5 курсов — получили 500 Fantiks!
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">2. За выполнение заданий</p>
                        <p className="text-sm text-muted-foreground">
                          На платформе есть специальные задания. Например: "Посмотрите 3 курса полностью" 
                          или "Оставьте отзыв". За каждое задание — Fantiks!
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">3. За активность</p>
                        <p className="text-sm text-muted-foreground">
                          Чем чаще вы заходите и учитесь, тем больше бонусов получаете
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Как использовать Fantiks:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Выберите курс, который хотите купить</li>
                      <li><strong className="text-foreground">2.</strong> При оплате вы увидите поле "Применить Fantiks"</li>
                      <li><strong className="text-foreground">3.</strong> Введите количество Fantiks (максимум 20% от цены курса)</li>
                      <li><strong className="text-foreground">4.</strong> Цена курса автоматически уменьшится!</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Где посмотреть баланс Fantiks:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Ваш баланс Fantiks всегда виден в профиле. Нажмите на иконку человечка в правом верхнем углу, 
                      и вы увидите, сколько у вас Fantiks.
                    </p>
                  </div>

                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Пример:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Курс стоит 10,000 рублей. У вас есть 2,000 Fantiks. 
                      Вы можете использовать их и заплатить всего 8,000 рублей! 
                      Экономия 2,000 рублей — просто за то, что вы учились!
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Balance and Top-up Section */}
              <AccordionItem value="balance" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-balance">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-500/10 p-2">
                      <Wallet className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Баланс и пополнение</h3>
                      <p className="text-sm text-muted-foreground">Управление вашими средствами</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-500" />
                      Что такое баланс:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      У вас на платформе есть два "кошелька":
                    </p>
                    <div className="ml-6 space-y-3">
                      <div>
                        <p className="font-semibold text-foreground mb-1">1. Основной баланс</p>
                        <p className="text-sm text-muted-foreground">
                          Это деньги, которые вы сами положили на платформу. Ими вы покупаете курсы.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">2. Реферальный баланс</p>
                        <p className="text-sm text-muted-foreground">
                          Это деньги, которые вы заработали, приглашая друзей. Их тоже можно использовать для покупок 
                          или вывести на карту.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Как пополнить основной баланс:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Нажмите на иконку человечка в правом верхнем углу</li>
                      <li><strong className="text-foreground">2.</strong> Найдите кнопку "Пополнить баланс"</li>
                      <li><strong className="text-foreground">3.</strong> Введите сумму, которую хотите положить (например, 5000 рублей)</li>
                      <li><strong className="text-foreground">4.</strong> Выберите способ оплаты (банковская карта, электронные деньги)</li>
                      <li><strong className="text-foreground">5.</strong> Следуйте инструкциям на экране для завершения оплаты</li>
                      <li><strong className="text-foreground">6.</strong> Деньги поступят на баланс обычно через 1-2 минуты</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Порядок списания при покупке:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Когда вы покупаете курс, деньги списываются в таком порядке:
                    </p>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Сначала используется реферальный баланс (если есть)</li>
                      <li><strong className="text-foreground">2.</strong> Потом используется основной баланс</li>
                      <li><strong className="text-foreground">3.</strong> Если не хватает денег, вам предложат пополнить баланс</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Как посмотреть историю транзакций:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Откройте свой профиль</li>
                      <li><strong className="text-foreground">2.</strong> Найдите раздел "История транзакций"</li>
                      <li><strong className="text-foreground">3.</strong> Там вы увидите все пополнения и покупки</li>
                    </ol>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Совет:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Пополняйте баланс заранее, чтобы не ждать при покупке курса. 
                      Деньги на балансе никуда не денутся и будут ждать вас!
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Course Purchase Section */}
              <AccordionItem value="purchase" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-purchase">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Покупка курсов</h3>
                      <p className="text-sm text-muted-foreground">Подробная инструкция по покупке</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как купить курс — пошаговая инструкция:
                    </h4>
                    <ol className="space-y-3 text-muted-foreground ml-6">
                      <li>
                        <strong className="text-foreground">1. Найдите курс</strong>
                        <p className="text-sm mt-1">
                          Откройте раздел "Магазин" в боковом меню слева. Просмотрите курсы или используйте поиск и фильтры.
                        </p>
                      </li>
                      <li>
                        <strong className="text-foreground">2. Изучите описание</strong>
                        <p className="text-sm mt-1">
                          Нажмите на карточку курса. Прочитайте подробное описание, посмотрите программу обучения, 
                          узнайте, что входит в курс.
                        </p>
                      </li>
                      <li>
                        <strong className="text-foreground">3. Проверьте цену</strong>
                        <p className="text-sm mt-1">
                          Цена курса указана на карточке. Убедитесь, что на вашем балансе достаточно денег.
                        </p>
                      </li>
                      <li>
                        <strong className="text-foreground">4. Нажмите "Купить"</strong>
                        <p className="text-sm mt-1">
                          Найдите большую кнопку "Купить" и нажмите на неё.
                        </p>
                      </li>
                      <li>
                        <strong className="text-foreground">5. Примените Fantiks (по желанию)</strong>
                        <p className="text-sm mt-1">
                          Если у вас есть Fantiks, вы можете использовать их для скидки до 20%.
                        </p>
                      </li>
                      <li>
                        <strong className="text-foreground">6. Подтвердите покупку</strong>
                        <p className="text-sm mt-1">
                          Проверьте итоговую сумму и нажмите "Подтвердить покупку".
                        </p>
                      </li>
                      <li>
                        <strong className="text-foreground">7. Готово!</strong>
                        <p className="text-sm mt-1">
                          Вы увидите сообщение об успешной покупке. Курс автоматически появится в вашей библиотеке.
                        </p>
                      </li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Что происходит после покупки:
                    </h4>
                    <ul className="space-y-2 text-muted-foreground ml-6 list-disc">
                      <li>Курс сразу же появляется в разделе "Библиотека"</li>
                      <li>Вы получаете 100 Fantiks в подарок</li>
                      <li>Вам приходит уведомление о покупке</li>
                      <li>Вы можете сразу начать обучение</li>
                      <li>Курс остаётся с вами навсегда</li>
                    </ul>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Совет:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Перед покупкой обязательно прочитайте описание курса и посмотрите программу. 
                      Убедитесь, что курс подходит для вашего уровня (для новичков или продвинутый).
                    </p>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Важно:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      После покупки курса деньги не возвращаются. Поэтому внимательно выбирайте курс перед покупкой!
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Course Viewing Section */}
              <AccordionItem value="viewing" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-viewing">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Play className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Просмотр курса</h3>
                      <p className="text-sm text-muted-foreground">Как учиться на платформе</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Как открыть купленный курс:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Откройте раздел "Библиотека" в боковом меню</li>
                      <li><strong className="text-foreground">2.</strong> Найдите нужный курс среди ваших покупок</li>
                      <li><strong className="text-foreground">3.</strong> Нажмите на карточку курса</li>
                      <li><strong className="text-foreground">4.</strong> Откроется страница с уроками курса</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      Как работать с видеоплеером:
                    </h4>
                    <div className="ml-6 space-y-3">
                      <div>
                        <p className="font-semibold text-foreground mb-1">Кнопка "Играть/Пауза"</p>
                        <p className="text-sm text-muted-foreground">
                          Нажмите на большую кнопку в центре или на маленькую кнопку слева внизу для запуска видео. 
                          Повторное нажатие поставит видео на паузу.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Громкость</p>
                        <p className="text-sm text-muted-foreground">
                          Значок динамика в левом нижнем углу. Нажмите на него, чтобы убавить или прибавить звук. 
                          Можете также использовать ползунок громкости.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Полноэкранный режим</p>
                        <p className="text-sm text-muted-foreground">
                          Кнопка в правом нижнем углу. Нажмите, чтобы развернуть видео на весь экран. 
                          Нажмите Esc на клавиатуре или ещё раз на кнопку, чтобы выйти из полноэкранного режима.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Перемотка</p>
                        <p className="text-sm text-muted-foreground">
                          Передвигайте ползунок внизу видео влево или вправо, чтобы перемотать назад или вперёд.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как переключать уроки:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Справа от видео вы увидите список всех уроков курса</li>
                      <li><strong className="text-foreground">2.</strong> Нажмите на урок, который хотите посмотреть</li>
                      <li><strong className="text-foreground">3.</strong> Видео автоматически переключится на выбранный урок</li>
                      <li><strong className="text-foreground">4.</strong> Просмотренные уроки отмечаются галочкой</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Download className="h-4 w-4 text-primary" />
                      Как скачать материалы курса:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> На странице курса найдите раздел "Материалы"</li>
                      <li><strong className="text-foreground">2.</strong> Там будут файлы: презентации, документы, шаблоны</li>
                      <li><strong className="text-foreground">3.</strong> Нажмите на название файла или кнопку "Скачать"</li>
                      <li><strong className="text-foreground">4.</strong> Файл загрузится на ваш компьютер</li>
                    </ol>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Совет:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Смотрите уроки по порядку. Каждый урок основывается на предыдущем, как главы в книге. 
                      Не торопитесь, пересматривайте сложные моменты — курс ваш навсегда!
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Programs Section */}
              <AccordionItem value="programs" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-programs">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Code className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Программы</h3>
                      <p className="text-sm text-muted-foreground">Полезный софт и инструменты</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Code className="h-4 w-4 text-primary" />
                      Что такое программы:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Программы — это полезный софт, боты и инструменты для работы. Например, программы для автоматизации 
                      работы на маркетплейсах, боты для Telegram, калькуляторы для расчёта прибыли, шаблоны документов и многое другое. 
                      Это как инструменты в мастерской — они помогают работать быстрее и эффективнее.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как купить программу:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Откройте раздел "Программы" в боковом меню</li>
                      <li><strong className="text-foreground">2.</strong> Просмотрите доступные программы</li>
                      <li><strong className="text-foreground">3.</strong> Нажмите на карточку программы, чтобы узнать подробности</li>
                      <li><strong className="text-foreground">4.</strong> Прочитайте описание: что умеет программа и как её использовать</li>
                      <li><strong className="text-foreground">5.</strong> Нажмите кнопку "Купить"</li>
                      <li><strong className="text-foreground">6.</strong> Можете применить Fantiks для скидки (до 20%)</li>
                      <li><strong className="text-foreground">7.</strong> Подтвердите покупку</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Download className="h-4 w-4 text-primary" />
                      Как скачать программу:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> После покупки откройте раздел "Программы"</li>
                      <li><strong className="text-foreground">2.</strong> Найдите купленную программу (она будет помечена)</li>
                      <li><strong className="text-foreground">3.</strong> Нажмите кнопку "Скачать"</li>
                      <li><strong className="text-foreground">4.</strong> Файл программы загрузится на ваш компьютер</li>
                      <li><strong className="text-foreground">5.</strong> Следуйте инструкциям по установке (они есть на странице программы)</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Где найти инструкции:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Каждая программа идёт с подробной инструкцией. На странице программы вы найдёте:
                    </p>
                    <ul className="space-y-2 text-muted-foreground ml-6 list-disc">
                      <li>Как установить программу</li>
                      <li>Как настроить программу</li>
                      <li>Как пользоваться всеми функциями</li>
                      <li>Ответы на частые вопросы</li>
                    </ul>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Совет:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Обязательно прочитайте системные требования перед покупкой. 
                      Убедитесь, что программа подходит для вашего компьютера или телефона.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Course Packages Section */}
              <AccordionItem value="packages" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-packages">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-orange-500/10 p-2">
                      <Box className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Подборки курсов</h3>
                      <p className="text-sm text-muted-foreground">Наборы курсов со скидкой</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Package className="h-4 w-4 text-orange-500" />
                      Что такое подборки курсов:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Подборки курсов (пакеты) — это готовые наборы курсов на одну тему со скидкой до 50%. 
                      Это как купить набор продуктов в магазине: дешевле, чем покупать всё по отдельности. 
                      Например, подборка "Старт на Wildberries" может включать 5 курсов по работе с маркетплейсом.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      В чём выгода подборок:
                    </h4>
                    <div className="ml-6 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Огромная экономия!</strong> Например:
                      </p>
                      <ul className="space-y-1 text-sm text-muted-foreground list-disc ml-4">
                        <li>5 курсов по отдельности стоят 50,000 рублей</li>
                        <li>В подборке те же 5 курсов стоят 25,000 рублей</li>
                        <li>Экономия 25,000 рублей — это 50% скидка!</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как купить подборку:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Найдите раздел "Подборки" в магазине</li>
                      <li><strong className="text-foreground">2.</strong> Выберите интересующую подборку</li>
                      <li><strong className="text-foreground">3.</strong> Посмотрите, какие курсы входят в подборку</li>
                      <li><strong className="text-foreground">4.</strong> Сравните цену подборки с ценами отдельных курсов</li>
                      <li><strong className="text-foreground">5.</strong> Нажмите кнопку "Купить подборку"</li>
                      <li><strong className="text-foreground">6.</strong> Подтвердите покупку</li>
                      <li><strong className="text-foreground">7.</strong> Все курсы из подборки сразу появятся в вашей библиотеке!</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Чем отличаются от VIP пакетов:
                    </h4>
                    <div className="ml-6 space-y-3">
                      <div>
                        <p className="font-semibold text-foreground mb-1">Подборки (пакеты)</p>
                        <p className="text-sm text-muted-foreground">
                          Фиксированный набор курсов. Вы получаете все курсы сразу после покупки. 
                          Не нужно ничего выбирать.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">VIP пакеты</p>
                        <p className="text-sm text-muted-foreground">
                          Вы сами выбираете курсы из каталога в указанном количестве. 
                          Больше свободы выбора.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Совет:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Подборки выгодны, если вам нужны все курсы из набора. 
                      Если нужны только некоторые курсы — лучше купить VIP пакет и выбрать нужные.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Trade-In Section */}
              <AccordionItem value="tradein" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-tradein">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <RefreshCw className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Trade-In (обмен курсов)</h3>
                      <p className="text-sm text-muted-foreground">Обменяйте старый курс на новый</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4 text-primary" />
                      Что такое Trade-In:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Trade-In — это обмен вашего старого курса на новый. Как в автосалоне: сдаёте старую машину, 
                      доплачиваете разницу и получаете новую. Здесь так же: сдаёте старый курс, доплачиваете 
                      (если новый дороже) и получаете актуальный курс.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Какие курсы можно обменять:
                    </h4>
                    <ul className="space-y-2 text-muted-foreground ml-6 list-disc">
                      <li>Курсы, которые вы купили (не из VIP пакета)</li>
                      <li>Курсы, которые устарели (вышла новая версия)</li>
                      <li>Курсы определённых категорий (проверьте правила Trade-In)</li>
                    </ul>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" />
                      Как работает стоимость обмена:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Стоимость обмена зависит от разницы в ценах:
                    </p>
                    <div className="ml-6 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Пример 1:</strong> Ваш курс стоил 10,000₽, новый стоит 15,000₽ 
                        → доплата 5,000₽
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Пример 2:</strong> Ваш курс стоил 10,000₽, новый стоит 8,000₽ 
                        → доплата не требуется!
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Пошаговая инструкция обмена:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Откройте раздел "Trade-In" в боковом меню</li>
                      <li><strong className="text-foreground">2.</strong> Выберите курс, который хотите обменять</li>
                      <li><strong className="text-foreground">3.</strong> Система покажет доступные курсы для обмена</li>
                      <li><strong className="text-foreground">4.</strong> Выберите новый курс, который хотите получить</li>
                      <li><strong className="text-foreground">5.</strong> Посмотрите сумму доплаты (если требуется)</li>
                      <li><strong className="text-foreground">6.</strong> Нажмите кнопку "Обменять"</li>
                      <li><strong className="text-foreground">7.</strong> Подтвердите обмен</li>
                      <li><strong className="text-foreground">8.</strong> Старый курс исчезнет из библиотеки, новый появится</li>
                    </ol>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Совет:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Обменивайте курсы, когда выходит обновлённая версия. 
                      Так вы всегда будете учиться по актуальным материалам!
                    </p>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Важно:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      После обмена вы потеряете доступ к старому курсу. Убедитесь, что изучили все нужные материалы 
                      перед обменом!
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Sniper Section */}
              <AccordionItem value="sniper" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-sniper">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-red-500/10 p-2">
                      <Target className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Снайпер</h3>
                      <p className="text-sm text-muted-foreground">Заказ нужного курса</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Crosshair className="h-4 w-4 text-red-500" />
                      Что такое Снайпер:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Снайпер — это система заказа курсов. Не нашли нужный курс на платформе? 
                      Предложите его в Снайпере! Как в ресторане: если в меню нет вашего любимого блюда, 
                      можете попросить повара его приготовить. Другие пользователи могут поддержать ваше предложение, 
                      и если курс наберёт много голосов — мы его добавим!
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как предложить курс:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Откройте раздел "Снайпер" в боковом меню</li>
                      <li><strong className="text-foreground">2.</strong> Нажмите кнопку "Предложить курс"</li>
                      <li><strong className="text-foreground">3.</strong> Введите название курса, который вам нужен</li>
                      <li><strong className="text-foreground">4.</strong> Укажите автора курса (если знаете)</li>
                      <li><strong className="text-foreground">5.</strong> Напишите, почему этот курс важен и полезен</li>
                      <li><strong className="text-foreground">6.</strong> Нажмите кнопку "Отправить предложение"</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Как голосовать за предложения:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Просмотрите список предложений других пользователей</li>
                      <li><strong className="text-foreground">2.</strong> Если видите курс, который вам тоже нужен — нажмите кнопку лайка</li>
                      <li><strong className="text-foreground">3.</strong> Чем больше голосов — тем выше шанс, что курс добавят</li>
                      <li><strong className="text-foreground">4.</strong> Можете оставить комментарий, почему курс нужен</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      Отслеживание статуса:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Статусы вашего предложения:
                    </p>
                    <ul className="space-y-2 text-muted-foreground ml-6 list-disc">
                      <li><strong className="text-foreground">На рассмотрении</strong> — предложение отправлено, ждём голосов</li>
                      <li><strong className="text-foreground">В работе</strong> — курс набрал голоса, мы его добавляем</li>
                      <li><strong className="text-foreground">Добавлен</strong> — курс появился в магазине! Вам придёт уведомление</li>
                      <li><strong className="text-foreground">Отклонён</strong> — курс недоступен для добавления (с пояснением причины)</li>
                    </ul>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Совет:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Подробно опишите курс в предложении. Укажите, чему он учит, почему он важен. 
                      Хорошее описание привлечёт больше голосов от других пользователей!
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Tasks and Rewards Section */}
              <AccordionItem value="tasks" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-tasks">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-yellow-500/10 p-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Задания и награды</h3>
                      <p className="text-sm text-muted-foreground">Выполняйте задания, получайте Fantiks</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Award className="h-4 w-4 text-yellow-500" />
                      Что такое задания:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Задания — это простые действия на платформе, за которые вы получаете награды в виде Fantiks. 
                      Это как мини-игра: выполнил задание — получил приз! Задания помогают вам лучше узнать платформу 
                      и заработать бонусы для скидок.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Где посмотреть задания:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Откройте раздел "Бонусы" в боковом меню</li>
                      <li><strong className="text-foreground">2.</strong> Найдите вкладку "Задания" или "Награды"</li>
                      <li><strong className="text-foreground">3.</strong> Там вы увидите список всех доступных заданий</li>
                      <li><strong className="text-foreground">4.</strong> У каждого задания указано, сколько Fantiks вы получите</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Типы заданий:
                    </h4>
                    <div className="ml-6 space-y-3">
                      <div>
                        <p className="font-semibold text-foreground mb-1">Задания для новичков</p>
                        <p className="text-sm text-muted-foreground">
                          Например: "Заполните профиль полностью" (100 Fantiks), 
                          "Добавьте первый курс в избранное" (50 Fantiks)
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Задания за покупки</p>
                        <p className="text-sm text-muted-foreground">
                          Например: "Купите первый курс" (200 Fantiks), 
                          "Купите 5 курсов" (500 Fantiks)
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Задания за активность</p>
                        <p className="text-sm text-muted-foreground">
                          Например: "Посмотрите 3 курса полностью" (300 Fantiks), 
                          "Оставьте 5 отзывов" (250 Fantiks)
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Ежедневные задания</p>
                        <p className="text-sm text-muted-foreground">
                          Например: "Зайдите на платформу 7 дней подряд" (100 Fantiks каждый день)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как получить награду:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Выполните условия задания</li>
                      <li><strong className="text-foreground">2.</strong> Вернитесь в раздел "Задания"</li>
                      <li><strong className="text-foreground">3.</strong> Нажмите кнопку "Получить награду" рядом с выполненным заданием</li>
                      <li><strong className="text-foreground">4.</strong> Fantiks автоматически начислятся на ваш баланс</li>
                      <li><strong className="text-foreground">5.</strong> Вы увидите уведомление о начислении бонусов</li>
                    </ol>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Совет:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Выполняйте задания регулярно! Некоторые дают Fantiks каждый день. 
                      За месяц можно накопить тысячи Fantiks и получить большую скидку на курсы!
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Notifications Section */}
              <AccordionItem value="notifications" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-notifications">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Уведомления</h3>
                      <p className="text-sm text-muted-foreground">Важные сообщения от платформы</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      Где посмотреть уведомления:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Найдите иконку колокольчика в правом верхнем углу</li>
                      <li><strong className="text-foreground">2.</strong> Если есть новые уведомления, увидите красный кружок с цифрой</li>
                      <li><strong className="text-foreground">3.</strong> Нажмите на колокольчик</li>
                      <li><strong className="text-foreground">4.</strong> Откроется список всех уведомлений</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      Какие бывают уведомления:
                    </h4>
                    <div className="ml-6 space-y-3">
                      <div>
                        <p className="font-semibold text-foreground mb-1">Подтверждения покупок</p>
                        <p className="text-sm text-muted-foreground">
                          "Вы купили курс 'Название курса'. Курс добавлен в библиотеку"
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Начисление бонусов</p>
                        <p className="text-sm text-muted-foreground">
                          "Вам начислено 100 Fantiks за покупку курса"
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Статус заказов в Снайпер</p>
                        <p className="text-sm text-muted-foreground">
                          "Курс, который вы заказали в Снайпере, добавлен в магазин!"
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Обновления VIP подписок</p>
                        <p className="text-sm text-muted-foreground">
                          "Ваш VIP пакет активирован. Курсы добавлены в библиотеку"
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Новости платформы</p>
                        <p className="text-sm text-muted-foreground">
                          "Добавлены новые курсы по маркетплейсам. Смотрите в разделе Магазин"
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Акции и скидки</p>
                        <p className="text-sm text-muted-foreground">
                          "Специальное предложение: скидка 30% на все курсы категории 'Бизнес'"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Settings className="h-4 w-4 text-primary" />
                      Как управлять уведомлениями:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Откройте свой профиль</li>
                      <li><strong className="text-foreground">2.</strong> Найдите раздел "Настройки уведомлений"</li>
                      <li><strong className="text-foreground">3.</strong> Выберите, какие уведомления хотите получать</li>
                      <li><strong className="text-foreground">4.</strong> Можете отключить неважные уведомления</li>
                      <li><strong className="text-foreground">5.</strong> Сохраните настройки</li>
                    </ol>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Совет:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Регулярно проверяйте уведомления, чтобы не пропустить важную информацию о покупках, 
                      бонусах и акциях!
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Partners Section */}
              <AccordionItem value="partners" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-partners">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Handshake className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Партнёры</h3>
                      <p className="text-sm text-muted-foreground">Наши партнёрские компании</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Building className="h-4 w-4 text-primary" />
                      Что такое раздел Партнёры:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      В разделе "Партнёры" представлены компании, с которыми мы сотрудничаем. 
                      Это проверенные организации, которые предлагают полезные услуги для наших пользователей: 
                      дополнительное обучение, сервисы для бизнеса, специальные предложения и скидки.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как посмотреть партнёров:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Откройте раздел "Партнёры" в боковом меню</li>
                      <li><strong className="text-foreground">2.</strong> Просмотрите список компаний-партнёров</li>
                      <li><strong className="text-foreground">3.</strong> Нажмите на карточку партнёра, чтобы узнать подробности</li>
                      <li><strong className="text-foreground">4.</strong> Прочитайте описание услуг партнёра</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Что вы найдёте:
                    </h4>
                    <ul className="space-y-2 text-muted-foreground ml-6 list-disc">
                      <li>Название и логотип компании-партнёра</li>
                      <li>Описание услуг, которые они предлагают</li>
                      <li>Контактные данные для связи</li>
                      <li>Специальные условия для пользователей платформы (если есть)</li>
                      <li>Ссылку на сайт партнёра</li>
                    </ul>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Совет:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Наши партнёры часто предлагают специальные скидки для пользователей платформы. 
                      Обращайте внимание на эксклюзивные предложения!
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Profile Section */}
              <AccordionItem value="profile" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline" data-testid="accordion-profile">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Профиль</h3>
                      <p className="text-sm text-muted-foreground">Ваша личная информация</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Как открыть профиль:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Найдите иконку человечка в правом верхнем углу</li>
                      <li><strong className="text-foreground">2.</strong> Нажмите на неё</li>
                      <li><strong className="text-foreground">3.</strong> Откроется ваш профиль со всей информацией</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Settings className="h-4 w-4 text-primary" />
                      Как изменить имя и фамилию:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Откройте профиль</li>
                      <li><strong className="text-foreground">2.</strong> Найдите поле "Имя" и нажмите на кнопку "Изменить" (карандаш)</li>
                      <li><strong className="text-foreground">3.</strong> Введите новое имя</li>
                      <li><strong className="text-foreground">4.</strong> Аналогично измените фамилию</li>
                      <li><strong className="text-foreground">5.</strong> Нажмите кнопку "Сохранить"</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Как добавить контактные данные:
                    </h4>
                    <div className="ml-6 space-y-3">
                      <div>
                        <p className="font-semibold text-foreground mb-1">Номер телефона</p>
                        <ol className="space-y-1 text-sm text-muted-foreground">
                          <li>1. Найдите поле "Телефон"</li>
                          <li>2. Нажмите "Добавить" или "Изменить"</li>
                          <li>3. Введите номер в формате +7 (999) 123-45-67</li>
                          <li>4. Нажмите "Сохранить"</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">Telegram username</p>
                        <ol className="space-y-1 text-sm text-muted-foreground">
                          <li>1. Найдите поле "Telegram"</li>
                          <li>2. Нажмите "Добавить" или "Изменить"</li>
                          <li>3. Введите ваш username без @ (например: ivan_petrov)</li>
                          <li>4. Нажмите "Сохранить"</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Статистика в профиле:
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      В профиле вы можете посмотреть:
                    </p>
                    <ul className="space-y-2 text-muted-foreground ml-6 list-disc">
                      <li>Количество купленных курсов</li>
                      <li>Общую сумму покупок</li>
                      <li>Баланс Fantiks</li>
                      <li>Основной баланс и реферальный баланс</li>
                      <li>Количество приглашённых друзей</li>
                      <li>Полученные награды и достижения</li>
                    </ul>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Award className="h-4 w-4 text-yellow-500" />
                      Как посмотреть награды:
                    </h4>
                    <ol className="space-y-2 text-muted-foreground ml-6">
                      <li><strong className="text-foreground">1.</strong> Откройте профиль</li>
                      <li><strong className="text-foreground">2.</strong> Найдите раздел "Награды" или "Достижения"</li>
                      <li><strong className="text-foreground">3.</strong> Там вы увидите все значки, которые заработали</li>
                      <li><strong className="text-foreground">4.</strong> Нажмите на значок, чтобы узнать, за что получили награду</li>
                    </ol>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Совет:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Заполните профиль полностью: добавьте имя, телефон, Telegram. 
                      Это поможет нам связаться с вами при необходимости и вы получите бонус 100 Fantiks за полное заполнение!
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Support & Complaints Section */}
            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/30 shadow-lg" data-testid="card-support">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/20 p-3">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      Жалобы и предложения
                    </CardTitle>
                    <CardDescription>Свяжитесь с нашей службой поддержки</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Introduction */}
                <div className="space-y-3">
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-support-intro">
                    Мы ценим обратную связь от наших пользователей! Если у вас есть жалобы, предложения по улучшению платформы, 
                    вопросы о работе сервиса или вы столкнулись с какими-либо проблемами — пожалуйста, не стесняйтесь обращаться 
                    к нашей команде технической поддержки. Мы внимательно рассматриваем каждое обращение и стремимся сделать 
                    платформу лучше для вас.
                  </p>
                </div>

                {/* Contact Channels */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Контакт службы поддержки
                  </h4>
                  
                  <div className="max-w-md">
                    {/* Telegram */}
                    <div className="bg-card border border-border rounded-lg p-4 space-y-3 hover-elevate transition-all">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-primary/10 p-2">
                          <MessageCircle className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-semibold text-sm">Telegram</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground" data-testid="text-telegram">@vkurse_support</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => window.open('https://t.me/vkurse_support', '_blank')}
                          data-testid="button-telegram-support"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Открыть
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Copyright Holders Section */}
                <div className="bg-muted/30 border border-border rounded-lg p-5 space-y-4" data-testid="section-copyright">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-orange-500/10 p-2 mt-1">
                      <ShieldAlert className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Для правообладателей курсов
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-copyright-info">
                        Если вы являетесь правообладателем курса, размещённого на нашей платформе, и считаете, 
                        что ваши права нарушены, пожалуйста, свяжитесь с нами по контактам выше. Мы оперативно 
                        рассмотрим ваше обращение и примем необходимые меры.
                      </p>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">При обращении укажите:</p>
                        <ul className="space-y-1 text-sm text-muted-foreground ml-6 list-disc">
                          <li>Название курса и ссылку на него на платформе</li>
                          <li>Доказательства вашего авторства (ссылки на оригинальные материалы, сертификаты)</li>
                          <li>Ваши контактные данные для связи</li>
                          <li>Суть вашего обращения (удаление, изменение информации и т.д.)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* What to Include Checklist */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Что указать в обращении
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Тип обращения</p>
                        <p className="text-xs text-muted-foreground">Жалоба, предложение, вопрос или технический сбой</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Подробное описание</p>
                        <p className="text-xs text-muted-foreground">Опишите проблему или предложение максимально детально</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Ваши контакты</p>
                        <p className="text-xs text-muted-foreground">Email или Telegram для обратной связи</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Скриншоты (при необходимости)</p>
                        <p className="text-xs text-muted-foreground">Прикрепите изображения для наглядности</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Response Time Notice */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2" data-testid="section-response-time">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    Время ответа
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-response-time">
                    Мы стремимся отвечать на все обращения в течение <strong className="text-foreground">24-48 часов</strong> в рабочие дни. 
                    Срочные вопросы обрабатываются приоритетно. Благодарим за ваше терпение и понимание!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips Card */}
            <Card className="bg-gradient-to-br from-green-500/5 to-background border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Sparkles className="h-5 w-5" />
                  Полезные советы
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex gap-2">
                    <Lightbulb className="h-4 w-4 text-foreground flex-shrink-0" />
                    <span>Добавляйте интересные курсы в избранное, чтобы не потерять их</span>
                  </p>
                  <p className="text-sm text-muted-foreground flex gap-2">
                    <Target className="h-4 w-4 text-foreground flex-shrink-0" />
                    <span>Используйте фильтры для быстрого поиска нужных курсов</span>
                  </p>
                  <p className="text-sm text-muted-foreground flex gap-2">
                    <Star className="h-4 w-4 text-foreground flex-shrink-0" />
                    <span>VIP пакеты выгоднее покупки отдельных курсов</span>
                  </p>
                  <p className="text-sm text-muted-foreground flex gap-2">
                    <BookOpen className="h-4 w-4 text-foreground flex-shrink-0" />
                    <span>Курсы в библиотеке остаются с вами навсегда</span>
                  </p>
                  <p className="text-sm text-muted-foreground flex gap-2">
                    <Search className="h-4 w-4 text-foreground flex-shrink-0" />
                    <span>Читайте описания курсов перед покупкой для выбора подходящего уровня</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
