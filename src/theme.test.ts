import { describe, expect, it } from "vitest";
import { COLORS } from "./theme";

describe("theme", () => {
  it("uses the agreed palette", () => {
    expect(COLORS).toEqual({ accent: "#4DE1FF", ink: "#0A1630", text: "#FFFFFF" });
  });
});
