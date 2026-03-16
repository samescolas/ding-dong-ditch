import fs from "fs";
import type { Response } from "express";
import type { Readable } from "stream";
import type { StorageBackend, RecordingMetadata } from "./backend.js";

// Types for @aws-sdk/client-s3 (dynamically imported)
type S3Client = import("@aws-sdk/client-s3").S3Client;

export class S3StorageBackend implements StorageBackend {
  private client: S3Client;
  private bucket: string;
  private prefix: string;

  constructor(client: S3Client, bucket: string, prefix: string) {
    this.client = client;
    this.bucket = bucket;
    this.prefix = prefix;
  }

  static async create(): Promise<S3StorageBackend> {
    const { S3Client } = await import("@aws-sdk/client-s3");

    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error("S3_BUCKET is required when STORAGE_BACKEND=s3");

    const client = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
    });

    const prefix = process.env.S3_PREFIX || "";
    return new S3StorageBackend(client, bucket, prefix);
  }

  private fullKey(key: string): string {
    return this.prefix + key;
  }

  async persist(localPath: string, key: string): Promise<void> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");

    const stream = fs.createReadStream(localPath);
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: this.fullKey(key),
      Body: stream,
      ContentType: "video/mp4",
    }));

    // Remove temp file after successful upload
    fs.unlinkSync(localPath);
  }

  async list(): Promise<RecordingMetadata[]> {
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");

    const results: RecordingMetadata[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: this.prefix,
        ContinuationToken: continuationToken,
      }));

      for (const obj of response.Contents || []) {
        if (!obj.Key || !obj.Key.endsWith(".mp4")) continue;

        // Strip prefix and parse: YYYY-MM-DD/Camera_Name/HH-MM-SS.mp4
        const relKey = this.prefix ? obj.Key.slice(this.prefix.length) : obj.Key;
        const parts = relKey.split("/");
        if (parts.length !== 3) continue;

        const [date, camera, file] = parts;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

        results.push({
          date,
          camera,
          file,
          path: relKey,
          size: obj.Size || 0,
          created: obj.LastModified || new Date(),
        });
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    // Sort newest first (matches local backend behavior)
    results.sort((a, b) => b.path.localeCompare(a.path));
    return results;
  }

  async serve(key: string, res: Response): Promise<void> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");

    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: this.fullKey(key),
      }));

      if (!response.Body) {
        res.status(404).json({ error: "not found" });
        return;
      }

      res.setHeader("Content-Type", response.ContentType || "video/mp4");
      if (response.ContentLength) {
        res.setHeader("Content-Length", response.ContentLength);
      }

      const stream = response.Body as Readable;
      stream.pipe(res);
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err.name === "NoSuchKey") {
        res.status(404).json({ error: "not found" });
        return;
      }
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");

    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: this.fullKey(key),
    }));
  }

  async deleteOlderThan(cutoffDate: string): Promise<void> {
    const { ListObjectsV2Command, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");

    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: this.prefix,
        ContinuationToken: continuationToken,
      }));

      const toDelete: { Key: string }[] = [];

      for (const obj of response.Contents || []) {
        if (!obj.Key) continue;
        const relKey = this.prefix ? obj.Key.slice(this.prefix.length) : obj.Key;
        const datePart = relKey.split("/")[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart) && datePart < cutoffDate) {
          toDelete.push({ Key: obj.Key });
        }
      }

      // Batch delete (max 1000 per call)
      while (toDelete.length > 0) {
        const batch = toDelete.splice(0, 1000);
        await this.client.send(new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch },
        }));
        console.log(`[cleanup] deleted ${batch.length} objects older than ${cutoffDate}`);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
  }
}
