export function menuPhotoUrl(item: { imageUrl?: string }): string {
  return item.imageUrl?.trim() ?? "";
}
