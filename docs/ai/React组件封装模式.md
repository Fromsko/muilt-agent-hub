# React 组件封装模式

> 收录时间：2026-04  
> 覆盖：组件设计模式、Props 设计、Compound Components、Headless、Polymorphic、forwardRef、泛型组件

---

## 一、组件设计六大模式

| 模式 | 核心思想 | 适用场景 | 代表库 |
|------|---------|---------|--------|
| **基础组件** | 单一职责，props 驱动 | Button / Input / Badge | shadcn/ui |
| **Compound Components** | 父子隐式共享状态 | Tabs / Select / Accordion | Radix UI |
| **Headless (无头)** | 只提供逻辑+状态，不提供 UI | 复杂交互（Combobox / Dialog） | Headless UI / Radix |
| **Render Props** | 通过函数 prop 渲染子元素 | 列表虚拟化 / 动画控制 | React Virtuoso |
| **Polymorphic (多态)** | `as` prop 改变渲染元素 | 通用布局/排版组件 | Chakra UI / Mantine |
| **HOC (高阶组件)** | 包装组件增强功能 | 权限控制 / 日志 | 历史模式，Hooks 替代 |

---

## 二、基础组件模式

### Props 设计原则

```tsx
// ✅ 好的 Props 设计
interface ButtonProps {
  // 1. 语义化变体，非散装样式 props
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";

  // 2. 布尔状态用 is/has 前缀
  isLoading?: boolean;
  isDisabled?: boolean;

  // 3. 事件回调用 on 前缀
  onClick?: (event: MouseEvent) => void;

  // 4. 子元素
  children: ReactNode;

  // 5. 允许扩展原生属性
  className?: string;
}

// ✅ 继承原生属性（不重复声明）
interface ButtonProps
  extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: ReactNode;
}
```

### 组件结构模板

```tsx
// components/ui/Button/Button.tsx

// 1. 导入
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/utils/cn";

// 2. 类型
interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

// 3. 样式映射（常量提取，不写在 JSX 里）
const variantStyles = {
  primary: "bg-primary text-white hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  danger: "bg-red-500 text-white hover:bg-red-600",
} as const;

const sizeStyles = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

// 4. 组件（命名导出 + forwardRef）
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", isLoading, className, children, disabled, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={disabled || isLoading}
        {...rest}
      >
        {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
        {children}
      </button>
    );
  },
);
```

### cn 工具（class 合并）

```tsx
// utils/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 三、Compound Components（复合组件）

> 父子隐式共享状态，像 `<select>` + `<option>` 一样自然

### 使用方式

```tsx
// 使用者视角 — 声明式、清晰
<Tabs defaultValue="code">
  <Tabs.List>
    <Tabs.Trigger value="code">代码</Tabs.Trigger>
    <Tabs.Trigger value="preview">预览</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="code">...</Tabs.Content>
  <Tabs.Content value="preview">...</Tabs.Content>
</Tabs>
```

### 实现模式（Context + Hooks）

```tsx
// components/ui/Tabs/Tabs.tsx
import { createContext, useContext, useState, type ReactNode } from "react";

// 1. Context
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs子组件必须放在 <Tabs> 内部");
  return ctx;
}

// 2. Root
interface TabsProps {
  defaultValue: string;
  children: ReactNode;
}

function TabsRoot({ defaultValue, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

// 3. 子组件
function TabsList({ children }: { children: ReactNode }) {
  return <div className="flex gap-1 border-b border-white/10">{children}</div>;
}

function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const { activeTab, setActiveTab } = useTabsContext();
  return (
    <button
      className={cn("px-4 py-2 text-sm", activeTab === value && "border-b-2 border-primary")}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;
  return <div>{children}</div>;
}

// 4. 组合导出
export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});
```

---

## 四、Headless 组件（无头模式）

> 只提供行为 + 状态 + 无障碍，UI 完全由使用者决定

### Hook 形式

```tsx
// hooks/useToggle.ts
function useToggle(initial = false) {
  const [isOn, setIsOn] = useState(initial);
  const toggle = useCallback(() => setIsOn((v) => !v), []);
  const setOn = useCallback(() => setIsOn(true), []);
  const setOff = useCallback(() => setIsOn(false), []);
  return { isOn, toggle, setOn, setOff } as const;
}

// hooks/useDisclosure.ts — 更通用的开关
function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // 返回 props getter — headless 核心理念
  const getButtonProps = useCallback(
    () => ({
      onClick: toggle,
      "aria-expanded": isOpen,
    }),
    [toggle, isOpen],
  );

  const getContentProps = useCallback(
    () => ({
      hidden: !isOpen,
      role: "region" as const,
    }),
    [isOpen],
  );

  return { isOpen, open, close, toggle, getButtonProps, getContentProps };
}
```

### Render Prop 形式

```tsx
function Combobox<T>({
  items,
  renderItem,
  onSelect,
}: {
  items: T[];
  renderItem: (item: T, isHighlighted: boolean) => ReactNode;
  onSelect: (item: T) => void;
}) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  // ... 键盘导航逻辑

  return (
    <ul role="listbox">
      {items.map((item, i) => (
        <li
          key={i}
          role="option"
          aria-selected={i === highlightedIndex}
          onClick={() => onSelect(item)}
          onMouseEnter={() => setHighlightedIndex(i)}
        >
          {renderItem(item, i === highlightedIndex)}
        </li>
      ))}
    </ul>
  );
}
```

---

## 五、Polymorphic 组件（多态 `as` prop）

> 一个组件可以渲染为任意 HTML 元素或其他组件

```tsx
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";

// 泛型类型工具
type PolymorphicProps<E extends ElementType, Props = object> = Props &
  Omit<ComponentPropsWithoutRef<E>, keyof Props> & {
    as?: E;
  };

// 组件
type TextProps<E extends ElementType> = PolymorphicProps<E, {
  size?: "sm" | "md" | "lg";
  weight?: "normal" | "medium" | "bold";
}>;

export function Text<E extends ElementType = "span">({
  as,
  size = "md",
  weight = "normal",
  className,
  ...rest
}: TextProps<E>) {
  const Component = as || "span";
  return (
    <Component
      className={cn(
        sizeMap[size],
        weightMap[weight],
        className,
      )}
      {...rest}
    />
  );
}

// 使用
<Text>普通文本</Text>
<Text as="h1" size="lg" weight="bold">标题</Text>
<Text as="p" size="sm">段落</Text>
<Text as={Link} href="/about">链接</Text>
```

---

## 六、forwardRef + 泛型组件

### forwardRef 标准写法

```tsx
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, className, ...rest }, ref) {
    return (
      <div>
        {label && <label>{label}</label>}
        <input ref={ref} className={cn("...", error && "border-red-500", className)} {...rest} />
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  },
);
```

### 泛型列表组件

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
}

export function List<T>({ items, renderItem, keyExtractor, emptyMessage }: ListProps<T>) {
  if (items.length === 0) {
    return <div className="text-muted py-8 text-center">{emptyMessage ?? "暂无数据"}</div>;
  }
  return (
    <ul>
      {items.map((item, i) => (
        <li key={keyExtractor(item)}>{renderItem(item, i)}</li>
      ))}
    </ul>
  );
}

// 使用 — T 自动推断
<List
  items={projects}
  keyExtractor={(p) => p.id}
  renderItem={(p) => <ProjectCard project={p} />}
/>
```

---

## 七、组件封装清单

每个组件封装时检查：

```
□ 单一职责 — 一个组件只做一件事
□ Props 最小化 — 只暴露必要的 props，内部细节不外泄
□ 默认值合理 — variant/size 等有合理默认值
□ className 可扩展 — 最外层接受 className 并用 cn() 合并
□ ref 转发 — 交互组件必须 forwardRef
□ 无障碍 — aria-label / role / keyboard navigation
□ 命名导出 — export function Button，禁止 default export
□ index.ts re-export — 每个组件文件夹提供 barrel
□ 测试 — 至少覆盖 render + 核心交互
□ 类型安全 — Props 类型独立导出，命名为 XxxProps
```

---

## 参考链接

- [React Design Patterns: Complete Guide (2026)](https://www.turbodocx.com/blog/react-design-patterns)
- [Compound Pattern — patterns.dev](https://www.patterns.dev/react/compound-pattern/)
- [Compound Components with React Hooks — Kent C. Dodds](https://kentcdodds.com/blog/compound-components-with-react-hooks)
- [Polymorphic React Components (2024)](https://www.tsteele.dev/posts/react-polymorphic-forwardref)
- [Build Strongly Typed Polymorphic Components — LogRocket](https://blog.logrocket.com/build-strongly-typed-polymorphic-components-react-typescript/)
- [React Stack Patterns 2026 — patterns.dev](https://www.patterns.dev/react/react-2026/)
- [Forwarding Refs for Polymorphic Components — Ben MVP](https://www.benmvp.com/blog/forwarding-refs-polymorphic-react-component-typescript/)
