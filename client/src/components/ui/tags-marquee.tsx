import React from 'react'
import { cn } from '@/lib/utils'

type TagItem = {
    id?: string
    name: string
}

type TagsMarqueeProps = {
    items: TagItem[]
    isPaused?: boolean
    onClick?: () => void
    className?: string
    repeatCount?: number
    itemClassName?: string
}

export const TagsMarquee: React.FC<TagsMarqueeProps> = ({
    items,
    isPaused = false,
    onClick,
    className,
    repeatCount = 2,
    itemClassName
}) => {
    const innerRef = React.useRef<HTMLDivElement>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const isMobileViewport = React.useMemo(() => {
        if (typeof window === 'undefined') return false
        return window.matchMedia('(max-width: 767px)').matches
    }, [])
    const [isInView, setIsInView] = React.useState(true)
    const isPerfLow = React.useMemo(() => {
        try {
            return typeof document !== 'undefined' && document.documentElement.classList.contains('perf-low')
        } catch {
            return false
        }
    }, [])

    const effectiveRepeatCount = isPerfLow ? Math.min(1, repeatCount) : repeatCount
    const effectivePaused = isPaused || isPerfLow
    const shouldPauseForViewport = isMobileViewport && !isInView
    const isAnimationRunning = !effectivePaused && !shouldPauseForViewport

    const repeatedItems = React.useMemo(() => {
        const result: TagItem[] = []
        for (let i = 0; i < effectiveRepeatCount; i++) {
            result.push(...items)
        }
        return result
    }, [items, effectiveRepeatCount])

    const charCount = items.reduce((sum, item) => sum + (item.name?.length || 0), 0)

    React.useEffect(() => {
        if (!isMobileViewport) {
            setIsInView(true)
            return
        }
        if (typeof IntersectionObserver === 'undefined' || !containerRef.current) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting)
            },
            {
                threshold: 0.05,
                rootMargin: '100px 0px'
            }
        )

        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [isMobileViewport])

    return (
        <div
            ref={containerRef}
            className={cn(
                "overflow-hidden relative h-auto my-2 cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            <div
                ref={innerRef}
                className={cn(
                    "inline-flex whitespace-nowrap animate-marquee",
                    "gap-1.5"
                )}
                style={{
                    animationPlayState: isAnimationRunning ? 'running' : 'paused',
                    willChange: isAnimationRunning ? 'transform' : 'auto',
                    '--marquee-duration': `${Math.max(6, charCount * 0.45 + 5)}s`
                } as React.CSSProperties}
            >
                {repeatedItems.map((item, idx) => (
                    <div
                        key={`${item.id || item.name}-${idx}`}
                        className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
                            isPerfLow
                                ? "bg-background/70 border-border/50 text-foreground/90"
                                : "bg-background/60 backdrop-blur-sm border-border/50 text-foreground/90",
                            "shadow-sm transition-colors hover:bg-accent/80",
                            itemClassName
                        )}
                    >
                        {item.name}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TagsMarquee
