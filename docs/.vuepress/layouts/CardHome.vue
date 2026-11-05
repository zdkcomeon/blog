<script setup>
import { useBlogType } from "@vuepress/plugin-blog/client";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouteLink, useRouter, withBase } from "vuepress/client";
import { filterArticles, prepareArticles, topics } from "../home.js";
import "../styles/card-home.scss";

const source = useBlogType("article");
const router = useRouter();
const articles = computed(() => prepareArticles(source.value.items));
const flipped = ref(false);
const selectedCategory = ref("");
const visibleCount = ref(6);
const filtered = computed(() => filterArticles(articles.value, selectedCategory.value));
const visible = computed(() => filtered.value.slice(0, visibleCount.value));
const filters = [
  { name: "全部", category: "", suit: "✳" },
  ...topics.map(({ name, category, suit }) => ({ name, category, suit })),
  { name: "生活记录", category: "生活记录", suit: "↗" },
];
const activeTopic = ref(null);
const topicArticles = computed(() => activeTopic.value
  ? filterArticles(articles.value, activeTopic.value.category).slice(0, 4)
  : []);
const topicDialog = ref(null);
const page = ref(null);
const mobileMenu = ref(null);
let observer;
let tiltQuery;
let previousOverflow;

watch(selectedCategory, () => { visibleCount.value = 6; });

const countTopic = (topic) => filterArticles(articles.value, topic.category).length;
const articleSuit = (article) => topics.find((topic) => article.categories.includes(topic.category))?.suit ?? "✳";

const surprise = () => {
  if (articles.value.length) {
    const article = articles.value[Math.floor(Math.random() * articles.value.length)];
    void router.push(article.path);
  }
};

const openTopic = async (topic) => {
  activeTopic.value = topic;
  await nextTick();
  if (!topicDialog.value || topicDialog.value.open) return;
  topicDialog.value.showModal();
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
};

const closeTopic = () => { topicDialog.value?.close(); };
const restorePage = () => {
  activeTopic.value = null;
  if (previousOverflow !== undefined) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = undefined;
  }
};
const closeOnBackdrop = (event) => {
  if (event.target !== topicDialog.value) return;
  const rect = topicDialog.value.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeTopic();
};

const tilt = (event) => {
  if (!tiltQuery?.matches || event.pointerType !== "mouse") return;
  const element = event.currentTarget;
  const rect = element.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  element.style.setProperty("--tilt-x", `${(0.5 - y) * 12}deg`);
  element.style.setProperty("--tilt-y", `${(x - 0.5) * 12}deg`);
  element.style.setProperty("--shine-x", `${x * 100}%`);
  element.style.setProperty("--shine-y", `${y * 100}%`);
};
const resetTilt = (event) => {
  for (const property of ["--tilt-x", "--tilt-y", "--shine-x", "--shine-y"]) {
    event.currentTarget.style.removeProperty(property);
  }
};
const closeMenu = () => { if (mobileMenu.value) mobileMenu.value.open = false; };

onMounted(() => {
  tiltQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.08 });
  for (const section of page.value.querySelectorAll("[data-reveal]")) {
    // 页面无脚本或 observer 不可用时，内容仍默认可读。
    if (section.getBoundingClientRect().top > window.innerHeight) section.classList.add("will-reveal");
    observer.observe(section);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  closeTopic();
  restorePage();
});
</script>

<template>
  <div ref="page" class="card-home">
    <a class="card-skip" href="#main-content">跳到正文</a>
    <header class="card-header">
      <RouteLink to="/" class="card-brand" aria-label="可爱团子随记首页">
        <span class="brand-mark" aria-hidden="true">hhs<span>✳</span></span>
        <span class="brand-caption">可爱团子随记<span>满觉陇的数字花园</span></span>
      </RouteLink>
      <nav class="card-desktop-nav" aria-label="首页导航">
        <a href="#collections">知识牌组</a>
        <a href="#journal">最近随记</a>
        <RouteLink to="/guide/">文档地图 <span aria-hidden="true">↗</span></RouteLink>
      </nav>
      <div class="card-header-actions">
        <SearchBox />
        <RouteLink class="header-about" to="/about/">认识一下 <span aria-hidden="true">↗</span></RouteLink>
        <details ref="mobileMenu" class="card-mobile-menu">
          <summary aria-label="展开首页导航"><span></span><span></span></summary>
          <nav aria-label="手机首页导航" @click="closeMenu">
            <a href="#collections">知识牌组</a>
            <a href="#journal">最近随记</a>
            <RouteLink to="/guide/">文档地图</RouteLink>
            <RouteLink to="/about/">关于作者</RouteLink>
          </nav>
        </details>
      </div>
    </header>

    <main id="main-content" tabindex="-1">
      <section class="card-hero" aria-labelledby="hero-title">
        <div class="hero-grid" aria-hidden="true"></div>
        <div class="hero-copy">
          <p class="card-eyebrow"><span class="status-dot"></span> A DEVELOPER'S FIELD NOTES</p>
          <h1 id="hero-title">保持好奇<span>好戏未完<span class="title-period">.</span></span></h1>
          <p class="hero-description">写代码，解难题，收集生活的灵感。<br />把每一次探索，都变成下一次出发的底牌。</p>
          <div class="hero-actions">
            <button class="card-primary" :disabled="!articles.length" @click="surprise">随手翻一篇 <span aria-hidden="true">↗</span></button>
            <a class="hero-explore" href="#collections">选一张，开始探索 <span aria-hidden="true">↓</span></a>
          </div>
          <div class="hero-footnote">
            <span>JAVA · ENGINEERING · AI · LIFE</span>
            <span>认真记录 / 自由生长</span>
          </div>
        </div>

        <div class="hero-stage">
          <span class="stage-orbit orbit-one" aria-hidden="true"></span>
          <span class="stage-orbit orbit-two" aria-hidden="true"></span>
          <span class="stage-suit stage-suit-one" aria-hidden="true">✳</span>
          <span class="stage-suit stage-suit-two" aria-hidden="true">♦</span>
          <div class="hero-main-card" @pointermove="tilt" @pointerleave="resetTilt">
            <button
              class="hero-flip-card"
              :class="{ 'is-flipped': flipped }"
              :aria-pressed="flipped"
              :aria-label="flipped ? '将作者卡牌翻回正面' : '翻开卡牌，认识作者'"
              @click="flipped = !flipped"
            >
              <span class="hero-card-face hero-card-front" :aria-hidden="flipped">
                <span class="card-corner">J<span>♠</span></span>
                <span class="card-edition">THE CURIOUS ONE</span>
                <span class="portrait-frame">
                  <img :src="withBase('/logo.png')" alt="" width="140" height="140" fetchpriority="high" />
                </span>
                <span class="portrait-title">KEEP<br /><em>CURIOUS.</em></span>
                <span class="card-owner">满觉陇 / WILD AT HEART</span>
                <span class="card-corner corner-bottom">J<span>♠</span></span>
                <span class="card-flip-hint">点击翻牌 <span aria-hidden="true">↻</span></span>
              </span>
              <span class="hero-card-face hero-card-back" :aria-hidden="!flipped">
                <span class="card-corner red-suit">J<span>♥</span></span>
                <span class="back-symbol" aria-hidden="true">✳</span>
                <span class="back-greeting">很高兴，<br />在这里遇见你。</span>
                <span class="back-description">我是满觉陇，一名 Java 开发者。<br />这里装着我的知识、实践，<br />和一些不务正业的热爱。</span>
                <span class="back-signature">代码之外，生活之中。</span>
                <span class="card-corner corner-bottom red-suit">J<span>♥</span></span>
                <span class="card-flip-hint">再翻一次 <span aria-hidden="true">↻</span></span>
              </span>
            </button>
          </div>
          <div class="hero-fan" aria-label="选择知识专题">
            <button
              v-for="(topic, index) in topics" :key="topic.id"
              class="fan-card" :class="topic.color" :style="{ '--fan-index': index, '--fan-angle': `${(index - 1.5) * 11}deg` }"
              aria-haspopup="dialog" :aria-label="`翻开${topic.name}牌组`" @click="openTopic(topic)"
            >
              <span class="fan-rank">{{ topic.rank }}<span>{{ topic.suit }}</span></span>
              <span class="fan-suit" aria-hidden="true">{{ topic.suit }}</span>
              <span class="fan-name">{{ topic.name }}</span>
            </button>
          </div>
          <span class="stage-note">PICK A CARD. FOLLOW YOUR CURIOSITY.</span>
        </div>
        <a class="hero-scroll" href="#collections"><span aria-hidden="true">↓</span> 往下，还有好牌</a>
        <span class="hero-page-index" aria-hidden="true">01 — 03</span>
      </section>

      <section id="collections" class="card-collections" aria-labelledby="collections-title">
        <div class="section-heading" data-reveal>
          <div>
            <p class="card-eyebrow">01 / THE COLLECTION</p>
            <h2 id="collections-title">每一种好奇，<br />都有它的花色<span class="red-suit">。</span></h2>
          </div>
          <p class="section-caption">四张牌，四个探索方向。<br />翻开你感兴趣的那一张。</p>
        </div>
        <div class="collection-grid" data-reveal>
          <button
            v-for="(topic, index) in topics" :key="topic.id"
            class="collection-card" :class="topic.color"
            aria-haspopup="dialog" @click="openTopic(topic)"
          >
            <span class="collection-top">
              <span>{{ topic.rank }} <span>{{ topic.suit }}</span></span>
              <span class="collection-index">0{{ index + 1 }}</span>
            </span>
            <span class="collection-suit" aria-hidden="true">{{ topic.suit }}</span>
            <span class="collection-english">{{ topic.english }}</span>
            <span class="collection-name">{{ topic.name }}</span>
            <span class="collection-description">{{ topic.description }}</span>
            <span class="collection-bottom">
              <span>{{ countTopic(topic) }} 篇随记</span>
              <span class="collection-arrow" aria-hidden="true">↗</span>
            </span>
          </button>
        </div>
        <div class="collection-footer">
          <span>好的知识，值得反复翻阅。</span>
          <RouteLink to="/guide/">查看完整文档地图 <span aria-hidden="true">↗</span></RouteLink>
        </div>
      </section>

      <section id="journal" class="card-journal" aria-labelledby="journal-title">
        <div class="section-heading" data-reveal>
          <div>
            <p class="card-eyebrow">02 / THE FIELD NOTES</p>
            <h2 id="journal-title">最近，写下这些<span class="red-suit">。</span></h2>
          </div>
          <RouteLink class="journal-timeline" to="/timeline/">沿着时间，慢慢看 <span aria-hidden="true">↗</span></RouteLink>
        </div>
        <div class="journal-filters" aria-label="筛选文章栏目">
          <button
            v-for="filter in filters" :key="filter.category"
            :class="{ active: selectedCategory === filter.category }"
            :aria-pressed="selectedCategory === filter.category"
            @click="selectedCategory = filter.category"
          >
            <span aria-hidden="true">{{ filter.suit }}</span> {{ filter.name }}
            <span class="filter-count">{{ filterArticles(articles, filter.category).length }}</span>
          </button>
        </div>
        <p class="journal-count" role="status" aria-live="polite">{{ selectedCategory || '全部栏目' }} / {{ filtered.length }} 篇随记，已展示 {{ visible.length }} 篇</p>
        <div class="journal-list">
          <RouteLink v-for="(article, index) in visible" :key="article.path" :to="article.path" class="journal-entry">
            <span class="entry-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="entry-content">
              <span class="entry-category">
                <span aria-hidden="true">{{ articleSuit(article) }}</span> {{ article.categories[0] || '随记' }}
              </span>
              <h3>{{ article.title }}</h3>
              <span v-if="article.description" class="entry-description">{{ article.description }}</span>
            </div>
            <span class="entry-end">
              <time v-if="article.date" :datetime="article.date">{{ article.dateText }}</time>
              <span v-else>{{ article.dateText }}</span>
              <span class="entry-arrow" aria-hidden="true">↗</span>
            </span>
          </RouteLink>
          <p v-if="!filtered.length" class="journal-empty">这组牌还在整理中。先去其他栏目逛逛吧。</p>
        </div>
        <button v-if="visible.length < filtered.length" class="journal-more" @click="visibleCount += 6">再翻六篇 <span aria-hidden="true">↓</span></button>
        <RouteLink v-else class="journal-more" to="/guide/">去文档地图继续探索 <span aria-hidden="true">↗</span></RouteLink>
      </section>

      <section class="card-signoff" aria-labelledby="signoff-title" data-reveal>
        <p class="card-eyebrow">03 / ALWAYS A WORK IN PROGRESS</p>
        <h2 id="signoff-title">学一点，做一点。<br /><span>让好奇，继续发生。</span><span class="signoff-star" aria-hidden="true">✳</span></h2>
        <RouteLink to="/about/">代码背后，是个怎样的人？ <span aria-hidden="true">↗</span></RouteLink>
      </section>
    </main>

    <footer class="card-footer">
      <div>
        <span class="brand-mark">hhs<span>✳</span></span>
        <p>可爱团子随记 · 满觉陇<br />一点一滴，皆是成长。</p>
      </div>
      <nav aria-label="更多阅读入口">
        <RouteLink to="/category/">分类</RouteLink>
        <RouteLink to="/tag/">标签</RouteLink>
        <RouteLink to="/timeline/">时间线</RouteLink>
        <RouteLink to="/cookbook/">生活食谱</RouteLink>
        <a href="https://github.com/zdkcomeon/blog" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
      </nav>
      <a href="#main-content" class="back-to-top">回到开局 <span aria-hidden="true">↑</span></a>
    </footer>

    <dialog
      ref="topicDialog" class="topic-dialog"
      aria-labelledby="topic-dialog-title" aria-describedby="topic-dialog-description"
      @click="closeOnBackdrop" @close="restorePage"
    >
      <template v-if="activeTopic">
        <button class="dialog-close" aria-label="收起牌组，返回首页" autofocus @click="closeTopic">×</button>
        <div class="dialog-heading" :class="activeTopic.color">
          <span class="dialog-rank">{{ activeTopic.rank }}<span>{{ activeTopic.suit }}</span></span>
          <span class="dialog-suit" aria-hidden="true">{{ activeTopic.suit }}</span>
          <p class="card-eyebrow">{{ activeTopic.english }}</p>
          <h2 id="topic-dialog-title">{{ activeTopic.name }}</h2>
          <p id="topic-dialog-description">{{ activeTopic.description }}</p>
          <span class="dialog-keywords">{{ activeTopic.keywords }}</span>
        </div>
        <div class="dialog-reading">
          <p class="dialog-reading-label">从这里开始 <span>RECENT NOTES / {{ countTopic(activeTopic) }}</span></p>
          <RouteLink v-for="article in topicArticles" :key="article.path" :to="article.path" @click="closeTopic">
            <span>{{ article.title }}</span><span aria-hidden="true">↗</span>
          </RouteLink>
          <p v-if="!topicArticles.length">这个专题正在生长，先从专题目录开始。</p>
          <RouteLink :to="activeTopic.path" class="dialog-all" @click="closeTopic">进入专题目录 <span aria-hidden="true">↗</span></RouteLink>
        </div>
        <div class="dialog-switcher" aria-label="切换知识牌组">
          <button
            v-for="topic in topics" :key="topic.id"
            :class="[topic.color, { active: activeTopic.id === topic.id }]"
            :aria-label="`查看${topic.name}`" :aria-pressed="activeTopic.id === topic.id"
            @click="activeTopic = topic"
          >{{ topic.suit }}</button>
          <span>换一张，继续探索</span>
        </div>
      </template>
    </dialog>
  </div>
</template>
