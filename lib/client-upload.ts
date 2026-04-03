"use client";

type SignedUpload = {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: string;
  signature: string;
};

export async function uploadImage(file: File, folder: string) {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
  const signed = (await signRes.json()) as SignedUpload & { error?: string };
  if (!signRes.ok) {
    throw new Error(signed.error || "Upload signing failed");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("folder", signed.folder);
  form.append("timestamp", signed.timestamp);
  form.append("signature", signed.signature);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(uploadJson.error?.message || "Upload failed");
  }
  return {
    secureUrl: uploadJson.secure_url as string,
    publicId: uploadJson.public_id as string,
  };
}
