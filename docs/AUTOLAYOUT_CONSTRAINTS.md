# AutoLayout Constraints Support

## Overview

Starting from this version, Figma Context MCP now extracts and includes autolayout constraints (`minWidth`, `maxWidth`, `minHeight`, `maxHeight`) in the layout data for all nodes.

## What's Changed

### Added Properties

The `SimplifiedLayout` interface now includes a new `constraints` field:

```typescript
interface SimplifiedLayout {
  // ... existing fields ...
  constraints?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
  // ... other fields ...
}
```

### When Are Constraints Included?

Constraints are only applicable and extracted for:
- Auto-layout frames (frames with `layoutMode` set to `HORIZONTAL`, `VERTICAL`, or `GRID`)
- Direct children of auto-layout frames

According to Figma API documentation, these properties define:
- **minWidth**: The minimum width of the component
- **maxWidth**: The maximum width of the component
- **minHeight**: The minimum height of the component
- **maxHeight**: The maximum height of the component

### Example Output

Before (without constraints):

```yaml
layout:
  mode: row
  gap: 16px
  sizing:
    horizontal: hug
    vertical: fixed
  dimensions:
    height: 48
```

After (with constraints):

```yaml
layout:
  mode: row
  gap: 16px
  sizing:
    horizontal: hug
    vertical: fixed
  constraints:
    minWidth: 320
    maxWidth: 1200
  dimensions:
    height: 48
```

## Use Cases

This enhancement allows AI coding assistants to:

1. **Generate more accurate responsive layouts**: Understanding min/max constraints helps create proper responsive CSS
2. **Respect design constraints**: Ensures implementations match designer intentions
3. **Create better media queries**: Knowing width/height constraints aids in breakpoint decisions
4. **Improve component flexibility**: Better understanding of component sizing behavior

## Implementation Details

The constraints are extracted from Figma REST API's `HasLayoutTrait` interface, which is available on nodes that support layout properties. All constraint values are rounded to the nearest pixel using the `pixelRound` utility function for consistency with other dimension values.

## Migration

No migration needed - this is a non-breaking change that adds additional optional data to the response.

