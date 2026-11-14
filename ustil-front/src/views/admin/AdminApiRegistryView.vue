<script setup lang="ts">
/* 接口权限总览：GET /admin/api-registry（全量数组，keyword 前端过滤路径） */
import { computed, onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { ApiRegistryItem } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import { roleLabel } from '@/utils/format'
import { KEYWORD_MAX } from '@/utils/limits'

const all = ref<ApiRegistryItem[] | null>(null)
const loading = ref(true)
const error = ref('')
const keyword = ref('')

function methodBadge(method: string): string {
  switch (method) {
    case 'GET': return 'badge-sky'
    case 'POST': return 'badge-mineral'
    case 'PATCH':
    case 'PUT': return 'badge-clay'
    case 'DELETE': return 'badge-error'
    default: return 'badge-gray'
  }
}

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

    <form class="admin-filters" role="search" @submit.prevent>
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
    <LoadingState v-else-if="loading" />
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
            <td><span class="badge" :class="methodBadge(item.method)">{{ item.method }}</span></td>
            <td class="path">{{ item.path }}</td>
            <td>
              <span v-if="item.isPublic" class="badge badge-sky" title="公开接口">PUB 公开</span>
              <template v-else-if="item.roles.length > 0">
                <span v-for="role in item.roles" :key="role" class="badge badge-plum">
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
/* 业务独有：路径列 mono 截断 */
.path {
  font-family: var(--font-mono);
  font-size: 0.82em;
  color: var(--ink-muted);
  max-width: 26rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 业务独有：登录即可为弱化文本而非徽章 */
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
