# Motion 动画组件设计

> 收录时间：2026-04  
> 覆盖：Motion (Framer Motion) v12 + React 组件集成模式、Variants 管理、AnimatePresence、布局动画、性能规范  
> 注：Framer Motion 已更名为 Motion（`motion` 包），API 兼容

---

## 一、核心 API 速查

| API | 用途 | 示例 |
|-----|------|------|
| `motion.div` | 动画元素 | `<motion.div animate={{ opacity: 1 }} />` |
| `animate` | 目标状态 | `animate={{ x: 0, opacity: 1 }}` |
| `initial` | 初始状态 | `initial={{ x: -20, opacity: 0 }}` |
| `exit` | 退出状态 | `exit={{ opacity: 0, scale: 0.95 }}` |
| `transition` | 过渡配置 | `transition={{ duration: 0.2, ease: "easeOut" }}` |
| `variants` | 命名动画状态集 | `variants={{ hidden: {...}, visible: {...} }}` |
| `whileHover` | 悬停状态 | `whileHover={{ scale: 1.02 }}` |
| `whileTap` | 按下状态 | `whileTap={{ scale: 0.98 }}` |
| `layout` | 布局动画 | `<motion.div layout />` 自动检测位置/尺寸变化 |
| `layoutId` | 跨组件布局动画 | 共享 layoutId 的元素自动过渡 |
| `AnimatePresence` | 管理退出动画 | 包裹条件渲染的元素 |
| `useAnimate` | 命令式动画控制 | `const [scope, animate] = useAnimate()` |
| `useInView` | 进入视口检测 | `const isInView = useInView(ref)` |
| `useScroll` | 滚动进度 | `const { scrollYProgress } = useScroll()` |

---

## 二、Variants 管理模式

### 原则：Variants 定义在组件外部常量中

```tsx
// ❌ 不要在 JSX 内联定义
<motion.div animate={{ opacity: 1, y: 0 }} />

// ✅ 提取为 Variants 常量
import { type Variants } from "motion/react";

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
} satisfies Variants;

<motion.div variants={fadeInUp} initial="hidden" animate="visible" />
```

### Variants 库：统一管理项目动画

```tsx
// utils/motionVariants.ts
import { type Variants } from "motion/react";

// ——— 进入动画 ———
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
} satisfies Variants;

export const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
} satisfies Variants;

export const fadeInDown = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
} satisfies Variants;

export const fadeInScale = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
} satisfies Variants;

export const slideInRight = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
} satisfies Variants;

// ——— 列表子项（stagger 用）———
export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
} satisfies Variants;

// ——— 容器（stagger 编排）———
export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
} satisfies Variants;

// ——— 退出 ———
export const exitFade = {
  exit: { opacity: 0, transition: { duration: 0.15 } },
} satisfies Variants;

export const exitScale = {
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
} satisfies Variants;
```

---

## 三、动画组件封装模式

### 模式 1：基础动画组件包装

```tsx
// components/ui/AnimatedBox/AnimatedBox.tsx
import { motion, type Variants, type HTMLMotionProps } from "motion/react";
import { cn } from "@/utils/cn";

interface AnimatedBoxProps extends HTMLMotionProps<"div"> {
  variants?: Variants;
  delay?: number;
}

export function AnimatedBox({
  variants = fadeInUp,
  delay = 0,
  className,
  children,
  ...rest
}: AnimatedBoxProps) {
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
```

### 模式 2：进入视口触发动画

```tsx
// components/ui/RevealOnScroll/RevealOnScroll.tsx
import { motion, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  once?: boolean; // 只触发一次
}

export function RevealOnScroll({ children, className, once = true }: RevealOnScrollProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

### 模式 3：Stagger 列表动画

```tsx
// components/ui/AnimatedList/AnimatedList.tsx
import { motion, AnimatePresence } from "motion/react";
import { staggerContainer, staggerItem } from "@/utils/motionVariants";

interface AnimatedListProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}

export function AnimatedList<T>({
  items,
  keyExtractor,
  renderItem,
}: AnimatedListProps<T>) {
  return (
    <motion.ul
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence>
        {items.map((item) => (
          <motion.li
            key={keyExtractor(item)}
            variants={staggerItem}
            exit={{ opacity: 0, x: -20 }}
            layout
          >
            {renderItem(item)}
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}
```

### 模式 4：页面切换动画

```tsx
// components/layout/PageTransition.tsx
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useOutlet } from "react-router-dom";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
} satisfies Variants;

export function PageTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
```

### 模式 5：布局动画（共享布局）

```tsx
// 卡片展开/收起 — layoutId 实现平滑过渡
function ProjectCard({ project }: { project: Project }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      layoutId={`card-${project.id}`}
      onClick={() => setIsExpanded(!isExpanded)}
      className={cn(
        "cursor-pointer rounded-xl border border-white/10 bg-gray-900/80 p-4",
        isExpanded && "fixed inset-4 z-50 overflow-auto",
      )}
    >
      <motion.h3 layout="position" className="font-semibold">
        {project.name}
      </motion.h3>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p>{project.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

### 模式 6：带动画的 UI 组件（Button 示例）

```tsx
// components/ui/Button/Button.tsx — 带 motion 的按钮
import { motion, type HTMLMotionProps } from "motion/react";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(variantStyles[variant], sizeStyles[size], className)}
      disabled={isLoading}
      {...rest}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Spinner className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
```

---

## 四、AnimatePresence 使用要点

```tsx
// ✅ 正确：包裹条件渲染的元素，子元素必须有 key
<AnimatePresence>
  {isOpen && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <ModalContent />
    </motion.div>
  )}
</AnimatePresence>

// ✅ mode="wait" — 等退出动画完成后再播放进入动画
<AnimatePresence mode="wait">
  <motion.div key={currentPage}>...</motion.div>
</AnimatePresence>

// ❌ 错误：没有 key
<AnimatePresence>
  {isOpen && <motion.div>...</motion.div>}  // 缺少 key
</AnimatePresence>
```

---

## 五、prefers-reduced-motion 适配

```tsx
// hooks/useReducedMotion.ts
import { useReducedMotion } from "motion/react";

// 在组件中使用
function AnimatedCard({ children }: PropsWithChildren) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

// 全局方案：Variants 根据偏好切换
export function getVariants(variants: Variants, prefersReduced: boolean): Variants {
  if (prefersReduced) {
    return {
      hidden: {},
      visible: {},
      exit: {},
    };
  }
  return variants;
}
```

---

## 六、性能规范

### 只动画 GPU 属性

```
✅ transform (x, y, scale, rotate) — GPU 合成层
✅ opacity — GPU 合成层
❌ width / height — 触发 layout reflow
❌ top / left — 触发 layout reflow
❌ background-color — 触发 repaint
```

### 性能检查清单

```
□ 只动画 transform + opacity
□ 列表动画使用 layout + AnimatePresence（不手动计算位置）
□ 避免同时动画 >20 个元素（用 stagger 分散）
□ 退出动画通过 AnimatePresence 管理（避免 DOM 残留）
□ 大列表的动画用 useInView 做懒触发
□ 尊重 prefers-reduced-motion
□ transition duration 不超过 0.4s（超过会感觉卡顿）
□ 避免 layout 动画嵌套过深（性能急剧下降）
```

### 推荐 transition 参数

```tsx
// 弹性交互（按钮/卡片悬停）
{ type: "spring", stiffness: 400, damping: 17 }

// 平滑进入
{ duration: 0.25, ease: "easeOut" }

// 快速退出
{ duration: 0.15, ease: "easeIn" }

// 列表 stagger
{ staggerChildren: 0.05, delayChildren: 0.1 }
```

---

## 七、组件动画决策

```
这个组件需要动画吗？
  ├─ 纯数据展示、静态内容 → 不需要
  └─ 有状态切换、进入/退出、交互反馈 → 需要

需要什么级别的动画？
  ├─ 悬停/点击反馈 → whileHover / whileTap（最简单）
  ├─ 进入/退出 → initial + animate + exit + AnimatePresence
  ├─ 列表增删 → Stagger + layout + AnimatePresence
  └─ 跨组件过渡 → layoutId（最复杂）

动画由谁控制？
  ├─ 组件自身 → variants 内置
  ├─ 父组件传入 → variants prop
  └─ 外部事件 → useAnimate 命令式
```

---

## 参考链接

- [Motion for React — Animation](https://motion.dev/docs/react-animation)
- [Motion — React Component](https://motion.dev/docs/react-motion-component)
- [Framer Motion React: Complete Guide (March 2026)](https://refine.dev/blog/framer-motion/)
- [Framer Motion React Animation Guide — Magic UI](https://magicui.design/blog/framer-motion-react)
- [AnimatePresence](https://motion.dev/docs/react-animate-presence)
- [Layout Animations](https://motion.dev/docs/react-layout-animations)
