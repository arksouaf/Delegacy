import { describe, it, expect } from "vitest";
import { parseDuration } from "../src/utils/pda";

describe("parseDuration", () => {
  it("parses seconds", () => {
    expect(parseDuration("30s")).toBe(30);
  });

  it("parses minutes", () => {
    expect(parseDuration("5m")).toBe(300);
  });

  it("parses hours", () => {
    expect(parseDuration("24h")).toBe(86_400);
  });

  it("parses days", () => {
    expect(parseDuration("7d")).toBe(604_800);
  });

  it("parses weeks", () => {
    expect(parseDuration("1w")).toBe(604_800);
  });

  it("throws on invalid format", () => {
    expect(() => parseDuration("abc")).toThrow("Invalid duration");
  });
});
