# Closyt tagger (FashionCLIP)

Runs [FashionCLIP](https://huggingface.co/patrickjohncyh/fashion-clip) on this
machine and tags garment photos for the app. FashionCLIP has no free hosted
inference API, so it runs locally — which is fine, because your phone already
talks to this machine over the LAN for Expo Go.

Zero-shot: no training, no dataset. Labels are defined as text prompts in
`app.py` (`CATEGORY_PROMPTS`, `FIT_PROMPTS`) — edit those to change the
vocabulary, no retraining involved.

## Setup (once)

```
pip install -r server/requirements.txt
```

~250MB of packages. The model itself (~600MB) downloads on first run and is
cached afterwards.

## Run it

```
python server/app.py
```

Wait for `ready in …s — listening for photos`, then start the app as usual.
Keep this running during your demo.

- `GET  /health` — readiness check, used by the app to show server status
- `POST /tag`    — `{"image": "<base64 jpeg>"}` → category + fit, each with
  confidence and the full score breakdown

## How the app finds it

The app derives this machine's IP from the Metro connection it is already using
(`Constants.expoConfig.hostUri`), so there is no IP to configure — as long as
the phone and this machine are on the same network. Port 8000.

If the server is unreachable, tagging degrades to colour-only and the item
opens in the tag editor for manual categorising. The app never breaks.

## Firewall

The first run may prompt for permission to accept incoming connections. Allow
it on private networks, or the phone will not reach port 8000.
