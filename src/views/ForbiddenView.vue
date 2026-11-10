<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue'
</script>

<template>
  <div class="container compose-page">
    <EmptyState title="无权访问" hint="当前账号没有访问该资源的权限。如需协助请联系社区管理员。">
      <p style="margin-top: 1.15rem">
        <RouterLink class="btn btn-secondary" :to="{ name: 'home' }">回到首页</RouterLink>
      </p>
    </EmptyState>
  </div>
</template>
