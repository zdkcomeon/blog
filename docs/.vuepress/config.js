module.exports = {
    title: "科技趣玩",
    description: "分享各类资源、教程、黑科技软件、工具等等",
    markdown: {
        lineNumbers: true,
    },
    themeConfig: {
        sidebar: [
            {
                title: '软件资源',
                children: ['/软件资源/软件资源'],
                initialOpenGroupIndex: 1 // 可选的, 默认值是 0
            }
        ],
        nav: [
            { text: "首页", link: "/" },
            { text: "基础教程", link: "/basics/" },
            { text: "项目实战", link: "/project/" },
            { text: "零散文章", link: "/article/" },
            { text: "一起学习", link: "/association/" },
            { text: "前端架构师", link: "/architect/" },
            { text: "小维博客", link: "https://blog.isww.cn/" }
        ]
    },
};