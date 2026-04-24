import { create } from 'zustand';

export interface GatewayInstance {
  id: string;
  name: string;
  region: string;
  endpoint: string;
  status: 'healthy' | 'degraded';
  version: string;
}

export interface RouteRule {
  id: string;
  name: string;
  match: string;
  upstream: string;
  policy: string;
  status: 'active' | 'draft';
}

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error';
  source: string;
}

interface ConsoleState {
  gateways: GatewayInstance[];
  routes: RouteRule[];
  alerts: AlertItem[];
  addGateway: (gateway: GatewayInstance) => void;
  removeGateway: (id: string) => void;
  updateGatewayStatus: (id: string, status: GatewayInstance['status']) => void;
  addRoute: (route: RouteRule) => void;
  removeRoute: (id: string) => void;
  updateRouteStatus: (id: string, status: RouteRule['status']) => void;
  addAlert: (alert: AlertItem) => void;
  removeAlert: (id: string) => void;
  updateAlertType: (id: string, type: AlertItem['type']) => void;
}

const initialGateways: GatewayInstance[] = [
  { id: 'gw-1', name: 'north-gw', region: '华北核心区', endpoint: 'north-gw.prod.internal', status: 'healthy', version: 'v2.8.1' },
  { id: 'gw-2', name: 'east-gw', region: '华东业务区', endpoint: 'east-gw.prod.internal', status: 'healthy', version: 'v2.8.1' },
  { id: 'gw-3', name: 'south-gw', region: '华南边缘区', endpoint: 'south-gw.prod.internal', status: 'degraded', version: 'v2.8.0' },
];

const initialRoutes: RouteRule[] = [
  { id: 'route-1', name: 'billing-v2', match: '/billing/v2/**', upstream: 'billing-service', policy: '鉴权 + 限流', status: 'active' },
  { id: 'route-2', name: 'orders-api', match: '/orders/**', upstream: 'orders-service', policy: '鉴权 + WAF', status: 'active' },
  { id: 'route-3', name: 'preview-assets', match: '/preview/assets/**', upstream: 'cdn-preview', policy: '仅白名单访问', status: 'draft' },
];

const initialAlerts: AlertItem[] = [
  { id: 'alert-1', title: 'south-gw 响应延迟升高', description: '最近 5 分钟 P95 延迟超过 80ms，建议优先检查上游服务健康度。', type: 'warning', source: '网关实例' },
  { id: 'alert-2', title: 'billing-service 出现异常流量峰值', description: '已自动命中限流策略，当前请求速率仍处在高位。', type: 'error', source: '流量治理' },
  { id: 'alert-3', title: '证书将在 7 天后过期', description: '请尽快轮换 edge-api.example.com 的 TLS 证书，避免服务中断。', type: 'info', source: '证书管理' },
];

export const useConsoleStore = create<ConsoleState>((set) => ({
  gateways: initialGateways,
  routes: initialRoutes,
  alerts: initialAlerts,
  addGateway: (gateway) =>
    set((state) => ({
      gateways: [gateway, ...state.gateways],
    })),
  removeGateway: (id) =>
    set((state) => ({
      gateways: state.gateways.filter((item) => item.id !== id),
    })),
  updateGatewayStatus: (id, status) =>
    set((state) => ({
      gateways: state.gateways.map((item) => (item.id === id ? { ...item, status } : item)),
    })),
  addRoute: (route) =>
    set((state) => ({
      routes: [route, ...state.routes],
    })),
  removeRoute: (id) =>
    set((state) => ({
      routes: state.routes.filter((item) => item.id !== id),
    })),
  updateRouteStatus: (id, status) =>
    set((state) => ({
      routes: state.routes.map((item) => (item.id === id ? { ...item, status } : item)),
    })),
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
    })),
  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((item) => item.id !== id),
    })),
  updateAlertType: (id, type) =>
    set((state) => ({
      alerts: state.alerts.map((item) => (item.id === id ? { ...item, type } : item)),
    })),
}));
