<script setup lang="ts">
import AppFooter from '@/components/AppFooter.vue'
import AppHeader from '@/components/AppHeader.vue'
import ToastHost from '@/components/ToastHost.vue'
</script>

<template>
  <AppHeader />
  <main id="main">
    <RouterView />
  </main>
  <AppFooter />
  <ToastHost />
</template>
