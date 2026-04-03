import crypto from "crypto";

function cloudName() {
  return process.env.CLOUDINARY_CLOUD_NAME || "";
}

export function uploadConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export function createCloudinarySignature(params: Record<string, string>) {
  const secret = process.env.CLOUDINARY_API_SECRET || "";
  const toSign = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return crypto.createHash("sha1").update(`${toSign}${secret}`).digest("hex");
}

export function uploadConfigPayload(folder = "potterymania/products") {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { folder, timestamp };
  return {
    cloudName: cloudName(),
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    folder,
    timestamp,
    signature: createCloudinarySignature(params),
  };
}
