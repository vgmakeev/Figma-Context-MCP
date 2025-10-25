import { isInAutoLayoutFlow, isFrame, isLayout, isRectangle } from "~/utils/identity.js";
import type {
  Node as FigmaDocumentNode,
  HasFramePropertiesTrait,
  HasLayoutTrait,
} from "@figma/rest-api-spec";
import { generateCSSShorthand, pixelRound } from "~/utils/common.js";

export interface SimplifiedLayout {
  mode: "none" | "row" | "column" | "grid";
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "baseline" | "stretch";
  alignItems?: "flex-start" | "flex-end" | "center" | "space-between" | "baseline" | "stretch";
  alignSelf?: "flex-start" | "flex-end" | "center" | "stretch";
  wrap?: boolean;
  gap?: string;
  rowGap?: string; // counterAxisSpacing - distance between wrapped rows
  alignContent?: "auto" | "space-between"; // counterAxisAlignContent - alignment of wrapped rows
  locationRelativeToParent?: {
    x: number;
    y: number;
  };
  dimensions?: {
    width?: number;
    height?: number;
    aspectRatio?: number;
  };
  padding?: string;
  sizing?: {
    horizontal?: "fixed" | "fill" | "hug";
    vertical?: "fixed" | "fill" | "hug";
  };
  frameSizing?: {
    primary: "fixed" | "auto"; // primaryAxisSizingMode - how frame sizes along primary axis
    counter: "fixed" | "auto"; // counterAxisSizingMode - how frame sizes along counter axis
  };
  constraints?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
  boxSizing?: "border-box" | "content-box"; // strokesIncludedInLayout - whether strokes affect layout calculations
  reverseZIndex?: boolean; // itemReverseZIndex - whether first child draws on top
  grid?: {
    columns?: number; // gridColumnCount
    rows?: number; // gridRowCount
    columnGap?: string; // gridColumnGap
    rowGap?: string; // gridRowGap
    templateColumns?: string; // gridColumnsSizing - CSS grid-template-columns
    templateRows?: string; // gridRowsSizing - CSS grid-template-rows
  };
  gridPlacement?: {
    columnSpan?: number; // gridColumnSpan
    rowSpan?: number; // gridRowSpan
    columnStart?: number; // gridColumnAnchorIndex + 1 (CSS is 1-based)
    rowStart?: number; // gridRowAnchorIndex + 1
    horizontalAlign?: "auto" | "start" | "center" | "end"; // gridChildHorizontalAlign
    verticalAlign?: "auto" | "start" | "center" | "end"; // gridChildVerticalAlign
  };
  overflowScroll?: ("x" | "y")[];
  position?: "absolute";
}

// Convert Figma's layout config into a more typical flex-like schema
export function buildSimplifiedLayout(
  n: FigmaDocumentNode,
  parent?: FigmaDocumentNode,
): SimplifiedLayout {
  const frameValues = buildSimplifiedFrameValues(n);
  const layoutValues = buildSimplifiedLayoutValues(n, parent, frameValues.mode) || {};

  return { ...frameValues, ...layoutValues };
}

// For flex layouts, process alignment and sizing
function convertAlign(
  axisAlign?:
    | HasFramePropertiesTrait["primaryAxisAlignItems"]
    | HasFramePropertiesTrait["counterAxisAlignItems"],
  stretch?: {
    children: FigmaDocumentNode[];
    axis: "primary" | "counter";
    mode: "row" | "column" | "none";
  },
) {
  if (stretch && stretch.mode !== "none") {
    const { children, mode, axis } = stretch;

    // Compute whether to check horizontally or vertically based on axis and direction
    const direction = getDirection(axis, mode);

    const shouldStretch =
      children.length > 0 &&
      children.reduce((shouldStretch, c) => {
        if (!shouldStretch) return false;
        if ("layoutPositioning" in c && c.layoutPositioning === "ABSOLUTE") return true;
        if (direction === "horizontal") {
          return "layoutSizingHorizontal" in c && c.layoutSizingHorizontal === "FILL";
        } else if (direction === "vertical") {
          return "layoutSizingVertical" in c && c.layoutSizingVertical === "FILL";
        }
        return false;
      }, true);

    if (shouldStretch) return "stretch";
  }

  switch (axisAlign) {
    case "MIN":
      // MIN, AKA flex-start, is the default alignment
      return undefined;
    case "MAX":
      return "flex-end";
    case "CENTER":
      return "center";
    case "SPACE_BETWEEN":
      return "space-between";
    case "BASELINE":
      return "baseline";
    default:
      return undefined;
  }
}

function convertSelfAlign(align?: HasLayoutTrait["layoutAlign"]) {
  switch (align) {
    case "MIN":
      // MIN, AKA flex-start, is the default alignment
      return undefined;
    case "MAX":
      return "flex-end";
    case "CENTER":
      return "center";
    case "STRETCH":
      return "stretch";
    default:
      return undefined;
  }
}

// interpret sizing
function convertSizing(
  s?: HasLayoutTrait["layoutSizingHorizontal"] | HasLayoutTrait["layoutSizingVertical"],
) {
  if (s === "FIXED") return "fixed";
  if (s === "FILL") return "fill";
  if (s === "HUG") return "hug";
  return undefined;
}

// interpret frame sizing mode
function convertSizingMode(
  mode?: HasFramePropertiesTrait["primaryAxisSizingMode"] | 
         HasFramePropertiesTrait["counterAxisSizingMode"],
): "fixed" | "auto" | undefined {
  if (mode === "FIXED") return "fixed";
  if (mode === "AUTO") return "auto";
  return undefined;
}

// interpret grid alignment
function convertGridAlign(
  align?: "AUTO" | "MIN" | "CENTER" | "MAX"
): "auto" | "start" | "center" | "end" | undefined {
  switch (align) {
    case "AUTO":
      return "auto";
    case "MIN":
      return "start";
    case "CENTER":
      return "center";
    case "MAX":
      return "end";
    default:
      return undefined;
  }
}

function getDirection(
  axis: "primary" | "counter",
  mode: "row" | "column",
): "horizontal" | "vertical" {
  switch (axis) {
    case "primary":
      switch (mode) {
        case "row":
          return "horizontal";
        case "column":
          return "vertical";
      }
    case "counter":
      switch (mode) {
        case "row":
          return "horizontal";
        case "column":
          return "vertical";
      }
  }
}

function buildSimplifiedFrameValues(n: FigmaDocumentNode): SimplifiedLayout | { mode: "none" } {
  if (!isFrame(n)) {
    return { mode: "none" };
  }

  const frameValues: SimplifiedLayout = {
    mode:
      !n.layoutMode || n.layoutMode === "NONE"
        ? "none"
        : n.layoutMode === "HORIZONTAL"
          ? "row"
          : n.layoutMode === "VERTICAL"
            ? "column"
            : "grid",
  };

  const overflowScroll: SimplifiedLayout["overflowScroll"] = [];
  if (n.overflowDirection?.includes("HORIZONTAL")) overflowScroll.push("x");
  if (n.overflowDirection?.includes("VERTICAL")) overflowScroll.push("y");
  if (overflowScroll.length > 0) frameValues.overflowScroll = overflowScroll;

  if (frameValues.mode === "none") {
    return frameValues;
  }

  // Grid layout handling
  if (frameValues.mode === "grid") {
    const grid: SimplifiedLayout["grid"] = {};
    
    if (n.gridColumnCount !== undefined) grid.columns = n.gridColumnCount;
    if (n.gridRowCount !== undefined) grid.rows = n.gridRowCount;
    if (n.gridColumnGap !== undefined) grid.columnGap = `${n.gridColumnGap}px`;
    if (n.gridRowGap !== undefined) grid.rowGap = `${n.gridRowGap}px`;
    if (n.gridColumnsSizing) grid.templateColumns = n.gridColumnsSizing;
    if (n.gridRowsSizing) grid.templateRows = n.gridRowsSizing;
    
    if (Object.keys(grid).length > 0) {
      frameValues.grid = grid;
    }
    
    // Grid frames don't use flex properties, but still need padding and common properties
    // Add padding
    if (n.paddingTop || n.paddingBottom || n.paddingLeft || n.paddingRight) {
      frameValues.padding = generateCSSShorthand({
        top: n.paddingTop ?? 0,
        right: n.paddingRight ?? 0,
        bottom: n.paddingBottom ?? 0,
        left: n.paddingLeft ?? 0,
      });
    }
    
    // Add common frame properties (sizing modes, box sizing, etc.)
    // These apply to both flex and grid
    const primarySizing = convertSizingMode(n.primaryAxisSizingMode);
    const counterSizing = convertSizingMode(n.counterAxisSizingMode);
    
    if (primarySizing || counterSizing) {
      frameValues.frameSizing = {
        primary: primarySizing || "auto",
        counter: counterSizing || "auto",
      };
    }

    if (n.strokesIncludedInLayout !== undefined) {
      frameValues.boxSizing = n.strokesIncludedInLayout ? "border-box" : "content-box";
    }

    if (n.itemReverseZIndex === true) {
      frameValues.reverseZIndex = true;
    }
    
    return frameValues;
  }

  // TODO: convertAlign should be two functions, one for justifyContent and one for alignItems
  frameValues.justifyContent = convertAlign(n.primaryAxisAlignItems ?? "MIN", {
    children: n.children,
    axis: "primary",
    mode: frameValues.mode,
  });
  frameValues.alignItems = convertAlign(n.counterAxisAlignItems ?? "MIN", {
    children: n.children,
    axis: "counter",
    mode: frameValues.mode,
  });
  frameValues.alignSelf = convertSelfAlign(n.layoutAlign);

  // Only include wrap if it's set to WRAP, since flex layouts don't default to wrapping
  frameValues.wrap = n.layoutWrap === "WRAP" ? true : undefined;
  frameValues.gap = n.itemSpacing ? `${n.itemSpacing ?? 0}px` : undefined;
  
  // Wrapping layout properties (only for WRAP mode)
  if (n.layoutWrap === "WRAP") {
    // Row gap (distance between wrapped rows)
    if (n.counterAxisSpacing !== undefined) {
      frameValues.rowGap = `${n.counterAxisSpacing}px`;
    }
    
    // Align content (how wrapped rows are distributed)
    if (n.counterAxisAlignContent) {
      frameValues.alignContent = 
        n.counterAxisAlignContent === "SPACE_BETWEEN" ? "space-between" : "auto";
    }
  }
  
  // gather padding
  if (n.paddingTop || n.paddingBottom || n.paddingLeft || n.paddingRight) {
    frameValues.padding = generateCSSShorthand({
      top: n.paddingTop ?? 0,
      right: n.paddingRight ?? 0,
      bottom: n.paddingBottom ?? 0,
      left: n.paddingLeft ?? 0,
    });
  }

  // Frame sizing modes (how frame itself sizes)
  const primarySizing = convertSizingMode(n.primaryAxisSizingMode);
  const counterSizing = convertSizingMode(n.counterAxisSizingMode);
  
  if (primarySizing || counterSizing) {
    frameValues.frameSizing = {
      primary: primarySizing || "auto",
      counter: counterSizing || "auto",
    };
  }

  // Box sizing (whether strokes are included in layout calculations)
  if (n.strokesIncludedInLayout !== undefined) {
    frameValues.boxSizing = n.strokesIncludedInLayout ? "border-box" : "content-box";
  }

  // Z-index stacking order
  if (n.itemReverseZIndex === true) {
    frameValues.reverseZIndex = true;
  }

  return frameValues;
}

function buildSimplifiedLayoutValues(
  n: FigmaDocumentNode,
  parent: FigmaDocumentNode | undefined,
  mode: "row" | "column" | "grid" | "none",
): SimplifiedLayout | undefined {
  if (!isLayout(n)) return undefined;

  const layoutValues: SimplifiedLayout = { mode };

  // Grid child properties
  if (isFrame(parent) && parent.layoutMode === "GRID") {
    const gridPlacement: SimplifiedLayout["gridPlacement"] = {};
    
    if (n.gridColumnSpan !== undefined) gridPlacement.columnSpan = n.gridColumnSpan;
    if (n.gridRowSpan !== undefined) gridPlacement.rowSpan = n.gridRowSpan;
    
    // Convert 0-based index to 1-based CSS grid line number
    if (n.gridColumnAnchorIndex !== undefined) {
      gridPlacement.columnStart = n.gridColumnAnchorIndex + 1;
    }
    if (n.gridRowAnchorIndex !== undefined) {
      gridPlacement.rowStart = n.gridRowAnchorIndex + 1;
    }
    
    if (n.gridChildHorizontalAlign) {
      gridPlacement.horizontalAlign = convertGridAlign(n.gridChildHorizontalAlign);
    }
    if (n.gridChildVerticalAlign) {
      gridPlacement.verticalAlign = convertGridAlign(n.gridChildVerticalAlign);
    }
    
    if (Object.keys(gridPlacement).length > 0) {
      layoutValues.gridPlacement = gridPlacement;
    }
  }

  layoutValues.sizing = {
    horizontal: convertSizing(n.layoutSizingHorizontal),
    vertical: convertSizing(n.layoutSizingVertical),
  };

  // Extract autolayout constraints (minWidth, maxWidth, minHeight, maxHeight)
  // These properties are only applicable for auto-layout frames or direct children of auto-layout frames
  const constraints: SimplifiedLayout["constraints"] = {};
  if (n.minWidth !== undefined) constraints.minWidth = pixelRound(n.minWidth);
  if (n.maxWidth !== undefined) constraints.maxWidth = pixelRound(n.maxWidth);
  if (n.minHeight !== undefined) constraints.minHeight = pixelRound(n.minHeight);
  if (n.maxHeight !== undefined) constraints.maxHeight = pixelRound(n.maxHeight);
  if (Object.keys(constraints).length > 0) {
    layoutValues.constraints = constraints;
  }

  // Only include positioning-related properties if parent layout isn't flex or if the node is absolute
  if (
    // If parent is a frame but not an AutoLayout, or if the node is absolute, include positioning-related properties
    isFrame(parent) &&
    !isInAutoLayoutFlow(n, parent)
  ) {
    if (n.layoutPositioning === "ABSOLUTE") {
      layoutValues.position = "absolute";
    }
    if (n.absoluteBoundingBox && parent.absoluteBoundingBox) {
      layoutValues.locationRelativeToParent = {
        x: pixelRound(n.absoluteBoundingBox.x - parent.absoluteBoundingBox.x),
        y: pixelRound(n.absoluteBoundingBox.y - parent.absoluteBoundingBox.y),
      };
    }
  }

  // Handle dimensions based on layout growth and alignment
  if (isRectangle("absoluteBoundingBox", n)) {
    const dimensions: { width?: number; height?: number; aspectRatio?: number } = {};

    // Only include dimensions that aren't meant to stretch
    if (mode === "row") {
      // AutoLayout row, only include dimensions if the node is not growing
      if (!n.layoutGrow && n.layoutSizingHorizontal == "FIXED")
        dimensions.width = n.absoluteBoundingBox.width;
      if (n.layoutAlign !== "STRETCH" && n.layoutSizingVertical == "FIXED")
        dimensions.height = n.absoluteBoundingBox.height;
    } else if (mode === "column") {
      // AutoLayout column, only include dimensions if the node is not growing
      if (n.layoutAlign !== "STRETCH" && n.layoutSizingHorizontal == "FIXED")
        dimensions.width = n.absoluteBoundingBox.width;
      if (!n.layoutGrow && n.layoutSizingVertical == "FIXED")
        dimensions.height = n.absoluteBoundingBox.height;

      if (n.preserveRatio) {
        dimensions.aspectRatio = n.absoluteBoundingBox?.width / n.absoluteBoundingBox?.height;
      }
    } else {
      // Node is not an AutoLayout. Include dimensions if the node is not growing (which it should never be)
      if (!n.layoutSizingHorizontal || n.layoutSizingHorizontal === "FIXED") {
        dimensions.width = n.absoluteBoundingBox.width;
      }
      if (!n.layoutSizingVertical || n.layoutSizingVertical === "FIXED") {
        dimensions.height = n.absoluteBoundingBox.height;
      }
    }

    if (Object.keys(dimensions).length > 0) {
      if (dimensions.width) {
        dimensions.width = pixelRound(dimensions.width);
      }
      if (dimensions.height) {
        dimensions.height = pixelRound(dimensions.height);
      }
      layoutValues.dimensions = dimensions;
    }
  }

  return layoutValues;
}
