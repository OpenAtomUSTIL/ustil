import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/resources/new',
  name: 'resource-new',
  component: () => import('@/views/resource/ResourceEditorView.vue'),
  meta: { requiresAuth: true, requiresRole: ['WHEEL', 'ADMIN'] },
}

export default route
