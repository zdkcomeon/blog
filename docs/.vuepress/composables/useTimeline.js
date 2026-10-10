import { useBlogType } from "@vuepress/plugin-blog/client";
import { computed, inject, provide } from "vue";
import { useLang } from "vuepress/client";
import { buildTimeline } from "../timeline.js";

const timelineSymbol = Symbol("blog-timeline");

export const useTimeline = () => {
  const timeline = inject(timelineSymbol);
  if (!timeline) throw new Error("useTimeline() is called without provider.");
  return timeline;
};

export const setupTimeline = () => {
  const articles = useBlogType("article");
  const locale = useLang();
  provide(timelineSymbol, computed(() => buildTimeline(articles.value.items, locale.value)));
};
