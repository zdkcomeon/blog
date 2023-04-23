module.exports = {
    title: "HHS",
    description: "分享资源、教程、软件、工具、开发配置",
    head: [
        ['link', { rel: 'icon', href: '/logo.png' }]
    ],
    host: 'localhost',
    port: '9090',
    markdown: {
        lineNumbers: true,
    },
    themeConfig: {
        // 设置自动生成侧边栏
        sidebar: 'auto',
        // 设置导航栏
        nav: [
            { text: "首页", link: "/" },
            {
                text: "学习资源",
                items: [
                    { text: 'Java', items: [{ text: "资源网站", link: "/learningResource/Java" }] },
                    { text: 'Mysql', items: [{ text: "资源网站", link: "/learningResource/Mysql" }] }
                ]
            },
            {
                text: "软件配置",
                link: "/softwareConfiguration/",
                items: [
                    { text: "IDEA配置", link: "/softwareConfiguration/idea" },
                    { text: "GIt配置", link: "/softwareConfiguration/git" }
                ]
            },
            {
                text: "推荐与安装",
                link: "/softwareInstallation/",
                items: [
                    {
                        text: "开发软件",
                        items: [
                            { text: "IDEA", link: "/softwareInstallation/idea" },
                            { text: "GIt配置", link: "/softwareInstallation/git" }
                        ]
                    },
                    {
                        text: "效率软件",
                        items: [{ text: "截屏软件", link: "/softwareInstallation/snipaste" }]
                    }
                ]
            },
            { text: "关于我", link: "https://blog.isww.cn/" }
        ]
    },
};