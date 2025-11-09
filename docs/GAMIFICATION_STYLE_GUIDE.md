# Gamification Style Guide

## Overview

This document defines the gamification design system used throughout the EvolveAI app, specifically for the Journey and Weekly Training screens. This style guide ensures consistency, reusability, and maintainability across all pages.

---

## Table of Contents

1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Component Patterns](#component-patterns)
4. [Spacing & Layout](#spacing--layout)
5. [Shadows & Depth](#shadows--depth)
6. [Gradients](#gradients)
7. [Animations](#animations)
8. [Reusable Components](#reusable-components)
9. [Implementation Guidelines](#implementation-guidelines)

---

## Color Palette

### Base Colors

All colors are defined in `frontend/src/constants/colors.ts`. **Always use these variables, never hardcode colors.**

```typescript
// Background colors
background: '#0D0D1A'        // Main app background (dark navy)
card: '#1A1A26'               // Card/container background (slightly lighter)

// Brand colors
primary: '#932322'            // Primary red (main brand color)
secondary: '#236193'           // Secondary blue
tertiary: '#16B89F'           // Tertiary teal/green
purple: '#A78BFA'             // Purple (for rest days, special elements)

// Text colors
text: '#FFFFFF'               // Primary text (white)
muted: '#B3B3B3'              // Secondary/muted text (70% white)

// Semantic colors
success: '#4CAF50'
warning: '#FF9800'
error: '#F44336'
info: '#2196F3'
```

### Color Usage Rules

1. **Primary Red (`colors.primary`)**: 
   - Active states, selected items
   - Important actions, highlights
   - Current week nodes, active tabs
   - Gradient headers

2. **Secondary Blue (`colors.secondary`)**:
   - Completed states
   - Secondary actions
   - Progress indicators

3. **Tertiary Teal (`colors.tertiary`)**:
   - Completed weeks/nodes
   - Positive metrics
   - Success states

4. **Purple (`colors.purple`)**:
   - Rest days
   - Special/optional elements
   - Decorative accents

### Transparent Color Variants

Use the `createColorWithOpacity()` helper function to create transparent variants:

```typescript
import { colors, createColorWithOpacity } from '@/src/constants/colors';

// Examples
const primaryTransparent = createColorWithOpacity(colors.primary, 0.3);
const cardOverlay = createColorWithOpacity(colors.card, 0.8);
```

**Common opacity values:**
- `0.1-0.15`: Very subtle backgrounds, borders
- `0.2-0.3`: Light overlays, inactive states
- `0.4-0.5`: Medium overlays, semi-transparent elements
- `0.6-0.8`: Strong overlays, gradient backgrounds

### Pre-defined Transparent Colors

```typescript
primaryTransparent: 'rgba(147, 35, 34, 0.2)'
primaryTransparentLight: 'rgba(147, 35, 34, 0.1)'
secondaryTransparent: 'rgba(35, 97, 147, 0.2)'
tertiaryTransparent: 'rgba(22, 184, 159, 0.2)'
```

---

## Typography

### Font Weights

```typescript
'400' - Regular (normal text)
'500' - Medium (subtitles, secondary text)
'600' - Semi-bold (labels, titles)
'700' - Bold (important text, values)
'800' - Extra-bold (headers, emphasis)
```

### Font Sizes

**Headers:**
- Large headers: `17-20px` (fontWeight: '800')
- Medium headers: `14-16px` (fontWeight: '700')
- Small headers: `11-13px` (fontWeight: '600')

**Body Text:**
- Primary text: `14-16px` (fontWeight: '400' or '500')
- Secondary text: `12-14px` (fontWeight: '400')
- Small text: `9-11px` (fontWeight: '400' or '500')

**Special:**
- Stat values: `18-22px` (fontWeight: '800')
- Week numbers: `22px` (fontWeight: '700')
- Labels: `10-11px` (fontWeight: '700', letterSpacing: 0.5)

### Letter Spacing

```typescript
// Headers and labels
letterSpacing: 0.5-1.2

// Body text
letterSpacing: 0 (default)
```

### Text Colors

```typescript
// Primary text
color: colors.text

// Secondary/muted text
color: colors.muted

// Highlighted text (username, important values)
color: colors.primary

// Disabled/locked text
color: colors.muted
opacity: 0.5-0.7
```

---

## Component Patterns

### 1. Card Container

**Purpose:** Wraps content sections with consistent styling.

**Pattern:**
```typescript
<View style={styles.cardContainer}>
  {/* Optional header */}
  <LinearGradient
    colors={[colors.primary, '#6B1A1A']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.header}
  >
    <Text style={styles.headerTitle}>{title.toUpperCase()}</Text>
  </LinearGradient>
  
  {/* Content */}
  <View style={styles.content}>
    {children}
  </View>
</View>
```

**Styling:**
```typescript
cardContainer: {
  backgroundColor: colors.card,
  borderRadius: 20,
  marginHorizontal: 16,
  marginTop: 12,
  marginBottom: 16,
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 6,
}
```

**Reusable Component:** `JourneyCardContainer` (can be adapted for other sections)

---

### 2. Stat Card (KPI Cards)

**Purpose:** Display metrics with icon, value, and label.

**Pattern:**
```typescript
<View style={styles.statCard}>
  <LinearGradient
    colors={[createColorWithOpacity(color, 0.4), createColorWithOpacity(color, 0.35)]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.gradientBackground}
  >
    {/* Icon Badge */}
    <View style={styles.iconBadge}>
      <Ionicons name={icon} size={12} color={colors.text} />
    </View>
    
    {/* Value */}
    <Text style={styles.statValue}>{value}</Text>
    
    {/* Title and Subtitle */}
    <View style={styles.statTextContainer}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  </LinearGradient>
</View>
```

**Styling:**
```typescript
statCard: {
  borderRadius: 16,
  overflow: 'hidden',
  backgroundColor: colors.card,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
  elevation: 3,
}

iconBadge: {
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: createColorWithOpacity(colors.text, 0.15),
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1.5,
  borderColor: createColorWithOpacity(colors.text, 0.2),
}
```

**Reusable Component:** `ProgressSummary` (StatCard sub-component)

---

### 3. Badge/Pill Component

**Purpose:** Small decorative elements (greetings, status indicators).

**Pattern:**
```typescript
<LinearGradient
  colors={gradientColors}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={styles.badge}
>
  <Ionicons name={icon} size={20} color={colors.text} />
  <Text style={styles.badgeText}>{text}</Text>
</LinearGradient>
```

**Styling:**
```typescript
badge: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 20,
  gap: 6,
  alignSelf: 'flex-start',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
  backgroundColor: colors.card, // Base for gradient overlay
}
```

**Reusable Component:** `WelcomeHeader` (greeting badge pattern)

---

### 4. Button with Gradient

**Purpose:** Primary action buttons with gamified appearance.

**Pattern:**
```typescript
<TouchableOpacity style={styles.buttonContainer}>
  <LinearGradient
    colors={[createColorWithOpacity(colors.primary, 0.8), createColorWithOpacity(colors.primary, 0.6)]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.buttonGradient}
  >
    <Ionicons name="icon" size={18} color={colors.text} />
    <Text style={styles.buttonText}>{label}</Text>
  </LinearGradient>
</TouchableOpacity>
```

**Styling:**
```typescript
buttonContainer: {
  borderRadius: 20,
  overflow: 'hidden',
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.15,
  shadowRadius: 2,
  elevation: 2,
}

buttonGradient: {
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 20,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
}
```

---

### 5. Node/Circle Component

**Purpose:** Interactive circular elements (week nodes, status indicators).

**Pattern:**
```typescript
<TouchableOpacity
  style={[
    styles.nodeContainer,
    {
      width: nodeSize,
      height: nodeSize,
      backgroundColor: nodeColor,
    },
  ]}
>
  <View style={[styles.nodeInner, { borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.7)' }]}>
    <Text style={styles.nodeText}>{content}</Text>
    
    {/* Optional badge */}
    {isActive && (
      <View style={styles.nodeBadge}>
        <Ionicons name="flash" size={12} color={colors.text} />
      </View>
    )}
  </View>
</TouchableOpacity>
```

**Styling:**
```typescript
nodeContainer: {
  borderRadius: 50, // Perfect circle
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 4,
}

nodeInner: {
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 50,
}

nodeBadge: {
  position: 'absolute',
  top: -5,
  right: -5,
  backgroundColor: colors.warning,
  borderRadius: 12,
  width: 24,
  height: 24,
  justifyContent: 'center',
  alignItems: 'center',
}
```

**Reusable Component:** `WeekNode` (can be adapted for other circular elements)

---

## Spacing & Layout

### Standard Spacing Values

```typescript
// Container padding
paddingHorizontal: 16        // Standard horizontal padding
paddingVertical: 12           // Standard vertical padding

// Card margins
marginHorizontal: 16         // Card side margins
marginTop: 12                 // Card top margin
marginBottom: 16              // Card bottom margin

// Internal spacing
gap: 8                        // Gap between items in flex containers
padding: 20                   // Internal card padding

// Component-specific
iconBadgeSize: 28             // Icon badge dimensions
nodeSize: 50                  // Week node size
```

### Border Radius

```typescript
// Cards and containers
borderRadius: 20              // Large cards, main containers
borderRadius: 16              // Medium cards, stat cards
borderRadius: 12              // Small cards, badges

// Circular elements
borderRadius: 50              // Perfect circles (nodes, buttons)
borderRadius: 20              // Pills, rounded buttons
borderRadius: 14              // Small circular badges
```

---

## Shadows & Depth

### Shadow Patterns

**Card Shadow (Standard):**
```typescript
shadowColor: '#000',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.15,
shadowRadius: 8,
elevation: 6,
```

**Button/Interactive Shadow:**
```typescript
shadowColor: colors.primary,  // Use brand color for colored shadows
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.15,
shadowRadius: 2,
elevation: 2,
```

**Subtle Shadow (Badges, Small Elements):**
```typescript
shadowColor: '#000',
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.1,
shadowRadius: 2,
elevation: 2,
```

**Node/Element Shadow:**
```typescript
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.25,
shadowRadius: 4,
elevation: 4,
```

---

## Gradients

### Gradient Patterns

**Primary Header Gradient:**
```typescript
colors: [colors.primary, '#6B1A1A']
start: { x: 0, y: 0 }
end: { x: 1, y: 0 }
```

**Stat Card Gradient:**
```typescript
colors: [createColorWithOpacity(color, 0.4), createColorWithOpacity(color, 0.35)]
start: { x: 0, y: 0 }
end: { x: 1, y: 1 }
```

**Button Gradient:**
```typescript
colors: [createColorWithOpacity(colors.primary, 0.8), createColorWithOpacity(colors.primary, 0.6)]
start: { x: 0, y: 0 }
end: { x: 1, y: 1 }
```

**Time-based Badge Gradients:**
```typescript
// Morning
colors: [createColorWithOpacity('#FFD700', 0.3), createColorWithOpacity('#FFA500', 0.25)]

// Afternoon
colors: [createColorWithOpacity('#4DD0E1', 0.3), createColorWithOpacity('#00897B', 0.25)]

// Evening
colors: [createColorWithOpacity('#A78BFA', 0.3), createColorWithOpacity('#805AD5', 0.25)]

// Night
colors: [createColorWithOpacity('#6B7280', 0.3), createColorWithOpacity('#4B5563', 0.25)]
```

---

## Animations

### Animation Patterns

**Pulse/Glow Animation (Current Week Node):**
```typescript
const glowAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.loop(
    Animated.sequence([
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }),
    ])
  ).start();
}, []);

// Usage
<Animated.View
  style={[
    styles.glow,
    {
      opacity: glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.2, 0.5],
      }),
    },
  ]}
/>
```

**Scale Animation (Interactive Elements):**
```typescript
// On press/active state
transform: [{ scale: focused ? 1.05 : 1 }]
```

---

## Reusable Components

### Existing Reusable Components

1. **`WelcomeHeader`** - Time-based greeting with badge
   - Location: `frontend/src/components/home/WelcomeHeader.tsx`
   - Usage: Top of screens, personalized greeting

2. **`ProgressSummary`** - KPI stat cards
   - Location: `frontend/src/components/home/ProgressSummary.tsx`
   - Usage: Display metrics (streak, weekly trainings, weeks completed)

3. **`JourneyCardContainer`** - Card wrapper with header
   - Location: `frontend/src/components/training/journeyMap/JourneyCardContainer.tsx`
   - Usage: Wrap any section with consistent card styling

4. **`WeekNode`** - Circular node component
   - Location: `frontend/src/components/training/journeyMap/WeekNode.tsx`
   - Usage: Week indicators, status nodes, circular badges

5. **`CandyTabIcon`** - Tab button with gamified styling
   - Location: `frontend/components/CandyTabIcon.tsx`
   - Usage: Navigation tabs, action buttons

### Component Reusability Guidelines

1. **Extract Common Patterns:**
   - If a styling pattern appears 3+ times, create a reusable component
   - Use props for customization (colors, sizes, content)

2. **Composition Over Duplication:**
   - Build complex components from smaller reusable pieces
   - Example: `ProgressSummary` uses `StatCard` internally

3. **Style Props Pattern:**
   ```typescript
   interface ComponentProps {
     color?: string;
     size?: 'small' | 'medium' | 'large';
     variant?: 'primary' | 'secondary' | 'tertiary';
     // ... other props
   }
   ```

4. **Shared Style Constants:**
   - Create `sharedStyles.ts` for common style patterns
   - Example: `cardShadow`, `buttonGradient`, `nodeBase`

---

## Implementation Guidelines

### 1. Always Use Color Variables

❌ **Don't:**
```typescript
backgroundColor: '#932322'
color: '#FFFFFF'
```

✅ **Do:**
```typescript
backgroundColor: colors.primary
color: colors.text
```

### 2. Use Helper Functions for Transparent Colors

❌ **Don't:**
```typescript
backgroundColor: 'rgba(147, 35, 34, 0.3)'
```

✅ **Do:**
```typescript
backgroundColor: createColorWithOpacity(colors.primary, 0.3)
```

### 3. Consistent Border Radius

❌ **Don't:**
```typescript
borderRadius: 18
borderRadius: 22
```

✅ **Do:**
```typescript
borderRadius: 20  // Cards
borderRadius: 16  // Smaller cards
borderRadius: 50  // Circles
```

### 4. Standard Shadow Patterns

❌ **Don't:**
```typescript
shadowOpacity: 0.2
shadowRadius: 10
```

✅ **Do:**
```typescript
// Use standard patterns from this guide
shadowOpacity: 0.15
shadowRadius: 8
```

### 5. Responsive Design

- Use `useWindowDimensions()` for responsive layouts
- Calculate card widths dynamically based on screen size
- Use `adjustsFontSizeToFit` and `minimumFontScale` for text

**Example:**
```typescript
const { width: screenWidth } = useWindowDimensions();
const cardWidth = (screenWidth - 32 - 16) / 3; // 3 cards with padding and gaps
```

### 6. Component Structure

**Standard component structure:**
```typescript
// 1. Imports
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, createColorWithOpacity } from '@/src/constants/colors';

// 2. Interface
interface ComponentProps {
  // Props
}

// 3. Component
export const Component: React.FC<ComponentProps> = ({ props }) => {
  // Logic
  
  return (
    <View style={styles.container}>
      {/* Content */}
    </View>
  );
};

// 4. Styles
const styles = StyleSheet.create({
  container: {
    // Use color variables and standard patterns
  },
});
```

### 7. File Organization

```
components/
  ├── shared/          # Truly reusable components
  ├── home/           # Home screen components
  ├── training/       # Training screen components
  │   ├── journeyMap/
  │   ├── header/
  │   └── dailyDetail/
  └── ...
```

---

## Checklist for New Pages

When creating a new page, ensure:

- [ ] All colors use variables from `colors.ts`
- [ ] Border radius follows standard values (20, 16, 12, 50)
- [ ] Shadows use standard patterns
- [ ] Spacing follows standard values (16px horizontal, 12px vertical)
- [ ] Typography uses standard font sizes and weights
- [ ] Gradients use `createColorWithOpacity()` helper
- [ ] Components are reusable where possible
- [ ] Responsive design is considered
- [ ] Consistent with existing Journey/Training screen styling

---

## Examples

### Creating a New Stat Card

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '@/src/constants/colors';

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[createColorWithOpacity(color, 0.4), createColorWithOpacity(color, 0.35)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconBadge}>
          <Ionicons name={icon} size={12} color={colors.text} />
        </View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  gradient: {
    padding: 16,
    alignItems: 'center',
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: createColorWithOpacity(colors.text, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.text, 0.2),
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
```

---

## Summary

This style guide provides:

1. **Consistent color palette** with variables and usage rules
2. **Typography standards** for headers, body, and special text
3. **Reusable component patterns** (cards, badges, buttons, nodes)
4. **Standard spacing and layout** values
5. **Shadow and depth** patterns for visual hierarchy
6. **Gradient patterns** for gamified elements
7. **Animation guidelines** for interactive elements
8. **Implementation best practices** to ensure consistency

**Key Principles:**
- ✅ Always use color variables
- ✅ Reuse components where possible
- ✅ Follow standard spacing and sizing
- ✅ Maintain consistent visual hierarchy
- ✅ Keep gamification subtle and professional

Use this guide when creating new pages or components to ensure consistency with the existing Journey and Weekly Training screens.

