import type { GraphicSpec, IconName, Storyboard } from "../types";
import { validateStoryboard } from "./validate";

export const video = (sb: Storyboard): Storyboard => {
  validateStoryboard(sb);
  return sb;
};

export const bigNumber = (value: string | number, label: string, opts: { prefix?: string } = {}): GraphicSpec =>
  ({ kind: "bigNumber", value: String(value), label, ...(opts.prefix ? { prefix: opts.prefix } : {}) });

export const punchList = (items: string[], opts: { pick?: number; strike?: number[] } = {}): GraphicSpec =>
  ({ kind: "punchList", items, ...opts });

export const iconStack = (icons: IconName[]): GraphicSpec => ({ kind: "iconStack", icons });

export const ctaSaveShare = (): GraphicSpec => ({ kind: "ctaSaveShare" });

export const counter = (from: number, to: number, label: string, opts: { prefix?: string } = {}): GraphicSpec =>
  ({ kind: "counter", from, to, label, ...(opts.prefix ? { prefix: opts.prefix } : {}) });

export const flashCard = (word: string): GraphicSpec => ({ kind: "flashCard", word });
