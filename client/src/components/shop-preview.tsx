import { Crown, Heart, FolderOpen, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import shopBackground from "@assets/generated_images/shop_background.webp";
import tradeInImage from "@assets/generated_images/UNO_style_trade_cards_illustration_11a5fb90.png";
import sniperImage from "@assets/generated_images/Influencer_in_sniper_crosshair_2bdcbb43.png";
import referralImage from "@assets/generated_images/Referral_network_illustration_951f8395.png";
import type { Course } from "@shared/schema";

const sidebarPlatforms = [
  "Маркетплейсы",
  "Искусственный интеллект, нейросети",
  "Бизнес, маркетинг и менеджмент",
  "Криптовалюты, блокчейн, арбитраж, P2P, трейдинг",
  "Рукоделие",
  "Дизайн (фото, видео, инфографика)",
  "Психология",
  "Заработок. Освоение профессии",
  "SMM, Соц. Сети, Продвижение",
  "Материнство. Уход за ребенком",
  "Здоровье",
  "Компьютеры. Программирование",
];

const previewCourseImages = [tradeInImage, sniperImage, referralImage, shopBackground];
const fallbackPreviewCourses = Array.from({ length: 12 }).map((_, idx) => ({
  id: `course-${idx + 1}`,
  image: previewCourseImages[idx % previewCourseImages.length],
  title: `Курс ${idx + 1}: Практика и разбор`,
  subtitle: `${2021 + (idx % 5)} · рейтинг ${(4.3 + (idx % 5) * 0.1).toFixed(1)}`,
  price: `${(1490 + idx * 320).toLocaleString("ru-RU")} ₽`,
}));

export function ShopPreview() {
  const { data: realCourses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses", "shop-preview", 15],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("excludeVipPackages", "true");
      params.append("limit", "15");
      params.append("offset", "0");
      const res = await fetch(`/api/courses?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    retry: false,
  });

  const previewCourses =
    realCourses.length > 0
      ? realCourses.slice(0, 15).map((course, idx) => ({
          id: course.id,
          image:
            (course as any).thumbnailImage ||
            (course as any).thumbnailUrl ||
            previewCourseImages[idx % previewCourseImages.length],
          title: course.title,
          subtitle:
            course.authorName && course.year
              ? `${course.authorName} · ${course.year}`
              : course.authorName || (course.year ? `${course.year}` : "Автор курса"),
          price: `${Number(course.price || 0).toLocaleString("ru-RU")} ₽`,
        }))
      : fallbackPreviewCourses;

  return (
    <div className="dark absolute inset-0 overflow-hidden bg-sidebar text-foreground">
      <div className="absolute inset-x-0 top-0 h-[70px] border-b border-[#2a3750] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#101a2c]/92 via-[#122035]/84 to-[#101a2c]/92 backdrop-blur-xl" />
        <div className="relative mx-auto h-full max-w-[1700px] px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-full gap-3">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="text-[22px] font-extrabold tracking-tight text-violet-300">
                В КУРСЕ<span className="text-yellow-300">?</span>
              </div>
              <div className="hidden lg:flex items-center gap-4 text-xs font-semibold">
                <span className="text-cyan-300">МАГАЗИН</span>
                <span className="text-slate-300/70">БИБЛИОТЕКА</span>
                <span className="text-slate-300/70">АКТИВНОСТИ</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:block h-8 rounded bg-fuchsia-500/80 px-3 text-[11px] font-semibold leading-8 text-white">Trade-In</div>
              <div className="h-8 w-36 md:w-44 rounded border border-[#2f4364] bg-[#13263f]/90" />
              <div className="hidden sm:block h-8 w-20 rounded border border-[#2f4364] bg-[#13263f]/90" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 top-[70px] h-[40px] border-b border-violet-500/20 bg-violet-500/12">
        <div className="mx-auto flex h-full max-w-[1700px] items-center px-3 sm:px-4 lg:px-6">
          <div className="h-3 w-80 max-w-full rounded bg-primary/30" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 top-[110px]">
        <div className="mx-auto flex h-full max-w-[1700px]">
          <aside className="hidden lg:block w-80 border-r border-[#2a3750] bg-[#182437]/94 flex-shrink-0 overflow-hidden">
            <div className="p-4 space-y-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold rounded-md vip-shimmer">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-500">VIP Пакеты</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold rounded-md">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">Избранное</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold rounded-md">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  <span>Каталог курсов</span>
                </div>
                <div className="ml-4 space-y-1">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left text-sm">
                    <ChevronDown className="h-4 w-4" />
                    <span>Платформы</span>
                  </div>
                  <div className="ml-6 space-y-1">
                    {sidebarPlatforms.map((item) => (
                      <div key={item} className="flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left text-xs">
                        <ChevronRight className="h-3 w-3 opacity-70" />
                        <span className="line-clamp-2">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left text-sm">
                    <ChevronDown className="h-4 w-4" />
                    <span>Год</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1 p-3 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
              <div className="space-y-3">
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Магазин курсов</h1>
                <p className="text-base md:text-lg text-muted-foreground">
                  Выберите курс для обучения и развития в любом направлении
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <div className="h-8 rounded bg-slate-500/45 px-3 text-[12px] font-semibold leading-8 text-slate-200/85">Каталог</div>
                <div className="h-8 rounded bg-slate-500/45 px-3 text-[12px] font-semibold leading-8 text-slate-200/85">Рефералка</div>
                <div className="h-8 rounded bg-slate-500/45 px-3 text-[12px] font-semibold leading-8 text-slate-200/85">Подборки</div>
              </div>

              <div id="catalog-preview" className="space-y-5">
                <div className="flex items-center gap-2 md:gap-3">
                  <FolderOpen className="h-7 w-7 md:h-10 md:w-10 text-primary flex-shrink-0" />
                  <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
                    Каталог курсов
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch" style={{ gridAutoRows: "1fr" }}>
                {previewCourses.map((course) => (
                    <div key={course.id} className="rounded-xl border border-border/40 bg-gradient-to-br from-background/80 via-background/65 to-background/80 backdrop-blur-sm overflow-hidden">
                      <div className="relative aspect-video border-b border-border/40 bg-background/40">
                        <img
                          src={course.image}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-85"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/45 via-transparent to-transparent" />
                      </div>
                      <div className="p-4 space-y-3">
                        <h3 className="font-bold text-xl leading-tight line-clamp-2">{course.title}</h3>
                        <p className="text-sm text-muted-foreground">{course.subtitle}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-foreground">{course.price}</span>
                          <span className="text-xs text-muted-foreground">доступ сразу</span>
                        </div>
                        <div className="h-10 rounded-md border border-primary/35 bg-primary/10 text-center text-sm font-semibold leading-10 text-primary">
                          Подробнее
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
