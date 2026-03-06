# UI/UX Design System - NanoLoc (Dark Mode Only)

## 1. Design Principles
- **Minimal & Practical**: Focus on content, reduce visual noise. Remove unnecessary borders when spacing can separate elements.
- **Dark Mode Only**: The interface is exclusively dark mode to reduce eye strain and provide a sleek developer-tool aesthetic.
- **Function over Form**: Forms, code snippets, and data tables must be readable and densely packed but not cluttered.

## 2. Color Palette (New Scheme)
We are moving away from the Indigo/Purple scheme to a high-contrast, ultra-modern monochrome + subtle accent style (Vercel/Apple inspired).

| Element | Tailwind Classes | Description |
|---|---|---|
| **App Background** | `bg-zinc-950` | Deepest black/gray for the main canvas. |
| **Card / Surface** | `bg-zinc-900 border border-zinc-800` | Slightly lighter for floating elements, panels, and cards. |
| **Primary Text** | `text-zinc-50` | For headings and important data. |
| **Secondary Text** | `text-zinc-400` | For descriptions, hints, and remarks. |
| **Borders / Separators** | `border-zinc-800` | Subtle lines for structure. |
| **Accent (Success)** | `text-emerald-400` / `bg-emerald-500/10` | For positive actions (e.g. successful translation/import). |

## 3. Buttons & Interactions

| Type | Tailwind Classes | Note |
|---|---|---|
| **Primary Action** | `bg-zinc-100 text-zinc-900 hover:bg-white active:bg-zinc-200 transition-colors shadow-sm` | Clean, high-impact style. Replaces Indigo/Purple. |
| **Secondary Action** | `bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700 transition-colors` | For standard actions like "Cancel" or "Options". |
| **Destructive** | `bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors` | Red for delete/remove. Keep it subdued until hovered. |
| **Ghost / Base** | `hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50 transition-colors` | For inline actions (e.g., table row actions, small icon buttons). |

**Interactive Rules:**
- Apply `cursor-pointer` to all clickable elements.
- Feedback on hover is mandatory: Add `transition-all duration-200` to buttons and links.
- Focus rings for accessibility: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950`.

## 4. Typography
- **Headings**: `font-semibold tracking-tight text-white`.
- **Base Text**: `text-sm text-zinc-300` for better density in SaaS tables.
- **Microcopy**: `text-xs text-zinc-500`.

## 5. Specific Components
- **Input Fields**: `bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400`.
- **Tables**: Row hover should be `hover:bg-zinc-800/50`. Sticky headers must use `bg-zinc-900 border-b border-zinc-800`.
- **Modals / Dialogs**: `bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/50`.
- **Loading States**: Use pulsing skeletons (`animate-pulse bg-zinc-800 rounded`) or a simple spinner (`Loader2 className="animate-spin text-zinc-500"`).

## 6. Pre-Delivery Checklist
- [ ] Ensure no Indigo, Blue, or Purple classes remain in primary UI buttons.
- [ ] Hover states provide clear visual feedback without layout shift.
- [ ] Focus states are visible for keyboard navigation.
- [ ] Borders are subtle (`border-zinc-800` or `border-zinc-700`) so they don't distract.
