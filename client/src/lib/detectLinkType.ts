interface LinkMeta {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    favicon?: string;
    type?: "link" | "google-sheets" | "google-docs" | "youtube" | "figma" | "notion" | "github";
}

export function detectLinkType(url: string): LinkMeta["type"] {
    if (url.includes("docs.google.com/spreadsheets")) return "google-sheets";
    if (url.includes("docs.google.com/document")) return "google-docs";
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
    if (url.includes("figma.com")) return "figma";
    if (url.includes("notion.so")) return "notion";
    if (url.includes("github.com")) return "github";
    return "link";
}