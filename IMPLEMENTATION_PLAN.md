# План реализации всех упущенных AutoLayout свойств

## Общая стратегия

**Цель:** Добавить поддержку всех важных AutoLayout свойств из Figma REST API в три фазы.

**Подход:**
1. Обновить TypeScript интерфейсы
2. Добавить логику извлечения из Figma API
3. Протестировать на реальных Figma файлах
4. Документировать изменения

---

## Фаза 1: Wrapping Layouts Support (Quick Win)

**Приоритет:** ⭐⭐⭐⭐⭐ КРИТИЧНО  
**Сложность:** 🟢 Низкая  
**Время:** ~15 минут

### Задачи

#### 1.1. Обновить SimplifiedLayout интерфейс

**Файл:** `src/transformers/layout.ts`

```typescript
export interface SimplifiedLayout {
  mode: "none" | "row" | "column";
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "baseline" | "stretch";
  alignItems?: "flex-start" | "flex-end" | "center" | "space-between" | "baseline" | "stretch";
  alignSelf?: "flex-start" | "flex-end" | "center" | "stretch";
  wrap?: boolean;
  gap?: string;  // itemSpacing - расстояние между элементами
  
  // 🆕 НОВОЕ: Wrapping layout support
  rowGap?: string;  // counterAxisSpacing - расстояние между обернутыми рядами
  alignContent?: "auto" | "space-between";  // counterAxisAlignContent
  
  // ... остальные поля
}
```

**Изменения:**
- Добавить `rowGap?: string` для `counterAxisSpacing`
- Добавить `alignContent?: "auto" | "space-between"` для `counterAxisAlignContent`

**Логика:**
- `rowGap` используется только если `wrap === true`
- Если `rowGap` не задан, используется `gap` (как в CSS)

#### 1.2. Извлечение данных из Figma API

**Файл:** `src/transformers/layout.ts`  
**Функция:** `buildSimplifiedFrameValues`

```typescript
function buildSimplifiedFrameValues(n: FigmaDocumentNode): SimplifiedLayout | { mode: "none" } {
  // ... существующий код ...

  // Only include wrap if it's set to WRAP
  frameValues.wrap = n.layoutWrap === "WRAP" ? true : undefined;
  
  // Main gap (itemSpacing)
  frameValues.gap = n.itemSpacing ? `${n.itemSpacing}px` : undefined;
  
  // 🆕 НОВОЕ: Row gap for wrapping layouts
  if (n.layoutWrap === "WRAP" && n.counterAxisSpacing !== undefined) {
    frameValues.rowGap = `${n.counterAxisSpacing}px`;
  }
  
  // 🆕 НОВОЕ: Align content for wrapping layouts
  if (n.layoutWrap === "WRAP" && n.counterAxisAlignContent) {
    frameValues.alignContent = 
      n.counterAxisAlignContent === "SPACE_BETWEEN" ? "space-between" : "auto";
  }

  // ... остальной код ...
}
```

#### 1.3. Тестирование

**Требования для теста:**
- Найти Figma файл с wrap layout
- У которого `layoutWrap: "WRAP"`
- И `counterAxisSpacing` задан (отличается от `itemSpacing`)

**Ожидаемый результат:**
```yaml
layout:
  mode: row
  wrap: true
  gap: 16px          # itemSpacing
  rowGap: 32px       # counterAxisSpacing
  alignContent: space-between  # counterAxisAlignContent
```

---

## Фаза 2: Frame Sizing Modes & Box Sizing

**Приоритет:** ⭐⭐⭐⭐ Очень важно  
**Сложность:** 🟡 Средняя  
**Время:** ~20 минут

### Задачи

#### 2.1. Обновить SimplifiedLayout интерфейс

**Файл:** `src/transformers/layout.ts`

```typescript
export interface SimplifiedLayout {
  // ... существующие поля ...
  
  // 🆕 НОВОЕ: Frame sizing modes
  frameSizing?: {
    primary: "fixed" | "auto";   // primaryAxisSizingMode
    counter: "fixed" | "auto";   // counterAxisSizingMode
  };
  
  // 🆕 НОВОЕ: Box sizing behavior
  boxSizing?: "border-box" | "content-box";  // strokesIncludedInLayout
  
  // 🆕 НОВОЕ: Z-index stacking order
  reverseZIndex?: boolean;  // itemReverseZIndex
  
  // ... остальные поля
}
```

**Новые поля:**
1. `frameSizing` - как сам фрейм определяет размеры
2. `boxSizing` - как учитываются borders в размерах
3. `reverseZIndex` - порядок наложения элементов

#### 2.2. Конвертер для sizing modes

**Новая функция:**

```typescript
function convertSizingMode(
  mode?: HasFramePropertiesTrait["primaryAxisSizingMode"] | 
         HasFramePropertiesTrait["counterAxisSizingMode"]
): "fixed" | "auto" | undefined {
  if (mode === "FIXED") return "fixed";
  if (mode === "AUTO") return "auto";
  return undefined;
}
```

#### 2.3. Извлечение данных из Figma API

**Файл:** `src/transformers/layout.ts`  
**Функция:** `buildSimplifiedFrameValues`

```typescript
function buildSimplifiedFrameValues(n: FigmaDocumentNode): SimplifiedLayout | { mode: "none" } {
  // ... существующий код ...

  if (frameValues.mode === "none") {
    return frameValues;
  }

  // Existing alignment code...
  
  // 🆕 НОВОЕ: Frame sizing modes
  const primarySizing = convertSizingMode(n.primaryAxisSizingMode);
  const counterSizing = convertSizingMode(n.counterAxisSizingMode);
  
  if (primarySizing || counterSizing) {
    frameValues.frameSizing = {
      primary: primarySizing || "auto",
      counter: counterSizing || "auto",
    };
  }
  
  // 🆕 НОВОЕ: Box sizing (border-box vs content-box)
  if (n.strokesIncludedInLayout !== undefined) {
    frameValues.boxSizing = n.strokesIncludedInLayout ? "border-box" : "content-box";
  }
  
  // 🆕 НОВОЕ: Reverse Z-index
  if (n.itemReverseZIndex === true) {
    frameValues.reverseZIndex = true;
  }

  // ... остальной код ...
}
```

#### 2.4. Тестирование

**Требования для теста:**
- Auto-layout фрейм с `primaryAxisSizingMode: "AUTO"`
- Фрейм с borders и `strokesIncludedInLayout: true`

**Ожидаемый результат:**
```yaml
layout:
  mode: row
  frameSizing:
    primary: auto
    counter: fixed
  boxSizing: border-box
  reverseZIndex: true
```

---

## Фаза 3: Full Grid Layout Support (Major)

**Приоритет:** ⭐⭐⭐⭐⭐ КРИТИЧНО для современных дизайнов  
**Сложность:** 🔴 Высокая  
**Время:** ~30-40 минут

### Архитектурные решения

#### Проблема: `layoutMode: "GRID"` сейчас не поддерживается

**Текущее состояние:**
```typescript
mode: !n.layoutMode || n.layoutMode === "NONE"
  ? "none"
  : n.layoutMode === "HORIZONTAL"
    ? "row"
    : "column",  // ❌ GRID попадает сюда!
```

**Решение:** Добавить обработку GRID

### Задачи

#### 3.1. Расширить SimplifiedLayout интерфейс

**Файл:** `src/transformers/layout.ts`

```typescript
export interface SimplifiedLayout {
  // 🆕 ИЗМЕНЕНО: добавить "grid" в union type
  mode: "none" | "row" | "column" | "grid";
  
  // Эти поля только для row/column (flex)
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "baseline" | "stretch";
  alignItems?: "flex-start" | "flex-end" | "center" | "space-between" | "baseline" | "stretch";
  wrap?: boolean;
  gap?: string;
  rowGap?: string;
  
  // 🆕 НОВОЕ: Grid layout properties (только для mode: "grid")
  grid?: {
    columns?: number;        // gridColumnCount
    rows?: number;          // gridRowCount
    columnGap?: string;     // gridColumnGap
    rowGap?: string;        // gridRowGap
    templateColumns?: string;  // gridColumnsSizing (CSS grid-template-columns)
    templateRows?: string;     // gridRowsSizing (CSS grid-template-rows)
  };
  
  // 🆕 НОВОЕ: Grid child placement (для детей grid контейнера)
  gridPlacement?: {
    columnSpan?: number;      // gridColumnSpan
    rowSpan?: number;         // gridRowSpan
    columnStart?: number;     // gridColumnAnchorIndex + 1 (CSS is 1-based)
    rowStart?: number;        // gridRowAnchorIndex + 1
    horizontalAlign?: "auto" | "start" | "center" | "end";  // gridChildHorizontalAlign
    verticalAlign?: "auto" | "start" | "center" | "end";    // gridChildVerticalAlign
  };
  
  // ... остальные поля
}
```

#### 3.2. Обновить buildSimplifiedFrameValues для Grid

**Файл:** `src/transformers/layout.ts`

```typescript
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
            : "grid",  // 🆕 НОВОЕ: поддержка GRID
  };

  // ... overflow scroll code ...

  if (frameValues.mode === "none") {
    return frameValues;
  }

  // 🆕 НОВОЕ: Grid layout handling
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
    
    // Grid frames don't use flex properties
    return frameValues;
  }

  // Existing flex layout code (только для row/column)...
  frameValues.justifyContent = convertAlign(n.primaryAxisAlignItems ?? "MIN", {
    children: n.children,
    axis: "primary",
    mode: frameValues.mode,
  });
  // ... etc
}
```

#### 3.3. Добавить извлечение grid child properties

**Файл:** `src/transformers/layout.ts`  
**Функция:** `buildSimplifiedLayoutValues`

```typescript
function buildSimplifiedLayoutValues(
  n: FigmaDocumentNode,
  parent: FigmaDocumentNode | undefined,
  mode: "row" | "column" | "grid" | "none",
): SimplifiedLayout | undefined {
  if (!isLayout(n)) return undefined;

  const layoutValues: SimplifiedLayout = { mode };

  // 🆕 НОВОЕ: Grid child properties
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

  // Existing code for flex children...
  layoutValues.sizing = {
    horizontal: convertSizing(n.layoutSizingHorizontal),
    vertical: convertSizing(n.layoutSizingVertical),
  };
  
  // ... rest of the code
}
```

#### 3.4. Добавить вспомогательную функцию

```typescript
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
```

#### 3.5. Тестирование

**Требования для теста:**
- Figma файл с `layoutMode: "GRID"`
- Grid с заданными `gridColumnCount`, `gridRowCount`
- Элементы с `gridColumnSpan`, `gridRowSpan`

**Ожидаемый результат для grid контейнера:**
```yaml
layout:
  mode: grid
  grid:
    columns: 3
    rows: 2
    columnGap: 24px
    rowGap: 32px
    templateColumns: "1fr 2fr 1fr"
    templateRows: "auto auto"
```

**Ожидаемый результат для grid child:**
```yaml
layout:
  mode: none
  gridPlacement:
    columnSpan: 2
    rowSpan: 1
    columnStart: 2
    rowStart: 1
    horizontalAlign: center
    verticalAlign: start
```

---

## Финальные задачи

### F1. Создать changeset

**Файл:** `.changeset/add-complete-autolayout-support.md`

```markdown
---
"figma-developer-mcp": minor
---

Complete AutoLayout support with wrapping, sizing modes, and Grid layouts

Phase 1: Wrapping Layouts
- Add counterAxisSpacing (rowGap) for wrap layouts
- Add counterAxisAlignContent (align-content) for wrap layouts

Phase 2: Frame Sizing & Box Model
- Add primaryAxisSizingMode/counterAxisSizingMode (frameSizing)
- Add strokesIncludedInLayout (boxSizing: border-box vs content-box)
- Add itemReverseZIndex for z-index control

Phase 3: Grid Layout Support
- Full support for layoutMode: "GRID"
- Grid container properties (columns, rows, gaps, templates)
- Grid child properties (span, placement, alignment)

This brings AutoLayout extraction from ~60% to ~95% feature coverage.
```

### F2. Обновить документацию

**Файлы для обновления:**
1. `docs/AUTOLAYOUT_CONSTRAINTS.md` → переименовать в `docs/AUTOLAYOUT_COMPLETE.md`
2. Добавить примеры для каждой фазы
3. Обновить `IMPLEMENTATION_SUMMARY.md`

### F3. Создать итоговый коммит

```bash
git add -A
git commit -m "feat: complete AutoLayout support (wrapping, sizing modes, grid)

Phase 1: Wrapping Layouts
- Add counterAxisSpacing as rowGap for wrap layouts
- Add counterAxisAlignContent for wrap distribution

Phase 2: Frame Sizing Modes
- Add primaryAxisSizingMode/counterAxisSizingMode
- Add strokesIncludedInLayout as boxSizing
- Add itemReverseZIndex support

Phase 3: Full Grid Layout Support
- Support layoutMode: GRID
- Extract grid container properties (columns, rows, gaps, templates)
- Extract grid child properties (span, anchor, alignment)

Coverage: ~60% → ~95% of Figma AutoLayout features
Breaking: none (all additions are optional fields)"
```

---

## Порядок выполнения

1. ✅ **Фаза 1** → Commit → Test
2. ✅ **Фаза 2** → Commit → Test
3. ✅ **Фаза 3** → Commit → Test
4. ✅ **Финализация** → Changeset → Documentation → Final Commit

## Риски и митигация

### Риск 1: Breaking changes
**Митигация:** Все новые поля опциональные (`?:`), обратная совместимость сохранена

### Риск 2: Grid layout может быть редким
**Митигация:** Даже если не используется, поддержка готова для будущего

### Риск 3: Сложность тестирования Grid
**Митигация:** Найти/создать простой Figma файл с Grid для теста

---

## Метрики успеха

- ✅ TypeScript компилируется без ошибок
- ✅ Все тесты проходят
- ✅ Протестировано на реальных Figma файлах
- ✅ Покрытие AutoLayout функционала: **~95%** (было ~60%)
- ✅ Обратная совместимость сохранена

---

**Готово к реализации!** 🚀

