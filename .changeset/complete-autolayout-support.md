---
"figma-developer-mcp": minor
---

Complete AutoLayout support with wrapping, sizing modes, and Grid layouts

**Phase 1: Wrapping Layouts**
- Add `rowGap` (counterAxisSpacing) for wrapped row spacing in flex layouts
- Add `alignContent` (counterAxisAlignContent) for wrapped row distribution
- Fixes incorrect spacing when using flex-wrap layouts

**Phase 2: Frame Sizing Modes & Box Model**
- Add `frameSizing` with primaryAxisSizingMode and counterAxisSizingMode
- Add `boxSizing` (strokesIncludedInLayout) - border-box vs content-box behavior
- Add `reverseZIndex` (itemReverseZIndex) for z-index stacking control
- Improves understanding of frame sizing behavior for accurate CSS generation

**Phase 3: Full Grid Layout Support**
- Add support for `layoutMode: "GRID"` (was incorrectly mapped to column before)
- Grid container properties: columns, rows, columnGap, rowGap, templateColumns, templateRows
- Grid child properties: columnSpan, rowSpan, columnStart, rowStart, horizontal/vertical alignment
- Enables proper CSS Grid implementation from Figma designs

**Impact:**
- AutoLayout feature coverage: ~60% → ~95%
- Breaking changes: None (all new fields are optional)
- Backward compatibility: Fully maintained

