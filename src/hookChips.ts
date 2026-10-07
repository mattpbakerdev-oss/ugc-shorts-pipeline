export const splitHook = (title: string): string[] => {
  const parts = title.split("//").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 1 || parts.length > 3) {
    throw new Error(`Hook "${title}" must split on "//" into 1-3 chips, got ${parts.length}`);
  }
  return parts;
};
