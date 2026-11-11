<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { describeError } from '@/api/error'
import { authApi, usersApi } from '@/api/request'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useUiStore } from '@/stores/ui'
import { formatDate, roleLabel } from '@/utils/format'
import { AVATAR_EXTENSIONS } from '@/utils/upload'
import AppAvatar from '@/components/AppAvatar.vue'
import FileUploader from '@/components/FileUploader.vue'

const route = useRoute()
const auth = useAuthStore()
const toast = useToastStore()
const ui = useUiStore()

const nickname = ref('')
const profileError = ref('')
const savingProfile = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const newPassword2 = ref('')
const passwordError = ref('')
const savingPassword = ref(false)

const identifierType = ref<'email' | 'phone'>('email')
const identifierValue = ref('')
const identifierPassword = ref('')
const identifierError = ref('')
const savingIdentifier = ref(false)

const inviteCode = ref('')
const redeemError = ref('')
const savingRedeem = ref(false)

const emailText = computed(() => auth.user?.email ?? '未绑定')
const phoneText = computed(() => auth.user?.phone ?? '未绑定')

watch(
  () => ui.profileOpen,
  async (open) => {
    if (!open) return
    await auth.ensureReady()
    nickname.value = auth.user?.nickname ?? ''
    profileError.value = ''
    passwordError.value = ''
    identifierError.value = ''
    currentPassword.value = ''
    newPassword.value = ''
    newPassword2.value = ''
    identifierType.value = 'email'
    identifierValue.value = ''
    identifierPassword.value = ''
    inviteCode.value = ''
    redeemError.value = ''
  },
)

watch(
  () => route.fullPath,
  () => {
    ui.closeProfile()
  },
  { flush: 'sync' },
)

function close(): void {
  ui.closeProfile()
}

async function redeem(): Promise<void> {
  if (savingRedeem.value) return
  redeemError.value = ''
  savingRedeem.value = true
  try {
    const updated = await authApi.redeemInviteCode({ inviteCode: inviteCode.value.trim() })
    auth.setUser(updated)
    toast.show('已转正为学习成员')
  } catch (err) {
    redeemError.value = describeError(err)
  } finally {
    savingRedeem.value = false
  }
}

async function saveProfile(): Promise<void> {
  if (savingProfile.value) return
  profileError.value = ''
  savingProfile.value = true
  try {
    const updated = await usersApi.updateMe({ nickname: nickname.value.trim() })
    auth.setUser(updated)
    toast.show('资料已更新')
  } catch (err) {
    profileError.value = describeError(err)
  } finally {
    savingProfile.value = false
  }
}

/** 头像上传（png / jpg / jpeg ≤10MB），进度与失败原因由 FileUploader 展示 */
async function uploadAvatar(file: File, onProgress: (percent: number) => void): Promise<void> {
  const updated = await usersApi.uploadAvatar(file, onProgress)
  auth.setUser(updated)
  toast.show('头像已更新')
}

async function changePassword(): Promise<void> {
  if (savingPassword.value) return
  passwordError.value = ''
  if (newPassword.value !== newPassword2.value) {
    passwordError.value = '两次输入的新密码不一致'
    return
  }
  savingPassword.value = true
  try {
    await authApi.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    currentPassword.value = ''
    newPassword.value = ''
    newPassword2.value = ''
    toast.show('密码已修改')
  } catch (err) {
    passwordError.value = describeError(err)
  } finally {
    savingPassword.value = false
  }
}

async function bindIdentifier(): Promise<void> {
  if (savingIdentifier.value) return
  identifierError.value = ''
  savingIdentifier.value = true
  try {
    const updated = await usersApi.updateIdentifier({
      type: identifierType.value,
      value: identifierValue.value.trim(),
      password: identifierPassword.value,
    })
    auth.setUser(updated)
    identifierValue.value = ''
    identifierPassword.value = ''
    toast.show('绑定成功')
  } catch (err) {
    identifierError.value = describeError(err)
  } finally {
    savingIdentifier.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="drawer-backdrop" :class="{ shown: ui.profileOpen }" @click="close" />
    <aside class="profile-drawer" :class="{ shown: ui.profileOpen }" aria-label="个人中心">
      <header class="pd-head">
        <h2>个人中心</h2>
        <button class="pd-close" type="button" aria-label="关闭" @click="close">
          <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </header>

      <div v-if="auth.user" class="pd-body">
        <section class="pd-id">
          <AppAvatar
            :nickname="auth.user.nickname"
            :avatar-url="auth.user.avatarUrl"
            :user-id="auth.user.id"
            size="xl"
          />
          <div class="who">
            <b>{{ auth.user.nickname }}</b>
            <div class="sub">
              <span class="badge badge-role">{{ roleLabel(auth.user.role) }}</span>
              <span style="font-size: var(--fs-small); color: var(--ink-faint)">
                加入于 {{ formatDate(auth.user.createdAt) }}
              </span>
            </div>
          </div>
        </section>

        <div class="pd-contacts">
          <span><b>邮箱：</b>{{ emailText }}</span>
          <span><b>手机号：</b>{{ phoneText }}</span>
        </div>

        <section v-if="auth.user.role === 'VISITOR'" class="pd-section">
          <h3>邀请码转正</h3>
          <p class="hint">持邀请码可立即成为学习成员；临时访客账号满 7 天将自动删除。</p>
          <div v-if="redeemError" class="form-error">{{ redeemError }}</div>
          <form class="form-grid" @submit.prevent="redeem">
            <div class="field">
              <label for="pd-invite">邀请码</label>
              <input id="pd-invite" v-model="inviteCode" type="text" maxlength="64" required placeholder="输入邀请码">
            </div>
            <button class="btn btn-clay" type="submit" :disabled="savingRedeem">
              {{ savingRedeem ? '提交中…' : '转正为学习成员' }}
            </button>
          </form>
        </section>

        <div class="pd-links">
          <RouterLink class="pd-link" :to="{ name: 'articles' }" @click="close">
            我的文章<span>查看与管理已发布文章</span>
          </RouterLink>
          <RouterLink v-if="auth.canViewAssignments" class="pd-link" :to="{ name: 'assignments' }" @click="close">
            我的作业提交<span>查看提交记录与截止时间</span>
          </RouterLink>
        </div>

        <section class="pd-section">
          <h3>编辑资料</h3>
          <div v-if="profileError" class="form-error">{{ profileError }}</div>
          <form class="form-grid" @submit.prevent="saveProfile">
            <div class="field">
              <label for="profile-nickname">昵称</label>
              <input id="profile-nickname" v-model="nickname" type="text" required maxlength="30">
            </div>
            <button class="btn btn-primary" type="submit" :disabled="savingProfile">
              {{ savingProfile ? '保存中…' : '保存资料' }}
            </button>
          </form>
          <div style="margin-top: 1rem">
            <FileUploader
              :extensions="AVATAR_EXTENSIONS"
              :upload="uploadAvatar"
              button-text="更换头像"
            />
          </div>
        </section>

        <section class="pd-section">
          <h3>修改密码</h3>
          <div v-if="passwordError" class="form-error">{{ passwordError }}</div>
          <form class="form-grid" @submit.prevent="changePassword">
            <div class="field">
              <label for="pw-current">当前密码</label>
              <input id="pw-current" v-model="currentPassword" type="password" autocomplete="current-password" required>
            </div>
            <div class="field">
              <label for="pw-new">新密码</label>
              <input id="pw-new" v-model="newPassword" type="password" autocomplete="new-password" required>
            </div>
            <div class="field">
              <label for="pw-new2">确认新密码</label>
              <input id="pw-new2" v-model="newPassword2" type="password" autocomplete="new-password" required>
            </div>
            <button class="btn btn-primary" type="submit" :disabled="savingPassword">
              {{ savingPassword ? '提交中…' : '修改密码' }}
            </button>
          </form>
        </section>

        <section class="pd-section">
          <h3>绑定邮箱 / 手机号</h3>
          <div v-if="identifierError" class="form-error">{{ identifierError }}</div>
          <form class="form-grid" @submit.prevent="bindIdentifier">
            <div class="field">
              <label for="id-type">类型</label>
              <select id="id-type" v-model="identifierType">
                <option value="email">邮箱</option>
                <option value="phone">手机号</option>
              </select>
            </div>
            <div class="field">
              <label for="id-value">{{ identifierType === 'email' ? '邮箱地址' : '手机号' }}</label>
              <input id="id-value" v-model="identifierValue" type="text" required>
            </div>
            <div class="field">
              <label for="id-password">当前密码（验证身份）</label>
              <input id="id-password" v-model="identifierPassword" type="password" autocomplete="current-password" required>
            </div>
            <button class="btn btn-primary" type="submit" :disabled="savingIdentifier">
              {{ savingIdentifier ? '提交中…' : '确认绑定' }}
            </button>
          </form>
        </section>
      </div>
    </aside>
  </Teleport>
</template>
