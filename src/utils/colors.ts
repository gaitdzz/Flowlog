export const tagColor = (tag: string, dark: boolean) => {
  const paletteLight = ['#e5e7eb', '#fde68a', '#bfdbfe', '#d1fae5', '#fbcfe8', '#e9d5ff'];
  const paletteDark = ['#374151', '#7c2d12', '#1f2937', '#064e3b', '#3b0764', '#312e81'];
  let sum = 0;
  for (let i = 0; i < tag.length; i++) sum = (sum + tag.charCodeAt(i)) % 9973;
  const idx = sum % paletteLight.length;
  return dark ? paletteDark[idx] : paletteLight[idx];
};
