import { Readable } from "stream";

export interface BunnyStorageConfig {
  zone: string;
  apiKey: string;
  host: string;
}

export interface BunnyObjectMeta {
  contentLength?: number;
  contentType?: string | null;
}

export function getBunnyConfig(): BunnyStorageConfig {
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const apiKey = process.env.BUNNY_STORAGE_API_KEY;
  const configuredHost = process.env.BUNNY_STORAGE_HOST || "storage.bunnycdn.com";
  const apiHost =
    process.env.BUNNY_STORAGE_API_HOST ||
    (configuredHost.includes("b-cdn.net") ? "storage.bunnycdn.com" : configuredHost);

  if (!zone || !apiKey) {
    throw new Error("Bunny storage is not configured. Set BUNNY_STORAGE_ZONE and BUNNY_STORAGE_API_KEY.");
  }

  return { zone, apiKey, host: apiHost };
}

export function buildStorageUrl(objectPath: string): string {
  const { zone, host } = getBunnyConfig();
  const normalizedPath = objectPath.startsWith("/") ? objectPath.slice(1) : objectPath;
  return `https://${host}/${zone}/${normalizedPath}`;
}

export async function putObject({ path, body, contentType }: { path: string; body: Readable | Buffer; contentType?: string; }): Promise<void> {
  const { apiKey } = getBunnyConfig();
  const response = await fetch(buildStorageUrl(path), {
    method: "PUT",
    headers: {
      AccessKey: apiKey,
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to upload object to Bunny (${response.status}): ${text}`);
  }
}

export async function headObject(path: string): Promise<BunnyObjectMeta | null> {
  const { apiKey } = getBunnyConfig();
  const response = await fetch(buildStorageUrl(path), {
    method: "HEAD",
    headers: {
      AccessKey: apiKey,
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch object metadata (${response.status}): ${text}`);
  }

  const lengthStr = response.headers.get("content-length");
  const type = response.headers.get("content-type");

  return {
    contentLength: lengthStr ? parseInt(lengthStr, 10) : undefined,
    contentType: type,
  };
}

export async function fetchObject(path: string, range?: string): Promise<Response> {
  const { apiKey } = getBunnyConfig();
  return fetch(buildStorageUrl(path), {
    method: "GET",
    headers: {
      AccessKey: apiKey,
      ...(range ? { Range: range } : {}),
    },
  });
}

export async function deleteObject(path: string): Promise<void> {
  const { apiKey } = getBunnyConfig();
  const response = await fetch(buildStorageUrl(path), {
    method: "DELETE",
    headers: { AccessKey: apiKey },
  });

  if (response.status === 404) return;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to delete object (${response.status}): ${text}`);
  }
}
