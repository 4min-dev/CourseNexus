import { buildStorageUrl, getBunnyConfig, headObject, putObject } from "./bunnyStorage";

const ACL_POLICY_METADATA_KEY = "custom:aclPolicy";

export interface StoredObject {
  path: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
}

function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }
  return granted === ObjectPermission.WRITE;
}

function getAclPath(path: string) {
  return `${path}.acl.json`;
}

export async function setObjectAclPolicy(
  objectFile: StoredObject,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  const meta = await headObject(objectFile.path);
  if (!meta) {
    throw new Error(`Object not found: ${objectFile.path}`);
  }

  const payload = Buffer.from(JSON.stringify(aclPolicy), "utf8");
  await putObject({ path: getAclPath(objectFile.path), body: payload, contentType: "application/json" });
}

export async function getObjectAclPolicy(
  objectFile: StoredObject,
): Promise<ObjectAclPolicy | null> {
  try {
    const response = await fetch(buildStorageUrl(getAclPath(objectFile.path)), {
      headers: { AccessKey: getBunnyConfig().apiKey },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to read ACL: ${text}`);
    }

    const json = await response.json();
    return json as ObjectAclPolicy;
  } catch (error) {
    console.error("Failed to get ACL policy", error);
    return null;
  }
}

export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
}: {
  userId?: string;
  objectFile: StoredObject;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }

  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  if (!userId) {
    return false;
  }

  if (aclPolicy.owner === userId) {
    return true;
  }

  return false;
}
