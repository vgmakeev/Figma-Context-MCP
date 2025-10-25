# Реализация поддержки AutoLayout Constraints

## Выполненные изменения

### 1. Исследование Figma API (✅ Завершено)

Изучена документация Figma REST API и типы из пакета `@figma/rest-api-spec v0.33.0`.

**Найденные свойства в `HasLayoutTrait`:**
- `minWidth?: number` - минимальная ширина для auto-layout фреймов
- `maxWidth?: number` - максимальная ширина для auto-layout фреймов  
- `minHeight?: number` - минимальная высота для auto-layout фреймов
- `maxHeight?: number` - максимальная высота для auto-layout фреймов

Эти свойства применимы только для:
- Auto-layout фреймов (с `layoutMode: HORIZONTAL | VERTICAL | GRID`)
- Прямых детей auto-layout фреймов

### 2. Обновление интерфейса SimplifiedLayout (✅ Завершено)

**Файл:** `src/transformers/layout.ts`

Добавлено новое поле `constraints` в интерфейс:

```typescript
export interface SimplifiedLayout {
  // ... существующие поля ...
  constraints?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
  // ... остальные поля ...
}
```

### 3. Извлечение constraints из Figma API (✅ Завершено)

**Файл:** `src/transformers/layout.ts`

Модифицирована функция `buildSimplifiedLayoutValues` для извлечения constraints:

```typescript
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
```

**Особенности реализации:**
- Значения округляются до ближайшего пикселя с помощью `pixelRound()` для консистентности
- Поле `constraints` добавляется в ответ только если хотя бы одно из значений определено
- Проверка на `undefined` гарантирует, что в ответ попадают только заданные значения

### 4. Проверка и сборка (✅ Завершено)

**Выполненные проверки:**
- ✅ TypeScript type checking: `npm run type-check` - без ошибок
- ✅ ESLint проверка: нет ошибок линтера
- ✅ Сборка проекта: `npm run build` - успешно

### 5. Документация (✅ Завершено)

**Созданные файлы:**

1. **`.changeset/add-autolayout-constraints.md`**
   - Changeset для версионирования изменений
   - Тип: patch (минорное изменение)

2. **`docs/AUTOLAYOUT_CONSTRAINTS.md`**
   - Подробная документация функционала
   - Примеры использования
   - Описание use cases

3. **`IMPLEMENTATION_SUMMARY.md`** (этот файл)
   - Полное описание реализации
   - Список изменений
   - Инструкции для тестирования

## Как протестировать

### Вариант 1: Локальное тестирование с Figma API

1. Убедитесь, что у вас есть Figma API токен:
   ```bash
   export FIGMA_API_KEY="your-figma-api-token"
   ```

2. Найдите Figma файл с auto-layout компонентами, у которых заданы min/max constraints

3. Запустите MCP сервер:
   ```bash
   npm start -- --figma-api-key=$FIGMA_API_KEY --stdio
   ```

4. Используйте tool `get_figma_data` с параметрами:
   - `fileKey`: ID вашего Figma файла
   - `nodeId`: ID узла с auto-layout constraints

5. Проверьте ответ - в секции `layout` должно появиться поле `constraints` с соответствующими значениями.

### Вариант 2: Интеграция с Cursor

1. Настройте MCP в Cursor согласно документации проекта

2. Откройте файл Figma с auto-layout constraints

3. Попросите Cursor получить данные о дизайне

4. В полученном ответе проверьте наличие `constraints` в layout данных

### Ожидаемый результат

Для узла с min/max constraints ответ будет содержать:

```yaml
layout:
  mode: row
  sizing:
    horizontal: hug
    vertical: fixed
  constraints:
    minWidth: 320
    maxWidth: 1200
    minHeight: 48
    maxHeight: 96
  # ... другие layout свойства
```

## Технические детали

### Затронутые файлы

1. **`src/transformers/layout.ts`**
   - Обновлён интерфейс `SimplifiedLayout`
   - Модифицирована функция `buildSimplifiedLayoutValues`
   - ~15 строк добавлено

2. **`.changeset/add-autolayout-constraints.md`**
   - Новый файл changeset

3. **`docs/AUTOLAYOUT_CONSTRAINTS.md`**
   - Новая документация

### Совместимость

- ✅ Обратная совместимость сохранена (поле опциональное)
- ✅ Не требует миграции существующего кода
- ✅ TypeScript типы корректны
- ✅ Работает с существующими extractors

### Зависимости

- Использует существующий `@figma/rest-api-spec` v0.33.0
- Не требует дополнительных зависимостей
- Совместимо с текущей версией `@modelcontextprotocol/sdk`

## Тестирование ✅

**Протестировано на реальном Figma файле:**
- File: `PU35GDafmwgicuV5xLd18G`
- Node: `17643:25110` (team frame)
- **Результат: SUCCESS** ✅

Найденные constraints:
```yaml
constraints:
  minWidth: 240
```

Узел с auto-layout (mode: column) корректно отдал значение `minWidth: 240px`, что подтверждает правильность реализации.

## Следующие шаги

1. ✅ **Протестировать на реальном Figma файле** - ЗАВЕРШЕНО
2. **Создать коммит** с изменениями
3. **Создать Pull Request** если это fork оригинального репозитория
4. **Обновить версию** через `npm run changeset:version`
5. **Опубликовать** через `npm run release`

## Готово к коммиту

Все изменения протестированы и готовы к коммиту:

```bash
git add .
git commit -m "feat: add autolayout constraints (minWidth, maxWidth, minHeight, maxHeight) support"
```

---

**Автор изменений:** Vladimir Makeev  
**Дата:** 25 октября 2025  
**Версия:** 0.6.5 (предполагаемая после changeset)

