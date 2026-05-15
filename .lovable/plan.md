## Goal
Lift the entire in-app experience to a "premium cute, hand-crafted boutique" feel — soft pastels, glassy depth, refined typography, micro-animations. Login stays in disguise mode (Secure Notes / slate). Disguised foreground push toasts also stay neutral.

## Design language
- **Palette**: warm cream base `#FFF7F4`, blush `#FFD6E5`, rose `#FF7AA8`, lilac `#C9A6FF`, deep plum `#3D1B4D` for ink. Add a "milk glass" surface `rgba(255,255,255,0.65)` with backdrop blur for cards.
- **Typography**: headings → `Fraunces` (serif, soft optical), body → `Plus Jakarta Sans`, accents → `Caveat` for handwritten flourishes (e.g. anniversary count, "thinking of you").
- **Radii/shadow**: cards `rounded-3xl`, buttons `rounded-2xl`, soft layered shadow (`0 1px 2px + 0 12px 32px -12px rose/30`).
- **Motion**: subtle float on hero stars, gentle spring on tab switch, sparkle trail on ping send, heart-burst on milestones (already exists — refine).

## Scope (phased so we ship fast, no breakage)

### Phase 1 — Foundation (every screen benefits automatically)
1. Update `src/index.css` HSL tokens: new `--background`, `--card`, `--primary`, `--accent`, `--muted`, `--border`, `--ring`, plus new `--gradient-romantic`, `--gradient-aurora`, `--shadow-soft`, `--shadow-rose`.
2. Extend `tailwind.config.ts`: add `font-display` (Fraunces), `font-script` (Caveat), `font-sans` (Plus Jakarta), new shadow utilities, new `animate-float`, `animate-shimmer`, `animate-heartbeat` keyframes.
3. Inject Google Fonts via `index.html` (preconnect + display=swap).
4. Polish global header gradient + glassy bottom nav (frosted, animated active pill indicator).
5. New animated logo/wordmark for header: serif "Couple Stars" with a tiny rotating sparkle.

### Phase 2 — Hero surfaces
6. **HomeScreen**: new hero card (gradient + floating hearts), Stars total in oversized Fraunces with glow, "On This Day" → polaroid card with tape, "Thinking of You" → blush pill with sparkle trail + cooldown ring.
7. **InAppNotification**: glass card, avatar bubble, soft pop-in spring, swipe-to-dismiss feel.
8. **Bottom nav**: frosted bar, active item gets a blush pill background + tiny bounce.

### Phase 3 — Feature screens
9. **Memories / Gallery**: polaroid-style cards with tape, tag chips in script font, frame picker as horizontal snap carousel with shine on selected.
10. **Chat**: bubble redesign — rose gradient for self, cream for partner, soft tail, reactions float above.
11. **Couple Games**: each game card → bento tile with emoji icon, soft gradient, hover lift; results screen confetti tuned.
12. **Listen Together**: vinyl-style now-playing disc with slow rotation when synced; mini player gets glassy bar.
13. **Love Letters / Calendar / History**: shared "boutique card" component (cream paper, subtle grain, blush accent line).
14. **Star burst / milestone celebration**: keep, but switch particles to hearts + sparkles in new palette.

### Phase 4 — Disguise integrity check
15. Verify Login + foreground push toast still render in slate "Secure Notes" theme — unaffected by new tokens (they already override locally; double-check).

## Out of scope
- No backend/data changes.
- No new features.
- Login screen visual stays as-is.

## Technical notes
- All colors stay as HSL tokens — no hard-coded hex in components.
- Fonts loaded once in `index.html` to avoid FOUT loops.
- New animations added to `tailwind.config.ts` `keyframes`/`animation`.
- `framer-motion` is already in deps — used only where Tailwind animate-classes aren't enough (sparkle trail, swipe dismiss).
- I'll save the new visual identity to `mem://style/visual-identity` so it's preserved.

## Delivery order
I'll ship Phase 1 + 2 in this turn (foundation + Home + notifications + nav + logo). Phases 3 & 4 in the next turn so you can react after seeing the new look. Sound good?
