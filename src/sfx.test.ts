import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SFX_NAMES } from "./types";

const dir = path.dirname(fileURLToPath(import.meta.url));

describe("sfx kit", () => {
  for (const name of SFX_NAMES) {
    it(`public/sfx/${name}.wav exists`, () => {
      expect(fs.existsSync(path.resolve(dir, "../public/sfx", name + ".wav"))).toBe(true);
    });
  }
});
