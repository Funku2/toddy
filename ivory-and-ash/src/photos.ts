import type { ImageMetadata } from 'astro';
const files = import.meta.glob<{ default: ImageMetadata }>('./assets/images/*.jpg', { eager: true });
export function photo(name: string): ImageMetadata {
  const hit = files[`./assets/images/${name}.jpg`];
  if (!hit) throw new Error(`Missing photo: ${name}`);
  return hit.default;
}
