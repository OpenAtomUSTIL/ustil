<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { AdminStats } from '@/api/types'

const stats = ref<AdminStats | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    stats.value = await adminApi.stats()
  } catch (err) {
    error.value = describeError(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="section-head">
      <h2>概览</h2>
    </div>

    <div v-if="error" class="form-error">{{ error }}</div>
    <div v-else-if="loading" class="empty">加载中…</div>

    <template v-else-if="stats">
      <div class="stat-grid">
        <div class="stat-card">
          <b>{{ stats.users.MEMBER + stats.users.ALUMNI + stats.users.WHEEL + stats.users.ADMIN }}</b>
          <span>正式成员</span>
        </div>
        <div class="stat-card">
          <b>{{ stats.users.VISITOR }}</b>
          <span>临时访客</span>
        </div>
        <div class="stat-card">
          <b>{{ stats.users.ALUMNI }}</b>
          <span>校友</span>
        </div>
        <div class="stat-card">
          <b>{{ stats.users.WHEEL }}</b>
          <span>负责人</span>
        </div>
        <div class="stat-card">
          <b>{{ stats.activeInviteCodes }}</b>
          <span>有效邀请码</span>
        </div>
        <div class="stat-card">
          <b>{{ stats.visitorPendingCleanup }}</b>
          <span>访客待清理</span>
        </div>
      </div>

      <div class="quick-links">
        <RouterLink class="btn btn-clay" :to="{ name: 'admin-invite-codes' }">生成邀请码</RouterLink>
        <RouterLink class="btn btn-secondary" :to="{ name: 'admin-users' }">管理用户</RouterLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1.15rem 1.25rem;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-12);
}

.stat-card b {
  display: block;
  font-family: var(--font-serif);
  font-size: 1.85rem;
  font-weight: var(--fw-regular);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.stat-card span {
  font-size: var(--fs-small);
  color: var(--ink-faint);
  letter-spacing: 0.06em;
}

.quick-links {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.75rem;
}
</style>
