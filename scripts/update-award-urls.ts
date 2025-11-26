import { db } from '../server/db';
import { awards } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Award title to image file mapping
const AWARD_IMAGE_MAPPING: Record<string, string> = {
  // Common
  '🚀 Начало пути': '/awards/Rocket_Launch_Holographic_Badge_d9c1aba0.png',
  '🎯 Избранное': '/awards/Target_Bullseye_Holographic_Badge_be5b6966.png',
  '🌙 Ночной совёнок': '/awards/Crescent_Moon_Holographic_Badge_9d1a22dd.png',
  '🌟 Первые шаги': '/awards/Radiant_Star_Holographic_Badge_e521a3ab.png',
  '📚 Первый урок': '/awards/Magic_Book_Holographic_Badge_4aa80dd5.png',
  '⏰ Ранняя пташка': '/awards/Alarm_Clock_Holographic_Badge_8fc774c9.png',
  '✍️ Критик': '/awards/Writing_Pen_Holographic_Badge_79f2169f.png',
  // Rare
  '🔥 Активный день': '/awards/Neon_Blue_Flame_Badge_63c09fcb.png',
  '📖 Библиотека знаний': '/awards/Neon_Library_Books_Badge_3917a998.png',
  '🏆 Коллекционер': '/awards/Neon_Trophy_Badge_6ddf5fe5.png',
  '💎 Коллекционер желаний': '/awards/Neon_Diamond_Gem_Badge_bec27b1b.png',
  '🎓 Начинающий студент': '/awards/Neon_Graduation_Cap_Badge_77e364d8.png',
  // Epic
  '💫 Мечтатель': '/awards/Cosmic_Sparkle_Purple_Badge_555874b2.png',
  '🎖️ Исследователь': '/awards/Epic_Medal_Purple_Badge_4a3ad937.png',
  '⚡ Знаток': '/awards/Epic_Lightning_Purple_Badge_805ec626.png',
  // Legendary
  '🔮 Гуру обучения': '/awards/Golden_Crystal_Orb_Badge_1bcb3197.png',
  '🌌 Легенда платформы': '/awards/Golden_Galaxy_Universe_Badge_90e4f307.png',
  '💪 Мастер завершений': '/awards/Golden_Champion_Trophy_Badge_622ec42f.png',
  '👑 Мастер обучения': '/awards/Golden_Royal_Crown_Badge_16eec4f6.png',
};

async function updateAwardUrls() {
  console.log('Updating award image URLs...');

  try {
    const allAwards = await db.select().from(awards);
    console.log(`Found ${allAwards.length} awards in database`);

    let updateCount = 0;

    for (const award of allAwards) {
      const imageUrl = AWARD_IMAGE_MAPPING[award.title];
      
      if (!imageUrl) {
        console.warn(`No image mapping found for award: ${award.title}`);
        continue;
      }

      await db
        .update(awards)
        .set({ imageUrl })
        .where(eq(awards.id, award.id));

      updateCount++;
      console.log(`✓ Updated: ${award.title} -> ${imageUrl}`);
    }

    console.log(`\n✅ Update complete! Updated ${updateCount} awards.`);
    process.exit(0);

  } catch (error) {
    console.error('Error updating award URLs:', error);
    process.exit(1);
  }
}

updateAwardUrls();
