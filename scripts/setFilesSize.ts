import { db } from "../server/db" // твой drizzle или knex/pg клиент
import { courseFiles } from "../shared/schema"
import { eq, isNull } from "drizzle-orm"

async function backfillFileSizes() {
    console.log("Запуск заполнения размеров файлов...")

    const files = await db
        .select()
        .from(courseFiles)
        .where(isNull(courseFiles.fileSize))

    console.log(`Найдено записей без размера: ${files.length}`)

    let updated = 0
    let failed = 0

    for (const file of files) {
        if (!file.fileUrl) {
            console.warn(`Нет URL у файла ${file.id} — ${file.fileName}`)
            failed++
            continue
        }

        try {
            const res = await fetch(file.fileUrl, { method: "HEAD" })

            if (!res.ok) {
                throw new Error(`HEAD ${res.status} ${res.statusText}`)
            }

            const sizeHeader = res.headers.get("content-length")

            if (!sizeHeader) {
                throw new Error("Нет заголовка Content-Length")
            }

            const size = Number(sizeHeader)

            if (isNaN(size) || size <= 0) {
                throw new Error(`Некорректный размер: ${sizeHeader}`)
            }

            await db
                .update(courseFiles)
                .set({ fileSize: size })
                .where(eq(courseFiles.id, file.id))

            console.log(`Обновлён ${file.fileName} → ${size} байт (${(size / 1024 / 1024).toFixed(2)} MB)`)
            updated++
        } catch (err) {
            console.error(`Ошибка для ${file.fileName} (${file.fileUrl}):`, err)
            failed++
        }

        // небольшая задержка, чтобы не нагружать CDN
        await new Promise(r => setTimeout(r, 400))
    }

    console.log(`\nИтог: обновлено ${updated}, ошибок ${failed}`)
    process.exit(0)
}

backfillFileSizes().catch(err => {
    console.error("Критическая ошибка:", err)
    process.exit(1)
})