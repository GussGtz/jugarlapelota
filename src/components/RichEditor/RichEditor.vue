<template>
  <div class="rich-editor border border-muted rounded-xl overflow-hidden focus-within:border-primary transition-colors">
    <!-- Toolbar -->
    <div class="flex items-center gap-1 px-3 py-2 bg-muted/50 border-b border-muted flex-wrap">
      <button v-for="btn in toolbar" :key="btn.cmd"
        @click.prevent="exec(btn.cmd, btn.val)"
        :title="btn.label"
        class="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-muted transition-colors text-sm font-bold"
      >{{ btn.icon }}</button>
      <div class="h-4 w-px bg-muted mx-1"></div>
      <button @click.prevent="insertLink" title="Insertar enlace"
        class="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-muted transition-colors text-sm">
        <IconLink class="w-4 h-4" />
      </button>
      <button @click.prevent="insertImage" title="Insertar imagen"
        class="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-muted transition-colors text-sm">
        <IconImage class="w-4 h-4" />
      </button>
    </div>

    <!-- Editable area -->
    <div
      ref="editor"
      contenteditable="true"
      class="min-h-40 p-4 text-slate-900 bg-white text-sm focus:outline-none leading-relaxed"
      @input="onInput"
      @focus="hasContent = editor?.innerHTML?.trim() !== ''"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({ modelValue: { type: String, default: '' } })
const emit  = defineEmits(['update:modelValue'])

const editor    = ref(null)
const hasContent = ref(false)

const toolbar = [
  { icon: 'B',  cmd: 'bold',          label: 'Negrita' },
  { icon: 'I',  cmd: 'italic',        label: 'Cursiva' },
  { icon: 'U',  cmd: 'underline',     label: 'Subrayado' },
  { icon: 'H1', cmd: 'formatBlock',   val: 'h2', label: 'Título' },
  { icon: '¶',  cmd: 'formatBlock',   val: 'p',  label: 'Párrafo' },
  { icon: '•',  cmd: 'insertUnorderedList', label: 'Lista' },
  { icon: '1.', cmd: 'insertOrderedList',   label: 'Lista numerada' },
  { icon: '—',  cmd: 'insertHorizontalRule', label: 'Línea' },
]

function exec(cmd, val) {
  document.execCommand(cmd, false, val || null)
  editor.value?.focus()
  onInput()
}

function insertLink() {
  const url = prompt('URL del enlace:')
  if (url) document.execCommand('createLink', false, url)
  onInput()
}

function insertImage() {
  const url = prompt('URL de la imagen:')
  if (url) document.execCommand('insertImage', false, url)
  onInput()
}

function onInput() {
  const html = editor.value?.innerHTML || ''
  hasContent.value = html.trim() !== ''
  emit('update:modelValue', html)
}

onMounted(() => {
  if (props.modelValue && editor.value) {
    editor.value.innerHTML = props.modelValue
    hasContent.value = true
  }
})

watch(() => props.modelValue, (val) => {
  if (editor.value && editor.value.innerHTML !== val) {
    editor.value.innerHTML = val || ''
    hasContent.value = !!val
  }
})
</script>

<style scoped>
[contenteditable] h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #0f172a; }
[contenteditable] p  { margin-bottom: 0.75rem; color: #1e293b; }
[contenteditable] ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
[contenteditable] ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
[contenteditable] img { max-width: 100%; border-radius: 0.5rem; margin: 0.5rem 0; }
[contenteditable] hr { border-color: #e2e8f0; margin: 1rem 0; }
[contenteditable] a  { color: #0ea5e9; text-decoration: underline; }
[contenteditable]:empty:before { content: 'Escribe el contenido de la noticia...'; color: #94a3b8; }
</style>
