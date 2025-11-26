CREATE TABLE "awards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text NOT NULL,
	"required_task_id" varchar,
	"rarity" varchar(20) DEFAULT 'common' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "balance_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" varchar,
	"name" text NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "course_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"lesson_id" varchar,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" varchar(50) NOT NULL,
	"file_size" integer,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_packages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"discount" integer DEFAULT 0 NOT NULL,
	"category_ids" text[],
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_request_votes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"vote" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_user_vote_per_request" UNIQUE("request_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "course_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"moderated_by" varchar,
	"moderated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_sections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_subcategories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"subcategory_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"user_id" varchar,
	"viewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"author_name" text,
	"author_bio" text,
	"author_image" text,
	"price" numeric(10, 2) DEFAULT '0',
	"thumbnail_image" text,
	"platform" varchar(50),
	"level" varchar(50),
	"year" integer,
	"keywords" text[],
	"is_free" boolean DEFAULT false NOT NULL,
	"is_vip_subscription" boolean DEFAULT false NOT NULL,
	"vip_tier" varchar(20),
	"rating" numeric(3, 2) DEFAULT '0',
	"reviews_count" integer DEFAULT 0 NOT NULL,
	"has_preview_lesson" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"course_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "filter_clicks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filter_type" varchar(50) NOT NULL,
	"filter_id" varchar,
	"filter_value" varchar(255),
	"user_id" varchar,
	"clicked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "info_banners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "landing_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hero_title" text DEFAULT 'Обучение для успешной работы в любых сферах' NOT NULL,
	"hero_subtitle" text DEFAULT 'Профессиональные курсы по маркетплейсам, бизнесу, IT, маркетингу и другим направлениям. Учитесь у экспертов, получайте реальные результаты и зарабатывайте!' NOT NULL,
	"hero_benefits" jsonb DEFAULT '["Экономия до 97% от официальной стоимости!","Курсы топовых спикеров за доступную цену","Бесплатные вводные уроки из ВСЕХ курсов","Реферальная программа - зарабатывай 30-45%"]'::jsonb NOT NULL,
	"hero_cta_primary" text DEFAULT 'Начать обучение бесплатно' NOT NULL,
	"hero_cta_secondary" text DEFAULT 'Войти в аккаунт' NOT NULL,
	"video_title" text DEFAULT 'Обзор платформы' NOT NULL,
	"video_description" text DEFAULT 'Смотрите презентацию и узнайте, как начать развиваться в любой сфере уже сегодня' NOT NULL,
	"video_url" text,
	"video_poster_url" text,
	"price_title" text DEFAULT 'Экономия до 97%' NOT NULL,
	"price_subtitle" text DEFAULT 'Курсы премиум-спикеров, которые официально стоят примерно 150 000 ₽, к примеру у нас цена будет составлять около 3 000 ₽' NOT NULL,
	"price_official" integer DEFAULT 150000 NOT NULL,
	"price_ours" integer DEFAULT 3000 NOT NULL,
	"price_advantages" jsonb DEFAULT '[{"title":"Топовые спикеры","description":"Курсы от самых известных и популярных экспертов рынка"},{"title":"Доступные цены","description":"Получите доступ к премиум-контенту за копейки"},{"title":"Максимальная выгода","description":"То же качество обучения - в 30 раз дешевле"}]'::jsonb NOT NULL,
	"free_title" text DEFAULT 'Начните обучение без вложений' NOT NULL,
	"free_subtitle" text DEFAULT 'Мы дали доступ к бесплатным материалам, чтобы вы могли оценить качество обучения' NOT NULL,
	"free_features" jsonb DEFAULT '[{"title":"Бесплатные вводные уроки","description":"Каждый курс имеет бесплатный вводный урок","points":["Смотрите вводные уроки из ВСЕХ курсов без ограничений","Оцените качество материалов и стиль преподавания","Выберите то, что подходит именно вам"]},{"title":"100% бесплатные курсы","description":"Полноценные курсы без необходимости платить!","points":["Доступны полные курсы по всем направлениям","В любой категории курсов есть актуальный материал, за который не нужно платить","Без скрытых платежей и ограничений"]}]'::jsonb NOT NULL,
	"features_title" text DEFAULT 'Всё необходимое для обучения' NOT NULL,
	"features_subtitle" text DEFAULT 'Мощная платформа с уникальными возможностями для эффективного обучения' NOT NULL,
	"platform_features" jsonb DEFAULT '[{"title":"Магазин курсов","description":"Огромный каталог курсов по любым направлениям: маркетплейсы, бизнес, IT, маркетинг, дизайн и многое другое. Фильтры по категориям, уровням и годам.","icon":"ShoppingBag"},{"title":"Личная библиотека","description":"Все купленные курсы в одном месте. Удобный доступ к урокам, прогресс обучения и закладки любимых курсов.","icon":"BookOpen"},{"title":"VIP пакеты","description":"Эксклюзивный доступ к десяткам премиум-курсов. 4 тарифа с разным количеством курсов на выбор.","icon":"Crown"},{"title":"Программа Trade-In","description":"Обменивайте свои курсы на новые. Получайте дополнительные бонусы при обмене премиум-курсов.","icon":"RefreshCcw"},{"title":"Система бонусов","description":"Зарабатывайте фантики за активность на платформе и получайте скидки на покупки. Чем активнее вы учитесь, тем больше экономите!","icon":"Gift"},{"title":"Реферальная программа","description":"Приглашайте друзей и зарабатывайте от 30% до 45% с их пополнений. Ваши друзья получают скидку 5% на первую покупку!","icon":"Users"}]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "landing_visits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" varchar NOT NULL,
	"session_id" varchar,
	"ip" varchar,
	"country" varchar,
	"city" varchar,
	"browser" varchar,
	"device" varchar,
	"os" varchar,
	"user_agent" text,
	"referer" text,
	"utm_source" varchar,
	"utm_medium" varchar,
	"utm_campaign" varchar,
	"visited_at" timestamp DEFAULT now(),
	"converted_to_registration" boolean DEFAULT false NOT NULL,
	"user_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"lesson_id" varchar NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"watched_seconds" integer DEFAULT 0,
	"last_accessed_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_user_lesson_progress" UNIQUE("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"video_url" text,
	"order" integer NOT NULL,
	"duration" integer,
	"processing_status" varchar(50) DEFAULT 'draft' NOT NULL,
	"upload_progress" integer DEFAULT 0,
	"error_message" text,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"href" text,
	"parent_id" varchar,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_external" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"related_id" varchar,
	"related_type" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "package_courses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" varchar NOT NULL,
	"course_id" varchar NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_package_course" UNIQUE("package_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"services" text NOT NULL,
	"contact_url" varchar(500) NOT NULL,
	"logo_url" varchar(500),
	"cover_image_url" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "program_purchases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"program_id" varchar NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"purchase_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"image_url" varchar(500),
	"download_url" varchar(1000) NOT NULL,
	"download_type" varchar(50) NOT NULL,
	"version" varchar(50),
	"size" varchar(100),
	"requirements" text,
	"is_free" boolean DEFAULT true NOT NULL,
	"price" numeric(10, 2) DEFAULT '0',
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"course_id" varchar NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"purchase_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar NOT NULL,
	"referred_user_id" varchar NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"earnings" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "review_votes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"vote_type" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_review_vote" UNIQUE("review_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"course_id" varchar NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"moderated_by" varchar,
	"moderated_at" timestamp,
	"moderation_comment" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logo_url" text,
	"site_name" text DEFAULT 'Курсы маркетплейсов' NOT NULL,
	"site_description" text DEFAULT 'Онлайн-курсы по маркетплейсам',
	"support_email" text DEFAULT 'support@example.com',
	"telegram_bot_username" text DEFAULT '',
	"telegram_bot_token" text DEFAULT '',
	"header_title" text,
	"header_subtitle" text,
	"referral_bonus_percent" integer DEFAULT 10 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" varchar NOT NULL,
	"name" text NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subcategories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"reward" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"difficulty" varchar(20) DEFAULT 'easy' NOT NULL,
	"required_level" integer DEFAULT 1 NOT NULL,
	"required_task_id" varchar,
	"target_value" integer DEFAULT 1 NOT NULL,
	"icon" varchar(50) DEFAULT 'trophy' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_repeatable" boolean DEFAULT false NOT NULL,
	"reset_period" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trade_in_page_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hero_badge_text" text DEFAULT 'Премиум программа обмена' NOT NULL,
	"hero_title" text DEFAULT 'Trade-In' NOT NULL,
	"hero_subtitle" text DEFAULT 'Обменяйте старые курсы' NOT NULL,
	"hero_description" text DEFAULT 'Превратите неактуальные знания в современные навыки. Принимаем курсы любых тематик и обмениваем на курсы из нашего каталога.' NOT NULL,
	"hero_cta_primary" text DEFAULT 'Написать в Telegram' NOT NULL,
	"hero_cta_secondary" text DEFAULT 'Узнать подробнее' NOT NULL,
	"hero_image1_title" text DEFAULT 'Выгодное партнёрство' NOT NULL,
	"hero_image1_description" text DEFAULT 'Обмен на взаимовыгодных условиях' NOT NULL,
	"hero_image2_title" text DEFAULT 'Довольные клиенты' NOT NULL,
	"hero_image2_description" text DEFAULT 'Более 1000 успешных обменов' NOT NULL,
	"how_works_badge_text" text DEFAULT 'Как это работает' NOT NULL,
	"how_works_title" text DEFAULT 'Процесс обмена за 4 шага' NOT NULL,
	"how_works_subtitle" text DEFAULT 'Простой и прозрачный процесс обмена ваших курсов' NOT NULL,
	"steps" jsonb DEFAULT '[{"icon":"MessageCircle","title":"Свяжитесь с нами","description":"Напишите нам в Telegram о курсах, которые хотите обменять","color":"from-purple-500 to-pink-500"},{"icon":"TrendingUp","title":"Оценка курсов","description":"Мы оценим ваши курсы и предложим лучшие варианты обмена","color":"from-pink-500 to-orange-500"},{"icon":"RefreshCw","title":"Выберите новый курс","description":"Выберите любой курс из нашего каталога для обмена","color":"from-orange-500 to-yellow-500"},{"icon":"CheckCircle","title":"Получите доступ","description":"Мгновенный доступ к новому курсу после подтверждения","color":"from-yellow-500 to-green-500"}]'::jsonb NOT NULL,
	"benefits_badge_text" text DEFAULT 'Преимущества' NOT NULL,
	"benefits_title" text DEFAULT 'Почему стоит обменять курсы с нами?' NOT NULL,
	"benefits" jsonb DEFAULT '[{"icon":"Gift","title":"Выгодный обмен","description":"Получите до 60% стоимости при обмене старых курсов"},{"icon":"Clock","title":"Быстрая обработка","description":"Оценка и обмен в течение 24 часов"},{"icon":"Shield","title":"Гарантия качества","description":"Все новые курсы проверены и актуальны"},{"icon":"Users","title":"Более 1000 обменов","description":"Присоединяйтесь к довольным клиентам"}]'::jsonb NOT NULL,
	"cta_title" text DEFAULT 'Готовы обменять курсы?' NOT NULL,
	"cta_description" text DEFAULT 'Напишите нам в Telegram, и наши специалисты помогут вам подобрать идеальный вариант обмена' NOT NULL,
	"cta_button_text" text DEFAULT 'Написать в Telegram' NOT NULL,
	"contact_telegram" text DEFAULT '@vkurse_support' NOT NULL,
	"contact_working_hours" text DEFAULT 'Пн-Пт 10:00-19:00 (МСК)' NOT NULL,
	"faq_title" text DEFAULT 'Условия обмена' NOT NULL,
	"faq_subtitle" text DEFAULT 'Основные правила программы Trade-In' NOT NULL,
	"faq_items" jsonb DEFAULT '[{"q":"Какие курсы можно обменять?","a":"Вы можете обменять любые онлайн-курсы любой тематики (маркетинг, дизайн, программирование, бизнес и др.), купленные на других платформах. Курсы должны быть актуальными (не старше 2 лет)."},{"q":"Как определяется стоимость обмена?","a":"Стоимость определяется индивидуально на основе актуальности курса, автора, популярности темы. В среднем вы получаете до 60% от рыночной стоимости курса."},{"q":"Сколько времени занимает обмен?","a":"Оценка курса занимает до 24 часов. После согласования условий доступ к новому курсу предоставляется мгновенно."},{"q":"Можно ли обменять несколько курсов сразу?","a":"Да, вы можете обменять любое количество курсов. При обмене 3+ курсов действуют специальные условия с повышенным процентом возврата."}]'::jsonb NOT NULL,
	"telegram_url" text DEFAULT 'https://t.me/vkurse_support' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_awards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"award_id" varchar NOT NULL,
	"earned_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_user_award" UNIQUE("user_id","award_id")
);
--> statement-breakpoint
CREATE TABLE "user_logins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"login_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"task_id" varchar NOT NULL,
	"current_progress" integer DEFAULT 0 NOT NULL,
	"target_value" integer DEFAULT 1 NOT NULL,
	"completed_at" timestamp,
	"reward_claimed" boolean DEFAULT false NOT NULL,
	"fantiks_earned" integer NOT NULL,
	"last_reset_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"password_hash" varchar,
	"telegram_id" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"selected_award_id" varchar,
	"phone_number" varchar,
	"telegram_username" varchar,
	"balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"referral_balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"fantiks" integer DEFAULT 0 NOT NULL,
	"referral_code" varchar,
	"promo_code" varchar,
	"referral_bonus_percent" integer,
	"referral_discount" integer DEFAULT 0 NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"landing_visit_id" varchar,
	"registration_ip" varchar,
	"registration_country" varchar,
	"registration_city" varchar,
	"registration_browser" varchar,
	"registration_device" varchar,
	"registration_os" varchar,
	"registration_user_agent" text,
	"last_activity_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code"),
	CONSTRAINT "users_promo_code_unique" UNIQUE("promo_code")
);
--> statement-breakpoint
CREATE TABLE "vip_packages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"tier" varchar(20) NOT NULL,
	"purchase_date" timestamp DEFAULT now(),
	"is_activated" boolean DEFAULT false NOT NULL,
	"current_year_limit" integer NOT NULL,
	"previous_years_limit" integer NOT NULL,
	"current_year_selected" integer DEFAULT 0 NOT NULL,
	"previous_years_selected" integer DEFAULT 0 NOT NULL,
	"referral_bonus_percent" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "vip_page_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_title" text DEFAULT 'VIP Подписки' NOT NULL,
	"page_subtitle" text DEFAULT 'Выберите подходящий тариф и получите эксклюзивный доступ к курсам, персональной поддержке и закрытым материалам для успешных селлеров' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vip_tiers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier" varchar(20) NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) DEFAULT '0',
	"features" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vip_tiers_tier_unique" UNIQUE("tier")
);
--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_required_task_id_tasks_id_fk" FOREIGN KEY ("required_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_files" ADD CONSTRAINT "course_files_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_files" ADD CONSTRAINT "course_files_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_request_votes" ADD CONSTRAINT "course_request_votes_request_id_course_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."course_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_request_votes" ADD CONSTRAINT "course_request_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_requests" ADD CONSTRAINT "course_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_requests" ADD CONSTRAINT "course_requests_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_subcategories" ADD CONSTRAINT "course_subcategories_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_subcategories" ADD CONSTRAINT "course_subcategories_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_views" ADD CONSTRAINT "course_views_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_views" ADD CONSTRAINT "course_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filter_clicks" ADD CONSTRAINT "filter_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_visits" ADD CONSTRAINT "landing_visits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_section_id_course_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_parent_id_menu_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_courses" ADD CONSTRAINT "package_courses_package_id_course_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."course_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_courses" ADD CONSTRAINT "package_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_purchases" ADD CONSTRAINT "program_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_purchases" ADD CONSTRAINT "program_purchases_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_required_task_id_tasks_id_fk" FOREIGN KEY ("required_task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_awards" ADD CONSTRAINT "user_awards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_awards" ADD CONSTRAINT "user_awards_award_id_awards_id_fk" FOREIGN KEY ("award_id") REFERENCES "public"."awards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_logins" ADD CONSTRAINT "user_logins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_landing_visit_id_landing_visits_id_fk" FOREIGN KEY ("landing_visit_id") REFERENCES "public"."landing_visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vip_packages" ADD CONSTRAINT "vip_packages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_awards_rarity" ON "awards" USING btree ("rarity");--> statement-breakpoint
CREATE INDEX "idx_awards_task" ON "awards" USING btree ("required_task_id");--> statement-breakpoint
CREATE INDEX "idx_balance_transactions_user_id" ON "balance_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_balance_transactions_created_at" ON "balance_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_balance_transactions_type" ON "balance_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_categories_parent" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_course_files_course" ON "course_files" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_files_lesson" ON "course_files" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_course_request_votes_request" ON "course_request_votes" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_course_request_votes_user" ON "course_request_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_course_requests_user" ON "course_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_course_requests_created" ON "course_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_course_requests_approved" ON "course_requests" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX "idx_course_requests_moderated" ON "course_requests" USING btree ("moderated_by");--> statement-breakpoint
CREATE INDEX "idx_course_sections_course" ON "course_sections" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_subcategories_course" ON "course_subcategories" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_subcategories_subcategory" ON "course_subcategories" USING btree ("subcategory_id");--> statement-breakpoint
CREATE INDEX "idx_course_views_course" ON "course_views" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_views_user" ON "course_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_course_views_date" ON "course_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "idx_courses_platform" ON "courses" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "idx_courses_year" ON "courses" USING btree ("year");--> statement-breakpoint
CREATE INDEX "idx_courses_level" ON "courses" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_courses_vip" ON "courses" USING btree ("is_vip_subscription");--> statement-breakpoint
CREATE INDEX "idx_courses_price" ON "courses" USING btree ("price");--> statement-breakpoint
CREATE INDEX "idx_courses_platform_vip" ON "courses" USING btree ("platform","is_vip_subscription");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_course_favorite" ON "favorites" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "idx_favorites_user" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_favorites_course" ON "favorites" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_filter_clicks_type" ON "filter_clicks" USING btree ("filter_type");--> statement-breakpoint
CREATE INDEX "idx_filter_clicks_filter_id" ON "filter_clicks" USING btree ("filter_id");--> statement-breakpoint
CREATE INDEX "idx_filter_clicks_filter_value" ON "filter_clicks" USING btree ("filter_value");--> statement-breakpoint
CREATE INDEX "idx_filter_clicks_date" ON "filter_clicks" USING btree ("clicked_at");--> statement-breakpoint
CREATE INDEX "idx_filter_clicks_type_value" ON "filter_clicks" USING btree ("filter_type","filter_value");--> statement-breakpoint
CREATE INDEX "idx_landing_visits_fingerprint" ON "landing_visits" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "idx_landing_visits_visited_at" ON "landing_visits" USING btree ("visited_at");--> statement-breakpoint
CREATE INDEX "idx_landing_visits_converted" ON "landing_visits" USING btree ("converted_to_registration");--> statement-breakpoint
CREATE INDEX "idx_landing_visits_user_id" ON "landing_visits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_lesson_progress_user" ON "lesson_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_lesson_progress_lesson" ON "lesson_progress" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_lessons_section" ON "lessons" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_is_read" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_type" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_package_courses_package" ON "package_courses" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "idx_package_courses_course" ON "package_courses" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_partners_display_order" ON "partners" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "idx_partners_is_active" ON "partners" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_program_unique" ON "program_purchases" USING btree ("user_id","program_id");--> statement-breakpoint
CREATE INDEX "idx_program_purchases_user_id" ON "program_purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_program_purchases_program_id" ON "program_purchases" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "idx_program_purchases_purchase_date" ON "program_purchases" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX "idx_programs_category" ON "programs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_programs_is_active" ON "programs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_programs_display_order" ON "programs" USING btree ("display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_course_unique" ON "purchases" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "idx_purchases_user_id" ON "purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_purchases_course_id" ON "purchases" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_purchases_purchase_date" ON "purchases" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX "idx_referrals_referrer_id" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "idx_referrals_referred_user_id" ON "referrals" USING btree ("referred_user_id");--> statement-breakpoint
CREATE INDEX "idx_referrals_created_at" ON "referrals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_referrals_status" ON "referrals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_review_votes_review" ON "review_votes" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_course" ON "reviews" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_user_course" ON "reviews" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_status" ON "reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_subcategories_category" ON "subcategories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_type" ON "tasks" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_tasks_category" ON "tasks" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_tasks_difficulty" ON "tasks" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_user_awards_user" ON "user_awards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_awards_award" ON "user_awards" USING btree ("award_id");--> statement-breakpoint
CREATE INDEX "idx_user_logins_user_id" ON "user_logins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_logins_date" ON "user_logins" USING btree ("login_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_logins_user_date" ON "user_logins" USING btree ("user_id",DATE("login_date"));--> statement-breakpoint
CREATE INDEX "idx_user_tasks_user" ON "user_tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_tasks_task" ON "user_tasks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_user_tasks_user_task" ON "user_tasks" USING btree ("user_id","task_id");--> statement-breakpoint
CREATE INDEX "idx_users_last_activity" ON "users" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "idx_users_created_at" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_users_landing_visit" ON "users" USING btree ("landing_visit_id");--> statement-breakpoint
CREATE INDEX "idx_vip_packages_user" ON "vip_packages" USING btree ("user_id");