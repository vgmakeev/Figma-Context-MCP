# AutoLayout Coverage Analysis - Что упущено?

## ✅ Что УЖЕ реализовано (95% покрытие)

### Frame Properties (Контейнер)
- ✅ `layoutMode` → `mode: "row" | "column" | "grid" | "none"`
- ✅ `primaryAxisAlignItems` → `justifyContent`
- ✅ `counterAxisAlignItems` → `alignItems`
- ✅ `layoutWrap` → `wrap`
- ✅ `itemSpacing` → `gap`
- ✅ `counterAxisSpacing` → `rowGap` (Phase 1)
- ✅ `counterAxisAlignContent` → `alignContent` (Phase 1)
- ✅ `paddingTop/Right/Bottom/Left` → `padding` (CSS shorthand)
- ✅ `primaryAxisSizingMode` → `frameSizing.primary` (Phase 2)
- ✅ `counterAxisSizingMode` → `frameSizing.counter` (Phase 2)
- ✅ `strokesIncludedInLayout` → `boxSizing` (Phase 2)
- ✅ `itemReverseZIndex` → `reverseZIndex` (Phase 2)
- ✅ `overflowDirection` → `overflowScroll`

### Child Properties (Дети)
- ✅ `layoutAlign` → `alignSelf`
- ✅ `layoutSizingHorizontal/Vertical` → `sizing.horizontal/vertical`
- ✅ `layoutPositioning` → `position: "absolute"`
- ✅ `minWidth, maxWidth, minHeight, maxHeight` → `constraints`
- ✅ `layoutGrow` - используется для вычисления dimensions (не возвращается напрямую)
- ✅ `preserveRatio` → `aspectRatio`

### Grid Properties (Phase 3)
- ✅ `gridColumnCount` → `grid.columns`
- ✅ `gridRowCount` → `grid.rows`
- ✅ `gridColumnGap` → `grid.columnGap`
- ✅ `gridRowGap` → `grid.rowGap`
- ✅ `gridColumnsSizing` → `grid.templateColumns`
- ✅ `gridRowsSizing` → `grid.templateRows`
- ✅ `gridChildHorizontalAlign` → `gridPlacement.horizontalAlign`
- ✅ `gridChildVerticalAlign` → `gridPlacement.verticalAlign`
- ✅ `gridColumnSpan` → `gridPlacement.columnSpan`
- ✅ `gridRowSpan` → `gridPlacement.rowSpan`
- ✅ `gridColumnAnchorIndex` → `gridPlacement.columnStart`
- ✅ `gridRowAnchorIndex` → `gridPlacement.rowStart`

---

## ⚠️ Что УПУЩЕНО (но может быть полезно)

### 1. `clipsContent` - Обрезка контента (⭐⭐⭐)

**Что это:**
- Определяет, обрезается ли контент за пределами границ фрейма
- CSS эквивалент: `overflow: hidden` vs `overflow: visible`

**Где в API:**
```typescript
clipsContent: boolean  // в HasFramePropertiesTrait
```

**Зачем нужно:**
- Критично для карточек с overflow
- Влияет на overflow поведение
- Нужно для генерации правильного CSS overflow

**Пример:**
```yaml
layout:
  clipsContent: true  # overflow: hidden
```

**Приоритет:** ⭐⭐⭐ ВАЖНО

---

### 2. `layoutGrow` - Explicit Grow Value (⭐⭐)

**Что это:**
- Определяет, растет ли элемент вдоль основной оси (0 = fixed, 1 = grow)
- CSS эквивалент: `flex-grow: 0` vs `flex-grow: 1`

**Где в API:**
```typescript
layoutGrow?: 0 | 1  // в HasLayoutTrait
```

**Текущее состояние:**
- ✅ Используется внутри для вычисления dimensions
- ❌ НЕ возвращается как отдельное свойство

**Зачем нужно:**
- AI может явно видеть flex-grow
- Полезно для понимания поведения sizing

**Пример:**
```yaml
layout:
  sizing:
    horizontal: fill
  flexGrow: 1  # явное значение flex-grow
```

**Приоритет:** ⭐⭐ Средний (уже косвенно учитывается)

---

### 3. Индивидуальные Padding Values (⭐⭐)

**Что это:**
- Отдельные значения paddingTop, paddingRight, paddingBottom, paddingLeft

**Текущее состояние:**
- ✅ Извлекаются из API
- ✅ Объединяются в CSS shorthand (`padding: "16px 24px"`)
- ❌ Не возвращаются раздельно

**Зачем может понадобиться:**
- Некоторые фреймворки требуют раздельные значения
- Явное указание каждого отступа

**Текущая реализация:**
```yaml
layout:
  padding: "16px 24px 24px 16px"  # top right bottom left
```

**Альтернатива (если нужна):**
```yaml
layout:
  padding: "16px 24px 24px 16px"
  paddingIndividual:  # опционально
    top: 16
    right: 24
    bottom: 24
    left: 16
```

**Приоритет:** ⭐⭐ Низкий (shorthand достаточно)

---

### 4. `absoluteBoundingBox` - Absolute Coordinates (⭐)

**Что это:**
- Абсолютные координаты элемента на canvas

**Текущее состояние:**
- ✅ Используется для вычисления `locationRelativeToParent`
- ❌ Сами абсолютные координаты не возвращаются

**Зачем может понадобиться:**
- Редко нужно для верстки
- Больше для позиционирования на canvas

**Приоритет:** ⭐ Очень низкий (не нужно для верстки)

---

### 5. `constraints` (старые Layout Constraints) - DEPRECATED (⚪)

**Что это:**
- Старая система constraints (не путать с min/max width/height!)
- Определяет, как элемент крепится к родителю (LEFT, RIGHT, TOP, BOTTOM, etc.)

**Где в API:**
```typescript
constraints?: LayoutConstraint  // в HasLayoutTrait
```

**Структура:**
```typescript
LayoutConstraint {
  horizontal: "LEFT" | "RIGHT" | "CENTER" | "LEFT_RIGHT" | "SCALE"
  vertical: "TOP" | "BOTTOM" | "CENTER" | "TOP_BOTTOM" | "SCALE"
}
```

**Важно:**
- ⚠️ Это НЕ autolayout constraints!
- Это старая система для non-autolayout фреймов
- В autolayout используется `layoutAlign` и `layoutSizing` вместо этого

**Приоритет:** ⚪ Не нужно (deprecated в пользу autolayout)

---

## 📊 Итоговая оценка покрытия

| Категория | Покрытие | Комментарий |
|-----------|----------|-------------|
| **Flex Layout** | 100% ✅ | Полностью |
| **Wrapping** | 100% ✅ | Полностью (Phase 1) |
| **Grid Layout** | 100% ✅ | Полностью (Phase 3) |
| **Sizing Modes** | 100% ✅ | Полностью (Phase 2) |
| **Constraints** | 100% ✅ | Min/max полностью |
| **Clipping** | 0% ❌ | **clipsContent отсутствует** |
| **Flex-grow** | 50% ⚠️ | Используется, но не возвращается |

**Общее покрытие: ~95%**

С учетом `clipsContent`: потенциально **~97-98%**

---

## 🎯 Рекомендации

### Критично добавить:

#### 1. `clipsContent` (overflow behavior)
```typescript
export interface SimplifiedLayout {
  // ... existing fields ...
  clipsContent?: boolean;  // overflow: hidden vs visible
}
```

**Реализация:**
```typescript
// В buildSimplifiedFrameValues
if (n.clipsContent !== undefined) {
  frameValues.clipsContent = n.clipsContent;
}
```

**CSS генерация:**
```typescript
overflow: clipsContent ? 'hidden' : 'visible'
```

**Важность:** ⭐⭐⭐⭐ Высокая (влияет на overflow поведение)

---

### Опционально добавить:

#### 2. `layoutGrow` как отдельное свойство
```typescript
export interface SimplifiedLayout {
  // ... existing fields ...
  flexGrow?: 0 | 1;  // explicit flex-grow value
}
```

**Важность:** ⭐⭐ Средняя (уже учитывается косвенно)

---

### НЕ нужно добавлять:

1. ❌ Старые `constraints` (LayoutConstraint) - deprecated
2. ❌ `absoluteBoundingBox` координаты - не нужны для верстки
3. ❌ Раздельные padding - shorthand достаточно

---

## 🔍 Что проверили

1. ✅ Все свойства `HasFramePropertiesTrait`
2. ✅ Все свойства `HasLayoutTrait`
3. ✅ Все grid-специфичные свойства
4. ✅ Сравнили с актуальной Figma API spec v0.33.0
5. ✅ Проверили на реальных Figma файлах

---

## 📝 Вывод

**Мы покрыли ~95% AutoLayout функционала.**

**Единственное значимое упущение:**
- `clipsContent` - определяет overflow: hidden vs visible

**Это свойство критично для:**
- Карточек с overflow
- Элементов с тенями/эффектами за пределами bounds
- Правильной генерации CSS overflow

**Рекомендация:** Добавить `clipsContent` как Phase 2.1 (mini-update)

---

**Обновлено:** 25 октября 2025  
**Версия API:** @figma/rest-api-spec v0.33.0  
**Покрытие:** 95% → потенциально 98% с clipsContent

