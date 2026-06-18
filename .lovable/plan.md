**Problem:** The current Spark logo uses dark navy text that is invisible against the navy hero background. Previous attempts to fix this (white pill container, transparent PNG) have not fully resolved the readability issue.

**Goal:** Make the logo stand out clearly on dark backgrounds without using any box, square, or pill-shaped container.

**Solution:**

1. **Regenerate logo asset** — White "SPARK" wordmark with the colorful orange/teal flame mark, on a transparent background. (Already completed via image generation.)

2. **Add soft teal radial glow in code** — Wrap the `<img>` in both `Navbar.tsx` and `Index.tsx` hero with a subtle blurred teal pseudo-element / div that creates an ambient glow halo behind the logo. This gives it presence and contrast without any hard-edged container.

**Files to modify:**
- `src/components/Navbar.tsx` — Add `relative` wrapper + blurred teal glow div behind the logo `<img>`.
- `src/pages/Index.tsx` — Same glow treatment on the hero logo (line ~115).

**No design tokens or color palette changes needed.**