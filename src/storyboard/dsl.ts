import type { GraphicSpec, IconName, Storyboard } from "../types";
import { validateStoryboard } from "./validate";

export const video = (sb: Storyboard): Storyboard => {
  validateStoryboard(sb);
  return sb;
};

export const bigNumber = (value: string | number, label: string): GraphicSpec =>
  ({ kind: "bigNumber", value: String(value), label });

export const punchList = (items: string[], opts: { pick?: number; strike?: number[] } = {}): GraphicSpec =>
  ({ kind: "punchList", items, ...opts });

export const iconStack = (icons: IconName[]): GraphicSpec => ({ kind: "iconStack", icons });

export const counter = (from: number, to: number, label: string): GraphicSpec =>
  ({ kind: "counter", from, to, label });

export const flashCard = (word: string): GraphicSpec => ({ kind: "flashCard", word });
