import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { describeSnapshot } from "./describe.js";

beforeEach(() => {
  vi.stubEnv("AI_ENABLED", "false");
  vi.stubEnv("AI_API_URL", "http://localhost:8080/v1");
  vi.stubEnv("AI_API_KEY", "");
  vi.stubEnv("AI_MODEL", "test-model");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const fakeImage = Buffer.from("fake-image-data");

describe("ai/describe", () => {
  it("returns fallback when AI is disabled", async () => {
    const result = await describeSnapshot(fakeImage, "Front Door");
    expect(result).toBe("Motion detected on Front Door");
  });

  it("calls the API and returns description when enabled", async () => {
    vi.stubEnv("AI_ENABLED", "true");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "A person walking to the door." } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await describeSnapshot(fakeImage, "Front Door");

    expect(result).toBe("A person walking to the door.");
    expect(mockFetch).toHaveBeenCalledOnce();

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe("http://localhost:8080/v1/chat/completions");
    const body = JSON.parse(callArgs[1].body);
    expect(body.model).toBe("test-model");
  });

  it("includes Authorization header when API key is set", async () => {
    vi.stubEnv("AI_ENABLED", "true");
    vi.stubEnv("AI_API_KEY", "sk-test123");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "A cat on the porch." } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await describeSnapshot(fakeImage, "Back Yard");

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Authorization"]).toBe("Bearer sk-test123");
  });

  it("returns fallback on API error response", async () => {
    vi.stubEnv("AI_ENABLED", "true");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    }));

    const result = await describeSnapshot(fakeImage, "Garage");
    expect(result).toBe("Motion detected on Garage");
  });

  it("returns fallback on network error", async () => {
    vi.stubEnv("AI_ENABLED", "true");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const result = await describeSnapshot(fakeImage, "Garage");
    expect(result).toBe("Motion detected on Garage");
  });

  it("returns fallback when API returns empty choices", async () => {
    vi.stubEnv("AI_ENABLED", "true");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    }));

    const result = await describeSnapshot(fakeImage, "Side Gate");
    expect(result).toBe("Motion detected on Side Gate");
  });

  it("returns fallback for invalid URL protocol", async () => {
    vi.stubEnv("AI_ENABLED", "true");
    vi.stubEnv("AI_API_URL", "file:///etc/passwd");

    const result = await describeSnapshot(fakeImage, "Front Door");
    expect(result).toBe("Motion detected on Front Door");
  });
});
