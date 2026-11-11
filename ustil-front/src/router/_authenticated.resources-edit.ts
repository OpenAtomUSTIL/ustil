import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/resources/:id/edit',
  name: 'resource-edit',
  component: () => import('@/views/resource/ResourceEditorView.vue'),
  meta: { requiresAuth: true, requiresRole: ['WHEEL', 'ADMIN'] },
}

export default route
