export function menuImageUrl(item: { uuid?: string; imageKey?: string }): string {
  const base = String(import.meta.env.VITE_MENU_IMAGES_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) return "";
  if (item.imageKey) return `${base}/${item.imageKey}`;
  if (!item.uuid) return "";
  return `${base}/${item.uuid}.png`;
}
