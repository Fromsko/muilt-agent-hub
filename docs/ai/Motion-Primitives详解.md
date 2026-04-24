# Motion-Primitives 详解

> 收录时间：2026-04  
> 官网：https://motion-primitives.com  
> Pro 版：https://pro.motion-primitives.com  
> GitHub：https://github.com/ibelick/motion-primitives  
> 作者：Julien Thibeaut (@Ibelick)  
> 关联项目：prompt-kit (AI Chat 组件，同一作者)

---

## 一、定位与理念

**"UI kit to make beautiful, animated interfaces, faster."**

Motion-Primitives 诞生于作者作为开发者在实际项目中**找不到高质量、实用的动画组件**的痛点。它不是大而全的 UI 框架，而是专注于**动画基元 (Motion Primitives)**——每个组件解决一个具体的动画/交互问题，可以直接 copy-paste 使用或轻松定制。

### 核心原则

- **Copy-Paste 哲学**：代码归你所有，无 npm 锁定（与 shadcn/ui 相同理念）
- **Motion 驱动**：全部基于 [Motion](https://motion.dev)（原 Framer Motion）构建
- **Tailwind CSS**：样式全用 Tailwind，无额外 CSS 依赖
- **组合式**：每个组件是独立基元，可自由组合成复杂效果
- **开源 + 社区驱动**：核心组件免费开源，欢迎贡献

### 技术栈

```
React + TypeScript + Next.js + Tailwind CSS + Motion (framer-motion)
```

### 为什么出色

1. **品味极好** — 动画效果精致克制，不花哨但让人印象深刻
2. **实用导向** — 每个组件都有真实场景（Landing Page、产品展示、数据看板）
3. **代码质量** — TypeScript 严格类型、API 设计简洁、Variants 可定制
4. **文档优秀** — 每个组件都有交互式 Demo + 多种变体示例
5. **生态闭环** — 免费基元 + Pro 页面级 Section + 完整模板，从组件到落地全覆盖

---

## 二、免费组件完整目录 (Open Source)

### 文字动画 (Text)

| 组件 | 描述 | 关键 Props |
|------|------|-----------|
| **TextEffect** | 文字出现/消失动画，支持逐字/逐词/逐行 | `per: 'char' \| 'word' \| 'line'`，`speedReveal`，`speedSegment`，自定义 `variants` |
| **TextMorph** | 文字变形——相同字母保持位置，不同字母流畅过渡 | 适合按钮文字切换、状态文字变化 |
| **TextScramble** | 加密解码效果——随机字符循环后稳定为最终文字 | 自定义触发、字符集、持续时间。科技感极强 |
| **SpinningText** | 文字沿圆形路径旋转 | 自定义半径、速度、方向 |
| **SlidingNumber** | 数字滑动切换（计数器/价格/统计） | 数字变化时上下滑动过渡 |

### 视觉效果 (Visual Effects)

| 组件 | 描述 |
|------|------|
| **BorderTrail** | ⭐ **边框扫光**——光点沿容器边缘移动，科技感拉满 |
| **Spotlight** | 鼠标跟随的聚光灯效果，支持自定义颜色（Tailwind gradient stops）和边框模式 |
| **Cursor** | 自定义光标组件，支持 spring 弹簧动画，可全局或限定父元素 |
| **ImageComparison** | 可拖拽滑块对比两张图片 |

### 布局动画 (Layout Animations)

| 组件 | 描述 |
|------|------|
| **MorphingDialog** | ⭐ 形变对话框——从触发元素平滑变形展开为 Dialog，支持 click-outside / ESC 关闭 |
| **MorphingPopover** | 形变弹出框——触发按钮平滑变形为弹出内容，而非凭空出现 |
| **TransitionPanel** | 内容切换面板——不同内容间带入场/退场动画，适合 Onboarding / Settings |
| **Dialog** | 动画对话框——自定义 variants / transition / 退场动画 / 自定义 backdrop |
| **Accordion** | 动画手风琴——可折叠容器，支持图标 + 自定义动画 |
| **Disclosure** | 展开/折叠——更轻量的内容显隐切换 |
| **Carousel** | 轮播——自定义尺寸/间距/指示器/导航，灵活的 Hook API (`useCarousel`) |

### 滚动 & 视口 (Scroll & Viewport)

| 组件 | 描述 |
|------|------|
| **InView** | 元素进入视口时触发动画，支持 margin 偏移、图片懒加载触发 |
| **ScrollProgress** | 滚动进度条——基础 / 导航吸顶 / 渐变色三种预设 |
| **AnimatedGroup** | ⭐ 批量子元素交错动画——适合列表/网格/卡片组的 stagger 入场 |

---

## 三、Pro 版组件目录 (付费 $149 终身)

> 面向 Landing Page / 营销网站的页面级 Section，共 80+ 组件

| 分类 | 数量 | 内容 |
|------|------|------|
| **Hero Sections** | 4 | 首屏大图/视频/渐变动效 |
| **Feature Sections** | 13 | 产品功能展示：网格/Bento/交互式 |
| **Text Sections** | 15 | 文字排版/动画文字区块 |
| **Navigation Sections** | 9 | 导航栏/菜单/移动端导航 |
| **Logo Cloud Sections** | 10 | 品牌 Logo 展示/无限滚动 |
| **CTA Sections** | 3 | 行动号召区块 |
| **FAQ Sections** | 4 | 常见问题手风琴 |
| **Footer Sections** | 5 | 页脚布局 |
| **Team Sections** | 5 | 团队成员展示 |
| **Heading Sections** | 5 | 标题装饰区块 |
| **Stats Sections** | 2 | 数据统计展示 |
| **Testimonials** | 2 | 用户评价/推荐语 |
| **Special Components** | 3 | 特殊交互组件 |

### Pro 模板

| 模板 | 描述 |
|------|------|
| **Nim** | 现代 Landing Page 模板 |
| **Noir** | 暗色主题 Landing Page 模板 |

### Pro 定价

- **个人许可**：$149（一次性，原价 $299）
- **终身访问 + 终身更新**
- **商业使用许可**
- 优惠码 `MP10` 可享 10% 折扣

---

## 四、本项目可直接使用的组件

> 基于 CGRA EDA 的需求场景，以下组件可立即采用

### 高优先级

| 组件 | 场景 | 原因 |
|------|------|------|
| **BorderTrail** | 选中的芯片模块、激活的面板边框 | 科技感强，契合 EDA 工具视觉 |
| **TextEffect** | 首页标语、AI 响应文字入场 | 逐字/逐词出现，提升质感 |
| **TextScramble** | 加载状态文字、数据处理进度 | "Generating code..." 加密解码效果 |
| **AnimatedGroup** | 列表/卡片组入场 | stagger 交错动画，避免一次性闪出 |
| **InView** | 滚动页面的内容区块 | 进入视口才触发动画，性能友好 |
| **Spotlight** | 卡片 hover 高光、面板焦点 | 鼠标跟随光效，暗色主题加分 |

### 中优先级

| 组件 | 场景 |
|------|------|
| **TransitionPanel** | 设置面板、步骤向导 |
| **MorphingDialog** | 从缩略图展开到详情视图 |
| **Accordion** | 配置面板的折叠区块 |
| **SlidingNumber** | 统计数字、性能指标 |
| **ScrollProgress** | 长文档页面的阅读进度 |
| **Carousel** | 项目/模板选择器 |

---

## 五、集成指南

### 安装

Motion-Primitives 采用 copy-paste 方式，不是 npm 包。通过 CLI 或手动复制：

```bash
# 1. 确保项目已有 Motion + Tailwind
bun add motion

# 2. 从文档页复制组件代码到项目中
# 建议放置路径：src/components/motion/
```

### 推荐目录结构

```
src/components/
├── ui/                    # shadcn/ui 基础组件
│   ├── Button/
│   ├── Input/
│   └── ...
└── motion/                # Motion-Primitives 动画组件
    ├── TextEffect.tsx
    ├── TextScramble.tsx
    ├── BorderTrail.tsx
    ├── Spotlight.tsx
    ├── AnimatedGroup.tsx
    ├── InView.tsx
    └── ...
```

### 使用示例

```tsx
// TextEffect — 文字逐词入场
import { TextEffect } from "@/components/motion/TextEffect";

<TextEffect per="word" as="h1" className="text-3xl font-bold">
  Animate your ideas with motion-primitives.
</TextEffect>

// TextScramble — 加密解码效果
import { TextScramble } from "@/components/motion/TextScramble";

<TextScramble>Generating the interface...</TextScramble>

// BorderTrail — 边框扫光
import { BorderTrail } from "@/components/motion/BorderTrail";

<div className="relative rounded-xl border border-white/10 p-6">
  <BorderTrail />
  <p>带扫光边框的面板</p>
</div>

// AnimatedGroup — 列表交错入场
import { AnimatedGroup } from "@/components/motion/AnimatedGroup";

<AnimatedGroup preset="fade">
  {items.map((item) => (
    <Card key={item.id}>{item.title}</Card>
  ))}
</AnimatedGroup>

// Spotlight — 鼠标跟随聚光灯
import { Spotlight } from "@/components/motion/Spotlight";

<div className="relative overflow-hidden rounded-xl bg-gray-900 p-8">
  <Spotlight className="from-blue-600 via-blue-400 to-blue-200" />
  <h2>鼠标移上来试试</h2>
</div>
```

### 自定义 Variants

所有组件都接受自定义 `variants`，格式与 Motion 的 `Variants` 类型一致：

```tsx
const customVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  },
  item: {
    hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
  },
};

<TextEffect variants={customVariants}>
  自定义动画效果
</TextEffect>
```

---

## 六、与同类库对比

| 维度 | Motion-Primitives | Aceternity UI | Magic UI |
|------|-------------------|---------------|----------|
| **定位** | 动画基元 (Primitives) | 动画组件包 (Kit) | Landing Page 动画 |
| **组件粒度** | 细粒度，单一职责 | 中粒度，场景化 | 中粒度，SaaS 导向 |
| **代码风格** | 极简、TypeScript 严格 | 较为复杂 | 中等 |
| **品味/审美** | ⭐⭐⭐⭐⭐ 克制精致 | ⭐⭐⭐⭐ 炫酷华丽 | ⭐⭐⭐⭐ 商务现代 |
| **文字动画** | 最强（5 种文字组件） | 一般 | 有 |
| **边框/光效** | BorderTrail + Spotlight | Spotlight + Beams | 有限 |
| **布局动画** | MorphingDialog/Popover（独有） | 无 | 无 |
| **Pro 版** | $149 终身，80+ Section | $99-299 | $197 |
| **作者** | @Ibelick (prompt-kit 同作者) | Aceternity 团队 | Magic UI 团队 |
| **适合** | 追求品质 + 定制化 | 快速获得炫酷效果 | SaaS Landing Page |

### 结论

- **追求极致动画品味** → Motion-Primitives
- **需要大量开箱即用效果** → Aceternity UI
- **SaaS 营销页面** → Magic UI
- **最佳实践**：Motion-Primitives（基元） + Aceternity UI（场景化效果）互补使用

---

## 七、参考链接

- **官网文档**：https://motion-primitives.com/docs
- **Pro 版**：https://pro.motion-primitives.com
- **GitHub**：https://github.com/ibelick/motion-primitives
- **Showcase**：https://motion-primitives.com/showcase
- **作者 Twitter**：https://twitter.com/Ibelick
- **关联 AI 组件**：https://www.prompt-kit.com (prompt-kit，同一作者)
- **Motion (底层库)**：https://motion.dev
