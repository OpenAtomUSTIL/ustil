<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

onMounted(async () => {
  await auth.ensureReady()
  await router.replace({ name: 'home' })
  ui.openProfile()
})
</script>

<template>
  <span class="sr-only">个人中心</span>
</template>
