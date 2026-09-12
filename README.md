# Closyt

Weekend Expo app: height, weight, and an optional selfie become an **internal body profile**. This branch stops there. Another part of Closyt will consume that profile later to build outfits. Body-type labels never appear on screen.

## Run

```bash
npm install
npx expo start
```

Open in Expo Go on a phone, or press `w` for web.

Gemini is optional. Copy `.env.example` to `.env` and add `EXPO_PUBLIC_GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey) if you want the selfie analyzed. Without a key, the profile is built from measurements only.

## Flow

1. Presentation (women / men / unisex) — rule book only
2. Height and weight
3. Selfie (optional)
4. Done — profile saved on device for a later handoff
