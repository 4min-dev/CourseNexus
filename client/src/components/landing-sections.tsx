import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  Gift,
  Trophy,
  ArrowRight,
  Play,
  Sparkles,
  Zap,
  Check,
  TrendingUp,
  Award,
  Wallet,
  GraduationCap,
  Video,
  Heart,
  Headphones,
  MessageCircle,
} from "lucide-react";
import * as Icons from "lucide-react";
import { NeonLogo } from "@/components/NeonLogo";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { ParallaxBackground } from "@/components/parallax-background";
import { Link, useLocation } from "wouter";
import { useState, ReactNode } from "react";
import type { LandingContent } from "@shared/schema";
import { debugLog } from "@/lib/debug";

// Helper function to detect video type and convert to embed URL
export function getVideoEmbedInfo(url: string | null | undefined): { type: 'direct' | 'youtube' | 'vk' | 'none', embedUrl: string } {
  if (!url || url.trim() === '') {
    return { type: 'none', embedUrl: '' };
  }

  const trimmedUrl = url.trim();

  // Check for YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = trimmedUrl.match(youtubeRegex);
  if (youtubeMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=0&rel=0`
    };
  }

  // Check for VK Video (both vk.com and vkvideo.ru formats)
  const vkRegex = /(?:vk\.com|vkvideo\.ru)\/video(-?\d+)_(\d+)/;
  const vkMatch = trimmedUrl.match(vkRegex);
  if (vkMatch) {
    return {
      type: 'vk',
      embedUrl: `https://vk.com/video_ext.php?oid=${vkMatch[1]}&id=${vkMatch[2]}&hd=2`
    };
  }

  // Check if it's a direct video file (.mp4, .webm, .ogg)
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(trimmedUrl)) {
    return { type: 'direct', embedUrl: trimmedUrl };
  }

  // Default: treat as direct URL
  return { type: 'direct', embedUrl: trimmedUrl };
}

interface EditableWrapperProps {
  children: ReactNode;
  fieldPath: string[];
  label: string;
  onEdit?: (fieldPath: string[], label: string) => void;
  editMode?: boolean;
}

// Editable wrapper component for inline editing
function EditableWrapper({ children, fieldPath, label, onEdit, editMode = false }: EditableWrapperProps) {
  if (!editMode || !onEdit) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative group cursor-pointer"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit(fieldPath, label);
      }}
    >
      <div className="group-hover:outline group-hover:outline-2 group-hover:outline-primary/50 group-hover:outline-dashed rounded transition-all">
        {children}
      </div>
      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Badge className="text-xs px-2 py-0.5 bg-primary pointer-events-none">
          ✏️ {label}
        </Badge>
      </div>
    </div>
  );
}

interface LandingSectionProps {
  content: LandingContent;
  registerUrl?: string;
  editMode?: boolean;
  onEdit?: (fieldPath: string[], label: string) => void;
}

export function LandingHeader({ registerUrl = '/register', loginUrl = '/login', editMode = false, onEdit }: { registerUrl?: string; loginUrl?: string; editMode?: boolean; onEdit?: (fieldPath: string[], label: string) => void }) {
  return (
    <header className="sticky top-0 z-[100] border-b border-border/40 overflow-hidden w-full bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/50 to-background/70 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="relative container mx-auto px-2.5 max-[480px]:px-2 sm:px-4 py-3 md:py-4 flex min-w-0 items-center justify-between gap-2 max-[480px]:gap-1">
        <div className="shrink-0 origin-left max-[480px]:scale-[0.84] max-[380px]:scale-[0.78]">
          <NeonLogo variant="gradient" />
        </div>

        <div className="flex min-w-0 items-center gap-2 max-[480px]:gap-1 sm:gap-4">
          {/* Контакты - скрыты на мобильных */}
          <div className="hidden md:flex items-center gap-2 border-r border-border/40 pr-4">
            <Button
              size="sm"
              variant="ghost"
              asChild
              className="gap-2 text-muted-foreground hover:text-foreground"
              data-testid="button-sales-telegram"
            >
              <a href="https://t.me/kurs_helper" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden lg:inline">Отдел продаж</span>
              </a>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              asChild
              className="gap-2 text-muted-foreground hover:text-foreground"
              data-testid="button-support-telegram"
            >
              <a href="https://t.me/kurs_helper" target="_blank" rel="noopener noreferrer">
                <Headphones className="h-4 w-4" />
                <span className="hidden lg:inline">Техподдержка</span>
              </a>
            </Button>
          </div>

          {/* Кнопки входа/регистрации */}
          <div className="flex min-w-0 flex-nowrap items-center justify-end gap-2 max-[480px]:gap-1 max-[380px]:gap-0.5 sm:gap-3">
            <Button
              size="sm"
              variant="outline"
              asChild
              className="h-8 whitespace-nowrap px-2 text-[11px] max-[380px]:h-7 max-[380px]:px-1.5 max-[380px]:text-[10px] sm:h-10 sm:px-4 sm:text-sm md:text-base"
              data-testid="button-login"
            >
              <Link href={loginUrl}>Войти</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="h-8 whitespace-nowrap px-2 text-[11px] max-[380px]:h-7 max-[380px]:px-1.5 max-[380px]:text-[10px] sm:h-10 sm:px-4 sm:text-sm md:text-base"
              data-testid="button-register"
            >
              <Link href={registerUrl}>Регистрация</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function HeroSection({ content, registerUrl = '/register', editMode = false, onEdit }: LandingSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoInfo = getVideoEmbedInfo(content?.videoUrl);
  const isEmbedVideo = videoInfo.type === 'youtube' || videoInfo.type === 'vk';

  const handlePlayVideo = () => {
    if (isEmbedVideo) {
      setIsPlaying(true);
      return;
    }

    const video = document.getElementById('intro-video') as HTMLVideoElement;
    if (video) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((error) => debugLog('Video playback prevented:', error));
      }
    }
  };

  return (
    <section className="relative py-12 md:py-20 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <ParallaxBackground />
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left Column - Text */}
          <div className="space-y-4 md:space-y-6">
            <Badge className="text-xs sm:text-sm px-3 sm:px-4 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              Маркетплейс образования №1
            </Badge>
            <EditableWrapper fieldPath={['heroTitle']} label="Заголовок Hero" onEdit={onEdit} editMode={editMode}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                {content.heroTitle || 'Крупнейший маркетплейс сливов курсов от топовых спикеров'}
              </h1>
            </EditableWrapper>
            <EditableWrapper fieldPath={['heroSubtitle']} label="Подзаголовок Hero" onEdit={onEdit} editMode={editMode}>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
                {content.heroSubtitle}
              </p>
            </EditableWrapper>

            {/* Key Benefits */}
            <EditableWrapper fieldPath={['heroBenefits']} label="Преимущества Hero секции" onEdit={onEdit} editMode={editMode}>
              <div className="space-y-2 md:space-y-3 pt-2 md:pt-4">
                {content.heroBenefits?.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 md:gap-3">
                    <div className={`h-7 w-7 md:h-8 md:w-8 rounded-full ${index === 0 ? 'bg-primary/20' : 'bg-chart-2/10'} flex items-center justify-center flex-shrink-0`}>
                      {index === 0 ? (
                        <Zap className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                      ) : (
                        <Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-chart-2" />
                      )}
                    </div>
                    <span className={`text-sm sm:text-base md:text-lg ${index === 0 ? 'font-semibold text-primary' : ''}`}>
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </EditableWrapper>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 pt-2 md:pt-4">
              <EditableWrapper fieldPath={['heroCtaPrimary']} label="Текст основной кнопки" onEdit={onEdit} editMode={editMode}>
                <Button size="lg" asChild className="text-base md:text-lg group w-full sm:w-auto" data-testid="button-get-started">
                  <Link href={registerUrl}>
                    {content.heroCtaPrimary}
                    <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </EditableWrapper>
              <EditableWrapper fieldPath={['heroCtaSecondary']} label="Текст вторичной кнопки" onEdit={onEdit} editMode={editMode}>
                <Button size="lg" variant="outline" asChild className="text-base md:text-lg w-full sm:w-auto" data-testid="button-explore">
                  <Link href="/login">
                    {content.heroCtaSecondary}
                  </Link>
                </Button>
              </EditableWrapper>
            </div>
          </div>

          {/* Right Column - Video */}
          <div className="relative delay-200 mt-4 lg:mt-0">
            <EditableWrapper fieldPath={['videoUrl']} label="Видео URL" onEdit={onEdit} editMode={editMode}>
              <div className="relative aspect-video rounded-lg md:rounded-2xl overflow-hidden border border-primary/20 md:border-2 shadow-xl md:shadow-2xl shadow-primary/20 bg-gradient-to-br from-primary/10 to-chart-2/10">
                {videoInfo.type === 'none' ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-chart-2/10">
                    <div className="text-center space-y-4 p-8">
                      <Video className="h-16 w-16 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">Видео не добавлено</p>
                    </div>
                  </div>
                ) : isEmbedVideo ? (
                  <iframe
                    src={videoInfo.embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    data-testid="video-intro-iframe"
                  />
                ) : (
                  <>
                    <video
                      id="intro-video"
                      className="w-full h-full object-cover"
                      poster={content?.videoPosterUrl || undefined}
                      controls={isPlaying}
                      onPlay={() => setIsPlaying(true)}
                      data-testid="video-intro"
                    >
                      <source src={videoInfo.embedUrl} type="video/mp4" />
                      Ваш браузер не поддерживает видео
                    </video>
                    {!isPlaying && (
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/60 to-black/40 cursor-pointer group"
                        onClick={handlePlayVideo}
                      >
                        <div className="h-20 w-20 rounded-full bg-primary/95 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all duration-300 shadow-2xl">
                          <Play className="h-10 w-10 text-primary-foreground ml-1" />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </EditableWrapper>

            {/* Video Description */}
            <div className="mt-4 md:mt-6 p-3 md:p-4 bg-card/70 rounded-lg border border-border">
              <div className="flex items-start gap-2 md:gap-3">
                <Video className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <EditableWrapper fieldPath={['videoTitle']} label="Заголовок видео" onEdit={onEdit} editMode={editMode}>
                    <h3 className="font-semibold mb-1 text-sm md:text-base">{content.videoTitle}</h3>
                  </EditableWrapper>
                  <EditableWrapper fieldPath={['videoDescription']} label="Описание видео" onEdit={onEdit} editMode={editMode}>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {content.videoDescription}
                    </p>
                  </EditableWrapper>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PriceSection({ content, editMode = false, onEdit }: LandingSectionProps) {
  return (
    <section className="py-12 md:py-20 px-4 bg-gradient-to-br from-primary/10 via-chart-2/5 to-chart-3/5">
      <div className="container mx-auto max-w-7xl">
        <Card className="border border-primary/30 md:border-2 shadow-xl md:shadow-2xl shadow-primary/20 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Left - Price Comparison */}
            <div className="bg-gradient-to-br from-primary/5 to-chart-2/5 p-6 md:p-12 flex flex-col justify-center">
              <Badge className="w-fit mb-4 md:mb-6 text-xs sm:text-sm md:text-base px-3 md:px-4 py-1.5 md:py-2 delay-100">
                <Sparkles className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Главное преимущество
              </Badge>

              <EditableWrapper fieldPath={['priceTitle']} label="Заголовок цен" onEdit={onEdit} editMode={editMode}>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 leading-tight delay-200">
                  {content.priceTitle}
                </h2>
              </EditableWrapper>

              <EditableWrapper fieldPath={['priceSubtitle']} label="Подзаголовок цен" onEdit={onEdit} editMode={editMode}>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 leading-relaxed delay-300">
                  {content.priceSubtitle}
                </p>
              </EditableWrapper>

              <div className="space-y-4 md:space-y-6">
                {content.priceAdvantages?.map((advantage, index) => {
                  const IconComponent = index === 0 ? Award : index === 1 ? Wallet : TrendingUp;
                  const bgClass = index === 0 ? 'bg-primary/10' : index === 1 ? 'bg-chart-2/10' : 'bg-chart-3/10';
                  const iconClass = index === 0 ? 'text-primary' : index === 1 ? 'text-chart-2' : 'text-chart-3';

                  return (
                    <EditableWrapper
                      key={index}
                      fieldPath={['priceAdvantages', String(index)]}
                      label={`Преимущество ${index + 1}`}
                      onEdit={onEdit}
                      editMode={editMode}
                    >
                      <div className={`flex items-start gap-3 md:gap-4 ${index === 0 ? 'animate-in fade-in slide-in-from-left duration-500 [animation-delay:400ms]' : ''}`}>
                        <div className={`h-10 w-10 md:h-12 md:w-12 rounded-lg md:rounded-xl ${bgClass} flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className={`h-5 w-5 md:h-6 md:w-6 ${iconClass}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base md:text-lg mb-1">{advantage.title}</h3>
                          <p className="text-sm md:text-base text-muted-foreground">
                            {advantage.description}
                          </p>
                        </div>
                      </div>
                    </EditableWrapper>
                  );
                })}
              </div>
            </div>

            {/* Right - Visual Price Comparison */}
            <div className="bg-gradient-to-br from-background to-card p-6 md:p-12 flex flex-col justify-center">
              <div className="space-y-6 md:space-y-8">
                <div className="text-center delay-100">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Официальная цена</p>
                  <EditableWrapper fieldPath={['priceOfficial']} label="Официальная цена" onEdit={onEdit} editMode={editMode}>
                    <div className="relative inline-block">
                      <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-muted-foreground/50 line-through">
                        ~<AnimatedNumber value={content.priceOfficial} separator=" " /> ₽
                      </div>
                      <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 h-6 w-6 md:h-8 md:w-8 rounded-full bg-destructive/20 flex items-center justify-center">
                        <span className="text-destructive text-base md:text-xl">✕</span>
                      </div>
                    </div>
                  </EditableWrapper>
                </div>

                <div className="flex items-center justify-center delay-200">
                  <div className="h-0.5 md:h-1 w-16 md:w-24 bg-gradient-to-r from-transparent via-border to-transparent"></div>
                  <ArrowRight className="h-6 w-6 md:h-8 md:w-8 text-primary mx-2 md:mx-4" />
                  <div className="h-0.5 md:h-1 w-16 md:w-24 bg-gradient-to-r from-transparent via-border to-transparent"></div>
                </div>

                <div className="text-center delay-300">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Цена у нас</p>
                  <EditableWrapper fieldPath={['priceOurs']} label="Наша цена" onEdit={onEdit} editMode={editMode}>
                    <div className="relative inline-block">
                      <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary">
                        ~<AnimatedNumber value={content.priceOurs} separator=" " /> ₽
                      </div>
                      <div className="absolute -top-2 -right-8 sm:-top-3 sm:-right-12 rotate-12">
                        <Badge className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 bg-chart-2">
                          -97%
                        </Badge>
                      </div>
                    </div>
                  </EditableWrapper>
                </div>

                <div className="mt-6 md:mt-8 p-4 md:p-6 bg-primary/5 rounded-lg md:rounded-xl border border-primary/20 [animation-delay:500ms]">
                  <div className="text-center space-y-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">Примерная экономия</p>
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
                      ~<AnimatedNumber value={content.priceOfficial - content.priceOurs} separator=" " /> ₽
                    </div>
                    <p className="text-xs text-muted-foreground">
                      На каждом премиум-курсе
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

export function FreeFeaturesSection({ content, registerUrl = '/register', editMode = false, onEdit }: LandingSectionProps) {
  return (
    <section className="py-12 md:py-20 px-4 bg-gradient-to-b from-transparent to-chart-2/5">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center space-y-3 md:space-y-4 mb-10 md:mb-16">
          <Badge variant="outline" className="text-xs sm:text-sm px-3 sm:px-4 py-1">
            <Gift className="h-3 w-3 mr-1" />
            Абсолютно бесплатно
          </Badge>
          <EditableWrapper fieldPath={['freeTitle']} label="Заголовок бесплатных функций" onEdit={onEdit} editMode={editMode}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
              {content.freeTitle}
            </h2>
          </EditableWrapper>
          <EditableWrapper fieldPath={['freeSubtitle']} label="Подзаголовок бесплатных функций" onEdit={onEdit} editMode={editMode}>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              {content.freeSubtitle}
            </p>
          </EditableWrapper>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {content.freeFeatures?.map((feature, index) => {
            const borderClass = index === 0 ? 'border-chart-2/20' : 'border-chart-3/20';
            const bgClass = index === 0 ? 'bg-chart-2/10' : 'bg-chart-3/10';
            const iconColorClass = index === 0 ? 'text-chart-2' : 'text-chart-3';
            const animationClass = index === 0 ? 'slide-in-from-left' : 'slide-in-from-right';
            const Icon = index === 0 ? Video : GraduationCap;

            return (
              <Card key={index} className={`border border-${borderClass} md:border-2 hover-elevate transition-all animate-in fade-in ${animationClass} duration-700`}>
                <CardHeader className="p-4 md:p-6">
                  <div className={`h-12 w-12 md:h-14 md:w-14 rounded-lg md:rounded-xl ${bgClass} flex items-center justify-center mb-3 md:mb-4`}>
                    <Icon className={`h-6 w-6 md:h-7 md:w-7 ${iconColorClass}`} />
                  </div>
                  <EditableWrapper
                    fieldPath={['freeFeatures', String(index), 'title']}
                    label={`Заголовок функции ${index + 1}`}
                    onEdit={onEdit}
                    editMode={editMode}
                  >
                    <CardTitle className="text-lg sm:text-xl md:text-2xl">{feature.title}</CardTitle>
                  </EditableWrapper>
                  <EditableWrapper
                    fieldPath={['freeFeatures', String(index), 'description']}
                    label={`Описание функции ${index + 1}`}
                    onEdit={onEdit}
                    editMode={editMode}
                  >
                    <CardDescription className="text-sm md:text-base">
                      {feature.description}
                    </CardDescription>
                  </EditableWrapper>
                </CardHeader>
                <CardContent className="space-y-4 p-4 md:p-6 pt-0">
                  <ul className="space-y-2 md:space-y-3">
                    {feature.points?.map((point, pointIndex) => (
                      <EditableWrapper
                        key={pointIndex}
                        fieldPath={['freeFeatures', String(index), 'points', String(pointIndex)]}
                        label={`Пункт ${pointIndex + 1}`}
                        onEdit={onEdit}
                        editMode={editMode}
                      >
                        <li className="flex items-start gap-2 md:gap-3">
                          <Check className={`h-4 w-4 md:h-5 md:w-5 ${iconColorClass} mt-0.5 flex-shrink-0`} />
                          <span className="text-sm md:text-base">{point}</span>
                        </li>
                      </EditableWrapper>
                    ))}
                  </ul>
                  <div className="pt-2 md:pt-4">
                    <Button variant="outline" asChild className="w-full text-sm md:text-base">
                      <Link href={registerUrl}>{index === 0 ? 'Смотреть бесплатные уроки' : 'Начать бесплатно'}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PlatformFeaturesSection({ content, registerUrl = '/register', editMode = false, onEdit }: LandingSectionProps) {
  const [, setLocation] = useLocation();

  const handleCardClick = () => {
    setLocation(registerUrl);
  };

  return (
    <section className="py-12 md:py-20 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center space-y-3 md:space-y-4 mb-10 md:mb-16">
          <EditableWrapper fieldPath={['featuresTitle']} label="Заголовок функций платформы" onEdit={onEdit} editMode={editMode}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
              {content.featuresTitle}
            </h2>
          </EditableWrapper>
          <EditableWrapper fieldPath={['featuresSubtitle']} label="Подзаголовок функций платформы" onEdit={onEdit} editMode={editMode}>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              {content.featuresSubtitle}
            </p>
          </EditableWrapper>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {content.platformFeatures?.map((feature, index) => {
            const bgClasses = ['bg-primary/10', 'bg-chart-2/10', 'bg-chart-3/10', 'bg-chart-4/10'];
            const iconClasses = ['text-primary', 'text-chart-2', 'text-chart-3', 'text-chart-4'];
            const delays = ['delay-75', 'delay-100', 'delay-150', 'delay-200', '[animation-delay:250ms]', 'delay-300'];

            const bgClass = bgClasses[index % bgClasses.length];
            const iconClass = iconClasses[index % iconClasses.length];
            const delayClass = delays[index] || '';

            // Dynamically get icon component from lucide-react
            const IconComponent = (Icons as any)[feature.icon] || ShoppingBag;

            return (
              <Card
                key={index}
                className={`hover-elevate transition-all ${delayClass} cursor-pointer`}
                onClick={handleCardClick}
              >
                <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                  <EditableWrapper
                    fieldPath={['platformFeatures', String(index), 'icon']}
                    label={`Иконка функции ${index + 1}`}
                    onEdit={onEdit}
                    editMode={editMode}
                  >
                    <div className={`h-10 w-10 md:h-12 md:w-12 rounded-lg md:rounded-xl ${bgClass} flex items-center justify-center`}>
                      <IconComponent className={`h-5 w-5 md:h-6 md:w-6 ${iconClass}`} />
                    </div>
                  </EditableWrapper>
                  <EditableWrapper
                    fieldPath={['platformFeatures', String(index), 'title']}
                    label={`Заголовок функции ${index + 1}`}
                    onEdit={onEdit}
                    editMode={editMode}
                  >
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold">{feature.title}</h3>
                  </EditableWrapper>
                  <EditableWrapper
                    fieldPath={['platformFeatures', String(index), 'description']}
                    label={`Описание функции ${index + 1}`}
                    onEdit={onEdit}
                    editMode={editMode}
                  >
                    <p className="text-sm md:text-base text-muted-foreground">
                      {feature.description}
                    </p>
                  </EditableWrapper>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function EarningSection({ registerUrl = '/register' }: { registerUrl?: string }) {
  const [, setLocation] = useLocation();

  const handleCardClick = () => {
    setLocation(registerUrl);
  };

  return (
    <section className="py-12 md:py-20 px-4 bg-gradient-to-b from-primary/5 to-transparent">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center space-y-3 md:space-y-4 mb-10 md:mb-16">
          <Badge variant="outline" className="text-xs sm:text-sm px-3 sm:px-4 py-1">
            <Wallet className="h-3 w-3 mr-1" />
            Зарабатывай с нами
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
            Учись и <span className="text-primary">зарабатывай</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Платформа создана не только для обучения, но и для заработка
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto">
          <Card className="border border-primary/20 md:border-2 cursor-pointer" onClick={handleCardClick}>
            <CardHeader className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="h-12 w-12 md:h-14 md:w-14 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl">Реферальная программа</CardTitle>
                  <Badge variant="outline" className="mt-1 text-xs sm:text-sm">30-45% пожизненно</Badge>
                </div>
              </div>
              <CardDescription className="text-sm md:text-base">
                Самая щедрая партнёрская программа на рынке!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0">
              <ul className="space-y-2 md:space-y-3">
                <li className="flex items-start gap-2 md:gap-3">
                  <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm md:text-base">
                    <strong>30% от пополнений</strong> каждого приведённого пользователя
                  </div>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm md:text-base">
                    <strong>Прокачка до 45%!</strong> Увеличивайте процент с VIP пакетами
                  </div>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm md:text-base">
                    <strong>ПОЖИЗНЕННО!</strong> Заработок с каждого пополнения навсегда
                  </div>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm md:text-base">
                    <strong>Вывод на карту</strong> - получайте реальные деньги
                  </div>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm md:text-base">
                    <strong>Бонус другу</strong> - ваш реферал получает скидку 5%
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border border-chart-2/20 md:border-2 cursor-pointer" onClick={handleCardClick}>
            <CardHeader className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="h-12 w-12 md:h-14 md:w-14 rounded-lg md:rounded-xl bg-chart-2/10 flex items-center justify-center flex-shrink-0">
                  <Award className="h-6 w-6 md:h-7 md:w-7 text-chart-2" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl">Система Фантиков</CardTitle>
                  <Badge variant="outline" className="mt-1 text-xs sm:text-sm">До 20% скидка</Badge>
                </div>
              </div>
              <CardDescription className="text-sm md:text-base">
                Бонусная программа лояльности
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0">
              <ul className="space-y-2 md:space-y-3">
                <li className="flex items-start gap-2 md:gap-3">
                  <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-chart-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm md:text-base">
                    <strong>За покупки</strong> - получайте фантики с каждой покупки
                  </div>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-chart-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm md:text-base">
                    <strong>За задания</strong> - выполняйте миссии и получайте бонусы
                  </div>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-chart-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm md:text-base">
                    <strong>За рефералов</strong> - дополнительные награды
                  </div>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-chart-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm md:text-base">
                    <strong>Оплата покупок</strong> - используйте до 20% стоимости
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function StatsSection() {
  return (
    <section className="py-12 md:py-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="grid sm:grid-cols-3 gap-6 md:gap-8 text-center">
          <div className="space-y-1 md:space-y-2">
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary">
              <AnimatedNumber value={1000} />+
            </div>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">Активных студентов</p>
          </div>
          <div className="space-y-1 md:space-y-2 delay-100">
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-chart-2">
              <AnimatedNumber value={500} />+
            </div>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">Курсов в каталоге</p>
          </div>
          <div className="space-y-1 md:space-y-2 delay-200">
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-chart-3">
              <AnimatedNumber value={95} />%
            </div>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">Положительных отзывов</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CTASection({ registerUrl = '/register' }: { registerUrl?: string }) {
  return (
    <section className="py-12 md:py-20 px-4 bg-gradient-to-br from-primary/10 via-chart-2/10 to-chart-3/10">
      <div className="container mx-auto max-w-4xl">
        <Card className="border border-primary/20 md:border-2 shadow-xl md:shadow-2xl">
          <CardContent className="p-6 md:p-12 text-center space-y-4 md:space-y-6">
            <div className="inline-flex items-center justify-center h-14 w-14 md:h-16 md:w-16 rounded-full bg-primary/10 mb-2 md:mb-4">
              <Heart className="h-7 w-7 md:h-8 md:w-8 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold px-2">Начните обучение прямо сейчас</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              Присоединяйтесь к тысячам успешных студентов и специалистов.
              Регистрация займёт всего 30 секунд!
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-4 md:pt-6">
              <Button size="lg" asChild className="text-base md:text-lg group w-full sm:w-auto" data-testid="button-cta-catalog">
                <Link href="/shop">
                  Перейти в каталог
                  <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base md:text-lg group w-full sm:w-auto" data-testid="button-cta-register">
                <Link href={registerUrl}>
                  Создать аккаунт бесплатно
                  <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            <div className="pt-4 md:pt-6 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 md:gap-6 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-chart-2 flex-shrink-0" />
                <span>Без кредитной карты</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-chart-2 flex-shrink-0" />
                <span>Бесплатные курсы</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-chart-2 flex-shrink-0" />
                <span>Отмена в любой момент</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
