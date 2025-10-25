# Упущенные AutoLayout свойства в Figma Context MCP

## Анализ использования Figma REST API свойств

### ✅ Что уже извлекается

| Figma API свойство | Преобразуется в | Файл |
|-------------------|----------------|------|
| `layoutMode` | `mode: "row" \| "column" \| "none"` | layout.ts:155-160 |
| `primaryAxisAlignItems` | `justifyContent` | layout.ts:173-177 |
| `counterAxisAlignItems` | `alignItems` | layout.ts:178-182 |
| `layoutAlign` | `alignSelf` | layout.ts:183 |
| `layoutWrap` | `wrap?: boolean` | layout.ts:186 |
| `itemSpacing` | `gap?: string` | layout.ts:187 |
| `paddingTop/Right/Bottom/Left` | `padding?: string` | layout.ts:189-196 |
| `layoutSizingHorizontal/Vertical` | `sizing.horizontal/vertical` | layout.ts:210-213 |
| `layoutPositioning` | `position?: "absolute"` | layout.ts:232-233 |
| `overflowDirection` | `overflowScroll?: ("x" \| "y")[]` | layout.ts:163-166 |
| `minWidth/maxWidth/minHeight/maxHeight` | `constraints?` | layout.ts:217-224 |

---

## ❌ Упущенные важные свойства

### 1. **Wrapping Auto Layout свойства** (критически важно!)

#### `counterAxisSpacing` - расстояние между обернутыми рядами
- **Тип:** `number`
- **Применимость:** Auto-layout frames с `layoutWrap: "WRAP"`
- **Важность:** ⭐⭐⭐⭐⭐ **КРИТИЧНО**
- **Зачем нужно:**
  - При `wrap: true` есть расстояние между элементами (`itemSpacing`/`gap`)
  - НО также есть расстояние между РЯДАМИ (`counterAxisSpacing`)
  - В CSS это `row-gap` vs `column-gap` в flex-wrap контейнере
  - **Без этого AI будет генерировать неправильные отступы при wrap!**

**Пример:**
```yaml
# Сейчас:
layout:
  mode: row
  wrap: true
  gap: 16px  # только itemSpacing

# Должно быть:
layout:
  mode: row
  wrap: true
  gap: 16px  # itemSpacing (расстояние между элементами в ряду)
  rowGap: 24px  # counterAxisSpacing (расстояние между рядами)
```

#### `counterAxisAlignContent` - выравнивание обернутых рядов
- **Тип:** `'AUTO' | 'SPACE_BETWEEN'`
- **Применимость:** Auto-layout frames с `layoutWrap: "WRAP"`
- **Важность:** ⭐⭐⭐⭐
- **CSS эквивалент:** `align-content` в flexbox
- **Зачем нужно:** Определяет, как распределяются обернутые ряды

---

### 2. **Sizing Mode свойства** (важно для понимания поведения)

#### `primaryAxisSizingMode` - размер по основной оси
- **Тип:** `'FIXED' | 'AUTO'`
- **Применимость:** Auto-layout frames
- **Важность:** ⭐⭐⭐⭐
- **Зачем нужно:**
  - `FIXED` = фрейм имеет фиксированный размер по основной оси
  - `AUTO` = фрейм подстраивается под содержимое (hug content)
  - Влияет на то, нужно ли задавать `width` или `height` в CSS

#### `counterAxisSizingMode` - размер по поперечной оси
- **Тип:** `'FIXED' | 'AUTO'`
- **Применимость:** Auto-layout frames
- **Важность:** ⭐⭐⭐⭐
- **Зачем нужно:** То же самое для поперечной оси

**Пример:**
```yaml
# Текущее состояние - неполная информация:
layout:
  mode: row
  sizing:
    horizontal: hug  # для child элементов
    vertical: fill

# С sizingMode будет понятнее:
layout:
  mode: row
  frameSizing:
    primary: auto    # primaryAxisSizingMode (фрейм подстраивается под контент)
    counter: fixed   # counterAxisSizingMode (фрейм имеет фиксированную высоту)
  sizing:
    horizontal: hug  # для child элементов
    vertical: fill
```

---

### 3. **Layout behavior свойства**

#### `itemReverseZIndex` - порядок отрисовки слоев
- **Тип:** `boolean`
- **Важность:** ⭐⭐
- **Зачем нужно:**
  - `true` = первый элемент отрисовывается сверху
  - `false` (default) = последний элемент сверху
  - Может повлиять на z-index в CSS

#### `strokesIncludedInLayout` - учет обводки в размерах
- **Тип:** `boolean`
- **Важность:** ⭐⭐⭐⭐
- **CSS эквивалент:** `box-sizing: border-box` (true) vs `content-box` (false)
- **Зачем нужно:**
  - Критично для точного расчета размеров
  - Влияет на то, включать ли border в width/height

**Пример:**
```css
/* strokesIncludedInLayout: true */
.element {
  box-sizing: border-box;
  width: 100px; /* включает border */
  border: 2px solid black;
}

/* strokesIncludedInLayout: false */
.element {
  box-sizing: content-box;
  width: 100px; /* не включает border, итого 104px */
  border: 2px solid black;
}
```

---

### 4. **GRID Layout свойства** (совершенно не поддерживаются!)

Figma теперь поддерживает `layoutMode: "GRID"` - полноценный CSS Grid!

#### Основные свойства грида:
- `gridColumnCount` / `gridRowCount` - количество колонок/рядов
- `gridColumnGap` / `gridRowGap` - отступы между колонками/рядами
- `gridColumnsSizing` - CSS grid-template-columns
- `gridRowsSizing` - CSS grid-template-rows

#### Свойства для детей грида:
- `gridChildHorizontalAlign` / `gridChildVerticalAlign` - выравнивание в ячейке
- `gridRowSpan` / `gridColumnSpan` - сколько ячеек занимает
- `gridRowAnchorIndex` / `gridColumnAnchorIndex` - к какой ячейке привязан

**Важность:** ⭐⭐⭐⭐⭐ **КРИТИЧНО для современных дизайнов!**

**Пример:**
```yaml
# Сейчас Grid просто игнорируется (mode: "column")
layout:
  mode: column  # ❌ неправильно!

# Должно быть:
layout:
  mode: grid
  gridColumns: 3
  gridRows: auto
  gridColumnGap: 16px
  gridRowGap: 24px
  gridTemplate:
    columns: "1fr 2fr 1fr"
    rows: "auto auto"
```

---

## 📊 Приоритизация добавления свойств

### Высокий приоритет (⭐⭐⭐⭐⭐)
1. **`counterAxisSpacing`** - критично для wrap layouts
2. **Grid layout поддержка** (`layoutMode: "GRID"`)
   - `gridColumnCount`, `gridRowCount`
   - `gridColumnGap`, `gridRowGap`
   - `gridColumnsSizing`, `gridRowsSizing`

### Средний приоритет (⭐⭐⭐⭐)
3. **`primaryAxisSizingMode` / `counterAxisSizingMode`** - для понимания поведения фрейма
4. **`strokesIncludedInLayout`** - для точного box-sizing
5. **`counterAxisAlignContent`** - для wrap layouts
6. **Grid child properties** для детей grid контейнеров

### Низкий приоритет (⭐⭐)
7. **`itemReverseZIndex`** - редко критично

---

## 💡 Рекомендации по реализации

### Фаза 1: Wrapping Layouts (Quick Win)
```typescript
export interface SimplifiedLayout {
  // ... existing fields ...
  gap?: string;  // itemSpacing
  rowGap?: string;  // counterAxisSpacing (для wrap layouts)
  alignContent?: "auto" | "space-between";  // counterAxisAlignContent
}
```

### Фаза 2: Frame Sizing Modes
```typescript
export interface SimplifiedLayout {
  // ... existing fields ...
  frameSizing?: {
    primary: "fixed" | "auto";   // primaryAxisSizingMode
    counter: "fixed" | "auto";   // counterAxisSizingMode
  };
  boxSizing?: "border-box" | "content-box";  // strokesIncludedInLayout
}
```

### Фаза 3: Grid Layout Support
```typescript
export interface SimplifiedLayout {
  mode: "none" | "row" | "column" | "grid";  // добавить "grid"
  
  // Grid-specific properties
  grid?: {
    columns: number;
    rows: number;
    columnGap?: string;
    rowGap?: string;
    templateColumns?: string;  // CSS grid-template-columns
    templateRows?: string;     // CSS grid-template-rows
  };
  
  // For grid children
  gridPlacement?: {
    columnSpan?: number;
    rowSpan?: number;
    columnStart?: number;
    rowStart?: number;
    horizontalAlign?: "auto" | "start" | "center" | "end";
    verticalAlign?: "auto" | "start" | "center" | "end";
  };
}
```

---

## 🎯 Use Cases - как это поможет AI

### С `counterAxisSpacing`:
```
User: "Сверстай эту карточную галерею"

AI видит:
  wrap: true
  gap: 16px
  rowGap: 32px

Генерирует:
  display: flex;
  flex-wrap: wrap;
  gap: 16px 32px; /* или column-gap: 16px; row-gap: 32px; */
```

### С `primaryAxisSizingMode`:
```
User: "Создай header как в Figma"

AI видит:
  mode: row
  frameSizing:
    primary: auto  # ширина подстраивается
    counter: fixed # высота фиксированная
  dimensions:
    height: 80

Генерирует:
  display: flex;
  flex-direction: row;
  width: auto; /* или не задает width вообще */
  height: 80px;
```

### С Grid Layout:
```
User: "Реализуй эту сетку продуктов"

AI видит:
  mode: grid
  grid:
    columns: 3
    columnGap: 24px
    rowGap: 32px
    templateColumns: "repeat(3, 1fr)"

Генерирует:
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 24px;
  row-gap: 32px;
```

---

## 📚 Ссылки
- [Figma Auto Layout Properties](https://www.figma.com/plugin-docs/api/node-properties/)
- [Figma REST API Spec](https://github.com/figma/rest-api-spec)
- [CSS Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [CSS Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)

---

**Вывод:** Текущая реализация покрывает ~60% autolayout функционала. Добавление упущенных свойств значительно улучшит точность генерации кода AI агентами.

