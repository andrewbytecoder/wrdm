<script setup lang="ts">
import {computed} from "vue";
import {typesBgColor, typesColor} from "../../consts/support_redis_type";


interface Props {
  type?: string
  color?: string
  size?: string
  bordered: boolean,
}


//  size 的值，只能为 'small' | 'medium' | 'large'

const props = withDefaults(defineProps<Props>(), {
  type: 'STRING',
  color: 'white',
  bordered: false,
  size: 'medium',
})

const fontColor = computed(() => {
  return typesColor[props.type]
})

const backgroundColor = computed(() => {
  return typesBgColor[props.type]
})

</script>

<template>
  <n-tag
    :bordered="false"
    :color="{ color: backgroundColor, borderColor: fontColor, textColor: fontColor }"
    :size="props.size"
    :class="[props.size === 'small' ? 'redis-type-tag-small' : 'redis-type-tag']"
    strong
  >
    {{ props.type }}
  </n-tag>
  <!--  <div class="redis-type-tag flex-box-h" :style="{backgroundColor: backgroundColor}">{{ props.type }}</div>-->
</template>

<style lang="scss">
.redis-type-tag {
  padding: 0 12px;
}

.redis-type-tag-small {
  padding: 0 5px;
}

</style>