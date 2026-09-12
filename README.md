# Closyt

Weekend Expo app: height, weight, and a selfie become an internal fit profile. Closet photos become a wardrobe. An outfit agent returns 2–3 looks from only those pieces. Body-type labels never appear on screen.

## Run

1. Copy `.env.example` to `.env` and add a [Google AI Studio](https://aistudio.google.com/apikey) key.
2. Install and start:

```bash
npm install
npx expo start
```

Open in Expo Go on a phone, or press `w` for web.

The demo closet and measurement-based outfits work without a key. Gemini is used to read a selfie, tag uploaded garments, and compose looks. If the key is missing, Closyt falls back to on-device rules.

## Flow

1. Presentation (women / men / unisex) — rule book only
2. Height and weight
3. Selfie (optional)
4. Closet photos, or **Load demo closet**
5. Outfit cards from those items only
