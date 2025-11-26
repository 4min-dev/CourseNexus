import { Response } from "express";
import { randomUUID } from "crypto";
import path from "path";
import {
  ObjectAclPolicy,
  ObjectPermission,
  StoredObject,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";
import { buildStorageUrl, deleteObject as deleteBunnyObject, fetchObject, getBunnyConfig, headObject } from "./bunnyStorage";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

interface BunnyObjectMeta {
  contentLength?: number;
  contentType?: string | null;
}

export class ObjectStorageService {
  constructor() {}

  private getConfig() {
    return getBunnyConfig();
  }

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Configure a bucket path and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Configure a bucket path and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<StoredObject | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const normalized = this.normalizeStoragePath(fullPath);
      const meta = await headObject(normalized);
      if (meta) {
        return { path: normalized };
      }
    }

    return null;
  }

  private normalizeStoragePath(raw: string): string {
    if (raw.startsWith("/")) return raw.slice(1);
    return raw;
  }

  async downloadObject(file: StoredObject, res: Response, cacheTtlSec: number = 3600, req?: any) {
    try {
      const meta = await headObject(file.path);
      if (!meta) {
        throw new ObjectNotFoundError();
      }
      const isPublic = file.path.includes("/public/");
      const fileSize = meta.contentLength ?? 0;
      const range = req?.headers?.range;

      if (range && fileSize > 0) {
        const parts = range.replace(/bytes=/, "").split("-");
        let start: number;
        let end: number;

        if (parts[0] === "" && parts[1]) {
          const suffixLength = parseInt(parts[1], 10);
          if (isNaN(suffixLength) || suffixLength <= 0) {
            res.status(416);
            res.set({ "Content-Range": `bytes */${fileSize}` });
            return res.end();
          }
          start = Math.max(0, fileSize - suffixLength);
          end = fileSize - 1;
        } else {
          start = parseInt(parts[0], 10);
          end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

          if (isNaN(start) || (parts[1] && isNaN(end))) {
            res.status(416);
            res.set({ "Content-Range": `bytes */${fileSize}` });
            return res.end();
          }

          start = Math.max(0, start);
          end = Math.min(fileSize - 1, end);
        }

        if (start > end || start >= fileSize) {
          res.status(416);
          res.set({ "Content-Range": `bytes */${fileSize}` });
          return res.end();
        }

        const chunkSize = end - start + 1;
        res.status(206);
        res.set({
          "Content-Type": meta.contentType || "application/octet-stream",
          "Content-Length": chunkSize.toString(),
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
        });

        const response = await fetchObject(file.path, `bytes=${start}-${end}`);
        if (!response.ok || !response.body) {
          throw new Error(`Failed to fetch object range: ${response.status}`);
        }

        const nodeStream = response.body as unknown as NodeJS.ReadableStream;
        nodeStream.on("error", (err) => {
          console.error("Stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error streaming file" });
          }
        });

        nodeStream.pipe(res);
      } else {
        res.set({
          "Content-Type": meta.contentType || "application/octet-stream",
          "Content-Length": fileSize?.toString() || "0",
          "Accept-Ranges": "bytes",
          "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
        });

        const response = await fetchObject(file.path);
        if (!response.ok || !response.body) {
          throw new Error(`Failed to fetch object: ${response.status}`);
        }

        const nodeStream = response.body as unknown as NodeJS.ReadableStream;
        nodeStream.on("error", (err) => {
          console.error("Stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error streaming file" });
          }
        });

        nodeStream.pipe(res);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(options?: {
    pathSegments?: string[];
    fileName?: string;
  }): Promise<{ uploadURL: string; headers: Record<string, string> }> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Configure a bucket path and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const safeSegments = [
      privateObjectDir,
      "uploads",
      ...(options?.pathSegments || []).map((segment) => this.sanitizePathSegment(segment)),
    ].filter((segment) => segment && segment.length > 0);

    const safeFileName = this.buildSafeFileName(options?.fileName);
    const fullPath = `${safeSegments.join("/")}/${safeFileName}`;
    const uploadURL = buildStorageUrl(fullPath);

    return { uploadURL, headers: { AccessKey: this.getConfig().apiKey } };
  }

  async getPublicObjectUploadURL(options?: {
    pathSegments?: string[];
    fileName?: string;
  }): Promise<{ uploadURL: string; headers: Record<string, string> }> {
    const publicPaths = this.getPublicObjectSearchPaths();
    if (publicPaths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Configure a bucket path and set PUBLIC_OBJECT_SEARCH_PATHS env var."
      );
    }

    const safeSegments = [
      publicPaths[0],
      ...(options?.pathSegments || []).map((segment) => this.sanitizePathSegment(segment)),
    ].filter((segment) => segment && segment.length > 0);

    const safeFileName = this.buildSafeFileName(options?.fileName);
    const fullPath = `${safeSegments.join("/")}/${safeFileName}`;

    return {
      uploadURL: buildStorageUrl(fullPath),
      headers: { AccessKey: this.getConfig().apiKey },
    };
  }

  async getObjectEntityFile(objectPath: string): Promise<StoredObject> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");

    let objectEntityPath: string;
    if (entityId.startsWith("public/")) {
      const publicPaths = this.getPublicObjectSearchPaths();
      const publicPath = publicPaths[0];
      objectEntityPath = `${publicPath}/${entityId.substring(7)}`;
    } else if (entityId.startsWith(".private/")) {
      let entityDir = this.getPrivateObjectDir();
      objectEntityPath = `${entityDir}/${entityId.substring(9)}`;
    } else {
      let entityDir = this.getPrivateObjectDir();
      objectEntityPath = `${entityDir}/${entityId}`;
    }

    const normalized = this.normalizeStoragePath(objectEntityPath);
    const meta = await headObject(normalized);
    if (!meta) {
      throw new ObjectNotFoundError();
    }
    return { path: normalized };
  }

  private transliterate(text: string): string {
    const map: Record<string, string> = {
      "а": "a",
      "б": "b",
      "в": "v",
      "г": "g",
      "д": "d",
      "е": "e",
      "ё": "yo",
      "ж": "zh",
      "з": "z",
      "и": "i",
      "й": "y",
      "к": "k",
      "л": "l",
      "м": "m",
      "н": "n",
      "о": "o",
      "п": "p",
      "р": "r",
      "с": "s",
      "т": "t",
      "у": "u",
      "ф": "f",
      "х": "h",
      "ц": "ts",
      "ч": "ch",
      "ш": "sh",
      "щ": "sch",
      "ъ": "",
      "ы": "y",
      "ь": "",
      "э": "e",
      "ю": "yu",
      "я": "ya",
      "А": "A",
      "Б": "B",
      "В": "V",
      "Г": "G",
      "Д": "D",
      "Е": "E",
      "Ё": "Yo",
      "Ж": "Zh",
      "З": "Z",
      "И": "I",
      "Й": "Y",
      "К": "K",
      "Л": "L",
      "М": "M",
      "Н": "N",
      "О": "O",
      "П": "P",
      "Р": "R",
      "С": "S",
      "Т": "T",
      "У": "U",
      "Ф": "F",
      "Х": "H",
      "Ц": "Ts",
      "Ч": "Ch",
      "Ш": "Sh",
      "Щ": "Sch",
      "Ъ": "",
      "Ы": "Y",
      "Ь": "",
      "Э": "E",
      "Ю": "Yu",
      "Я": "Ya",
    };

    return text
      .split("")
      .map((char) => map[char] || char)
      .join("");
  }

  private sanitizePathSegment(input: string): string {
    const transliterated = this.transliterate(input || "");
    const normalized = transliterated
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    const sanitized = normalized
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "")
      .trim();

    return sanitized || "unnamed";
  }

  private buildSafeFileName(originalName?: string): string {
    if (!originalName) {
      return randomUUID();
    }

    const extension = path.extname(originalName);
    const baseName = originalName.slice(0, Math.max(0, originalName.length - extension.length));
    const safeBase = this.sanitizePathSegment(baseName);
    const uniqueSuffix = randomUUID();

    return `${safeBase}-${uniqueSuffix}${extension ? extension.toLowerCase() : ""}`;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("http")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.includes(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(rawObjectPath.indexOf(objectEntityDir) + objectEntityDir.length);
    return `/objects/.private/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: StoredObject;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  async deleteObjectEntity(objectPath: string): Promise<void> {
    if (!objectPath) {
      return;
    }

    try {
      const objectFile = await this.getObjectEntityFile(objectPath);
      await deleteBunnyObject(objectFile.path);
      console.log(`[ObjectStorage] Deleted file: ${objectPath}`);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        console.log(`[ObjectStorage] File not found (already deleted?): ${objectPath}`);
        return;
      }
      console.error(`[ObjectStorage] Error deleting file ${objectPath}:`, error);
      throw error;
    }
  }
}

export function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}
