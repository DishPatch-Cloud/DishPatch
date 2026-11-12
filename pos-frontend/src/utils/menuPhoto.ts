export function menuPhotoUrl(item: { uuid?: string; imageUrl?: string }): string {
  const saved = item.imageUrl?.trim();
  if (saved) return saved;
  const base = String(import.meta.env.VITE_MENU_IMAGES_BASE_URL ?? "").replace(/\/$/, "");
  if (!base || !item.uuid) return "";
  return `${base}/${item.uuid}.png`;
}
