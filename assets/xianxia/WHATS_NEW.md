# Xianxia Pixel Pack — what's new in 2.1

Free update. **Nothing from 2.0 was changed or removed** — every original file
is byte-for-byte the same. Everything below is new, in the same folders.

| Folder | New | Count |
|---|---|---|
| `backgrounds/` | Heavenly Palace: jade halls, Nantian Gate, Lingxiao Hall, floating isles, star river, dragon pillars, immortal peach trees; plus ground clutter (lingzhi, orchids, taihu rock…) | **36 pieces** |
| `terrain/` | Terrain sets — bluestone, bamboo grove, cloud platform, red clay. Ground, platforms, 26°/45°/63° slopes; **Tiled `.tsx` and Godot `TileSet` with autotiling**; example levels | **4 sets, 244 tiles** |
| `weapons/` | Tiered weapons (12 × mortal iron / fine steel / magic treasure) and evolution lines (6 × sealed → awakened → unleashed → ultimate) | **60** |
| `weapon_fx/` | Looping elemental glow for every magic weapon — water, flame, lightning, wind, holy light, ink mist, jade | **30 overlays** |
| `icons/` | 32 × 32 icon for every 2.0 weapon | **36** |
| `ui/` | Rosewood, jade, silk and ink panels (9-slice); jade and silk buttons (3 states); HP/MP/spirit bars; cursors, dividers; 23 item & status icons. Godot `.tres` / `.tscn` included | **39 elements** |
| `fx/` | Ambient loops — peach blossom, willow fluff, rain, fireflies (tile in both directions) | **4** |
| `fx/` | Cloud-sea, auspicious-cloud and mountain-mist strips, seamless left↔right | **9** |
| `fx/` | Weapon transformations (animated) | **3** |
| `fx/` | Red-crowned cranes: flap cycle at two sizes, and a flock that loops across the sky | **3** |
| `fx/` | Animated scenery — floating-isle waterfall, glowing portal, deity halo | **3** |
| `fx/` | Interactive props — treasure chest, alchemy furnace, wine jar, bamboo basket | **4** |
| `characters/` | Animated monsters, 80 px: lantern ghost, sword spirit, fox-fire wisps, paper doll, hopping jiangshi, bat demon, peach-blossom sprite, toad spirit, water ghost, skeleton soldier, wolf demon, snake demon, stone golem, treant, fox demon, heavenly soldier, thunderbird — idle, move, attack, hurt, death | **17** |
| `characters/` | Bosses, 150 px: nine-tailed fox, fallen sword immortal, jiao dragon — idle, move, two attacks, an ultimate, hurt, death | **3** |
| `characters/` | Animated heroes, 72 px body — swordsman, swordswoman, staff monk, spearman, archer, fan scholar, bamboo-staff beggar, saber, twin-blade swordswoman — idle, walk, attack, jump, fall, hurt, death, plus skills: cast, block, dash | **9** |
| `characters/smooth/` | **Smooth animations for all 9 heroes**, made from AI video and cleaned up frame by frame: idle loop (12–47 frames), 12-frame walk cycle, and a **three-hit combo** (`combo1` → `combo2` → `combo3`, ~9 frames each). Five heroes also have a single heavy `attack`. Robes, sleeves and ponytails swing with real follow-through | **9 heroes, 691 frames** |
| `characters/` | Colour variants — ghost, fox-fire, sword spirit, jiangshi, swordsman, spearman — same frames, ready for elites or rival sects | **14** |
| `characters/` | Dialogue portraits, 128 px: innkeeper, Taoist, fairy, sect elder, wandering swordsman, alchemist, blacksmith, teahouse owner, book boy, fortune teller, herbalist, constable, old beggar master, warrior nun, cult leader, blind hermit, scholar swordsman, eccentric doctor, peddler, boatman, abbot, young lady, drunkard, hunter, maid, granny, child, general, storyteller, immortal page boy — 3 expressions each | **30 × 3** |

## Notes

- **Evolution stages share one canvas and the grip is on the same pixel**
  (`grip` in `pack.json`), so swapping stages in game never jumps.
- **Glow overlays**: draw the weapon, then the glow frame at the weapon's
  position plus the `offset` in its `_fx.json`.
- **Terrain**: paint with the terrain brush in Tiled or Godot; ends, middles
  and single pillars pick themselves. Mix the three middle variants.
- **Ambient loops** are greyscale; `pack.json` suggests a tint for each.
- **Characters**: every frame of one character shares one canvas, feet on the
  bottom edge (`anchor: bottom`), so frames swap without jitter. Portraits of
  one person are pixel-aligned; only the face changes.
  Heroes share one body scale. `foot_y` / `body_x` in `pack.json` are the
  ground row and head column of each animation — line these up when switching
  animations (skills come from a separate sheet with its own canvas, and
  jump/fall frames reach lower, so the canvas bottom is not always the ground).
- **Smooth animations** (`characters/smooth/`, section `smooth_animations` in
  `pack.json`) play at **12 fps** and use the same body scale and foot line as
  the frame-by-frame heroes, so you can mix them. Each entry has `frames`,
  `cell`, `foot_y`, `body_x` and `loop`. Combo hits share one canvas and each
  hit ends on the next hit's first pose — `next` names the follow-up; play it
  on the next button press, or return to idle when it is `null`.
- **UI**: no text is drawn on anything — plaques and seals are blank.
- New entries were added to `pack.json`; existing entries are unchanged.

Same license: **CC0 1.0**. Same AI disclosure as the main README, plus: the
smooth animations were generated with Google Veo from the pack's own character
art (image-to-video), then cut, keyed, aligned and retimed by script.
