<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState, type Extension } from '@codemirror/state'
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

onMounted(() => {
  if (!host.value) return
  const extensions: Extension[] = [
    markdown(),
    history(),
    drawSelection(),
    EditorView.lineWrapping,
    theme,
    cmPlaceholder(props.placeholder),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
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
</style>
