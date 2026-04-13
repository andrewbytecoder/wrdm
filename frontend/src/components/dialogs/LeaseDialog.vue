<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import useDialog from '@/stores/dialog'
import useConnectionStore from '@/stores/connections'
import { useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'

const dialogStore = useDialog()
const connectionStore = useConnectionStore()
const message = useMessage()
const i18n = useI18n()

const state = reactive({
  server: '',
  key: '',
  leaseId: 0,
  ttl: -1,
  newTtl: 60,
  loading: false,
})

watch(
  () => dialogStore.leaseDialogVisible,
  async (visible) => {
    if (!visible) return
    const { server, key, leaseId } = dialogStore.leaseParam
    state.server = server
    state.key = key
    state.leaseId = leaseId || 0
    state.ttl = -1
    state.newTtl = 60
    if (state.leaseId > 0) {
      await refreshTTL()
    }
  }
)

const hasLease = computed(() => state.leaseId > 0)

const refreshTTL = async () => {
  if (!hasLease.value) return
  state.loading = true
  try {
    const info = await connectionStore.leaseTimeToLive(state.server, state.leaseId, false)
    state.ttl = info?.TTL ?? info?.ttl ?? -1
  } catch (e: any) {
    message.error(e.message)
  } finally {
    state.loading = false
  }
}

const keepAlive = async () => {
  if (!hasLease.value) return
  state.loading = true
  try {
    await connectionStore.keepAliveLease(state.server, state.leaseId)
    message.success(i18n.t('handle_succ'))
    await refreshTTL()
  } catch (e: any) {
    message.error(e.message)
  } finally {
    state.loading = false
  }
}

const revoke = async () => {
  if (!hasLease.value) return
  state.loading = true
  try {
    await connectionStore.revokeLease(state.server, state.leaseId)
    message.success(i18n.t('handle_succ'))
    state.leaseId = 0
    state.ttl = -1
  } catch (e: any) {
    message.error(e.message)
  } finally {
    state.loading = false
  }
}

const attachNewLease = async () => {
  state.loading = true
  try {
    const kv = await connectionStore.getKV(state.server, state.key)
    if (!kv) throw new Error('key not found')
    const lease = await connectionStore.grantLease(state.server, state.newTtl)
    await connectionStore.putKV(state.server, state.key, kv.valueBase64, lease.id)
    state.leaseId = lease.id
    message.success(i18n.t('handle_succ'))
    await refreshTTL()
  } catch (e: any) {
    message.error(e.message)
  } finally {
    state.loading = false
  }
}

const onClose = () => dialogStore.closeLeaseDialog()
</script>

<template>
  <n-modal
    v-model:show="dialogStore.leaseDialogVisible"
    :closable="false"
    :close-on-esc="false"
    :mask-closable="false"
    :show-icon="false"
    title="Lease"
    preset="dialog"
    transform-origin="center"
  >
    <n-form :show-require-mark="false" label-width="auto" label-placement="left">
      <n-form-item :label="$t('server')">
        <n-input :value="state.server" readonly />
      </n-form-item>
      <n-form-item label="Key">
        <n-input :value="state.key" readonly />
      </n-form-item>
      <n-form-item label="LeaseID">
        <n-input :value="String(state.leaseId || 0)" readonly />
      </n-form-item>
      <n-form-item label="TTL">
        <n-input :value="String(state.ttl)" readonly />
        <n-button style="margin-left: 8px" :loading="state.loading" @click="refreshTTL">Refresh</n-button>
      </n-form-item>

      <n-divider />

      <n-form-item label="Attach TTL">
        <n-input-number v-model:value="state.newTtl" :min="1" :max="86400" />
        <n-button style="margin-left: 8px" type="primary" :loading="state.loading" @click="attachNewLease">
          Attach
        </n-button>
      </n-form-item>
    </n-form>

    <template #action>
      <div class="flex-item n-dialog__action">
        <n-button @click="onClose">{{ $t('cancel') }}</n-button>
        <n-button :disabled="!hasLease" :loading="state.loading" @click="keepAlive">KeepAlive</n-button>
        <n-button type="error" :disabled="!hasLease" :loading="state.loading" @click="revoke">Revoke</n-button>
      </div>
    </template>
  </n-modal>
</template>

