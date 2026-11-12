<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorSelection, EditorState, type Extension } from '@codemirror/state'
import { EditorView, drawSelection, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { renderMarkdown } from '@/utils/markdown'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    minHeight?: string
    ariaLabel?: string
  }>(),
  { placeholder: '', minHeight: '240px', ariaLabel: '' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

type Mode = 'edit' | 'preview' | 'split'
const mode = ref<Mode>('split')
const syncScroll = ref(true)
const previewEl = ref<HTMLElement | null>(null)

const previewHtml = computed(() => renderMarkdown(props.modelValue))

function syncFrom(src: HTMLElement, dest: HTMLElement): void {
  if (syncing || !syncScroll.value || mode.value !== 'split') return
  syncing = true
  const max = src.scrollHeight - src.clientHeight
  const ratio = max > 0 ? src.scrollTop / max : 0
  dest.scrollTop = ratio * (dest.scrollHeight - dest.clientHeight)
  requestAnimationFrame(() => {
    syncing = false
  })
}

function onEditorScroll(): void {
  if (view && previewEl.value) syncFrom(view.scrollDOM, previewEl.value)
}

function onPreviewScroll(): void {
  if (view && previewEl.value) syncFrom(previewEl.value, view.scrollDOM)
}

const host = ref<HTMLElement | null>(null)
let view: EditorView | null = null
let syncing = false

const theme = EditorView.theme({
  '&': {
    fontSize: 'var(--fs-body)',
    color: 'var(--ink)',
    lineHeight: '1.8',
  },
  '&.cm-focused': {
    outline: 'none',
    boxShadow: 'inset 0 0 0 2px var(--accent-interactive)',
  },
  '.cm-content': {
    fontFamily: 'var(--font-mono)',
    padding: '0.75rem 1rem',
  },
  '.cm-scroller': { maxHeight: '32rem' },
  '.cm-cursor': { borderLeftColor: 'var(--ink)' },
  '.cm-selectionBackground': { backgroundColor: 'var(--clay-soft)' },
})

function wrapSelection(before: string, after: string): void {
  if (!view) return
  const { state } = view
  const changes = state.changeByRange((range) => ({
    changes: [
      {
        from: range.from,
        to: range.to,
        insert: before + state.sliceDoc(range.from, range.to) + after,
      },
    ],
    range: EditorSelection.range(range.from + before.length, range.to + before.length),
  }))
  view.dispatch(changes, { scrollIntoView: true })
  view.focus()
}

function prefixLines(prefix: string): void {
  if (!view) return
  const { state } = view
  const changes = state.changeByRange((range) => {
    const first = state.doc.lineAt(range.from).number
    const last = state.doc.lineAt(range.to).number
    const lineChanges = []
    for (let n = first; n <= last; n += 1) {
      lineChanges.push({ from: state.doc.line(n).from, insert: prefix })
    }
    const mapped = state.changes(lineChanges)
    return {
      changes: lineChanges,
      range: EditorSelection.range(
        mapped.mapPos(range.from, 1),
        mapped.mapPos(range.to, -1),
      ),
    }
  })
  view.dispatch(changes, { scrollIntoView: true })
  view.focus()
}

function insertBlock(text: string, caretOffset = text.length): void {
  if (!view) return
  const range = view.state.selection.main
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: text },
    selection: EditorSelection.cursor(range.from + caretOffset),
    scrollIntoView: true,
  })
  view.focus()
}

function insertLink(): void {
  if (!view) return
  const { state } = view
  const changes = state.changeByRange((range) => {
    const selected = state.sliceDoc(range.from, range.to)
    const urlStart = range.from + 1 + selected.length + 2
    return {
      changes: [
        {
          from: range.from,
          to: range.to,
          insert: `[${selected}](https://)`,
        },
      ],
      range: EditorSelection.range(urlStart, urlStart + 'https://'.length),
    }
  })
  view.dispatch(changes, { scrollIntoView: true })
  view.focus()
}

const toolGroups = [
  {
    key: 'basic',
    items: [
      { label: 'B', title: '粗体 Ctrl/⌘+B', run: () => wrapSelection('**', '**') },
      { label: 'I', title: '斜体 Ctrl/⌘+I', run: () => wrapSelection('*', '*') },
      { label: 'S', title: '删除线', run: () => wrapSelection('~~', '~~') },
      { label: '<>', title: '行内代码', run: () => wrapSelection('`', '`') },
      { label: '链接', title: '链接 Ctrl/⌘+K', run: () => insertLink() },
    ],
  },
  {
    key: 'structure',
    items: [
      { label: 'H2', title: '二级标题', run: () => prefixLines('## ') },
      { label: 'H3', title: '三级标题', run: () => prefixLines('### ') },
      { label: '列表', title: '无序列表', run: () => prefixLines('- ') },
      { label: '1.', title: '有序列表', run: () => prefixLines('1. ') },
      { label: '引用', title: '引用', run: () => prefixLines('> ') },
      {
        label: '表格',
        title: '插入表格',
        run: () => insertBlock('\n| 列1 | 列2 |\n| --- | --- |\n|     |     |\n'),
      },
      { label: '分割线', title: '分割线', run: () => insertBlock('\n---\n') },
    ],
  },
  {
    key: 'math',
    items: [
      { label: '∑ 行内', title: '行内公式', run: () => wrapSelection('$', '$') },
      { label: '∑∑ 块级', title: '块级公式', run: () => insertBlock('$$\n\n$$\n', 3) },
    ],
  },
]

onMounted(() => {
  if (!host.value) return
  const extensions: Extension[] = [
    markdown(),
    history(),
    drawSelection(),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ 'aria-label': props.ariaLabel }),
    theme,
    cmPlaceholder(props.placeholder),
    keymap.of([
      { key: 'Mod-b', run: () => (wrapSelection('**', '**'), true) },
      { key: 'Mod-i', run: () => (wrapSelection('*', '*'), true) },
      { key: 'Mod-k', run: () => (insertLink(), true) },
      indentWithTab,
      ...defaultKeymap,
      ...historyKeymap,
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        emit('update:modelValue', update.state.doc.toString())
      }
    }),
  ]
  view = new EditorView({
    state: EditorState.create({ doc: props.modelValue, extensions }),
    parent: host.value,
  })
  view.scrollDOM.addEventListener('scroll', onEditorScroll)
})

watch(
  () => props.modelValue,
  (value) => {
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
    }
  },
)

onBeforeUnmount(() => {
  view?.scrollDOM.removeEventListener('scroll', onEditorScroll)
  view?.destroy()
  view = null
})
</script>

<template>
  <div class="md-editor">
    <div class="md-toolbar">
      <div v-for="group in toolGroups" :key="group.key" class="md-tools">
        <button
          v-for="tool in group.items"
          :key="tool.title"
          type="button"
          class="md-tool"
          :title="tool.title"
          :disabled="mode === 'preview'"
          @click="tool.run"
        >
          {{ tool.label }}
        </button>
      </div>
      <div class="md-modes">
        <button
          type="button"
          class="md-mode"
          :class="{ active: mode === 'edit' }"
          @click="mode = 'edit'"
        >
          仅编辑
        </button>
        <button
          type="button"
          class="md-mode"
          :class="{ active: mode === 'preview' }"
          @click="mode = 'preview'"
        >
          仅预览
        </button>
        <button
          type="button"
          class="md-mode"
          :class="{ active: mode === 'split' }"
          @click="mode = 'split'"
        >
          分栏
        </button>
        <label v-if="mode === 'split'" class="md-sync">
          <input v-model="syncScroll" type="checkbox">
          同步滚动
        </label>
      </div>
    </div>
    <div class="md-panes" :class="`mode-${mode}`">
      <div v-show="mode !== 'preview'" ref="host" class="md-pane md-edit" />
      <div
        v-show="mode !== 'edit'"
        ref="previewEl"
        class="md-pane md-preview md-body"
        @scroll="onPreviewScroll"
        v-html="previewHtml"
      />
    </div>
  </div>
</template>

<style scoped>
.md-editor {
  --md-min-height: v-bind(minHeight);
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-12);
  box-shadow: 0 2px 10px rgba(26, 25, 24, 0.07);
  overflow: hidden;
}

.md-pane {
  min-height: var(--md-min-height);
}

.md-edit :deep(.cm-editor) {
  min-height: var(--md-min-height);
}

.md-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  background: var(--gray-050);
  padding: 0.55rem 0.75rem;
  border-bottom: var(--bw-hair) solid var(--gray-150);
  margin-bottom: 0;
}

.md-tools {
  display: flex;
  gap: 3px;
  background: var(--gray-150);
  padding: 3px;
  border-radius: var(--br-8);
}

.md-tool {
  padding: 0.25rem 0.55rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--ink);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.md-tool:hover:not(:disabled) {
  background: var(--bg-raised);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.md-tool:disabled {
  opacity: 0.4;
  cursor: default;
}

.md-modes {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
  background: var(--gray-150);
  padding: 3px;
  border-radius: var(--br-8);
}

.md-mode {
  padding: 0.25rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--ink-muted);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.md-mode.active {
  background: var(--accent);
  color: var(--gray-000);
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.4);
}

.md-sync {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: 0.35rem;
  font-size: 0.8125rem;
  color: var(--ink-muted);
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-8);
  padding: 0.25rem 0.65rem;
}

.md-panes {
  display: flex;
}

.md-panes.mode-split .md-edit {
  border-right: var(--bw-hair) solid var(--gray-150);
}

.md-pane {
  flex: 1;
  min-width: 0;
}

.md-preview {
  max-height: 32rem;
  overflow: auto;
  padding: 0.75rem 1rem;
}

@media (max-width: 768px) {
  .md-panes {
    flex-direction: column;
  }

  .md-panes.mode-split .md-edit {
    border-right: none;
    border-bottom: var(--bw-hair) solid var(--gray-150);
  }
}
</style>
