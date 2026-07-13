# 深柴动力子站 — 3D 产品展示

React、Three.js 与 Vite 构建的滚动驱动 3D 产品展示站点。本目录是五个子站之一。

## 当前配置（2026-07-13）

- 默认语言：英文；顶栏可切换中文。
- 顶栏：透明背景、白色 Logo 与白色控件，菜单跳转到主站对应模块。
- “网上展厅”链接：`https://shenchai1-5-3.pages.dev/`。
- 产品切换：页面左上方悬浮按键，滚动后淡出；可在五个子站之间跳转。
- 3D 模型与图片位于 `public/`，构建结果位于 `dist/`。

## 产品切换地址

| 产品 | 地址 |
| --- | --- |
| 静音型发电机组 | `https://1-5-7.pages.dev/` |
| 开架型发电机组 | `https://shenchai1-5-6.pages.dev/` |
| 开架型发电机组（小）/ 网上展厅 | `https://shenchai1-5-3.pages.dev/` |
| 移动拖车式发电机组 | `https://1-5-8.pages.dev/` |
| 高压配电系统 | `https://1-5-9.pages.dev/` |

## 开发与部署

```bash
pnpm install
pnpm dev
pnpm build
```

Cloudflare Pages 构建命令为 `pnpm build`，输出目录为 `dist`。直接上传时只上传 `dist` 内的内容。
