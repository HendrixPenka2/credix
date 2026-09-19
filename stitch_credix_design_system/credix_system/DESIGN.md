---
name: Credix System
colors:
  surface: '#fcf8fa'
  surface-dim: '#dcd9db'
  surface-bright: '#fcf8fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#45464d'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#23005c'
  on-tertiary-container: '#9466ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#fcf8fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
  success-emerald: '#10B981'
  warning-amber: '#F59E0B'
  danger-rose: '#F43F5E'
  supervisor-violet: '#7C3AED'
  simulation-orange: '#FB923C'
  slate-50: '#F8FAFC'
  slate-200: '#E2E8F0'
  slate-500: '#64748B'
  slate-900: '#0F172A'
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
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  data-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-page: 32px
  card-padding: 20px
  stack-sm: 8px
  stack-md: 16px
---

## Brand & Style

The design system is engineered for a high-stakes financial environment where AI-driven clarity and "Explainable AI" (XAI) are paramount. The brand personality is **Technical, Utilitarian, and High-Trust**, drawing heavily from **Modern Corporate Fintech** aesthetics like Stripe or Bloomberg Terminal, but with the refined air of a premium SaaS.

The visual style is **Corporate / Modern** with elements of **Minimalism**. It prioritizes high data density and functional whitespace to prevent cognitive overload during complex credit risk assessments. 

### Design Principles
- **Clarity Over Flair**: Visual elements must never obscure the data.
- **Explainability (XAI)**: Complex SHAP values and model drift metrics are translated into human-readable patterns through structured hierarchy.
- **Contextual Awareness**: Distinct visual cues (role-based accents and simulation modes) ensure users always know their current environment.
- **Reliability**: A rigid 8px grid and disciplined typography ensure the platform feels stable and institutional.

## Colors

The palette uses a strict semantic logic to communicate risk and status instantly. 

- **Primary**: A deep, sophisticated Slate/Navy (`#0F172A`) used for the "Agent" role and core navigation.
- **Secondary**: Indigo (`#6366F1`) for primary actions and brand touchpoints.
- **Role Identity**: **Violet** is reserved exclusively for the Supervisor space to provide a distinct psychological shift when managing teams.
- **Risk Semantics**: 
    - **Emerald**: Positive outcomes (Accorded), stable PSI, and active states.
    - **Amber/Orange**: Staging models, manual reviews, and "Simulation Mode."
    - **Rose**: Refused applications, critical drift, and high-risk indicators.
- **Surface Strategy**:
    - **Light Mode**: Uses `slate-50` for backgrounds with white cards to create subtle depth.
    - **Dark Mode**: Uses a monochromatic dark slate scale. Surfaces are defined by 1px borders rather than shadows to maintain a flat, professional "dashboard" feel.

## Typography

This design system utilizes **Inter** exclusively to ensure maximum legibility at high data densities. 

- **Data-First Scaling**: Specific `data` roles are defined for numeric values (like the 300-850 scoring range) to ensure they stand out within KPI cards.
- **Hierarchy through Weight**: Use `Medium` (500) and `Semi-Bold` (600) weights to differentiate labels from values without increasing font size, preserving vertical space.
- **Labels**: Small caps or tracked-out labels (`0.05em`) should be used for table headers and secondary metadata.
- **Mobile Adjustments**: Headlines scale down significantly (e.g., `headline-lg` at 32px moves to 24px on mobile) to accommodate dense tabular data.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. Navigation sidebars are fixed-width to ensure tool accessibility, while content areas use a fluid 12-column grid to maximize the visibility of data tables and XAI charts.

- **The 8px Rhythm**: All component heights, padding, and margins are multiples of 8px (or 4px for tight internal spacing).
- **Page Layout**: 
    - **Sidebar**: 260px (Desktop), 0px/Drawer (Mobile).
    - **Header**: 64px height, fixed to top with a blur effect.
- **Breakpoints**:
    - **Desktop**: 1280px+ (Full 12-column).
    - **Tablet**: 768px - 1279px (8-column, sidebar collapses to icons).
    - **Mobile**: Under 768px (4-column, stacked KPI cards).

## Elevation & Depth

Visual hierarchy is managed primarily through **Tonal Layering** and **Low-Contrast Outlines** rather than aggressive shadows.

- **Light Mode**: Use "Ambient Shadows" — very soft, diffused shadows (`0px 4px 20px rgba(15, 23, 42, 0.05)`) paired with a 1px `slate-200` border.
- **Dark Mode**: Elevation is communicated via surface color shifts. Backgrounds are darker, and elevated cards use a slightly lighter slate. Shadows are disabled in Dark Mode to maintain clarity.
- **Z-Index Strategy**:
    - **Level 0**: Page background (`slate-50`).
    - **Level 1**: Content cards and tables.
    - **Level 2**: Overlays, dropdowns, and fly-outs.
    - **Level 3**: System-critical modals and toasts.

## Shapes

The shape language reflects professional precision. 

- **Controls**: Buttons and input fields use an **8px (rounded-md)** radius to feel modern yet structured.
- **Containers**: Cards, modals, and data sections use a **12px (rounded-lg)** radius to distinguish them from smaller UI elements.
- **Status Indicators**: Badges and user avatars use **Pill (Full)** rounding to stand out against the predominantly rectangular grid.
- **Charts**: Gauges (300-850) should be rendered as semi-circles with rounded end-caps for a modern fintech look.

## Components

- **KPI Cards**: Feature a `data-lg` value, a `label-md` title, and a small trend indicator (up/down arrow). In Light Mode, these have a white background and subtle 1px border.
- **Buttons**:
    - **Primary**: Solid `slate-900` or `indigo-600`.
    - **Secondary**: Ghost style with 1px border.
    - **Success/Danger**: Reserved for final actions (Accord/Refuse).
- **Status Badges**: Small, semi-transparent background with high-contrast text (e.g., Emerald-100 background with Emerald-800 text).
- **Input Fields**: 40px height, 8px radius. Active state uses a 2px indigo ring.
- **Gauges & Rings**: Used for PDO scores and "Coverage" metrics. Use a thick stroke (12px) with a subtle grey track background.
- **Decision Wizard**: A 3-step linear progress indicator at the top of the "Client Creation" form, using role-specific colors for the active state.
- **SHAP Explanation Blocks**: Use a distinctive "Audit" styling—monospaced fonts for raw values and `body-sm` for the natural language interpretation, wrapped in a light-grey container to denote "AI-generated" content.