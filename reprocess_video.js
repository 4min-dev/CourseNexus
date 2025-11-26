import { db } from './server/db.js';
import { lessons } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { videoQueue } from './server/videoQueue.js';

const lessonId = '887d8e8f-b8e5-49ab-8507-252adff373de';
const videoUrl = '/objects/.private/uploads/5bc0ed4e-44be-4d4f-81a4-6860dc5c047d';

console.log('Adding video to processing queue...');
await videoQueue.addToQueue(lessonId, videoUrl, 'video.mp4');
console.log('Video queued for processing');

process.exit(0);
