<script setup lang="ts">
 import IconButton from '@/components/common/IconButton.vue'
import Delete from '@/components/icons/Delete.vue'
import Edit from '@/components/icons/Edit.vue'
import Close from '@/components/icons/Close.vue'
import Save from '@/components/icons/Save.vue'

interface Props {
  bindKey?: string
  editing?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits(['edit', 'delete', 'save', 'cancel'])

</script>

<template>
  <!-- TODO: support multiple save -->
  <div v-if="props.editing" class="flex-box-h edit-column-func">
    <icon-button :icon="Save" @click="emit('save')" />
    <icon-button :icon="Close" @click="emit('cancel')" />
  </div>
  <div v-else class="flex-box-h edit-column-func">
    <icon-button :icon="Edit" @click="emit('edit')" />
    <n-popconfirm :negative-text="$t('cancel')" :positive-text="$t('confirm')" @positive-click="emit('delete')">
      <template #trigger>
        <icon-button :icon="Delete" />
      </template>
      {{ $t('remove_tip', { name: props.bindKey }) }}
    </n-popconfirm>
  </div>
</template>

<style lang="scss">
.edit-column-func {
  align-items: center;
  justify-content: center;
  gap: 10px;
}
</style>
