import { geminiJson, hasGeminiKey } from '@/lib/gemini';
import { createId } from '@/lib/ids';
import {
  agentItemPayload,
  canComposeOutfits,
  filterWardrobe,
  itemsByCategory,
} from '@/lib/wardrobeFilter';
import type { BodyProfile, Occasion, Outfit, WardrobeItem } from '@/types';

type AgentOutfit = {
  itemIds?: string[];
  title?: string;
  occasion?: Occasion;
  why?: string;
};

type AgentResponse = {
  outfits?: AgentOutfit[];
};

const OCCASIONS: Occasion[] = ['everyday', 'casual', 'office', 'night'];

function whyForFit(profile: BodyProfile): string {
  if (profile.fitBias === 'fitted') {
    return 'Keeps the line close so the look doesn’t swallow your frame.';
  }
  if (profile.fitBias === 'relaxed') {
    return 'Uses drape and ease through the body instead of clinging.';
  }
  return 'Balanced proportions — structure without squeeze.';
}

function isComplete(items: WardrobeItem[]): boolean {
  return canComposeOutfits(items);
}

export function validateOutfits(
  proposed: AgentOutfit[],
  wardrobe: WardrobeItem[],
): Outfit[] {
  const byId = new Map(wardrobe.map((item) => [item.id, item]));
  const outfits: Outfit[] = [];

  for (const row of proposed) {
    const ids = Array.from(new Set((row.itemIds ?? []).filter((id) => byId.has(id))));
    const pieces = ids.map((id) => byId.get(id)!);
    if (!isComplete(pieces)) continue;
    outfits.push({
      id: createId('look'),
      itemIds: ids,
      title: (row.title || 'Everyday look').slice(0, 48),
      occasion: OCCASIONS.includes(row.occasion as Occasion)
        ? (row.occasion as Occasion)
        : 'everyday',
      why: (row.why || '').slice(0, 220),
      fallback: false,
    });
    if (outfits.length === 3) break;
  }
  return outfits;
}

export function fallbackOutfits(wardrobe: WardrobeItem[], profile: BodyProfile): Outfit[] {
  const groups = itemsByCategory(wardrobe);
  const looks: Outfit[] = [];
  const why = whyForFit(profile);

  const extras = (index: number) => {
    const ids: string[] = [];
    if (groups.outerwear[index % Math.max(groups.outerwear.length, 1)] && groups.outerwear.length) {
      ids.push(groups.outerwear[index % groups.outerwear.length].id);
    }
    if (groups.shoes[index % Math.max(groups.shoes.length, 1)] && groups.shoes.length) {
      ids.push(groups.shoes[index % groups.shoes.length].id);
    }
    return ids;
  };

  if (groups.dress.length) {
    looks.push({
      id: createId('look'),
      itemIds: [groups.dress[0].id, ...extras(0)],
      title: 'Easy one-piece',
      occasion: 'everyday',
      why,
      fallback: true,
    });
  }

  const pairCount = Math.min(3, groups.top.length, groups.bottom.length || 1);
  for (let i = 0; i < pairCount && looks.length < 3; i += 1) {
    if (!groups.top[i] || !groups.bottom[i % groups.bottom.length]) break;
    const bottom = groups.bottom[i % groups.bottom.length];
    looks.push({
      id: createId('look'),
      itemIds: [groups.top[i].id, bottom.id, ...extras(i + 1)],
      title: i === 0 ? 'Everyday uniform' : i === 1 ? 'Clean second look' : 'Change-up',
      occasion: i === 2 ? 'casual' : 'everyday',
      why,
      fallback: true,
    });
  }

  return looks.slice(0, 3);
}

function agentPrompt(profile: BodyProfile, items: ReturnType<typeof agentItemPayload>[]): string {
  return `You are Closyt's outfit-creator agent. Assemble outfits ONLY from the provided wardrobe item ids.

Body profile (internal — never name body types, BMI, weight, or medical language in "why"):
${JSON.stringify({
    presentation: profile.presentation,
    sizeBand: profile.sizeBand,
    fitBias: profile.fitBias,
    prefer: profile.prefer,
    avoid: profile.avoid,
    vibe: profile.vision.clothingVibe,
    colors: profile.vision.colors,
  })}

Wardrobe:
${JSON.stringify(items)}

Return JSON:
{
  "outfits": [
    {
      "itemIds": string[],
      "title": string,
      "occasion": "everyday" | "casual" | "office" | "night",
      "why": string
    }
  ]
}

Rules:
- Return 2 or 3 outfits.
- Every itemId MUST be in the wardrobe list. Never invent clothes, colors, or accessories that are not listed.
- Each outfit needs a dress, OR a top and a bottom. Add outerwear/shoes/accessories only if those ids exist.
- Vary color story or occasion when possible.
- "why" is 1-2 sentences about fit and silhouette for the wearer. No clinical words. No body-type labels.
- Prefer items whose fit/flags match fitBias and prefer; avoid items matching avoid.`;
}

export async function composeOutfits(
  profile: BodyProfile,
  wardrobe: WardrobeItem[],
): Promise<{ outfits: Outfit[]; source: 'agent' | 'fallback' }> {
  const templates = fallbackOutfits(wardrobe, profile);
  if (!templates.length) {
    return { outfits: [], source: 'fallback' };
  }

  if (!hasGeminiKey()) {
    return { outfits: templates, source: 'fallback' };
  }

  try {
    const filtered = filterWardrobe(wardrobe, profile);
    const raw = await geminiJson<AgentResponse>({
      prompt: agentPrompt(profile, filtered.map(agentItemPayload)),
      timeoutMs: 20000,
    });
    const validated = validateOutfits(raw.outfits ?? [], wardrobe).map((outfit) => ({
      ...outfit,
      why: outfit.why || whyForFit(profile),
    }));
    if (validated.length >= 2) {
      return { outfits: validated.slice(0, 3), source: 'agent' };
    }
    if (validated.length === 1) {
      const extra = templates.filter(
        (look) => look.itemIds.join() !== validated[0].itemIds.join(),
      );
      return { outfits: [...validated, ...extra].slice(0, 3), source: 'agent' };
    }
  } catch {
    // fall through to templates
  }

  return { outfits: templates, source: 'fallback' };
}
