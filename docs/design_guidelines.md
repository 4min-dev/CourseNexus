# Design Guidelines: Course Marketplace Platform

## Design Approach
**Reference-Based Design** drawing inspiration from:
- **Steam** - File-tree navigation and game library patterns
- **Udemy/Skillshare** - Course card displays and detail pages
- **Modern E-commerce** - Clean product presentation and trust signals

Key Principles: Professional credibility, intuitive navigation, visual course emphasis, efficient information hierarchy

## Color Palette

### Dark Mode (Primary)
- **Background Base**: 220 20% 12% (deep slate background)
- **Surface**: 220 18% 18% (elevated cards/panels)
- **Surface Elevated**: 220 16% 22% (modals, dropdowns)
- **Primary Brand**: 265 85% 62% (vibrant purple for CTAs and accents)
- **Primary Hover**: 265 85% 68%
- **Text Primary**: 0 0% 98%
- **Text Secondary**: 220 10% 70%
- **Border**: 220 15% 28%
- **Success**: 142 70% 55% (purchase confirmations)
- **Warning**: 38 92% 50% (bonuses, rewards)

### Light Mode (Secondary)
- **Background Base**: 0 0% 98%
- **Surface**: 0 0% 100%
- **Primary Brand**: 265 75% 52%
- **Text Primary**: 220 20% 15%
- **Text Secondary**: 220 10% 45%

## Typography
- **Primary Font**: Inter (Google Fonts) - clean, professional
- **Headings**: 'Inter', weight 700
  - H1: 2.5rem (40px) - Course titles on detail pages
  - H2: 1.875rem (30px) - Section headers
  - H3: 1.5rem (24px) - Category names, card titles
  - H4: 1.25rem (20px) - Subsection headers
- **Body**: 'Inter', weight 400, 1rem (16px)
- **Small Text**: 0.875rem (14px) for metadata, pricing
- **Button Text**: weight 600

## Layout System

### Spacing Primitives
Use Tailwind units: **2, 3, 4, 6, 8, 12, 16, 20** for consistent spacing
- Micro spacing: p-2, gap-3
- Standard spacing: p-4, p-6, m-8
- Section spacing: py-12, py-16, py-20

### Grid Structure
- **Left Navigation Tree**: Fixed width 280px (w-70), sticky positioning
- **Main Content Area**: flex-1 with max-w-7xl container
- **Course Grid**: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- **Admin Panel**: Split layout - file tree left (320px), content editor right

### Responsive Breakpoints
- Mobile: Single column, collapsible navigation drawer
- Tablet (md:): 2-column course grid
- Desktop (lg:): Full navigation tree + 3-column grid
- Wide (xl:): 4-column grid for course cards

## Component Library

### Navigation
- **Top Header** (h-16): Logo left, search bar center (max-w-xl), navigation links right, user avatar/balance
- **File Tree Navigation**: 
  - Collapsible folder structure with indent levels (pl-4, pl-8, pl-12)
  - Icons: folder (closed/open), course file
  - Hover state: bg-surface with transition
  - Active category: border-l-4 border-primary

### Course Cards
- **Card Structure**: 
  - Aspect ratio 16:9 course thumbnail
  - Course title (font-semibold, truncate after 2 lines)
  - Author with avatar (flex items-center gap-2)
  - Category badges (text-xs, rounded-full)
  - Price (text-2xl font-bold) + "Add to Cart" button
  - Hover: scale-105 transform, shadow-xl elevation

### Course Detail Page
- **Hero Section** (h-80): Course banner image with gradient overlay
- **Content Layout**: 2-column (lg:) - left: video/images + description, right: sticky purchase card
- **Author Card**: Avatar (w-16 h-16), name, bio, course count
- **Curriculum Accordion**: Expandable sections with lesson counts

### Forms & Inputs
- **Input Fields**: 
  - h-12 rounded-lg border-2 border-border
  - Focus: ring-2 ring-primary border-primary
  - Dark background (bg-surface) with light text
- **Buttons**:
  - Primary: bg-primary text-white h-12 px-6 rounded-lg font-semibold
  - Secondary: border-2 border-primary text-primary (with backdrop-blur-sm if over images)
  - Icon buttons: w-10 h-10 rounded-full

### Admin Panel
- **File System UI**:
  - Breadcrumb navigation (Home > Marketplaces > WB > 2025)
  - Drag-and-drop course upload area
  - Rich text editor for descriptions (Tiptap-style toolbar)
  - Multi-image uploader with preview grid
  - Category selector with nested checkboxes

### Bonuses Section
- **Referral Card**: Gradient background (purple to blue), referral link copy button, earnings display
- **Task Cards**: Icon + title + reward amount (in "фантики"), progress bar, claim button

### Profile Page
- **Info Grid**: 2-column (md:) cards for personal info, balance widget prominent (larger card)
- **Balance Top-up**: Modal with amount presets, payment method selection

## Search & Filters
- **Search Bar**: 
  - Icon left (magnifying glass), input center, keyboard shortcut hint (⌘K)
  - Autocomplete dropdown with course thumbnails + quick category filters
- **Filter Sidebar**: Collapsible panels for Platform, Level, Year with checkboxes

## Images
- **Hero Images**: Not applicable - focus on course thumbnails and content
- **Course Thumbnails**: High-quality images (16:9) showing course content/platform logos
- **Author Avatars**: Circular, consistent sizing (w-12 h-12 for cards, w-16 h-16 for detail pages)
- **Category Icons**: Custom SVG icons for WB, Ozon, other platforms (use placeholder comments)
- **Empty States**: Illustration placeholders for empty library, no search results

## Interactions & Animations
- **Minimal Animation**: Only subtle hover states (scale, opacity changes)
- **Loading States**: Skeleton screens for course cards, shimmer effect
- **Transitions**: duration-200 ease-in-out for most interactions
- **No Scroll Animations**: Focus on instant, responsive UI

## Accessibility
- Consistent dark mode throughout including all inputs
- Minimum contrast ratio 4.5:1 for text
- Focus indicators on all interactive elements
- Skip to content link for keyboard navigation
- ARIA labels for icon-only buttons