# 拍摄参谋 - 功能规划

> 最后更新：2026-04-18

## 一、当前能力

- 多模式相机（photo / scan / video / portrait）
- AI 实时构图建议（BubbleOverlay）
- 三分法关键点标记（KeypointOverlay）
- 流式文字显示
- 图像压缩与 base64 上传
- Minimax API 集成

---

## 二、功能规划（待实现）

### 构图增强
- [x] **多种网格叠加** — GridOverlay + GridSelectorModal（thirds/golden/diagonal/spiral）
- [x] **水平仪指示器** — LevelIndicator + useDeviceOrientation + 陀螺仪气泡提示
- [x] **太阳位置估算** — SunPositionOverlay + useSunPosition（黄金时刻/仰角/方位角）

### 拍摄辅助
- [x] **直方图显示** — HistogramOverlay + useHistogram（实时曝光分析）
- [x] **对焦峰值（Focus Peaking）** — 手动对焦时高亮显示合焦边缘（已集成到CameraScreen，500ms周期性边缘采样）
- [x] **对焦辅助（FocusGuideOverlay）** — FocusGuideOverlay（变焦指示器/DOF警告/景深按钮/点击对焦环动画），已集成到CameraOverlays
- [x] **RAW 格式支持** — 更高质量的图像捕获（需要 Camera2 API）
- [x] **快门延迟/倒计时** — TimerSelectorModal + useCountdown（3s/5s/10s）

### AI 增强
- [x] **拍摄前后对比** — ComparisonOverlay（原始图 vs AI 建议图滑动对比）
- [x] **语音反馈** — useVoiceFeedback + expo-speech（构图达标语音提示）
- [x] **智能连拍建议** — BurstSuggestionOverlay
- [x] **场景识别标签** — SceneTagOverlay + useSceneRecognition

### 照片管理
- [x] **优秀照片收藏夹** — FavoritesScreen + useFavorites
- [x] **照片日志** — ShootLogScreen + useShootLog（时间/地点/AI建议）
- [x] **历史分析** — StatsScreen + stats.ts（拍摄习惯统计）

### 社交/分享
- [x] **一键分享** — ShareButton + share.ts
- [x] **构图评分挑战** — CompositionScoreOverlay（S/A/B/C/D 评分 + 闪光特效）

---

## 三、优化方向（持续改进）

### UI 优化
- [x] 统一颜色系统 — ThemeContext + colors.ts（消除硬编码色值）
- [x] 动画流畅度优化（60fps） — 所有动画组件迁移至 react-native-reanimated + useFrameCallback，React.memo 防止不必要重渲染
- [x] 深色/浅色主题适配 — ThemeContext 全局支持 + App.tsx 集成
- [x] 无障碍支持（VoiceOver/TalkBack）

### 代码结构
- [x] 将 CameraScreen 拆分为多个 sub-components（控制在 400 行以内）
- [x] 提取通用 hooks（useCamera, useKeypoints, useBubbleChat）
- [x] 建立统一的错误处理层 — errors.ts + useErrorHandler
- [x] 补充 TypeScript 类型定义 — types/index.ts

---

## 四、优先级建议

| 优先级 | 功能 | 理由 |
|--------|------|------|
| P0 | 水平仪 + 网格选择器 | 用户感知强，实现难度低 |
| P1 | RAW 格式 + 直方图 | 摄影进阶用户刚需 |
| P2 | 优秀照片收藏夹 | 提高用户留存 |
| P3 | 黄金时刻估算 | 差异化竞争点 |
