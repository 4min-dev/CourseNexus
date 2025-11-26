import { Storage } from '@google-cloud/storage';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { db } from '../server/db';
import { awards } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Award title to image file mapping
const AWARD_IMAGE_MAPPING: Record<string, string> = {
  // Common
  '🚀 Начало пути': 'Rocket_Launch_Holographic_Badge_d9c1aba0.png',
  '🎯 Избранное': 'Target_Bullseye_Holographic_Badge_be5b6966.png',
  '🌙 Ночной совёнок': 'Crescent_Moon_Holographic_Badge_9d1a22dd.png',
  '🌟 Первые шаги': 'Radiant_Star_Holographic_Badge_e521a3ab.png',
  '📚 Первый урок': 'Magic_Book_Holographic_Badge_4aa80dd5.png',
  '⏰ Ранняя пташка': 'Alarm_Clock_Holographic_Badge_8fc774c9.png',
  '✍️ Критик': 'Writing_Pen_Holographic_Badge_79f2169f.png',
  // Rare
  '🔥 Активный день': 'Neon_Blue_Flame_Badge_63c09fcb.png',
  '📖 Библиотека знаний': 'Neon_Library_Books_Badge_3917a998.png',
  '🏆 Коллекционер': 'Neon_Trophy_Badge_6ddf5fe5.png',
  '💎 Коллекционер желаний': 'Neon_Diamond_Gem_Badge_bec27b1b.png',
  '🎓 Начинающий студент': 'Neon_Graduation_Cap_Badge_77e364d8.png',
  // Epic
  '💫 Мечтатель': 'Cosmic_Sparkle_Purple_Badge_555874b2.png',
  '🎖️ Исследователь': 'Epic_Medal_Purple_Badge_4a3ad937.png',
  '⚡ Знаток': 'Epic_Lightning_Purple_Badge_805ec626.png',
  // Legendary
  '🔮 Гуру обучения': 'Golden_Crystal_Orb_Badge_1bcb3197.png',
  '🌌 Легенда платформы': 'Golden_Galaxy_Universe_Badge_90e4f307.png',
  '💪 Мастер завершений': 'Golden_Champion_Trophy_Badge_622ec42f.png',
  '👑 Мастер обучения': 'Golden_Royal_Crown_Badge_16eec4f6.png',
};

async function uploadAwardImages() {
  console.log('Starting award image upload...');

  // Initialize Google Cloud Storage
  const storage = new Storage();
  const bucketName = process.env.BUCKET_ID || 'your-bucket-name';
  const bucket = storage.bucket(bucketName);

  const sourceDir = join(process.cwd(), 'attached_assets', 'generated_images');
  
  try {
    // Get all awards from database
    const allAwards = await db.select().from(awards);
    console.log(`Found ${allAwards.length} awards in database`);

    let uploadCount = 0;
    let updateCount = 0;

    for (const award of allAwards) {
      const imageFileName = AWARD_IMAGE_MAPPING[award.title];
      
      if (!imageFileName) {
        console.warn(`No image mapping found for award: ${award.title}`);
        continue;
      }

      const localFilePath = join(sourceDir, imageFileName);
      const storageFilePath = `public/awards/${imageFileName}`;

      try {
        // Read the file
        const fileBuffer = await readFile(localFilePath);
        
        // Upload to storage
        const file = bucket.file(storageFilePath);
        await file.save(fileBuffer, {
          metadata: {
            contentType: 'image/png',
            cacheControl: 'public, max-age=31536000',
          },
          public: true,
        });

        uploadCount++;
        console.log(`✓ Uploaded: ${imageFileName}`);

        // Generate public URL
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${storageFilePath}`;

        // Update database
        await db
          .update(awards)
          .set({ imageUrl: publicUrl })
          .where(eq(awards.id, award.id));

        updateCount++;
        console.log(`✓ Updated DB for: ${award.title}`);

      } catch (error) {
        console.error(`✗ Error processing ${award.title}:`, error);
      }
    }

    console.log(`\n✅ Upload complete!`);
    console.log(`   Uploaded: ${uploadCount} images`);
    console.log(`   Updated: ${updateCount} database records`);

  } catch (error) {
    console.error('Error uploading award images:', error);
    process.exit(1);
  }
}

uploadAwardImages();
