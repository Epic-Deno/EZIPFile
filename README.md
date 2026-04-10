# EZIPFile

一个可在 **macOS / Windows** 打包安装的本地图片与视频压缩工具（Electron）。

## 功能

- 选择图片（jpg/png/webp）或视频（mp4/mov/mkv/avi）
- 输入目标体积（MB），例如 `20` 表示目标约 `20MB`
- 全程本地处理，不上传网络
- 以清晰度优先策略压缩：
  - 图片先降质量，再必要时轻度降分辨率
  - 视频按时长估算码率并使用 H.264 + AAC 压缩

## 开发运行

```bash
npm install
npm start
```

## 打包安装包

```bash
npm run dist
```

生成结果：

- macOS: `dist/*.dmg`
- Windows: `dist/*.exe` (NSIS)

## 注意

- 视频“精确到刚好 20MB”受编码器与素材复杂度影响，会有小幅偏差。
- 若源文件已经很小或质量很高，继续压缩会出现可见损失，这是编码本身限制。

## GitHub Actions 自动打包

仓库已提供 workflow：`.github/workflows/build-desktop.yml`

触发方式：

- push 到 `main/master`
- Pull Request
- 手动触发（workflow_dispatch）
- 发布 Release（会自动上传安装包到 Release Assets）

产物：

- macOS: `dist/*.dmg`
- Windows: `dist/*.exe`
