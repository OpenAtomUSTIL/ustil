<script setup lang="ts">
/* 接口权限总览：GET /admin/api-registry（全量数组，keyword 前端过滤路径） */
import { computed, onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { ApiRegistryItem } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import { roleLabel } from '@/utils/format'
import { KEYWORD_MAX } from '@/utils/limits'

const all = ref<ApiRegistryItem[] | null>(null)
const loading = ref(true)
const error = ref('')
const keyword = ref('')

const filtered = computed<ApiRegistryItem[]>(() => {
  const list = all.value ?? []
  const q = keyword.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((item) => item.path.toLowerCase().includes(q))
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    all.value = await adminApi.apiRegistry()
  } catch (err) {
    error.value = describeError(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="section-head">
      <h2>接口权限总览</h2>
      <span v-if="all" class="hint">共 {{ all.length }} 个接口</span>
    </div>

    <form class="filter-bar" role="search" @submit.prevent>
      <div class="field">
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索路径"
          aria-label="搜索路径"
          :maxlength="KEYWORD_MAX"
        >
      </div>
    </form>

    <div v-if="error" class="state-box">
      <p class="form-error">{{ error }}</p>
      <button class="btn btn-secondary" type="button" @click="load">重试</button>
    </div>
    <div v-else-if="loading" class="empty">加载中…</div>
    <EmptyState v-else-if="filtered.length === 0" title="没有匹配的接口" hint="换个关键词试试" />

    <div v-else class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>方法</th>
            <th>路径</th>
            <th>权限</th>
            <th>控制器</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in filtered" :key="`${item.method}-${item.path}-${index}`">
            <td><span class="method" :data-method="item.method">{{ item.method }}</span></td>
            <td class="path">{{ item.path }}</td>
            <td>
              <span v-if="item.isPublic" class="perm-badge perm-public" title="公开接口">PUB 公开</span>
              <template v-else-if="item.roles.length > 0">
                <span v-for="role in item.roles" :key="role" class="perm-badge perm-role">
                  {{ roleLabel(role) }}
                </span>
              </template>
              <span v-else class="perm-login">登录即可</span>
            </td>
            <td class="controller">
              {{ item.controller }}
              <span class="handler">{{ item.handler }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  margin-bottom: 1.25rem;
}

.filter-bar .field {
  margin: 0;
}

.filter-bar input {
  min-width: 16rem;
  padding: 0.5rem 0.75rem;
  border: var(--bw-sm) solid var(--border-strong);
  border-radius: var(--br-8);
  background: var(--bg-raised);
  font-size: var(--fs-meta);
}

.state-box {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.table-wrap {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-12);
  font-size: var(--fs-meta);
}

.admin-table th,
.admin-table td {
  padding: 0.75rem 0.9rem;
  text-align: left;
  border-bottom: var(--bw-sm) solid var(--border);
  white-space: nowrap;
}

.admin-table th {
  font-size: var(--fs-small);
  letter-spacing: 0.06em;
  color: var(--ink-faint);
  font-weight: var(--fw-semibold);
}

.admin-table tr:last-child td {
  border-bottom: none;
}

.path {
  font-family: var(--font-mono);
  font-size: 0.82em;
  color: var(--ink-muted);
  max-width: 26rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.method {
  display: inline-flex;
  align-items: center;
  padding: 0.12rem 0.52rem;
  border-radius: var(--br-6);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: var(--fw-semibold);
  background: var(--gray-200);
  color: var(--gray-700);
}

.method[data-method='GET'] {
  background: rgba(106, 155, 204, 0.13);
  color: var(--sky);
}

.method[data-method='POST'] {
  background: rgba(102, 153, 135, 0.16);
  color: var(--mineral);
}

.method[data-method='PATCH'],
.method[data-method='PUT'] {
  background: rgba(217, 119, 87, 0.12);
  color: var(--clay-dark);
}

.method[data-method='DELETE'] {
  background: rgba(191, 77, 67, 0.12);
  color: var(--error);
}

.perm-badge {
  display: inline-flex;
  align-items: center;
  margin-right: 0.35rem;
  padding: 0.12rem 0.52rem;
  border-radius: var(--br-6);
  font-size: 0.78rem;
  font-weight: var(--fw-semibold);
  border: var(--bw-sm) solid transparent;
}

.perm-public {
  background: rgba(106, 155, 204, 0.13);
  color: var(--sky);
  border-color: rgba(106, 155, 204, 0.3);
}

.perm-role {
  background: var(--gray-200);
  color: var(--gray-700);
  border-color: var(--border-strong);
}

.perm-login {
  color: var(--ink-faint);
}

.controller {
  color: var(--ink-muted);
}

.handler {
  margin-left: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.78em;
  color: var(--ink-faint);
}
</style>
