import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_LEDGER_IMAGE_BYTES = 5 * 1024 * 1024;

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const uploadRoot = process.env.LEDGER_UPLOAD_DIR ?? "/var/www/fura/uploads/ledger";

function storedFilePath(imagePath: string) {
  return `${uploadRoot}/${imagePath}`;
}

function hasValidSignature(buffer: Buffer, mime: string): boolean {
  if (mime === "image/jpeg")
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png")
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp")
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

export type StoredLedgerImage = {
  imagePath: string;
  imageName: string;
  imageMime: string;
};

export async function storeLedgerImage(
  value: FormDataEntryValue | null,
): Promise<{ image: StoredLedgerImage | null; error?: "invalid" | "tooLarge" }> {
  if (!(value instanceof File) || value.size === 0) return { image: null };
  if (value.size > MAX_LEDGER_IMAGE_BYTES) return { image: null, error: "tooLarge" };

  const extension = extensions[value.type];
  if (!extension) return { image: null, error: "invalid" };

  const buffer = Buffer.from(await value.arrayBuffer());
  if (!hasValidSignature(buffer, value.type)) return { image: null, error: "invalid" };

  const imagePath = `${randomUUID()}.${extension}`;
  await mkdir(uploadRoot, { recursive: true });
  await writeFile(storedFilePath(imagePath), buffer, { flag: "wx", mode: 0o640 });

  return {
    image: {
      imagePath,
      imageName: path.basename(value.name).slice(0, 255) || `receipt.${extension}`,
      imageMime: value.type,
    },
  };
}

export async function removeLedgerImage(imagePath: string | null | undefined) {
  if (!imagePath || path.basename(imagePath) !== imagePath) return;
  await unlink(storedFilePath(imagePath)).catch(() => undefined);
}

export async function readLedgerImage(imagePath: string): Promise<Buffer> {
  if (path.basename(imagePath) !== imagePath) throw new Error("Invalid image path");
  return readFile(storedFilePath(imagePath));
}
