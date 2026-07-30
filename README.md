# Personal Desk / 个人工作台

Personal Desk 是一个无需登录、无需后端的个人任务与工作流管理网站。它将工作项目、自媒体日常、广告项目和个人生活放进同一个每日 Dashboard，并针对四类事项提供不同的输入和推进方式。

所有业务数据都保存在当前浏览器。项目不会把任务上传到云端，也不依赖数据库或付费服务。

## 功能

- 四模块今日 Dashboard，支持桌面四列、平板两列、手机单列。
- ChatGPT 风格底部输入区，切换模块时保留各模块草稿。
- 工作项目与个人生活的紧急程度、截止日期和超时排序。
- 自媒体四阶段、广告五阶段工作流；日期自动推算且可手动调整。
- 阶段只在用户点击后推进，超时不会自动完成或跳转。
- 右侧任务详情面板，支持编辑、完成当前阶段和删除。
- 已完成任务筛选、分组和阶段历史查看。
- 完成、推进、删除后的独立 15 秒撤销；刷新后继续倒计时。
- 浏览器内提醒、系统通知权限管理。
- Zod 验证的 JSON 全量导入、导出、替换和合并。
- 损坏数据隔离、问题数据导出和存储空间错误提示。

## 环境

- Node.js 22.13 或更高版本
- pnpm 11 或更高版本

## 安装与启动

```bash
pnpm install
pnpm dev
```

默认开发地址为 `http://localhost:3000`。

## 质量检查与构建

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

测试覆盖日期推算、阶段推进、排序、紧急程度、撤销、JSON 校验、迁移和合并。

## 数据保存位置

浏览器使用以下 `localStorage` 键：

- `personal-desk:data`：数据版本和全部事项。
- `personal-desk:settings`：导航与提醒设置。
- `personal-desk:pending-actions`：仍在 15 秒撤销期内的完整快照。
- `personal-desk:notification-history`：当日已发送通知的轻量记录。

清除浏览器站点数据会删除本机任务。建议定期在“数据备份”页面导出 JSON。

## JSON 导入与导出

导出文件名为 `personal-desk-backup-YYYY-MM-DD.json`，包含任务、阶段、完成时间、设置和待撤销操作。

导入时会检查版本、模块、日期、阶段数量、当前阶段引用、重复 ID 和必填字段。验证通过后可选择：

- 替换当前数据：确认后整体覆盖。
- 与当前数据合并：ID 重复时保留 `updatedAt` 更新的版本。

导入失败不会修改当前数据。

## 浏览器兼容

推荐当前版本的 Chrome、Edge、Safari 或 Firefox。浏览器通知依赖各浏览器和操作系统权限；不支持通知时，应用内提醒仍可使用。界面支持键盘操作、移动端安全区域和 `prefers-reduced-motion`。

## 维护文档

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATA_SCHEMA.md](./DATA_SCHEMA.md)
- [CHANGELOG.md](./CHANGELOG.md)
