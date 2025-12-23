import { S3Client } from "@aws-sdk/client-s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: "ru-central-1",
    endpoint: "https://s3.ru-central-1.nowcdn.co",
    credentials: {
        accessKeyId: process.env.CDNNOW_KEY!,
        secretAccessKey: process.env.CDNNOW_SECRET!,
    },
    forcePathStyle: true,
});

const BUCKET_NAME = process.env.NOWCDN_BUCKET!;

export async function deleteFromCDNNow(objectKey: string): Promise<void> {
    if (!objectKey) return;

    try {
        let key = objectKey;

        if (objectKey.includes("nowcdn.co")) {
            const url = new URL(objectKey);
            key = url.pathname.slice(1);
            if (key.startsWith("vkurse/")) {
                key = key.slice(7);
            }
        }

        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);
        console.log(`[CDNNow] Успешно удалён файл: ${key}`);
    } catch (error: any) {
        if (error.name === "NoSuchKey") {
            console.log(`[CDNNow] Файл уже удалён или не существует: ${objectKey}`);
            return;
        }
        console.error(`[CDNNow] Ошибка удаления файла ${objectKey}:`, error);
        throw error;
    }
}