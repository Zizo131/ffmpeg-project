import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../server.js";
import { parseYoutubeUrl, validateQuality } from "../utils/validateUrl.js";

describe("URL and input security", () => {
  it.each([
    "file:///etc/passwd",
    "http://localhost:3000",
    "https://127.0.0.1/watch?v=AAAAAAAAAAA",
    "https://youtube.com/watch?v=AAAAAAAAAAA&list=PL123",
    "https://youtube.com/watch?v=--exec",
    "https://user:pass@youtube.com/watch?v=AAAAAAAAAAA",
    "https://youtube.com:443/watch?v=AAAAAAAAAAA",
    "https://youtube.com/watch?v=AAAAAAAAAAA%00"
  ])("rejects malicious URL %s", (value) => {
    expect(parseYoutubeUrl(value)).toBeNull();
  });

  it("canonicalizes only valid video IDs", () => {
    expect(parseYoutubeUrl("https://youtu.be/BoUXljpfMHI?si=abc")).toEqual({
      id: "BoUXljpfMHI",
      canonicalUrl: "https://www.youtube.com/watch?v=BoUXljpfMHI"
    });
  });

  it("whitelists quality values", () => {
    expect(validateQuality("standard")).toBe("standard");
    expect(validateQuality("hd")).toBe("hd");
    expect(validateQuality("--exec")).toBeNull();
  });

  it("rejects oversized JSON payloads", async () => {
    const response = await request(app).post("/api/unknown").send({ value: "x".repeat(2048) });
    expect(response.status).toBe(413);
  });

  it("rejects unauthorized origins", async () => {
    const response = await request(app).get("/api/info").set("Origin", "https://evil.example").query({ url: "https://youtu.be/BoUXljpfMHI" });
    expect(response.status).toBe(403);
  });

  it("sets defensive API headers", async () => {
    const response = await request(app).get("/api/info").query({ url: "file:///etc/passwd" });
    expect(response.status).toBe(400);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
  });
});
