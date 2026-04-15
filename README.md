# 拍摄参谋 (Photo Advisor)

> AI 智能摄影辅助 App，实时构图建议 + 多模式相机

---

## 一句话介绍

拍摄参谋是一款 AI 驱动的智能摄影辅助应用，通过实时构图分析、多模式相机和专业级的拍摄辅助工具，帮助用户拍出更具艺术感的照片。

---

## 功能特性

- 📷 **多模式相机拍摄** — 普通 / 扫描 / 视频 / 人像多种模式一键切换
- 🤖 **AI 实时构图建议** — BubbleOverlay 流式文字实时反馈构图优化方案
- 🔲 **多种网格叠加** — 三分法（Rule of Thirds）、黄金分割（Golden Ratio）、对角线（Diagonal）、螺旋（Fibonacci Spiral）
- 🎯 **关键点标记** — 自动标出三分法交叉点，辅助构图定位
- 📐 **水平仪 + 陀螺仪气泡提示** — 实时检测手机倾斜角度，避免画面倾斜
- 🌅 **太阳位置估算** — 智能估算黄金时刻（Golden Hour）与蓝调时刻（Blue Hour）时间窗口
- 📊 **实时直方图** — 曝光分析直方图，精准把控画面曝光
- 🔍 **对焦峰值（Focus Peaking）** — 边缘高亮显示对焦平面，辅助手动对焦
- 🖼️ **RAW 格式支持** — 保存 RAW 文件，保留更多后期空间
- ⏱️ **倒计时拍摄** — 支持 3s / 5s / 10s 倒计时，自拍无忧
- ↔️ **拍摄前后对比滑块** — 滑动对比原图与 AI 优化效果
- 🔊 **AI 语音反馈** — 实时语音播报构图建议，拍摄时无需低头看屏幕
- 🚀 **智能连拍建议** — AI 分析场景，给出连拍时机与数量建议
- 🏷️ **场景识别标签** — 自动识别风景、人像、建筑等场景，智能标签管理
- ❤️ **优秀照片收藏夹** — 精选照片单独收藏，随时回顾
- 📋 **照片日志** — 自动记录拍摄时间、地点与 AI 构图建议
- 📈 **历史拍摄统计** — 统计拍摄数量、场景分布，量化拍摄习惯
- 📤 **一键分享 + 构图评分挑战** — 分享照片至社交平台，参与构图评分挑战
- 🌓 **深色 / 浅色主题** — 支持 Dark / Light 主题自由切换
- ♿ **无障碍支持** — 全面适配 VoiceOver（iOS）与 TalkBack（Android）

---

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| Framework | Expo SDK 54 |
| Runtime | React Native 0.81.5 |
| Language | TypeScript |
| Navigation | React Navigation v7 |
| Animation | Reanimated v4 |
| Camera | expo-camera |
| Sensors | expo-sensors（陀螺仪 / 加速度计） |
| Location | expo-location |
| Storage | expo-media-library / AsyncStorage |
| AI Services | 东方财富 AI 接口（妙想系列 Skills） |

---

## 快速开始

```bash
# 克隆项目
git clone <repo-url>
cd photo-advisor

# 安装依赖
npm install

# 启动开发服务器
npx expo start

# 运行 Android
npx expo run:android

# 运行 iOS
npx expo run:ios
```

> **要求**：Node.js ≥ 18，Expo SDK 54，Android API ≥ 24 或 iOS ≥ 15

---

## 版本历史

| 版本 | 日期 | 更新说明 |
|------|------|----------|
| v1.0.0 | 2026-01 | 初始版本，多模式相机 + 基础构图辅助 |
| v1.0.1 | 2026-02 | 修复陀螺仪权限问题，优化水平仪精度 |
| v1.0.2 | 2026-03 | 新增 AI 语音反馈、连拍建议、直方图 |
| v1.1.0 | 2026-04 | 性能优化：全面重构组件样式，抽取 inline styles 为 StyleSheet.create()，提升 60fps 渲染性能；新增对焦峰值、RAW 格式支持、对比滑块 |

---

## License

MIT © 2026
