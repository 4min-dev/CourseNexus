// server/s3Client.ts
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: 'ru-central1',
    endpoint: 'https://storage.yandexcloud.net',
    credentials: {
        accessKeyId: process.env.NOWCDN_KEY!,
        secretAccessKey: process.env.NOWCDN_SECRET!,
    },
});

export { s3Client };