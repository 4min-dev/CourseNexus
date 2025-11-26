## Overview

"В Курсе ?" is an online educational platform offering a wide range of courses across various disciplines like e-commerce, business, IT, and design. Its purpose is to provide a high-quality user experience through features like course discovery and purchase, referral programs, a dual-mode interface, and modern design. The platform aims to be a comprehensive educational hub, enhancing learning accessibility and engagement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend uses React, TypeScript, Vite, Wouter, TanStack Query, and Tailwind CSS with shadcn/ui. It features a "New York" dark mode theme with purple accents, Steam-inspired hierarchical category navigation, and card-based course displays. Responsive design is prioritized, including mobile adaptations with `SwipeableCarousel` and `MobileNavDrawer`. Visuals include frosted glass login/registration pages and parallax backgrounds, with performance optimized through careful CSS and animation management. Header navigation is consolidated into hover-activated dropdown menus. Global CSS optimizations are implemented for GPU acceleration of `backdrop-filter` rendering in Opera GX, ensuring smooth performance with glass-morphism effects.

A comprehensive Help/Support page (`/help`) provides detailed user guidance with accordion sections covering all platform features. This page includes a dedicated "Complaints and Suggestions" section with full support contact information (email: support@vkurse.ru, Telegram: @vkurse_support, phone: +7 (999) 123-45-67), copyright holder contact procedures, and structured guidance for submitting complaints or suggestions to technical support.

### Technical Implementations

The backend is built with Express.js and TypeScript, connected to Neon Serverless PostgreSQL via Drizzle ORM. Authentication supports email/password, Telegram 2FA (via bot verification codes), and Replit Auth (OpenID Connect), all session-based. The RESTful API includes logging, error handling, and Zod validation. **Logout Optimization**: The system intelligently detects authentication type via token presence (`id_token`/`access_token`) to optimize logout flow. Local users (email/password, Telegram) skip the OIDC end-session redirect chain for instant logout (<100ms), while OIDC users (Replit Auth) complete the full provider logout flow to properly terminate upstream sessions.

A polling-based Telegram bot system handles account linking, 2FA, and password recovery. Users can link Telegram during registration or from their profile by sending `/start` to the bot and entering a received code. The system uses Telegram user ID as a fallback if no username is set. 2FA is automatically enabled for linked accounts, sending a 6-digit code to Telegram for login verification. **2FA Modes**: Admins configure Telegram 2FA through `/admin/settings` with three modes: (1) **Disabled** - Telegram not required or prompted; (2) **Optional (Recommended)** - Yellow modal suggests linking, can be dismissed; (3) **Mandatory** - Registration blocks without valid Telegram code, shop page forces connection modal. Server validates `require2FA === 'mandatory'` to enforce blocking, allowing optional/disabled modes to proceed without codes. **Password Reset**: Users can reset their password through a two-step flow accessed via "Забыли пароль?" link on the login page. Step 1: User enters email on `/reset-password` page, system validates email and Telegram linkage, then automatically sends a 6-digit code to their Telegram. Step 2: User enters the received code and new password on the same page. The system verifies via `/api/auth/reset-password` endpoint and updates the password. A persistent modal reminds users without linked Telegram accounts to connect, highlighting benefits like security and notifications. Security features include SHA-256 code hashing, in-memory session management, single-use codes with TTL, rate limiting (max 5 verification attempts), bcrypt password hashing, and anti-abuse protection via unique `telegramChatId` constraints.

All platform notifications are duplicated to Telegram for linked accounts, covering purchase confirmations, review updates, Sniper requests, admin broadcasts, and new lesson alerts. A smart lesson notification system groups new lesson alerts by course, sending a single consolidated notification after a 30-minute delay to prevent spam during bulk uploads.

**Automated Re-engagement System:** An engagement scheduler identifies and re-engages inactive users through creative Russian-language Telegram messages sent daily at 12:00 Moscow time (UTC+3). The system tracks user activity via the `lastActivityAt` field (updated by global middleware with 1-minute throttling) and sends personalized notifications at three inactivity milestones: 1 week ("давненько не виделись"), 2 weeks ("уже две недели без тебя"), and 1 month ("целый месяц!"). Each message is randomly selected from a pool of 4 creative variants per milestone, maintaining an engaging and non-repetitive tone. Users receive only ONE notification at their highest inactivity level (e.g., a user inactive for 1 month receives only the "1_month" notification, not all three). The `engagementNotifications` table prevents duplicate sends, ensuring users receive each notification type only once. The system respects Telegram rate limits with 100ms delays between sends and only targets users with linked Telegram accounts. **Run Tracking:** The scheduler uses the `schedulerRuns` table to track daily execution with status tracking (running/completed/failed), preventing duplicate sends even after server restarts or mid-run failures. A unique constraint on scheduler name and run date ensures exactly-once daily execution, with automatic handling of concurrent process conflicts.

Dynamic SEO is implemented with a `useSEO` hook and `SEOManager` component, automatically updating `<title>`, meta description, and Open Graph tags from admin-configurable site settings.

**Landing Visit Conversion Tracking:** The `useLandingVisit` hook automatically tracks user journeys from landing page to registration. On mount, it calls `POST /api/landing/track-visit` (server extracts IP/geo/browser metadata via `extractVisitorMetadata`), caches the returned `visitId` in sessionStorage with timestamp, and forwards UTM parameters from URL. During registration, `landingVisitId` is included in the payload, linking `users.landing_visit_id` to the `landing_visits` record. Upon successful registration, the backend calls `updateLandingVisitConversion(visitId, userId)` to set `converted_to_registration = true` and link `user_id`, enabling conversion analytics. The hook's `clearVisitId()` prevents ID reuse across accounts. Analytics queries track total visits, unique visitors (by fingerprint), conversions, conversion rate, top countries/browsers/devices, and UTM campaign performance.

**Referral Tracking System:** A centralized `useReferralTracking` hook manages referral code propagation across the landing→registration flow. The system validates referral codes (8 alphanumeric characters, uppercase), stores them in localStorage with metadata (code, source, capturedAt) and a 7-day TTL, and implements strict precedence rules (current URL parameter > fresh localStorage > legacy storage). All landing page registration buttons automatically include referral parameters via `getRegisterUrl()`, ensuring codes persist across navigation. Registration pages sync with the tracking system and clear codes upon successful registration. The implementation prevents accidental overwrites, handles iOS Safari's aggressive memory management, and supports both URL propagation and direct code entry.

### Feature Specifications

*   **Course Management:** A comprehensive catalog with filtering, VIP packages, bundles, and a favorites system. Admins control course visibility. Courses utilize a 3-tier hierarchical category system (parent → child → level) supporting multi-subcategory assignment. Purchases support dual-balance deduction (referral first, then main balance) with concurrency guards. A Fantik pricing system allows courses to be priced in traditional currency, platform currency (Fantiks), or both.
*   **Course Packages System:** Admin-managed course bundles with discounts and hierarchical category assignment for filtering.
*   **User Engagement & Monetization:** Includes a referral system (30% default bonus), "Fantiks" bonus currency, and a Tasks & Achievements system.
*   **Content & Media:** WYSIWYG editors, Replit Object Storage for files, and FFmpeg for video processing (streaming, watermarking).
*   **Interaction & Experience:** A course review system with moderation, "frequently bought together" recommendations, interactive landing page elements, and animated purchase confirmations.
*   **Admin & Analytics:** An admin panel for content management, unified moderation, and analytics for user engagement, revenue, and performance, including landing visitor and filter popularity tracking. Admin purchase management allows viewing, refunding, and granting courses.
*   **Sniper System:** Allows users to request courses, which are then moderated and voted upon.
*   **Notifications System:** User notification center with pagination for purchase confirmations, subscriptions, and Sniper request updates.
*   **Partners System:** Public catalog of partners with detail pages and full CRUD operations via the admin panel.
*   **Programs Marketplace:** An auxiliary marketplace for software tools (free or paid) with download access, detailed pages, reviews, and integration into the user's library. Payment uses user balance (main + referral) with full Fantik payment support matching the course system: programs can be priced in traditional currency only (`money_only`), Fantiks only (`fantiks_only`), or both (`both`). When paying with money, users can apply up to 20% Fantiks discount. When paying with Fantiks, the full price is deducted from user's Fantik balance. Purchases award 1% of the money price as bonus Fantiks. All purchases flow through the program detail page dialog with payment method selection.

### System Design Choices

*   **Database Schema:** Comprehensive tables for users, courses, purchases, referrals, and a hierarchical category system.
*   **Database Stability & Performance:** Connection pooling, graceful shutdown, automatic reconnection, transactional safety, and analytics indexing.
*   **API Design:** RESTful API with Zod validation.
*   **Tracking Infrastructure:** Browser fingerprint-based deduplication, session IDs, conversion tracking, and UTM parameter extraction. Category popularity is tracked via filter clicks and used for dynamic sorting, with data cached for performance.

## External Dependencies

### Third-Party Services

*   **Replit Authentication:** OpenID Connect provider.
*   **Neon Database:** Serverless PostgreSQL hosting.
*   **Google Cloud Storage:** Used by Replit Object Storage.

### UI Component Libraries

*   **Radix UI Primitives:** Foundational UI components.
*   **shadcn/ui:** Component library built on Radix UI and Tailwind CSS.

### Utility Libraries

*   **class-variance-authority:** For component variants.
*   **clsx, tailwind-merge:** For CSS class management.
*   **cmdk:** For command palette functionality.
*   **date-fns:** For date formatting.
*   **zod:** For runtime schema validation.
*   **drizzle-zod:** For schema-to-validator conversion.