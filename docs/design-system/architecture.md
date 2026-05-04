# TendWorks Design System Architecture

Welcome to the **TendWorks Design System**. This system is built to provide a consistent, high-quality, and accessible user experience across all TendWorks products. It serves as the single source of truth for design and engineering teams.

## 1. Design Principles

Our design system is guided by these core values:

*   **Trust & Reliability**: Every interaction should feel stable and predictable.
*   **Clarity & Purpose**: Focus on the task at hand. Remove unnecessary friction.
*   **High Density, Low Noise**: Especially for enterprise tools, show more data with less clutter.
*   **Inclusive by Default**: Accessibility is not a feature; it's a requirement.

---

## 2. Token Architecture

We use a three-tier token architecture to ensure flexibility and maintainability.

### Tier 1: Global Tokens (Primitives)
Raw values without specific context.
*   **Path**: `design-system/tokens.json` -> `color.primitive.*`
*   **CSS Variable**: `--color-[palette]-[grade]` (e.g., `--color-blue-500`)

### Tier 2: Semantic Tokens (Purposeful)
Functional tokens that map primitives to their intent.
*   **Path**: `design-system/tokens.json` -> `color.semantic.*`
*   **CSS Variable**: `--color-[group]-[role]` (e.g., `--color-bg-surface`, `--color-text-primary`)

### Tier 3: Component Tokens (Specific)
Tokens scoped to a single component.
*   **Example**: `--button-bg-primary`, `--input-border-focus`

---

## 3. Foundations

### Typography
We use **Inter** for UI and **JetBrains Mono** for code/data.

| Variable | Size (rem) | Size (px) | Usage |
| :--- | :--- | :--- | :--- |
| `--text-xs` | 0.75rem | 12px | Captions, Labels |
| `--text-sm` | 0.875rem | 14px | Default UI text |
| `--text-base` | 1rem | 16px | Body copy |
| `--text-lg` | 1.125rem | 18px | Subheadings |
| `--text-2xl` | 1.5rem | 24px | Page Titles |

### Spacing
Our spacing system is based on a **4px grid**.

| Variable | Value | Usage |
| :--- | :--- | :--- |
| `--space-1` | 4px | Micro-spacing |
| `--space-4` | 16px | Standard padding |
| `--space-8` | 32px | Section gap |

---

## 4. Component API Standards

All components must follow these standard properties for consistency:

1.  **Variant**: Primary, Secondary, Ghost, Danger.
2.  **Size**: Small, Medium (Default), Large.
3.  **State**: Default, Hover, Focus, Active, Disabled, Loading.
4.  **Theme**: Light (Default), Dark.

### Example: Button API (React)
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}
```

---

## 5. Governance & Contribution

The design system is a living product.

### Proposing Changes
1.  **Audit**: Check if an existing component can solve the problem.
2.  **RFC**: Create a Request for Comments for new tokens or components.
3.  **Design**: Provide Figma mockups for all states and themes.
4.  **Review**: Get approval from at least one designer and one engineer.

### Maintenance
*   **Sync**: Design tokens are the source of truth. Changes to `tokens.json` must be transformed to all platforms.
*   **Versioning**: Follow Semantic Versioning (SemVer) for the design system package.
