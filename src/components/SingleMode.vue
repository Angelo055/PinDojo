<script setup lang="ts">
import Keyboard from "../components/Keyboard.vue";
import Hanzi from "../components/Hanzi.vue";
import Pinyin from "../components/Pinyin.vue";
import TypeSummary from "../components/TypeSummary.vue";
import MenuList from "../components/MenuList.vue";
import { moqiCodeMap } from '../utils/moqiCode';

import { onMounted, onActivated, onDeactivated, ref, watchPostEffect } from "vue";
import { matchSpToPinyin } from "../utils/keyboard";
import { useStore } from "../store";
import { computed } from "vue";
import { getPinyinOf } from "../utils/hanzi";
import { TypingSummary } from "../utils/summary";
import { followKeys, leadKeys } from "../utils/pinyin";
import { randInt } from "../utils/number";
import { storeToRefs } from "pinia";

// 添加数据加载和页面就绪状态
const isDataReady = ref(false)
const isPageReady = ref(false)

// 初始化数据
onMounted(async () => {
  try {
    await moqiCodeMap.ensureDataLoaded()
    isDataReady.value = true
    isPageReady.value = true
  } catch (error) {
    console.error('Failed to load moqi data:', error)
  }
})

export interface SingleModeProps {
  nextChar?: () => string;
  hanziList?: string[];
  onValidInput?: (result: boolean) => void;
  mode?: "Lead" | "Follow";
  isBujianMode?: boolean;
  getBujianPinyin?: (bujian: string) => string[];
}

// 获取下一个练习汉字
function nextChar() {
  if (!props.mode) {
    return props.nextChar?.() ?? "";
  }
  return props.hanziList?.[randInt(props.hanziList?.length)] ?? "";
}

// 当前输入的拼音序列
const pinyin = ref<string[]>([]);

const store = useStore();
const props = defineProps<SingleModeProps>();
// 当前汉字序列
const hanziSeq = ref(new Array(4).fill(0).map(() => nextChar()));
// 是否输入正确
const isValid = ref(false);

// 打字统计
const summary = ref(new TypingSummary());

// 设置
const settings = storeToRefs(store).settings;


// 获取菜单项
const keys = {
  Lead: leadKeys,
  Follow: followKeys,
  "": [] as string[],
}[props.mode ?? ""];

const progresses = computed(() =>
  keys.map((v) => {
    return {
      key: v,
      progress: store.getProgress(v),
    };
  })
);

const listMenuItems = computed(() => {
  return progresses.value.map(
    (v) =>
      `${v.key.toUpperCase()} ${(store.getAccuracy(v.key) * 100).toFixed(2)}%`
  );
});

const menuIndex = computed(() => {
  if (props.mode === "Lead") {
    return store.currentLeadIndex;
  } else if (props.mode === "Follow") {
    return store.currentFollowIndex;
  }
  return -1;
});

function onMenuChange(i: number) {
  if (props.mode === "Lead") {
    store.currentLeadIndex = i;
  } else if (props.mode === "Follow") {
    store.currentFollowIndex = i;
  }
}

watchPostEffect(() => {
  for (let i = 0; i < 4; ++i) {
    hanziSeq.value.unshift(nextChar());
    hanziSeq.value.pop();
  }
});

// 监听键盘事件
function onKeyPressed() {
  summary.value.onKeyPressed();
}

onActivated(() => {
  document.addEventListener("keypress", onKeyPressed);
});

onDeactivated(() => {
  document.removeEventListener("keypress", onKeyPressed);
});

const currentMap = computed(() => {
  let answer
  const currentHanzi = hanziSeq.value.at(-1) ?? "";

  // 根据不同模式获取拼音
  let pys: string[];
  if (props.isBujianMode && props.getBujianPinyin) {
    // 部件模式下使用专用方法获取拼音
    pys = props.getBujianPinyin(currentHanzi);
  } else {
    // 其他模式使用默认的拼音获取方法
    pys = getPinyinOf(currentHanzi);
  }

  // console.log(currentHanzi, pys);
  // console.log("answer", pys.at(0) ?? "");
  // console.log("xh code", store.mode().py2sp.get(pys.at(0) ?? "") ?? "");
  // console.log("moqi code", moqiCodeMap.getCode(currentHanzi));
  // console.log("moqi getShapes", moqiCodeMap.getShapes(currentHanzi));
  // console.log("moqi getFullSplit", moqiCodeMap.getFullSplit(currentHanzi));
  // console.log("hanziList", props.hanziList);
  console.log("moqi getCharCollection", moqiCodeMap.getCharCollection(currentHanzi, props.hanziList ?? []));

  if (settings.value.enableMoqiCode) {
    // 墨奇模式下的答案处理

    const pinyinMoqi = pys.at(0) ?? "";
    const shuangpin = store.mode().py2sp.get(pinyinMoqi) ?? "";
    const moqiCode = moqiCodeMap.getCode(currentHanzi);
    answer = shuangpin + moqiCode; // 返回4字母组合
  } else {
    // 原有模式的答案处理
    answer = pys.at(0) ?? "";
  }

  return {
    answer,
    codeShapes: moqiCodeMap.getShapes(currentHanzi),
    fullSplit: moqiCodeMap.getFullSplit(currentHanzi),
    getCharCollection: props.hanziList ? moqiCodeMap.getCharCollection(currentHanzi, props.hanziList) : { firstShape: [], endShape: [] },
  }
});

// 获取键盘提示
const hints = computed(() => {
  if (props.isBujianMode) {
    // 部件模式下只需要提示第一个字母
    const answer = currentMap.value.answer;
    // console.log("hint answer", answer);
    return answer ? [answer[0].toLowerCase()] : [];
  }

  if (settings.value.enableMoqiCode) {
    // 墨奇模式下显示完整的4字母提示
    return currentMap.value.answer.split("");
  }

  // 原有模式的提示处理
  // console.log("hint", currentMap.value.answer.split(""), (store.mode().py2sp.get(currentMap.value.answer) ?? "").split(""));
  return (store.mode().py2sp.get(currentMap.value.answer) ?? "").split("");
});

// 处理输入序列
function onSeq([lead, follow, firstShape, lastShape]: [string?, string?, string?, string?]) {
  // 部件练习模式处理逻辑
  if (props.isBujianMode) {
    const currentHanzi = hanziSeq.value.at(-1) ?? "";
    // 使用专用的部件拼音获取方法
    const pys = props.getBujianPinyin ? props.getBujianPinyin(currentHanzi) : [];
    // 部件练习模式下只需验证单一键位
    const expectedKey = pys.at(0)?.[0]?.toLowerCase() ?? "";
    const input = lead ?? "";

    pinyin.value = input ? [input] : [];

    const valid = input.toLowerCase() === expectedKey;

    if (input) {
      props.onValidInput?.(valid);
      summary.value.onValid(valid);
      isValid.value = valid;
    }

    return valid;
  }

  if (settings.value.enableMoqiCode) {
    // 墨奇模式下的输入处理
    const input = (lead ?? "") + (follow ?? "") + (firstShape ?? "") + (lastShape ?? "");
    const expectedAnswer = currentMap.value.answer;

    // 累积输入,直到达到4个字符
    pinyin.value = input.split("");

    const fullInput = input.length === 4;
    if (fullInput) {
      const valid = input === expectedAnswer;
      props.onValidInput?.(valid);
      summary.value.onValid(valid);
      isValid.value = valid;
    }

    // console.log("onSeq moqi", input, expectedAnswer, fullInput, pinyin.value);

    return fullInput ? input === expectedAnswer : false;
  }

  // 原有模式的输入处理
  const res = matchSpToPinyin(
    store.mode(),
    lead as Char,
    follow as Char,
    currentMap.value.answer
  );

  if (!!lead && !!follow) {
    props.onValidInput?.(res.valid);
    store.updateProgressOnValid(res.lead, res.follow, res.valid);
  }

  const fullInput = !!lead && !!follow;
  if (fullInput) {
    summary.value.onValid(res.valid);
  }

  pinyin.value = [res.lead, res.follow].filter((v) => !!v) as string[];

  isValid.value = res.valid;

  // console.log("onSeq", res, pinyin.value, fullInput);

  return res.valid;
}

// 监听正确输入后的处理
watchPostEffect(() => {
  if (isValid.value) {
    setTimeout(() => {
      hanziSeq.value.unshift(nextChar());
      hanziSeq.value.pop();
      pinyin.value = [];
      isValid.value = false;
    }, 100);
  }
});
</script>

<template>
  <div v-if="isPageReady" class="home-page">
    <div class="single-menu">
      <menu-list
        :items="listMenuItems"
        :index="menuIndex"
        @menu-change="onMenuChange"
      />
    </div>

    <div class="input-area">
      <Pinyin :chars="pinyin" />
    </div>

    <div class="hanzi-info">
      <!-- 墨奇模式下的提示显示 -->
      <div v-if="!props.isBujianMode && settings.enableMoqiCode" class="top-hint">
        <div class="hint-row">
          <span class="hint-label">辅助码:</span>
          <span class="hint-content first">{{ currentMap.answer.slice(2, 4) }}</span>
          <span class="hint-label">首末:</span>
          <span class="hint-content second">{{ currentMap.codeShapes }}</span>
          <span class="hint-label">拆分:</span>
          <span class="hint-content">{{ currentMap.fullSplit }}</span>
        </div>
      </div>
      <!-- 部件练习模式下的提示显示 -->
      <div v-if="props.isBujianMode" class="top-hint bujian-mode">
        <div class="hint-row">
          <span class="hint-label">常见字例(首):</span>
          <span class="hint-content">{{ currentMap.getCharCollection?.firstShape.slice(0, 10).join(", ") || 'N/A' }}</span>
        </div>
        <div class="hint-row">
          <span class="hint-label">常见字例(末):</span>
          <span class="hint-content">{{ currentMap.getCharCollection?.endShape.slice(0, 10).join(", ") || 'N/A' }}</span>
        </div>
      </div>

      <div class="hanzi-list">
        <Hanzi
          :hanzi-seq="[...hanziSeq]"
          :is-bujian-mode="props.isBujianMode"
          :get-bujian-pinyin="props.getBujianPinyin" />
      </div>
    </div>

    <div class="single-keyboard">
      <Keyboard :valid-seq="onSeq" :hints="hints" :is-bujian-mode="props.isBujianMode" />
    </div>

    <div class="summary">
      <TypeSummary
        :speed="summary.hanziPerMinutes"
        :accuracy="summary.accuracy"
        :avgpress="summary.pressPerHanzi"
      />
    </div>
  </div>
</template>

<style lang="less">
@import "../styles/color.less";
@import "../styles/var.less";

.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;

  .single-menu {
    position: absolute;
    top: 0;
    left: 100px;
  }

  .hanzi-info {
    position: absolute;
    top: var(--app-padding);
    right: var(--app-padding);
    min-height: 80px;
    display: flex;
    flex-direction: row; // 改为水平方向
    align-items: flex-start; // 顶部对齐
    gap: 7rem; // 增加间距

    .top-hint {
      display: flex;
      align-items: flex-start; // 左对齐
      gap: 0.5rem;
      font-size: 20px;
      font-weight: bold;
      color: var(--text-light);
      padding-top: 5px; // 微调顶部对齐

      // 针对部件模式添加垂直布局
      &.bujian-mode {
        flex-direction: column;
        width: 100%;
        gap: 0.8rem;

        .hint-row {
          width: 100%;
          margin-bottom: 0;
          height: 30px;
        }
      }

      .hint-row {
        display: flex;
        gap: 0.1rem;
        align-items: center;
        height: 80px;
        line-height: 32px;

        .hint-label {
          color: var(--text-lighter);
          min-width: 3.5rem; // 固定标签宽度，保证对齐
          text-align: right; // 标签右对齐
          font-family: 'Noto Serif SC', 'Source Han Serif SC', source-han-serif-sc, serif;
          font-size: 15px;
          color: @primary-color;
        }

        .hint-content {
          padding: 0.1em 0.2em;
          border-radius: 4px;
          background: var(--bg-light);
          font-family: "LXGW WenKai Mono";
          min-width: 5em; // 内容最小宽度
          text-align: left;
        }

        .hint-content.first {
          min-width: 1.5em;
        }

        .hint-content.second {
          min-width: 4em;
        }
      }
    }
  }

  .hanzi-list {
    // 保留必要的样式
    @media (max-width: 576px) {
      top: 120px;
    }
  }

  .input-area {
    margin-top: 8rem;
    margin-bottom: 32px;
    height: 160px;
    display: flex;
    align-items: center;

    @media (max-width: 576px) {
      margin-top: 18vh;
    }
  }

  // 移动端适配
  @media (max-width: 576px) {
    .hanzi-list {
      top: 120px;
    }
    .hanzi-info {
      flex-direction: column-reverse; // 在移动端改回垂直布局
      flex-wrap: wrap-reverse;
      gap: 1rem;
      padding-top: 90px;

      .top-hint {
        display: flex;
        flex-direction:column;
        align-items: center; // 左对齐
        gap: 0.5rem;
        font-size: 14px;
        font-weight: bold;
        color: var(--text-light);

        &.bujian-mode {
          gap: 0.5rem;

          .hint-row {
            height: 100px;
            line-height: 24px;
          }
        }

        .hint-row {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          align-items: end;
          height: 80px;
          line-height: 32px;

          .hint-label {
            color: var(--text-lighter);
            min-width: 3.5rem; // 固定标签宽度，保证对齐
            text-align: right; // 标签右对齐
            font-family: 'Noto Serif SC', 'Source Han Serif SC', source-han-serif-sc, serif;
            font-size: 12px;
            color: @primary-color;
          }

          .hint-content {
            padding: 0.3em 0.6em;
            border-radius: 4px;
            background: var(--bg-light);
            font-family: "LXGW WenKai Mono";
            min-width: 5em; // 内容最小宽度
            text-align: right;
          }
        }
      }
    }
  }

  .summary {
    position: absolute;
    right: var(--app-padding);
    bottom: var(--app-padding);

    @media (max-width: 576px) {
      top: 36px;
    }
  }

  @media (max-width: 576px) {
    .single-keyboard {
      position: absolute;
      bottom: 1em;
    }
  }
}
</style>
