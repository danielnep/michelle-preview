import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

// Área exclusiva dos originais enviados ao Power BI MC, no bucket do projeto.
const originalsFolder = "power-bi-mc/arquivos-enviados/originais/";

export function storedOriginalKey(file) {
  // Arquivos anteriores continuam acessíveis sem mover ou recriar seus objetos.
  return file.object_key || "originais/" + file.id;
}

export async function uploadOriginal(s3, bucket, id, bytes) {
  const objectKey = originalsFolder + id + "-" + randomUUID();
  await s3.send(new PutObjectCommand({
    Bucket: bucket, Key: objectKey, Body: bytes, ContentType: "application/octet-stream"
  }));
  return objectKey;
}

export function downloadOriginal(s3, bucket, file) {
  return s3.send(new GetObjectCommand({ Bucket: bucket, Key: storedOriginalKey(file) }));
}
