'use client';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, ChevronUp, Copy, Search } from 'lucide-react';
import { toast } from 'sonner';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// CSS Custom Highlight API (Chrome/Edge 105+, Safari 17.2+) — красит совпадения
// прямо поверх текстовых узлов через Range, не трогая DOM, поэтому не конфликтует
// с React-рендером дерева (react-json-view-lite само управляет своим DOM).
const HIGHLIGHT_SUPPORTED = typeof window !== 'undefined' && typeof CSS !== 'undefined' && 'highlights' in CSS;

// Обходит текстовые узлы контейнера и возвращает Range для каждого вхождения
// needle — в порядке документа, что и нужно для навигации "вперёд/назад".
function collectMatchRanges(container: Node, needle: string): Range[] {
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const value = node.nodeValue ?? '';
    const lower = value.toLowerCase();
    let from = 0;
    let at = lower.indexOf(needle, from);
    while (at !== -1) {
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + needle.length);
      ranges.push(range);
      from = at + needle.length;
      at = lower.indexOf(needle, from);
    }
    node = walker.nextNode();
  }
  return ranges;
}

// Обходит дерево data и собирает набор объектов/массивов (по ссылке), внутри
// которых есть совпадение по ключу или значению — react-json-view-lite зовёт
// shouldExpandNode(level, value, field) с самим value-объектом узла, поэтому
// достаточно сверяться по ссылке через Set, полный path не нужен. Это нужно,
// чтобы к моменту подсветки (collectMatchRanges) совпадения уже были в DOM —
// сама подсветка не разворачивает свёрнутые узлы дерева.
function collectExpandTargets(node: unknown, needle: string, expand: Set<unknown>): boolean {
  if (Array.isArray(node)) {
    let matched = false;
    for (const item of node) {
      if (collectExpandTargets(item, needle, expand)) matched = true;
    }
    if (matched) expand.add(node);
    return matched;
  }
  if (node !== null && typeof node === 'object') {
    let matched = false;
    for (const [key, value] of Object.entries(node)) {
      const keyMatches = key.toLowerCase().includes(needle);
      if (collectExpandTargets(value, needle, expand) || keyMatches) matched = true;
    }
    if (matched) expand.add(node);
    return matched;
  }
  return String(node).toLowerCase().includes(needle);
}

type ViewMode = 'tree' | 'text';
type ExpandMode = 'default' | 'all' | 'collapsed';

// Дерево должно выглядеть как обычный отформатированный JSON (тот же шрифт,
// без цветовой раскраски по типам — как в режиме "Текст"), а не как
// разноцветный дефолтный вид библиотеки. Пропускаем только те ключи
// StyleProps, где реально нужно другое оформление — react-json-view-lite сам
// подмешивает { ...defaultStyles, ...style }, так что остальное (отступы,
// child-контейнеры) остаётся от defaultStyles без изменений.
// `StyleProps` не экспортируется пакетом напрямую — берём тип через сам JsonView.
type TreeStyle = NonNullable<Parameters<typeof JsonView>[0]['style']>;
const treeStyle: TreeStyle = {
  container: 'font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-words',
  // Дефолтный отступ уровня (10px) слишком мал под кнопки +/- — увеличиваем
  // примерно до 5 символов моноширинного шрифта, чтобы вложенность не наезжала.
  basicChildStyle: 'pl-9',
  label: 'text-foreground',
  clickableLabel: 'text-foreground cursor-pointer',
  nullValue: 'text-foreground',
  undefinedValue: 'text-foreground',
  numberValue: 'text-foreground',
  stringValue: 'text-foreground',
  booleanValue: 'text-foreground',
  otherValue: 'text-foreground',
  punctuation: 'text-foreground',
  quotesForFieldNames: true,
  // Заменяем стрелки ▸/▾ библиотеки на +/- в виде маленьких кнопок — с
  // рамкой и hover-фоном, чтобы визуально читалось как кликабельный элемент.
  expandIcon:
    "mr-1 inline-flex size-4 shrink-0 translate-y-[1px] cursor-pointer items-center justify-center rounded border border-border bg-background align-middle text-[10px] leading-none text-muted-foreground select-none hover:border-foreground/30 hover:bg-muted hover:text-foreground after:content-['+']",
  collapseIcon:
    "mr-1 inline-flex size-4 shrink-0 translate-y-[1px] cursor-pointer items-center justify-center rounded border border-border bg-background align-middle text-[10px] leading-none text-muted-foreground select-none hover:border-foreground/30 hover:bg-muted hover:text-foreground after:content-['−']",
  collapsedContent: "mr-1 cursor-pointer text-[0.85em] text-muted-foreground after:content-['…']",
};

/** Postman-style просмотр JSON-ответа: дерево со сворачиванием узлов (react-json-view-lite)
 * или сырой текст, плюс поиск с подсветкой всех совпадений и переходом между ними. */
export function JsonSearchDialog({
  open,
  onOpenChange,
  title,
  description,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  data: unknown;
}) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandMode, setExpandMode] = useState<ExpandMode>('default');
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const rangesRef = useRef<Range[]>([]);

  const text = useMemo(() => (data == null ? '' : JSON.stringify(data, null, 2)), [data]);
  const needle = search.trim().toLowerCase();

  const expandTargets = useMemo(() => {
    const set = new Set<unknown>();
    if (needle && data != null) collectExpandTargets(data, needle, set);
    return set;
  }, [data, needle]);

  const shouldExpandNode = useCallback(
    (level: number, value: unknown) => {
      if (needle) return expandTargets.has(value);
      if (expandMode === 'all') return true;
      if (expandMode === 'collapsed') return false;
      return level === 0;
    },
    [needle, expandTargets, expandMode],
  );

  // Пересчитывает подсветку всех совпадений при смене поиска/режима/данных —
  // после того как дерево уже развернуло нужные ветки (тот же рендер-проход).
  useLayoutEffect(() => {
    if (!HIGHLIGHT_SUPPORTED) return;
    const container = containerRef.current;
    if (!container || !needle) {
      CSS.highlights.delete('json-search-match');
      CSS.highlights.delete('json-search-current');
      rangesRef.current = [];
      setMatchCount(0);
      setCurrentIndex(0);
      return;
    }
    const ranges = collectMatchRanges(container, needle);
    rangesRef.current = ranges;
    CSS.highlights.set('json-search-match', new Highlight(...ranges));
    setMatchCount(ranges.length);
    setCurrentIndex(0);
  }, [needle, viewMode, text]);

  // Подсвечивает текущее совпадение отдельным цветом и скроллит к нему.
  useLayoutEffect(() => {
    if (!HIGHLIGHT_SUPPORTED) return;
    const ranges = rangesRef.current;
    if (!ranges.length) {
      CSS.highlights.delete('json-search-current');
      return;
    }
    const range = ranges[currentIndex];
    CSS.highlights.set('json-search-current', new Highlight(range));
    const el = range.startContainer.parentElement;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [currentIndex, matchCount]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (matchCount ? (i + 1) % matchCount : 0));
  }, [matchCount]);
  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (matchCount ? (i - 1 + matchCount) % matchCount : 0));
  }, [matchCount]);

  const copyJson = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('JSON скопирован'))
      .catch(() => toast.error('Не удалось скопировать'));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setSearch('');
          setExpandMode('default');
          if (HIGHLIGHT_SUPPORTED) {
            CSS.highlights.delete('json-search-match');
            CSS.highlights.delete('json-search-current');
          }
        }
      }}
    >
      <DialogContent className="sm:max-w-3xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                if (e.shiftKey) goPrev();
                else goNext();
              }}
              placeholder="Поиск по JSON — например, ID заказа"
              className="pl-8"
              autoFocus
            />
          </div>
          {needle ? (
            <div className="flex shrink-0 items-center gap-0.5 text-[11px] text-muted-foreground">
              <span className="mr-1 tabular-nums">{matchCount > 0 ? `${currentIndex + 1} / ${matchCount}` : '0 совпад.'}</span>
              <Button variant="ghost" size="icon-sm" disabled={!matchCount} onClick={goPrev} title="Предыдущее (Shift+Enter)">
                <ChevronUp />
              </Button>
              <Button variant="ghost" size="icon-sm" disabled={!matchCount} onClick={goNext} title="Следующее (Enter)">
                <ChevronDown />
              </Button>
            </div>
          ) : (
            <span className="shrink-0 text-[11px] text-muted-foreground">{text.split('\n').length} строк</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'tree' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('tree')}
            >
              Дерево
            </Button>
            <Button
              variant={viewMode === 'text' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('text')}
            >
              Текст
            </Button>
          </div>
          {viewMode === 'tree' && (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={!!needle}
                onClick={() => setExpandMode('all')}
                title="Развернуть всё"
              >
                <ChevronsUpDown data-icon="inline-start" />
                Развернуть всё
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!!needle}
                onClick={() => setExpandMode('collapsed')}
                title="Свернуть всё"
              >
                <ChevronsDownUp data-icon="inline-start" />
                Свернуть всё
              </Button>
            </div>
          )}
        </div>
        <div className="relative">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={copyJson}
            title="Скопировать JSON"
            className="absolute top-2 right-2.5 z-10 bg-background/90 backdrop-blur-sm"
          >
            <Copy />
          </Button>
          <div ref={containerRef} className="max-h-[60vh] overflow-auto rounded-lg border border-border bg-muted/40 p-3 pr-10">
            {data == null ? (
              <span className="text-muted-foreground">Нет данных</span>
            ) : viewMode === 'tree' ? (
              <JsonView data={data as object} shouldExpandNode={shouldExpandNode} style={treeStyle} />
            ) : (
              <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-words">{text}</pre>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
