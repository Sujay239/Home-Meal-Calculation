---
name: Kinetic Ledger
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#404753'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#717784'
  outline-variant: '#c0c7d5'
  surface-tint: '#005fac'
  primary: '#005da8'
  on-primary: '#ffffff'
  primary-container: '#0076d3'
  on-primary-container: '#fdfcff'
  inverse-primary: '#a4c9ff'
  secondary: '#53606c'
  on-secondary: '#ffffff'
  secondary-container: '#d6e4f3'
  on-secondary-container: '#586672'
  tertiary: '#4b5d76'
  on-tertiary: '#ffffff'
  tertiary-container: '#637690'
  on-tertiary-container: '#fdfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e3ff'
  primary-fixed-dim: '#a4c9ff'
  on-primary-fixed: '#001c39'
  on-primary-fixed-variant: '#004884'
  secondary-fixed: '#d6e4f3'
  secondary-fixed-dim: '#bac8d6'
  on-secondary-fixed: '#0f1d27'
  on-secondary-fixed-variant: '#3b4854'
  tertiary-fixed: '#d2e4ff'
  tertiary-fixed-dim: '#b5c8e5'
  on-tertiary-fixed: '#071c32'
  on-tertiary-fixed-variant: '#364860'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 20px
  stack-gap-sm: 8px
  stack-gap-md: 16px
  stack-gap-lg: 24px
  section-margin: 32px
---

## Brand & Style

This design system is built for the intersection of fiscal precision and social harmony. The aesthetic is **Modern Corporate** with a heavy lean into **Minimalism**, designed to evoke the feeling of a premium fintech platform rather than a simple utility app. It prioritizes clarity, speed, and trust, ensuring that shared expenses never become a source of friction.

The UI should feel expansive and airy, utilizing generous whitespace to reduce the cognitive load associated with financial data. Subtle gradients and fine lines provide a "high-end startup" finish, while the interaction model remains utilitarian and grounded. The emotional response is one of control and transparency—making complex meal splits feel effortless and professional.

## Colors

The palette is anchored by a high-energy **Vibrant Blue** (#208AEF), used strategically for primary actions and brand emphasis. To maintain a premium, calm atmosphere, it is supported by **Soft Blue** surfaces and **Slate Grays**.

- **Primary:** Used for the "North Star" actions: submitting expenses, confirming splits, and primary navigation.
- **Secondary:** A pale, crystalline blue used for background washes, container fills, and low-priority chips.
- **Neutral:** A range of Slate Grays (from #1E293B to #F8FAFC) provides the structural hierarchy for text and borders.
- **Status:** Use a refined emerald for "Settled" and a warm amber for "Pending" to maintain the professional fintech aesthetic without using harsh, alarming reds.

## Typography

The design system utilizes **Inter** exclusively to leverage its exceptional legibility and systematic, neutral character. Typography is treated with a strict hierarchy to differentiate between "Data" (numbers) and "Metadata" (labels).

- **Data Presentation:** Numerical values in expense tracking should use `Medium` or `SemiBold` weights to ensure they are the first thing a user sees.
- **Micro-copy:** Use `label-sm` in all-caps with slight letter spacing for category headers (e.g., "GROCERIES," "DINING OUT") to create a clear architectural break between sections.
- **Line Heights:** Generous line heights are used for body text to maintain the airy, minimalist feel.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a base-8 spacing system. On mobile, we employ a 4-column grid with a 20px outer margin to provide a comfortable "thumb-zone" for interaction.

- **Vertical Rhythm:** Elements are grouped using 16px gaps, while major sections (e.g., Total Balance vs. Recent Transactions) are separated by 32px to create clear mental boundaries.
- **Safe Areas:** Cards and interactive elements should never touch the edge of the screen, maintaining a floating, "premium" layout.
- **Alignment:** Content is predominantly left-aligned to mimic financial ledgers, with currency values right-aligned for easy scanning of decimal points.

## Elevation & Depth

To achieve the "high-end startup" look, depth is communicated through **Tonal Layers** and **Ambient Shadows** rather than heavy borders.

- **Base Layer:** The background is a very light gray (#F8FAFC) to allow white cards to "pop."
- **Level 1 (Cards):** Use a white surface with a very soft, diffused shadow (0px 4px 20px, 4% opacity black). This creates a sense of the card hovering slightly above the interface.
- **Level 2 (Modals/Popovers):** Higher elevation with a more pronounced shadow and a 20% backdrop blur (Glassmorphism) on the background to maintain context while focusing on the task.
- **Active State:** Buttons and interactive cards should use a subtle inner glow or a 2px offset shadow when pressed to provide tactile feedback.

## Shapes

The shape language is **Rounded**, using a 0.5rem (8px) base radius. This strikes a balance between the friendliness required for a social roommate app and the precision expected from a fintech tool.

- **Primary Buttons:** Should use the `rounded-xl` (24px) or full pill-shape to make them feel approachable and distinct from data containers.
- **Input Fields:** Standard `rounded-lg` (16px) corners to match the card aesthetic.
- **Avatars:** Always circular to distinguish people from objects/categories.

## Components

### Buttons
Primary buttons use the Vibrant Blue background with white text and a subtle 10% brightness increase on hover. Secondary buttons are "Ghost" style with a Soft Blue background and Primary Blue text.

### Expense Cards
Cards feature a 3-column internal layout: Icon (Left), Description/Date (Center), and Amount (Right). The amount should be in `label-md` SemiBold.

### Input Fields
Inputs are minimalist, using a subtle bottom border or a very light gray fill. On focus, the border transitions to Primary Blue with a 1px stroke. Labels float above the input in `label-sm`.

### Split-Sliders
A custom component for meal calculation: a horizontal slider that allows users to adjust percentages visually. Use the Primary Blue for the active track and Slate Gray for the inactive track.

### Roommate Chips
Small, circular avatars with a "status ring." A blue ring indicates the person has paid their share; a gray ring indicates a pending balance.

### Progress Bars
Used for monthly budget tracking. The track should be the Secondary Soft Blue, with the filler being a gradient from Primary Blue to a slightly lighter tint to add depth.