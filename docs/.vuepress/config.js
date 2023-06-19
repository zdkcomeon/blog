module.exports = {
    base: '/blog/',
    title: "HHS",
    description: "分享资源、教程、软件、工具、开发配置",
    head: [
        ['link', { rel: 'icon', href: '/logo.png' }]
    ],
    locales: {
        // 作为特例，默认语言可以使用 '/' 作为其路径。
        '/': {
            lang: 'zh-CN', // 将会被设置为 <html> 的 lang 属性
        },
    },
    theme: 'reco',
    host: 'localhost',
    port: '9090',
    markdown: {
        lineNumbers: true,
    },
    themeConfig: {
        // 设置自动生成侧边栏
        sidebar: 'auto',
        subSidebar: 'auto',
        // 设置导航栏
        nav: [
            { text: "首页", link: "/" },
            {
                text: "学习资源",
                link: "/learningResource/",
                items: [
                    {
                        text: 'Java', items: [
                            { text: "八股文", link: "/learningResource/Java/八股文" },
                            { text: "面试题", link: "/learningResource/Java/面试题" }
                        ]
                    },
                    {
                        text: 'Mysql', items: [
                            { text: "八股文", link: "/learningResource/mysql/八股文" },
                            { text: "面试题", link: "/learningResource/mysql/面试题" }
                        ]
                    },
                    {
                        text: '计算机网络', items: [
                            { text: "八股文", link: "/learningResource/computer-networks/八股文" },
                            { text: "面试题", link: "/learningResource/computer-networks/面试题" }
                        ]
                    },
                    {
                        text: '操作系统', items: [
                            { text: "八股文", link: "/learningResource/os/八股文" },
                            { text: "面试题", link: "/learningResource/os/面试题" }
                        ]
                    },
                    {
                        text: '框架',
                        link: "/learningResource/frameword",
                        items: [
                            { text: "Spring", link: "/learningResource/frameword/Spring/" },
                            { text: "SpringBoot", link: "/learningResource/frameword/SpringBoot/" },
                            { text: "SpringCloud", link: "/learningResource/frameword/SpringCloud/" },
                        ]
                    }
                ]
            },
            {
                text: "软件配置",
                link: "/softwareConfiguration/",
                items: [
                    { text: "IDEA配置", link: "/softwareConfiguration/idea" },
                    { text: "GIt配置", link: "/softwareConfiguration/git" },
                    { text: "JetBrains免费方案", link: "/softwareConfiguration/JetBrains全家桶免费" }
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
                            { text: "GIt", link: "/softwareInstallation/git" },
                            { text: "TortoiseGit小乌龟", link: "/softwareInstallation/TortoiseGit" },
                            { text: "JVMS jdk管理", link: "/softwareInstallation/jvms" },
                            { text: "NVM node管理", link: "/softwareInstallation/nvm" },
                            { text: "JetBrains Toolbox", link: "/softwareInstallation/JetBrains-Toolbox" }
                        ]
                    },
                    {
                        text: "效率软件",
                        items: [
                            { text: "snipaste", link: "/softwareInstallation/snipaste" },
                            { text: "uTools", link: "/softwareInstallation/uTools" },
                            { text: "draw.io", link: "/softwareInstallation/draw-io" },
                            { text: "trello", link: "/softwareInstallation/trello" }
                        ]
                    }
                ]
            },
            { text: "技巧积攒", link: "/tips/" },
            { text: "孤独程序员食谱", link: "/cookbook/" },
            { text: "关于我", link: "https://blog.isww.cn/" }
        ]
    },
};