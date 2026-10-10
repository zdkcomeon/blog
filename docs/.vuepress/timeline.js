export const timelinePath = "/timeline/";

const timeZone = "Asia/Shanghai";

const getArticleDate = (value) => {
  if (!(value instanceof Date) && typeof value !== "number" && typeof value !== "string") {
    return null;
  }
  if (typeof value === "string" && !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const buildTimeline = (articles, locale = "zh-CN") => {
  const yearFormatter = new Intl.DateTimeFormat("en", { year: "numeric", timeZone });
  const dateFormatter = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", timeZone });
  const entries = articles
    .filter(({ info }) => info.timeline !== false)
    .map((article) => ({ ...article, date: getArticleDate(article.info.date) }))
    .sort((left, right) => {
      if (!left.date) return right.date ? 1 : 0;
      if (!right.date) return -1;
      return right.date.getTime() - left.date.getTime();
    });
  const years = new Map();
  const undated = [];

  for (const { date, info, path } of entries) {
    const item = { date: date ? dateFormatter.format(date) : "", info, path };
    if (!date) {
      undated.push(item);
      continue;
    }

    const year = yearFormatter.format(date);
    if (!years.has(year)) years.set(year, { year, items: [] });
    years.get(year).items.push(item);
  }

  const config = [...years.values()];
  if (undated.length) config.push({ year: "未注明日期", items: undated });

  return {
    path: timelinePath,
    items: entries.map(({ info, path }) => ({ info, path })),
    config,
  };
};
