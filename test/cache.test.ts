import { describe, it, expect, vi, afterEach } from "vitest";
import { TtlCache } from "../src/cache.js";

describe("TtlCache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves values", () => {
    const cache = new TtlCache<string>(1000);
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("returns undefined for missing keys", () => {
    const cache = new TtlCache<string>(1000);
    expect(cache.get("nope")).toBeUndefined();
  });

  it("expires entries after TTL", () => {
    vi.useFakeTimers();
    const cache = new TtlCache<string>(1000);
    cache.set("key", "value");
    vi.advanceTimersByTime(1001);
    expect(cache.get("key")).toBeUndefined();
  });

  it("respects per-entry TTL override", () => {
    vi.useFakeTimers();
    const cache = new TtlCache<string>(1000);
    cache.set("long", "value", 5000);
    vi.advanceTimersByTime(2000);
    expect(cache.get("long")).toBe("value");
  });

  it("deletes by prefix", () => {
    const cache = new TtlCache<number>(1000);
    cache.set("boards:1", 1);
    cache.set("boards:1:cards", 2);
    cache.set("boards:2", 3);
    cache.deletePrefix("boards:1");
    expect(cache.get("boards:1")).toBeUndefined();
    expect(cache.get("boards:1:cards")).toBeUndefined();
    expect(cache.get("boards:2")).toBe(3);
  });

  it("evicts oldest entry at capacity", () => {
    const cache = new TtlCache<number>(1000, 2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.size).toBe(2);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("clears all entries", () => {
    const cache = new TtlCache<number>(1000);
    cache.set("a", 1);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
