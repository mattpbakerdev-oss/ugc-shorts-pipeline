/** Plain integers get en-GB thousands separators; anything else ("3x", "1.5", "1,000") is left alone. */
export const formatBigValue = (value: string | number, prefix = ""): string => {
  const s = String(value);
  const body = /^-?\d+$/.test(s) ? Number(s).toLocaleString("en-GB") : s;
  return `${prefix}${body}`;
};
