# Figma Context MCP - Extended Layout Edition

Fork of [GLips/Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP) with enhanced Auto Layout and prototype data extraction.

## Why This Fork?

The original Framelink MCP provides basic layout information, but AI agents often struggle with:
- Complex flex layouts with wrapping
- CSS Grid layouts
- Min/max constraints
- Scroll behavior in prototypes
- Proper overflow handling

This fork exposes **significantly more layout data** from Figma, enabling AI agents to generate more accurate CSS/HTML that matches the original design.

## What's Added

### Extended Auto Layout Properties

| Property | Description | CSS Equivalent |
|----------|-------------|----------------|
| `rowGap` | Gap between wrapped rows | `row-gap` |
| `alignContent` | Distribution of wrapped rows | `align-content` |
| `frameSizing` | How frame sizes on primary/counter axis | `flex-grow`/`flex-shrink` context |
| `constraints` | Min/max width and height | `min-width`, `max-width`, `min-height`, `max-height` |
| `boxSizing` | Whether strokes affect layout | `box-sizing` |
| `clipsContent` | Content overflow behavior | `overflow: hidden` vs `visible` |
| `reverseZIndex` | Stacking order of children | `flex-direction: *-reverse` context |

### Full CSS Grid Support

| Property | Description | CSS Equivalent |
|----------|-------------|----------------|
| `grid.columns` / `grid.rows` | Grid dimensions | - |
| `grid.columnGap` / `grid.rowGap` | Grid gaps | `column-gap`, `row-gap` |
| `grid.templateColumns` / `grid.templateRows` | Column/row sizing | `grid-template-columns`, `grid-template-rows` |
| `gridPlacement.columnSpan` / `rowSpan` | Cell spanning | `grid-column: span N` |
| `gridPlacement.columnStart` / `rowStart` | Cell positioning | `grid-column-start`, `grid-row-start` |
| `gridPlacement.horizontalAlign` / `verticalAlign` | Cell alignment | `justify-self`, `align-self` |

### Prototype Scroll Behavior

| Property | Description | Use Case |
|----------|-------------|----------|
| `scrollBehavior: "fixed"` | Fixed position during scroll | Sticky headers, floating buttons |
| `scrollBehavior: "sticky"` | Sticky positioning | Scroll-aware sticky elements |

## Installation

> **Note:** You need a [Figma API access token](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens). Replace `YOUR-KEY` below with your token.

### Cursor / Windsurf / any MCP client (JSON config)

Add to your MCP configuration file (e.g. `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "Figma Extended": {
      "command": "npx",
      "args": ["-y", "figma-context-mcp-extended", "--figma-api-key=YOUR-KEY", "--stdio"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add --transport stdio figma-extended -- \
  npx -y figma-context-mcp-extended --figma-api-key=YOUR-KEY --stdio
```

Use `--scope user` to make the server available across all your projects, or `--scope project` to share a `.mcp.json` with the team.

### Build from source

```bash
git clone https://github.com/vgmakeev/Figma-Context-MCP.git
cd Figma-Context-MCP
pnpm install
pnpm build
```

Then point your MCP client to the local build:

```json
{
  "mcpServers": {
    "Figma Extended": {
      "command": "node",
      "args": ["/path/to/Figma-Context-MCP/dist/bin.js", "--figma-api-key=YOUR-KEY", "--stdio"]
    }
  }
}
```

## Example Output Comparison

### Original (GLips)
```json
{
  "layout": {
    "mode": "row",
    "gap": "16px",
    "wrap": true,
    "padding": "24px"
  }
}
```

### This Fork (Extended)
```json
{
  "layout": {
    "mode": "row",
    "gap": "16px",
    "rowGap": "24px",
    "wrap": true,
    "alignContent": "space-between",
    "padding": "24px",
    "constraints": {
      "minWidth": 320,
      "maxWidth": 1200
    },
    "clipsContent": true,
    "frameSizing": {
      "primary": "auto",
      "counter": "fixed"
    }
  }
}
```

## When to Use This Fork

Use this fork if you need:
- Accurate responsive layouts with min/max constraints
- CSS Grid implementations from Figma
- Proper handling of flex-wrap with row gaps
- Prototype scroll behavior (sticky headers, fixed elements)
- Precise overflow control

For basic layouts without these requirements, the original [GLips/Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP) works fine.

## Credits

Based on [Framelink MCP for Figma](https://github.com/GLips/Figma-Context-MCP) by [@glipsman](https://twitter.com/glipsman).
