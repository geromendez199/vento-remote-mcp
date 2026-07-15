import { describe, it, expect } from "vitest";
import { tokensMatch } from "../src/auth.js";

describe("tokensMatch", () => {
  it("matches identical tokens", () => {
    expect(tokensMatch("secret-token", "secret-token")).toBe(true);
  });

  it("rejects different tokens", () => {
    expect(tokensMatch("secret-token", "other-token")).toBe(false);
  });

  it("rejects tokens of different lengths without throwing", () => {
    expect(tokensMatch("short", "a-much-longer-token-value")).toBe(false);
  });

  it("rejects empty provided token", () => {
    expect(tokensMatch("", "expected")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(tokensMatch("Token", "token")).toBe(false);
  });
});
