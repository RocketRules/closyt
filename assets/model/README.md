# The garment classifier model

The app runs **without** a model — it just falls back to manual category tagging
(colour detection works either way). Drop a trained model in here and category
tagging switches on automatically. Nothing in the code needs changing.

## What goes in this folder

Replace all three placeholder files:

| File | What it is |
|---|---|
| `model.json` | Model topology + weights manifest |
| `weights.bin` | The trained weights |
| `metadata.json` | Must contain a `labels` array, in the model's output order |

The app detects the placeholders via a `closytPlaceholder` flag, so a partial
replacement will keep it disabled — swap all three.

## Training it (free, ~15 minutes, no installs)

Use **Teachable Machine**: <https://teachablemachine.withgoogle.com> → New Image Project
→ Standard image model.

1. **Create exactly these seven classes**, spelled this way — they must match
   `TYPES` in `src/theme/theme.js`, or the prediction gets discarded:

   ```
   Shirt   Tee   Knitwear   Jacket   Trousers   Jeans   Shoes
   ```

2. Upload your dataset images into each class.

3. **Then add 10–20 photos of your own real clothes per class**, shot on your
   phone, laid flat, on the surfaces you'll actually demo on. This matters more
   than dataset size — a model trained only on clean catalogue images falls
   apart on real photos with shadows, creases and cluttered backgrounds.

4. Train, then **Export Model → TensorFlow.js → Download**. You get a zip with
   `model.json`, `weights.bin` and `metadata.json`. Unzip all three into this
   folder.

5. Restart Metro with a cleared cache so the new asset is picked up:

   ```
   npx expo start --clear
   ```

Teachable Machine exports a MobileNet **layers** model at 224×224 with inputs
scaled to [-1, 1], which is what `src/logic/classifier.js` expects. If you train
your own model elsewhere, match that or update `INPUT_SIZE` and the
normalisation in that file.

## Measuring it

Hold back ~20% of your images and check accuracy per class rather than eyeballing
it — being able to quote a real number is worth more in a demo than a vibe.

## Why it works in Expo Go

Inference uses `@tensorflow/tfjs-core` with the **CPU backend**, which is pure
JavaScript. The usual React Native bindings (`@tensorflow/tfjs-react-native`)
need `react-native-fs`, and TFLite/ONNX are native modules — none of those can
load in Expo Go. `src/logic/tfPlatform.js` registers a minimal platform so
tfjs never reaches for browser or Node APIs that Hermes lacks.

Tradeoff: CPU inference is slower than a native runtime. Expect a couple of
seconds per photo, which is why the model preloads at app launch.
