# Interface direction

## Product and scene
A photo selection and download utility, used one-handed on a phone after an event, often outdoors. The user's photos are the focal point. Light surfaces work in daylight; a working dark theme supports evening browsing.

## Direction
Saweria-inspired, mobile-first and photo-led, as explicitly requested by the owner. ENERGY 2 / RHYTHM 2 / MOTION 1. Warm cream, amber-orange actions, dark outlines, compact offset shadows and friendly typography evoke its playful, approachable interface while preserving this app's photo workflows.

## Decisions
- System sans-serif follows the user's device and keeps controls familiar and readable.
- Cream surfaces, amber-orange primary actions and warm charcoal ink form the palette. Pale blue distinguishes the collage tools from the download action. The highlighted import heading introduces the action without decorative assets.
- Strong borders and small offset shadows are reserved for primary actions and import panels. Fine neutral rules separate secondary controls; 8–14px corners soften the composition while preserving its tactile neobrutalist character.
- Solid surfaces replace gradients and decorative blur so photos retain their own colors.
- Import methods are plain-language choices. Setup instructions precede actions that need preparation.
- Gallery controls use separate rows rather than compressing every feature into one toolbar.
- A safe-area-aware bottom action bar keeps saving reachable by thumb and states file format explicitly.
- Two-column mobile photo tiles preserve browsing density; image metadata sits outside the image so it does not obscure the photo.
- Watermark and collage options stay visible as requested; their secondary controls appear when needed.
- Controls target at least 44px. Mobile text entry uses 16px to prevent automatic input zoom.
- Pressed controls translate into their offset shadows. A scan sweep communicates active image processing; a separate file animation communicates download preparation. Both respect reduced-motion preferences.
- Photo preview uses a dark opaque canvas to separate the image from the surrounding app, not decorative glass.
- No invented identity assets, statistics, claims, or event details. Collage text starts empty for the user to supply.

## Verification
All auxiliary tools, help dialogs, prompt controls, collage controls, install notices and toast surfaces use the same theme tokens. Processing/viewer canvases remain dark for photograph visibility; error and success indicators retain semantic colors.

Check 320px, 390px, 768px and desktop widths, both themes, keyboard dialogs, import failures, filter/selection interactions, image retry, download/cancel and collage generation.
