module.exports = {
    base: '/blog/',
    title: "HHS",
    description: "资源、教程、软件、工具、配置",
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
    themeConfig: {
        // 博客配置
        blogConfig: {
            category: {
                location: 2,     // 在导航栏菜单中所占的位置，默认2
                text: 'Category' // 默认文案 “分类”
            },
            tag: {
                location: 3,     // 在导航栏菜单中所占的位置，默认3
                text: 'Tag'      // 默认文案 “标签”
            },
            socialLinks: [     // 信息栏展示社交信息
                { icon: 'reco-github', link: 'https://github.com/recoluan' },
                { icon: 'reco-npm', link: 'https://www.npmjs.com/~reco_luan' }
            ]
        }
    },
    host: 'localhost',
    port: '9090',
    markdown: {
        lineNumbers: true,
    },
    plugins: [
        [
            "@vuepress-reco/vuepress-plugin-kan-ban-niang",
            {
                theme: ["koharu"],
                clean: true,
                modelStyle: {
                    position: "fixed",
                    left: "0px",
                    bottom: "0px",
                    opacity: "0.9",
                    zIndex: 99999
                }
            }
        ]
    ],
    themeConfig: {
        // reco 博客模式
        type: 'blog',
        // author
        author: '谦毅',
        huawei: true,
        // blog 头像地址
        authorAvatar: '/logo.png',
        // 密钥
        keyPage: {
            keys: ['de24428d9d10ecc445fd07f4000e4eda'], // 1.3.0 版本后需要设置为密文
            color: '#42b983', // 登录页动画球的颜色
            lineColor: '#42b983' // 登录页动画线的颜色
        },
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
            {
                text: "总结与分享",
                items: [
                    { text: "技巧积攒", link: "/tips/技巧积攒" },
                    { text: "单元测试", link: "/tips/unitTest" }
                ]
            },
            { text: "孤独程序员食谱", link: "/cookbook/" },
            { text: "关于我", link: "https://blog.isww.cn/" }
        ]
    },
};