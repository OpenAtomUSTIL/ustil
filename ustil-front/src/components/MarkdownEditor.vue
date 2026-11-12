<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorSelection, EditorState, type Extension } from '@codemirror/state'
import { EditorView, drawSelection, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    minHeight?: string
  }>(),
  { placeholder: '', minHeight: '240px' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const host = ref<HTMLElement | null>(null)
let view: EditorView | null = null

const theme = EditorView.theme({
  '&': {
    fontSize: 'var(--fs-body)',
    color: 'var(--ink)',
    backgroundColor: 'var(--bg-raised)',
    border: 'var(--bw-sm) solid var(--border)',
    borderRadius: 'var(--br-12)',
    lineHeight: '1.8',
  },
  '&.cm-focused': { outline: 'none', borderColor: 'var(--accent-interactive)' },
  '.cm-content': {
    fontFamily: 'var(--font-mono)',
    padding: '10px 12px',
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
}

function insertBlock(text: string, caretOffset = text.length): void {
  if (!view) return
  const range = view.state.selection.main
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: text },
    selection: EditorSelection.cursor(range.from + caretOffset),
    scrollIntoView: true,
  })
}

const toolGroups = [
  {
    key: 'basic',
    items: [
      { label: 'B', title: '粗体 ⌘B', run: () => wrapSelection('**', '**') },
      { label: 'I', title: '斜体 ⌘I', run: () => wrapSelection('*', '*') },
      { label: 'S', title: '删除线', run: () => wrapSelection('~~', '~~') },
      { label: '<>', title: '行内代码', run: () => wrapSelection('`', '`') },
      { label: '链接', title: '链接 ⌘K', run: () => wrapSelection('[', '](https://)') },
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
    theme,
    cmPlaceholder(props.placeholder),
    keymap.of([
      { key: 'Mod-b', run: () => (wrapSelection('**', '**'), true) },
      { key: 'Mod-i', run: () => (wrapSelection('*', '*'), true) },
      { key: 'Mod-k', run: () => (wrapSelection('[', '](https://)'), true) },
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
  view?.destroy()
  view = null
})
</script>

<template>
  <div class="md-editor">
    <div class="md-toolbar">
      <template v-for="group in toolGroups" :key="group.key">
        <div class="md-tools">
          <button
            v-for="tool in group.items"
            :key="tool.title"
            type="button"
            class="md-tool"
            :title="tool.title"
            @click="tool.run"
          >
            {{ tool.label }}
          </button>
        </div>
        <span class="md-divider" aria-hidden="true" />
      </template>
    </div>
    <div ref="host" class="md-pane md-edit" />
  </div>
</template>

<style scoped>
.md-editor {
  --md-min-height: v-bind(minHeight);
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
  margin-bottom: 0.5rem;
}

.md-tools {
  display: flex;
  gap: 0.25rem;
}

.md-tool {
  padding: 0.25rem 0.55rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--ink);
  background: var(--bg-sunken);
  border: var(--bw-sm) solid var(--border);
  border-radius: 6px;
  cursor: pointer;
}

.md-tool:hover {
  background: var(--gray-200);
}

.md-divider {
  width: 1px;
  height: 1.1rem;
  background: var(--border-strong);
}
</style>
