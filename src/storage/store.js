import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  profile: 'closyt.bodyProfile',
  wardrobe: 'closyt.wardrobe',
  worn: 'closyt.wornCounts',
};

async function read(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const write = async (key, value) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
  return value;
};

/*
 * Body profile: gender, age, height, weight and the onboarding photos.
 * Held internally to inform recommendations — never surfaced as a screen.
 */
export const getBodyProfile = () => read(KEYS.profile, null);
export const saveBodyProfile = (profile) => write(KEYS.profile, profile);

/* The wardrobe itself. */
export const getWardrobe = () => read(KEYS.wardrobe, []);
export const saveWardrobe = (items) => write(KEYS.wardrobe, items);

/* How often each item has been worn, so recommendations spread across the closet. */
export const getWornCounts = () => read(KEYS.worn, {});
export const saveWornCounts = (counts) => write(KEYS.worn, counts);

export async function resetAll() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
