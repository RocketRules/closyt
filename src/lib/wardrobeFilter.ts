import type { BodyProfile, Category, WardrobeItem } from '@/types';

export type RankedItem = WardrobeItem & { score: number };

const FIT_TOKENS = new Set(['fitted', 'regular', 'relaxed']);

function haystack(item: WardrobeItem): string {
  return [item.label, item.subcategory, item.notes, item.fit, item.sleeve, ...item.flags, ...item.colors]
    .join(' ')
    .toLowerCase();
}

function tokenHit(item: WardrobeItem, token: string): boolean {
  const t = token.toLowerCase();
  if (item.flags.map((flag) => flag.toLowerCase()).includes(t)) return true;
  if (FIT_TOKENS.has(t) && item.fit === t) return true;
  return haystack(item).includes(t.replace(/-/g, ' ')) || haystack(item).includes(t);
}

export function rankWardrobe(items: WardrobeItem[], profile: BodyProfile): RankedItem[] {
  return items
    .map((item) => {
      let score = 4;
      for (const prefer of profile.prefer) {
        if (tokenHit(item, prefer)) score += 2;
      }
      for (const avoid of profile.avoid) {
        if (tokenHit(item, avoid)) score -= 3;
      }
      if (item.fit === profile.fitBias) score += 2;
      if (item.fit === 'fitted' && profile.fitBias === 'relaxed') score -= 2;
      if (item.fit === 'relaxed' && profile.fitBias === 'fitted') score -= 1;
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function filterWardrobe(items: WardrobeItem[], profile: BodyProfile): RankedItem[] {
  const ranked = rankWardrobe(items, profile);
  const kept = ranked.filter((item) => item.score >= 2);
  if (kept.length >= 4) return kept;
  return ranked;
}

export function itemsByCategory(items: WardrobeItem[]): Record<Category, WardrobeItem[]> {
  const groups: Record<Category, WardrobeItem[]> = {
    top: [],
    bottom: [],
    outerwear: [],
    shoes: [],
    dress: [],
    accessory: [],
  };
  for (const item of items) {
    groups[item.category].push(item);
  }
  return groups;
}

export function canComposeOutfits(items: WardrobeItem[]): boolean {
  const groups = itemsByCategory(items);
  return groups.dress.length > 0 || (groups.top.length > 0 && groups.bottom.length > 0);
}

export function agentItemPayload(item: WardrobeItem & { score?: number }) {
  return {
    id: item.id,
    label: item.label,
    category: item.category,
    subcategory: item.subcategory,
    colors: item.colors,
    fit: item.fit,
    sleeve: item.sleeve,
    formality: item.formality,
    flags: item.flags,
    score: item.score,
  };
}
