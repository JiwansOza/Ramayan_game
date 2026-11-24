# Art direction: Lanka at sundown

## What we studied
The reference was the browser game *Ramayana: The Sacred Fires* (thaxnay.com/ramayana): its title, ending and share-card
paintings, and three frames from a gameplay video (YouTube `i3EkssViT2k`). We took **qualities** from it, not its content.
Its hero (Rama), places (Dandaka forest, mesas), creatures (Jatayu), bow combat and HUD art stay theirs. Our game keeps
its own story (Hanuman in Lanka, Sundar Kand), its own setting and its own UI.

## What makes that reference feel good
| Quality | What we saw | How we use it in Lanka |
|---|---|---|
| Light | Warm golden hour; pastel purple-to-orange sky; big sun glow | Sundown: a low warm sun behind the golden palace on Trikuta, peach horizon, violet zenith, pink clouds |
| Depth | Strong atmospheric haze; distant ridges fade to lavender | Warm lavender exponential fog; ocean all round the island; three layers of far ridges, each paler |
| Glow | Bloom on bright sky and fire; light shafts through trees; floating motes | UnrealBloom, a screen-space sun-shaft pass aimed at the sun, golden motes drifting round Hanuman |
| Life | Dense wind-blown grass, wildflowers, chunky foliage | ~26,000 instanced grass blades in Ashok Vatika (plus tufts along the lanes), all bending in one wind |
| Grade | Saturated, warm, soft vignette | Final grade pass: +saturation, warm highlights, violet shadows, contrast, vignette, red edge when hurt |
| HUD | Small, at the corners: emblem with health and stamina, objective line, ability icon with key list, contextual prompts | Bottom-left: objective, gada emblem, health and stamina. Bottom-right: form icon (gada or fist) and keys. Centre: "E Mudrika do" prompt |
| Title | Painted hero art, menu text on one side | In-engine hero shot over Hanuman's shoulder towards the sunset, menu on a left-hand shade |

## Palette
- Sky: horizon `#f79a7a`, mid `#a86ea8`, zenith `#2c2a74`, sun glow `#ffc078`
- Haze: `#c99aa6`; rain pulls it to `#6e7090`
- Sun light `#ffb27a` (2.3); sky fill (hemisphere) `#b8a8ff` over `#6a4632`; camera-side fill `#9a8ad8`
- UI gold `#e9c46a`, saffron health `#d8641e → #ffd27a`, stamina `#3a6ad8 → #8ab8ff`

## Stamina
Sprinting drains it; a dodge roll costs 20 and the heavy attack 18. It refills after a short pause.
