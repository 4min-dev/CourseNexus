import { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/useIsMobile"

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  color: string
}

interface PageNavigationProps {
  items: NavigationItem[]
}

export function PageNavigation({ items }: PageNavigationProps) {
  const [activeSection, setActiveSection] = useState("")
  const isMobile = useIsMobile()
  const rafIdRef = useRef<number | null>(null)
  const tickingRef = useRef(false)
  const lastEvalAtRef = useRef(0)

  const evaluateActiveSection = useCallback(() => {
    const scrollY = window.pageYOffset
    const viewportHeight = window.innerHeight
    const triggerPoint = scrollY + viewportHeight * 0.25

    let current = ""

    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i]
      const el = document.getElementById(item.id)
      if (el) {
        const top = el.getBoundingClientRect().top + scrollY
        if (top <= triggerPoint) {
          current = item.id
          break
        }
      }
    }

    if (scrollY < 100 && items.length > 0) {
      current = items[0].id
    }

    setActiveSection((prev) => (prev === current ? prev : current))
  }, [items])

  useEffect(() => {
    evaluateActiveSection()

    const runInRaf = () => {
      if (tickingRef.current) return
      const now = typeof performance !== "undefined" ? performance.now() : Date.now()
      const minInterval = isMobile ? 120 : 0
      if (minInterval > 0 && now - lastEvalAtRef.current < minInterval) return
      tickingRef.current = true

      rafIdRef.current = window.requestAnimationFrame(() => {
        evaluateActiveSection()
        lastEvalAtRef.current = typeof performance !== "undefined" ? performance.now() : Date.now()
        tickingRef.current = false
        rafIdRef.current = null
      })
    }

    window.addEventListener("scroll", runInRaf, { passive: true })
    window.addEventListener("resize", runInRaf)

    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      tickingRef.current = false
      window.removeEventListener("scroll", runInRaf)
      window.removeEventListener("resize", runInRaf)
    }
  }, [evaluateActiveSection, isMobile])

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      const navOffset = isMobile ? 140 : 200
      const top = el.getBoundingClientRect().top + window.pageYOffset - navOffset

      window.scrollTo({
        top,
        behavior: "smooth"
      })
    }
  }, [isMobile])

  if (items.length === 0) return null

  return (
    <nav className="z-[100] mb-6 sticky top-9 lg:top-20 transition-all duration-300 ease-out pt-2 bg-background/80 backdrop-blur-md border-b border-border/20">
      <div className="container mx-auto">
        <div className="flex items-center gap-1.5 lg:gap-3 overflow-x-auto px-2 lg:px-4 pb-3 lg:pb-4 pt-[2px] no-scrollbar scroll-smooth">
          {items.map(item => {
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "flex items-center gap-1 lg:gap-2 px-2.5 lg:px-4 py-1.5 lg:py-2.5 rounded-md lg:rounded-lg whitespace-nowrap transition-all duration-200 min-w-fit text-xs lg:text-sm",
                  isActive
                    ? `bg-gradient-to-r ${item.color} text-white font-semibold shadow-lg scale-105`
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("transition-transform duration-200 [&>svg]:h-3 [&>svg]:w-3 lg:[&>svg]:h-4 lg:[&>svg]:w-4", isActive && "scale-110")}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}