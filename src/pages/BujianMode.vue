<script setup lang="ts">
import SingleMode from '../components/SingleMode.vue';
import { ref, onMounted } from 'vue';
import { hanziList } from '../utils/hanzi';
import hanzi_bujian from '../utils/hanzi_bujian.json';

// 构建部件Map
const bujianMap = ref({
  hanzi: [] as string[],
  pinyin: [] as string[][]
});

// 初始化部件数据
onMounted(() => {
  if (hanzi_bujian.popular) {
    bujianMap.value.hanzi = hanzi_bujian.popular.hanzi;
    bujianMap.value.pinyin = hanzi_bujian.popular.pinyin;
  }
});

// 构建部件到拼音的映射
const bujianToPinyin = ref(new Map<string, string[]>());

// 初始化映射关系
onMounted(() => {
  const { hanzi, pinyin } = hanzi_bujian.popular;
  for (let i = 0; i < hanzi.length; i++) {
    bujianToPinyin.value.set(hanzi[i], pinyin[i]);
  }
});

// 获取部件的拼音
function getBujianPinyin(bujian: string): string[] {
  return bujianToPinyin.value.get(bujian) || [];
}

// 随机选择一个部件
function nextChar() {
  const index = Math.floor(Math.random() * bujianMap.value.hanzi.length);
  return bujianMap.value.hanzi[index];
}

// 自定义验证函数，仅需验证单一键位
function validateSingleKey(result: boolean) {
  // 这个函数将传递给SingleMode组件，在部件练习模式下只需验证单一键位
  return result;
}
</script>

<template>
  <single-mode
    :next-char="nextChar"
    :hanzi-list="hanziList.hanzi"
    :on-valid-input="validateSingleKey"
    :is-bujian-mode="true"
    :get-bujian-pinyin="getBujianPinyin" />
</template>

<style>
</style>