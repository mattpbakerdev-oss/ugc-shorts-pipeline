import { describe, expect, it } from "vitest";
import { formatBigValue } from "./format";

describe("formatBigValue", () => {
  it("adds a prefix and thousands separators", () => {
    expect(formatBigValue("500000", "$")).toBe("$500,000");
    expect(formatBigValue(1000000)).toBe("1,000,000");
  });
  it("leaves small and non-integer values alone", () => {
    expect(formatBigValue("10")).toBe("10");
    expect(formatBigValue("3x")).toBe("3x");
    expect(formatBigValue("1.5")).toBe("1.5");
    expect(formatBigValue("$500,000")).toBe("$500,000");
  });
});

import { bigNumber, counter } from "../storyboard/dsl";
describe("dsl prefix", () => {
  it("carries prefix on bigNumber and counter", () => {
    expect(bigNumber(500000, "X", { prefix: "$" })).toEqual({ kind: "bigNumber", value: "500000", label: "X", prefix: "$" });
    expect(counter(0, 1_000_000, "F", { prefix: "$" })).toMatchObject({ prefix: "$" });
    expect(bigNumber(3, "X")).not.toHaveProperty("prefix");
  });
});
