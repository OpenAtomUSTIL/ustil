import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: 'article-review',
  name: 'admin-article-review',
  component: () => import('@/views/admin/AdminArticleReviewView.vue'),
}

export default route
