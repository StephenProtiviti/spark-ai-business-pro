# Quick UI Tweaks

## Overview
Two small visual refinements to the homepage based on user feedback.

## Changes

### 1. Spark Logo Glow Enhancement
- **File:** `src/pages/Index.tsx`
- **Location:** Hero section, logo glow layers
- **Change:** Add a third innermost radial gradient layer with white (`hsl(0 0% 100%)`) centered behind the logo. This sits inside the existing teal and orange glow layers with a smaller spread (`-m-6`) and `blur-xl` for a bright white hot spot at the center.

### 2. Card Hover Text Color Fix
- **File:** `src/pages/Index.tsx`
- **Location:** "Your Ideas" card title `<h3>` element
- **Change:** Remove `group-hover:text-[hsl(var(--spark-teal))]` so the card title text stays white on hover instead of switching to teal.