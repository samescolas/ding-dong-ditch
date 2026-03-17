export function isAiEnabled(): boolean {
  return process.env.AI_ENABLED === "true";
}

function getConfig() {
  return {
    enabled: process.env.AI_ENABLED === "true",
    apiUrl: process.env.AI_API_URL || "",
    apiKey: process.env.AI_API_KEY || "",
    model: process.env.AI_MODEL || "gpt-4o",
    prompt:
      process.env.AI_PROMPT ||
      "Describe what you see in this security camera image in one concise sentence.",
  };
}

import { log } from "../logger.js";

function validateUrl(url: string): void {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`AI_API_URL must use http or https protocol, got ${parsed.protocol}`);
  }
}

export async function describeSnapshot(
  imageBuffer: Buffer,
  cameraName: string,
): Promise<string> {
  const fallback = `Motion detected on ${cameraName}`;
  const config = getConfig();

  if (!config.enabled) {
    return fallback;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const endpoint = `${config.apiUrl}/chat/completions`;
    validateUrl(endpoint);

    const base64 = imageBuffer.toString("base64");
    const dataUri = `data:image/jpeg;base64,${base64}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: config.prompt },
              { type: "image_url", image_url: { url: dataUri } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      log.warn(
        `[ai] ${cameraName}: API returned ${response.status} ${response.statusText}`,
      );
      return fallback;
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const description = data.choices?.[0]?.message?.content?.trim();
    if (!description) {
      log.warn(`[ai] ${cameraName}: empty response from API`);
      return fallback;
    }

    log.info(`[ai] ${cameraName}: ${description}`);
    return description;
  } catch (e) {
    log.warn(
      `[ai] ${cameraName}: failed: ${(e as Error).message}`,
    );
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
