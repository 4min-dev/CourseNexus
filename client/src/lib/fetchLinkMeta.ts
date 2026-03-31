import { detectLinkType } from "./detectLinkType"
import { getDomain } from "./getDomain"

interface LinkMeta {
    url: string
    title?: string
    description?: string
    image?: string
    siteName?: string
    favicon?: string
    type?: "link" | "google-sheets" | "google-docs" | "youtube" | "figma" | "notion" | "github"
}

export async function fetchLinkMeta(url: string): Promise<LinkMeta> {
    const isGoogle = url.includes('docs.google.com') || url.includes('sheets.google.com')

    try {
        let endpoint = isGoogle ? '/api/og-google' : '/api/og'

        const res = await fetch(`${endpoint}?url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error('Meta fetch failed')

        const data = await res.json()

        if (data.error) {
            return {
                url,
                type: detectLinkType(url),
                title: data.fallback.title,
                description: data.fallback.description,
                image: data.fallback.image,
                siteName: data.fallback.siteName,
                favicon: data.fallback.favicon,
            }
        }

        return {
            url,
            type: detectLinkType(url),
            title: data.title,
            description: data.description,
            image: data.image,
            siteName: data.siteName,
            favicon: data.favicon,
        }
    } catch (err) {
        console.error('[fetchLinkMeta]', err)
        const domain = getDomain(url)
        return {
            url,
            type: "link",
            siteName: domain,
            title: `Страница на ${domain}`,
            description: `Материал с сайта ${domain}`,
            favicon: `https://www.google.com/s2/favicons?domain=${url}&sz=32`,
        }
    }
}