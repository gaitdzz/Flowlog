export const parseTags = (tags?: string | null): string[] => {
  if (!tags) return [];
  try {
    const arr = JSON.parse(tags);
    return Array.isArray(arr) ? arr.filter((t: any) => typeof t === 'string') : [];
  } catch {
    return [];
  }
};
