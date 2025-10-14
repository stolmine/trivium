# Trivium Design System

This document outlines the design system for Trivium, ensuring consistency across the application.

## Typography

### Font Families

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-serif: 'Charter', 'Georgia', 'Cambria', serif;
```

- **UI Elements**: Use `Inter` (sans-serif) for all interface elements
- **Reading Content**: Use `Charter`/`Georgia` (serif) for optimal reading experience

### Type Scale

| Element | Size | Line Height | Weight | Usage |
|---------|------|-------------|--------|-------|
| h1 | 36px (2.25rem) | 40px (2.5rem) | 700 | Page titles |
| h2 | 30px (1.875rem) | 36px (2.25rem) | 600 | Section headers |
| h3 | 24px (1.5rem) | 32px (2rem) | 600 | Subsection headers |
| h4 | 20px (1.25rem) | 28px (1.75rem) | 600 | Card titles |
| Body | 16px (1rem) | 24px (1.5rem) | 400 | Default text |
| Small | 14px (0.875rem) | 20px (1.25rem) | 400 | Metadata, captions |
| Reading | 20px (1.25rem) | 36px (1.8) | 400 | Main content text |

### Reading Content Guidelines

- Max width: 70ch for optimal readability
- Font: Serif (Charter/Georgia)
- Font size: 20px (text-xl)
- Line height: 1.8 (leading-relaxed)
- Paragraph spacing: 1rem (space-y-4)

## Color System

### Light Mode

```css
--background: oklch(1 0 0);           /* Pure white */
--foreground: oklch(0.145 0 0);      /* Near black */
--muted-foreground: oklch(0.48 0 0); /* Medium gray (WCAG AA) */
--border: oklch(0.922 0 0);          /* Light gray */
--card: oklch(1 0 0);                /* White */
--primary: oklch(0.205 0 0);         /* Dark gray */
```

### Dark Mode

```css
--background: oklch(0.145 0 0);      /* Near black */
--foreground: oklch(0.95 0 0);       /* Off-white (reduces eye strain) */
--muted-foreground: oklch(0.75 0 0); /* Light gray (WCAG AA) */
--border: oklch(1 0 0 / 10%);        /* Subtle border */
--card: oklch(0.205 0 0);            /* Dark card */
--primary: oklch(0.922 0 0);         /* Light gray */
```

### Contrast Requirements

All text must meet WCAG AA standards:
- Normal text: 4.5:1 contrast ratio minimum
- Large text (18px+): 3:1 contrast ratio minimum
- UI components: 3:1 contrast ratio minimum

## Spacing System

Based on 4px base unit:

| Token | Value | Usage |
|-------|-------|-------|
| 1 | 4px | Tight spacing |
| 2 | 8px | Close spacing |
| 3 | 12px | Default spacing |
| 4 | 16px | Comfortable spacing |
| 6 | 24px | Section spacing |
| 8 | 32px | Large section spacing |
| 12 | 48px | Page-level spacing |

### Component Spacing

- **Dashboard Cards**: p-8 (32px padding)
- **Card Grid Gap**: gap-8 (32px between cards)
- **Section Margins**: mb-8 (32px bottom margin)
- **Content Padding**: px-8 py-12 (32px horizontal, 48px vertical)

## Layout

### Sidebar

- Expanded width: 256px
- Collapsed width: 64px
- Transition duration: 300ms
- Easing: cubic-bezier(0.4, 0, 0.2, 1)

### Main Content Areas

- Dashboard: max-w-6xl
- Reading: max-w-4xl
- Review: max-w-2xl

## Shadows

Shadows provide depth and visual hierarchy:

```css
.shadow-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05);
}

.shadow-card-hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05);
}

.shadow-modal {
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
}

.shadow-dropdown {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05);
}
```

### Usage

- Cards: `shadow-card` by default
- Interactive cards: `hover-lift` (includes scale and shadow transition)
- Modals/Dialogs: `shadow-modal`
- Dropdowns: `shadow-dropdown`

## Animation Principles

### Duration

- Fast: 150ms - Micro-interactions (hover, focus)
- Normal: 200ms - View transitions, page changes
- Slow: 300ms - Sidebar collapse, major layout changes

### Easing

```css
--easing-standard: cubic-bezier(0.4, 0, 0.2, 1);    /* Default */
--easing-accelerate: cubic-bezier(0.4, 0, 1, 1);    /* Exit */
--easing-decelerate: cubic-bezier(0, 0, 0.2, 1);    /* Enter */
```

### Micro-Animations

- **Button Hover**: Scale 1.02, 150ms
- **Card Hover**: Scale 1.01, shadow increase, 150ms
- **Link Hover**: Opacity 0.8, 150ms
- **Focus Ring**: 2px outline with 2px offset

### Reduced Motion

Always respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Component Guidelines

### Cards

```tsx
<div className="border rounded-lg p-8 shadow-card hover-lift bg-card">
  <h2 className="text-lg font-semibold mb-6">Card Title</h2>
  {/* Content */}
</div>
```

- Border radius: rounded-lg (0.625rem)
- Padding: p-8 (32px)
- Background: bg-card
- Shadow: shadow-card
- Interactive: hover-lift

### Buttons

- Primary: High contrast, clear CTA
- Secondary: Outlined, less prominent
- Ghost: Minimal, for tertiary actions
- Destructive: Red, for dangerous actions

All buttons should:
- Have clear hover states
- Include focus indicators
- Show loading states when async
- Be disabled appropriately

### Forms

- Focus rings: 2px ring with theme color
- Error states: Red accent with helper text
- Success states: Green accent
- Helper text: text-muted-foreground

### Empty States

```tsx
<EmptyState
  icon={IconComponent}
  title="Empty State Title"
  description="Helpful message about why it's empty"
  action={{ label: "Action", onClick: handler }}
/>
```

- Center-aligned
- Icon in muted circle
- Clear title and description
- Optional action button

### Loading States

Use skeleton loaders instead of spinners:
- `SkeletonCard` for cards
- `SkeletonText` for text content
- `SkeletonList` for lists
- Animated shimmer effect

## Accessibility

### Focus Management

- Visible focus indicators on all interactive elements
- Focus traps in modals
- Focus returns to appropriate element after modal closes
- Skip links for keyboard users

### ARIA

- Proper heading hierarchy (h1 → h2 → h3)
- Live regions for dynamic content
- Status messages for screen readers
- Descriptive labels for all controls

### Keyboard Navigation

- Tab order is logical throughout
- All interactive elements are focusable
- Arrow keys for tree navigation
- Escape to close modals
- Shortcuts documented in help overlay

## Responsive Design

### Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Adaptations

- Dashboard grid: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)
- Sidebar: Auto-collapse on mobile
- Reading view: Full width on mobile with adjusted padding
- Touch targets: Minimum 44x44px on mobile

## Best Practices

1. **Consistency**: Use design tokens consistently across all components
2. **Hierarchy**: Establish clear visual hierarchy with typography and spacing
3. **Feedback**: Provide immediate visual feedback for all interactions
4. **Progressive Enhancement**: Core functionality works without JavaScript
5. **Performance**: Lazy load routes, memoize expensive components
6. **Accessibility**: Follow WCAG AA standards at minimum
7. **Dark Mode**: Test all components in both themes
8. **Motion**: Respect prefers-reduced-motion
9. **Error Handling**: Provide clear, actionable error messages
10. **Loading States**: Never leave users wondering if something is happening

## Icons

- Library: Lucide React
- Size: h-5 w-5 (20px) for UI icons
- Color: Inherits from parent or text-muted-foreground
- Consistent stroke width

## Code Style

### Utility Classes

Prefer Tailwind utilities over custom CSS:
- Use semantic class names when needed
- Keep specificity low
- Follow mobile-first approach

### Component Structure

```tsx
export function Component() {
  // 1. Hooks
  // 2. State
  // 3. Effects
  // 4. Event handlers
  // 5. Render helpers
  // 6. Early returns (loading, error, empty)
  // 7. Main render
}
```

### Performance

- Use React.memo for expensive components
- useMemo for expensive calculations
- useCallback for event handlers passed to children
- Code split routes with lazy loading
- Virtualize long lists (>100 items)

---

This design system ensures Trivium maintains a consistent, professional, and accessible interface throughout the application.
