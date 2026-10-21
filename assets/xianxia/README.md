# Xianxia Pixel Pack

Pixel art for a side-scrolling action game in a Chinese xianxia / wuxia
setting: spell effects, parallax background props and weapon icons.

Three kinds of art that were made to work together, but each folder stands
on its own — you can take only the effects, or only the backgrounds.

## Contents

| Folder | What | Count |
|---|---|---|
| `fx/` | Spell effects, frame by frame | **24 effects, 332 frames** |
| `backgrounds/` | Parallax scenery props, 3 depth layers | **30 pieces** |
| `weapons/` | Weapon icons | **36** |

## The effects are monochrome on purpose

Every effect is drawn in white → dark grey only. **No hue at all.**

That is not an oversight: it lets you tint one effect to a dozen elements at
runtime with a single colour multiply. A white slash becomes fire, ice,
poison or holy without another sprite.

If you want them coloured on disk instead, multiply them once in your image
editor and ship that.

### Anchors — read this before you place them

An effect is not always centred on the caster. `pack.json` gives each
effect an `anchor`:

| `anchor` | Align the cell's… | Effects |
|---|---|---|
| `center` | centre to the caster's body | most of them |
| `bottom` | **bottom edge to the ground line** | lotus, array seal, ascension pillar, tribulation, stone spike, sword rain, bell ward, gale vortex |
| `left` | **left edge to the casting hand**, flip with facing | sword qi, qi palm, moon arc |

Centring a `bottom` effect leaves it floating in mid-air. Centring a `left`
effect makes the beam come out of the character's chest.

Note that `bottom` means *where it lands*, not where it comes from —
falling lightning and raining swords are anchored at the ground they hit.

### Cells and frames

Every effect is a horizontal strip of **256 × 256** cells, plus the same
frames already cut in `<name>_frames/`. Frame *n* sits at `x = n * 256`.

Frame counts differ per effect (11–18); `pack.json` has the exact number.
Peak brightness is early — frames 2–3 — so they read as impacts rather than
as something inflating.

## The backgrounds are separate props, not a wide image

There is no seamless scrolling backdrop here, and that is deliberate: a
tiling image has a seam, and you would be fighting it forever. Instead you
get **individual objects** you scatter along each depth layer. What repeats
is the placement, not a picture.

| Layer | Suggested parallax | Look | Pieces |
|---|---|---|---|
| `far` | **0.06** | pale, washed out, low contrast | 8 |
| `mid` | **0.18** | mid-tone, readable structure | 11 |
| `near` | **1.00** | near-black silhouettes | 11 |

Those factors are what the game these came from uses, and the ratio matters
more than the numbers: each layer moves about three times as fast as the one
behind it. At 0.06 the far layer shifts only ~38 px across a 640 px screen —
almost still, but not a sticker.

`pack.json` gives every piece its `layer` and `factor`, plus two flags:

- **`ground`** — **this is the one you place by.** `true` means stand it on
  the ground line; `false` means it belongs in the sky (the cloud band and
  the moon, nothing else).
- `flat_base` — whether its bottom edge is a straight horizontal line.
  Useful if you snap sprites to a pixel row, but **do not use it to decide
  where a piece goes.** It answers a different question and gets it wrong
  in both directions: the pagoda has a stepped plinth so its base is not
  flat, yet it stands on the ground; the moon is a circle, which passes the
  flat test, yet it floats.

Do not tint the near layer lighter to "see it better" — it is dark so that
it never competes with your character. The far layer is pale for the same
reason, from the other end.

## The weapons are already straightened

Icons are horizontal, tip to the right, grip centred at the left edge — cut
from 45° source sheets and rotated for you. Sizes run 80–128 px along
the long edge, grouped by weapon length.

## `pack.json`

One file describing all three folders: frame counts and anchors for the
effects, layer and parallax factor for the background pieces, sizes for the
weapons.

## The original sheets are a separate download

*Xianxia Pixel Pack — Original Sheets* holds the raw generated sheets every
piece was cut from: whole grids, uncut, unscaled, background not removed.

You do not need it. Get it if you want to re-cut at a different cell size,
keep frames I dropped, or do a cleaner cutout than mine.

It is on the same page, free, same CC0 license.

## Importing

Use **nearest-neighbour** filtering everywhere. The art is drawn at high
pixel density and stays sharp scaled down; scaling *up* past 1× goes soft.

**Godot** — drop the folder in, set *Filter* to *Nearest*, then
`Sprite2D` + `hframes = <frames>` for an effect strip, or drag the cut
frames onto an `AnimatedSprite2D`. Background props go on a
`Parallax2D` / `ParallaxLayer` per depth layer with the factors above.

**Unity** — *Sprite Mode: Multiple*, *Filter Mode: Point*,
*Compression: None*, Sprite Editor → Slice → *Grid By Cell Size* 256 × 256
for effects. Weapons and background props are single sprites.

**GameMaker** — *Import Strip Image*, 256 × 256, frame count from
`pack.json`.

## License

**CC0 1.0 Universal** — public domain dedication. See `LICENSE.txt`.

Use it commercially, modify it, ship it, resell what you make with it.
No credit required. Credit is welcome but never expected.

## AI disclosure

**Every image in this pack was generated with Google Gemini from written
text prompts, then cut, cleaned, aligned and assembled by hand.**

No existing artwork was used as an input, reference or img2img source at
any point in the process.
