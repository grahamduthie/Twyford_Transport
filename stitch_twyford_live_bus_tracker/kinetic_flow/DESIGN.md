---
name: Kinetic Flow
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#005a82'
  on-tertiary: '#ffffff'
  tertiary-container: '#0074a6'
  on-tertiary-container: '#e4f2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The brand personality is rooted in momentum, precision, and technological sophistication. It targets a professional, tech-savvy audience that values efficiency and clarity. The UI should evoke a sense of controlled energy—fluid yet structured.

This design system employs a **Modern Minimalist** foundation enhanced by **Glassmorphism**. By combining clean white spaces with translucent, layered navigation elements, the interface feels lightweight and futuristic. The aesthetic is "kinetic" through the use of subtle depth and clear directional hierarchy, ensuring the user always feels a sense of progress and flow.

## Colors
The palette is anchored by a high-energy primary blue, symbolizing reliability and technological innovation. 

- **Primary:** Use the crisp blue (#2563eb) for all primary actions, active states, and key brand moments.
- **Secondary:** A muted slate (#64748b) provides balance for less critical UI elements and secondary information.
- **Neutral/Background:** The primary canvas is clean white (#ffffff), with structural backgrounds using a very light grey (#f8fafc) to define distinct content areas without heavy borders.
- **Text:** Maintain high contrast using dark slate (#0f172a) for headings and slightly softer slate (#334155) for body text to ensure maximum readability in light mode.

## Typography
Typography is used to reinforce the tech-focused nature of the design system. 

- **Headlines:** Use **Sora** for its geometric, modern structure. It feels technical and progressive.
- **Body:** **Hanken Grotesk** is chosen for its exceptional legibility and contemporary humanist touch, making long-form content feel approachable.
- **Labels & Metadata:** **JetBrains Mono** is utilized for small labels, data points, and code-like metadata to provide a developer-centric, precise aesthetic.

Ensure headlines use tight letter-spacing to feel "packed" and energetic, while body text remains airy for optimal scanning.

## Layout & Spacing
The layout follows a **Fluid Grid** model based on an 8px rhythm. 

- **Grid:** Use a 12-column grid for desktop with 24px gutters.
- **Margins:** Implement wide horizontal margins (40px) on desktop to let content breathe, while mobile should compress to 16px.
- **Rhythm:** Spacing should be used to group related elements tightly (base/sm) and separate sections significantly (lg/xl) to create a visual "flow" from top to bottom.
- **Responsiveness:** On mobile, multi-column layouts should stack into a single column, prioritizing the primary action at the bottom of the screen within thumb-reach.

## Elevation & Depth
Depth is created through a blend of tonal layering and frosted glass effects rather than traditional heavy shadows.

- **Navigation & Overlays:** Use **Glassmorphism**. Apply a backdrop-filter (blur: 12px-20px) with a semi-transparent white background (#ffffff80) and a subtle 1px inner white border to simulate polished glass.
- **Floating Elements:** For cards or modals that require focus, use "Ambient Shadows"—extremely soft, low-opacity (#00000008) shadows with a wide spread (30px+) to create a sense of height without visual clutter.
- **Sub-surfaces:** Use tonal layers (background: #f8fafc) for recessed areas like code blocks or sidebar containers to differentiate from the main white canvas.

## Shapes
The shape language is consistently **Rounded**. 

- **Elements:** Standard components like buttons and input fields use a 0.5rem (8px) radius to feel modern and professional.
- **Containers:** Large cards and glassmorphic panels use a 1rem (16px) or 1.5rem (24px) radius to soften the technological aesthetic.
- **Buttons:** Interactive elements should favor the standard roundedness rather than full-pill shapes to maintain a structured, "engineered" look.

## Components
Consistent component styling ensures the kinetic energy of the design system is maintained across all touchpoints.

- **Buttons:** Primary buttons use the accent blue (#2563eb) with white text. Secondary buttons should use a ghost style with a 1px slate-200 border and slate-700 text.
- **Navigation Panels:** Always apply the glassmorphic style (blur + transparency) to top bars and sidebars to maintain context of the content beneath.
- **Input Fields:** Use a white background with a subtle slate-200 border. On focus, the border should transition to the primary blue with a soft blue outer glow.
- **Cards:** White backgrounds with no border, using a subtle ambient shadow and a 16px corner radius.
- **Chips/Badges:** Use JetBrains Mono for the text within chips. Backgrounds should be highly desaturated versions of the primary color (e.g., light blue tint) to keep the focus on the content.
- **Progress Indicators:** Use thin, high-contrast blue lines to represent the "flow" and status of system processes.