import assert from "node:assert/strict";
import test from "node:test";
import { filterArticles, prepareArticles, topics } from "../docs/.vuepress/home.js";

test("首页按日期倒序排列，并保留未注明日期和不收录在时间线的文章", () => {
  const items = [
    { path: "/undated.html", info: { title: "无日期", date: null } },
    { path: "/older.html", info: { title: "旧文章", date: "2023-06-24", category: ["开发工具"] } },
    { path: "/invalid.html", info: { title: "无效日期", date: "invalid" } },
    { path: "/newer.html", info: { title: "新文章", date: "2026-10-22", timeline: false, category: ["AI 实践", "规则文件"], excerpt: "<p>第一行</p>\n第二行" } },
    { path: "/empty-date.html", info: { title: "空日期", date: " " } },
  ];
  const result = prepareArticles(items);
  assert.deepEqual(result.map(({ path }) => path), ["/newer.html", "/older.html", "/undated.html", "/invalid.html", "/empty-date.html"]);
  assert.equal(result[0].dateText, "2026.10.22");
  assert.equal(result[0].description, "第一行 第二行");
  assert.equal(result[2].date, "");
  assert.equal(result[2].dateText, "未注明日期");
  assert.equal(items[0].path, "/undated.html", "不改变博客插件提供的顺序");
});

test("按完整栏目筛选，多分类文章只计入一次，生活记录可以独立阅读", () => {
  const result = prepareArticles([
    { path: "/ai.html", info: { title: "规则", category: ["AI 实践", "规则文件"] } },
    { path: "/java.html", info: { title: "Java", category: ["学习资源", "Java"] } },
    { path: "/life.html", info: { title: "食谱", category: "生活记录" } },
    { path: "/notes.html", info: { title: "随记" } },
  ]);
  assert.equal(filterArticles(result).length, 4);
  assert.deepEqual(filterArticles(result, "AI 实践").map(({ path }) => path), ["/ai.html"]);
  assert.equal(filterArticles(result, "学习").length, 0);
  assert.equal(filterArticles(result, "生活记录")[0].path, "/life.html");
  assert.equal(filterArticles([], "学习资源").length, 0);
  assert.equal(new Set(topics.map(({ suit }) => suit)).size, 4);
});

test("日期遵循上海时区，空列表和数值日期可以正常展示", () => {
  assert.deepEqual(prepareArticles([]), []);
  const result = prepareArticles([{ path: "/note.html", info: { title: "随记", date: Date.UTC(2026, 9, 21, 18) } }]);
  assert.equal(result[0].dateText, "2026.10.22");
  assert.equal(result[0].date, "2026-10-21T18:00:00.000Z");
});
