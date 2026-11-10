<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue'
</script>

<template>
  <div class="container compose-page">
    <EmptyState title="页面不存在" hint="它可能已被删除，或者链接地址有误。">
      <p style="margin-top: 1.15rem">
        <RouterLink class="btn btn-secondary" :to="{ name: 'home' }">回到首页</RouterLink>
      </p>
    </EmptyState>
  </div>
</template>
