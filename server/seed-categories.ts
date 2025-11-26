import { db } from "./db";
import { categories, subcategories, siteSettings, menuItems } from "@shared/schema";
import { eq } from "drizzle-orm";
import { seedTasks } from "./seed-tasks";

export async function seedInitialData() {
  console.log("Seeding initial categories...");

  // Create site settings ONLY IF they don't exist (prevent duplicates)
  const existingSettings = await db.select().from(siteSettings).limit(1);
  
  if (existingSettings.length === 0) {
    await db.insert(siteSettings).values({
      siteName: "Курсы маркетплейсов",
      logoUrl: null,
      headerTitle: "Обучление продажам на маркетплейсах",
      headerSubtitle: "Wildberries, Ozon, Яндекс.Маркет",
      referralBonusPercent: 10,
    }).returning();
  }

  // Create or get Wildberries category
  let [wb] = await db.insert(categories).values({
    name: "Wildberries",
    nameEn: "wildberries",
    slug: "wb",
    displayOrder: 1,
    isActive: true,
  }).onConflictDoNothing().returning();
  
  // If category already exists, fetch it
  if (!wb) {
    const existing = await db.select().from(categories).where(eq(categories.slug, "wb")).limit(1);
    wb = existing[0];
  }

  if (wb) {
    await db.insert(subcategories).values([
      { categoryId: wb.id, name: "Для новичков", nameEn: "beginner", slug: "beginner-wb", displayOrder: 1 },
      { categoryId: wb.id, name: "Для опытных", nameEn: "intermediate", slug: "intermediate-wb", displayOrder: 2 },
      { categoryId: wb.id, name: "Продвинутый", nameEn: "advanced", slug: "advanced-wb", displayOrder: 3 },
    ]).onConflictDoNothing();
  }

  // Create or get Ozon category
  let [ozon] = await db.insert(categories).values({
    name: "Ozon",
    nameEn: "ozon",
    slug: "ozon",
    displayOrder: 2,
    isActive: true,
  }).onConflictDoNothing().returning();
  
  // If category already exists, fetch it
  if (!ozon) {
    const existing = await db.select().from(categories).where(eq(categories.slug, "ozon")).limit(1);
    ozon = existing[0];
  }

  if (ozon) {
    await db.insert(subcategories).values([
      { categoryId: ozon.id, name: "Для новичков", nameEn: "beginner", slug: "beginner-ozon", displayOrder: 1 },
      { categoryId: ozon.id, name: "Для опытных", nameEn: "intermediate", slug: "intermediate-ozon", displayOrder: 2 },
      { categoryId: ozon.id, name: "Продвинутый", nameEn: "advanced", slug: "advanced-ozon", displayOrder: 3 },
    ]).onConflictDoNothing();
  }

  // Create or get Yandex Market category
  let [yandex] = await db.insert(categories).values({
    name: "Яндекс.Маркет",
    nameEn: "yandex",
    slug: "yandex",
    displayOrder: 3,
    isActive: true,
  }).onConflictDoNothing().returning();
  
  // If category already exists, fetch it
  if (!yandex) {
    const existing = await db.select().from(categories).where(eq(categories.slug, "yandex")).limit(1);
    yandex = existing[0];
  }

  if (yandex) {
    await db.insert(subcategories).values([
      { categoryId: yandex.id, name: "Для новичков", nameEn: "beginner", slug: "beginner-yandex", displayOrder: 1 },
      { categoryId: yandex.id, name: "Для опытных", nameEn: "intermediate", slug: "intermediate-yandex", displayOrder: 2 },
      { categoryId: yandex.id, name: "Продвинутый", nameEn: "advanced", slug: "advanced-yandex", displayOrder: 3 },
      { categoryId: yandex.id, name: "Премиум", nameEn: "premium", slug: "premium-yandex", displayOrder: 4 },
    ]).onConflictDoNothing();
  }

  // Create or get Design category
  let [design] = await db.insert(categories).values({
    name: "Дизайн",
    nameEn: "design",
    slug: "design",
    displayOrder: 4,
    isActive: true,
  }).onConflictDoNothing().returning();
  
  if (!design) {
    const existing = await db.select().from(categories).where(eq(categories.slug, "design")).limit(1);
    design = existing[0];
  }

  // Create child categories for Design
  let [infographics] = await db.insert(categories).values({
    name: "Инфографика",
    nameEn: "infographics",
    slug: "infographics",
    parentId: design?.id,
    displayOrder: 1,
    isActive: true,
  }).onConflictDoNothing().returning();
  
  if (!infographics) {
    const existing = await db.select().from(categories).where(eq(categories.slug, "infographics")).limit(1);
    infographics = existing[0];
  }

  if (infographics) {
    await db.insert(subcategories).values([
      { categoryId: infographics.id, name: "Для новичков", nameEn: "beginner", slug: "beginner-infographics", displayOrder: 1 },
      { categoryId: infographics.id, name: "Для опытных", nameEn: "intermediate", slug: "intermediate-infographics", displayOrder: 2 },
      { categoryId: infographics.id, name: "Продвинутый", nameEn: "advanced", slug: "advanced-infographics", displayOrder: 3 },
      { categoryId: infographics.id, name: "Премиум", nameEn: "premium", slug: "premium-infographics", displayOrder: 4 },
    ]).onConflictDoNothing();
  }

  let [photoshop] = await db.insert(categories).values({
    name: "Фотошоп",
    nameEn: "photoshop",
    slug: "photoshop",
    parentId: design?.id,
    displayOrder: 2,
    isActive: true,
  }).onConflictDoNothing().returning();
  
  if (!photoshop) {
    const existing = await db.select().from(categories).where(eq(categories.slug, "photoshop")).limit(1);
    photoshop = existing[0];
  }

  if (photoshop) {
    await db.insert(subcategories).values([
      { categoryId: photoshop.id, name: "Для новичков", nameEn: "beginner", slug: "beginner-photoshop", displayOrder: 1 },
      { categoryId: photoshop.id, name: "Для опытных", nameEn: "intermediate", slug: "intermediate-photoshop", displayOrder: 2 },
      { categoryId: photoshop.id, name: "Продвинутый", nameEn: "advanced", slug: "advanced-photoshop", displayOrder: 3 },
      { categoryId: photoshop.id, name: "Премиум", nameEn: "premium", slug: "premium-photoshop", displayOrder: 4 },
    ]).onConflictDoNothing();
  }

  // Create or get AI category
  let [ai] = await db.insert(categories).values({
    name: "Искусственный интеллект",
    nameEn: "artificial-intelligence",
    slug: "artificial-intelligence",
    displayOrder: 5,
    isActive: true,
  }).onConflictDoNothing().returning();
  
  if (!ai) {
    const existing = await db.select().from(categories).where(eq(categories.slug, "artificial-intelligence")).limit(1);
    ai = existing[0];
  }

  // Create child category for AI
  let [ii] = await db.insert(categories).values({
    name: "ИИ",
    nameEn: "ii",
    slug: "ii",
    parentId: ai?.id,
    displayOrder: 1,
    isActive: true,
  }).onConflictDoNothing().returning();
  
  if (!ii) {
    const existing = await db.select().from(categories).where(eq(categories.slug, "ii")).limit(1);
    ii = existing[0];
  }

  if (ii) {
    await db.insert(subcategories).values([
      { categoryId: ii.id, name: "Для новичков", nameEn: "beginner", slug: "beginner-ii", displayOrder: 1 },
      { categoryId: ii.id, name: "Для опытных", nameEn: "intermediate", slug: "intermediate-ii", displayOrder: 2 },
      { categoryId: ii.id, name: "Продвинутый", nameEn: "advanced", slug: "advanced-ii", displayOrder: 3 },
      { categoryId: ii.id, name: "Премиум", nameEn: "premium", slug: "premium-ii", displayOrder: 4 },
    ]).onConflictDoNothing();
  }

  // Add Premium subcategory to existing marketplace categories
  if (wb) {
    await db.insert(subcategories).values([
      { categoryId: wb.id, name: "Премиум", nameEn: "premium", slug: "premium-wb", displayOrder: 4 },
    ]).onConflictDoNothing();
  }

  if (ozon) {
    await db.insert(subcategories).values([
      { categoryId: ozon.id, name: "Премиум", nameEn: "premium", slug: "premium-ozon", displayOrder: 4 },
    ]).onConflictDoNothing();
  }

  // Create menu items only if they don't exist
  const existingMenuItems = await db.select().from(menuItems);
  
  if (existingMenuItems.length === 0) {
    await db.insert(menuItems).values([
      { label: "Магазин", href: "/shop", displayOrder: 1, isActive: true, isExternal: false },
      { label: "Библиотека", href: "/library", displayOrder: 2, isActive: true, isExternal: false },
      { label: "Бонусы", href: "/bonuses", displayOrder: 3, isActive: true, isExternal: false },
    ]);
  }

  // Seed tasks
  await seedTasks();

  console.log("Initial data seeded successfully!");
}
