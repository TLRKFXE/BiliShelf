# BiliShelf Helper（中文上架文案模板）

## 一句话简介（Short Description）
在 B 站视频页快速采集并保存到本地管理系统，支持多收藏夹与标签管理。

## 详细介绍（Detailed Description）
BiliShelf Helper 是一个面向 Bilibili 视频收藏管理的效率插件，适合希望构建“可检索、可分类、可批量处理”个人视频库的用户。

核心能力：
- 在 `bilibili.com/video/*` 页面一键打开悬浮采集面板
- 自动读取视频基础信息（BV、标题、UP 主、封面、简介、系统标签）
- 支持选择多个收藏夹并添加自定义标签
- 与本地管理端联动（本地后端 API），形成完整收藏管理闭环
- 支持浅色/深色/自动主题

适用人群：
- 需要高效整理视频资料的学习者/创作者
- 需要长期积累和检索视频素材的用户

## 权限说明（Permissions）
- `storage`：保存插件主题偏好
- `activeTab`：向当前活动标签页同步主题设置
- `https://www.bilibili.com/*`：在视频页面注入采集面板
- `https://api.bilibili.com/*`：读取视频详情与标签信息
- `http://127.0.0.1:4321/*` / `http://localhost:4321/*`：访问本地管理后端 API

## 版本更新说明（What's New）
- 迁移为 WXT 工程结构，支持多浏览器构建与打包
- 优化构建与上架流程，提供一键多浏览器产物
