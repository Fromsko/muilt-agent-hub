import { Flex, theme, Typography } from 'antd';
import type { ReactNode } from 'react';

interface LineChartPoint {
  label: string;
  value: number;
}

interface SimpleLineChartProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  data: LineChartPoint[];
  color?: string;
  height?: number;
  suffix?: string;
}

export function SimpleLineChart({
  title,
  subtitle,
  data,
  color,
  height = 220,
  suffix = '',
}: SimpleLineChartProps) {
  const { token } = theme.useToken();

  if (data.length === 0) {
    return null;
  }

  const width = 560;
  const padding = 24;
  const values = data.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(maxValue - minValue, 1);

  const points = data.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y = height - padding - ((point.value - minValue) / range) * (height - padding * 2);
    return { ...point, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${height - padding} L ${points[0]?.x ?? 0} ${height - padding} Z`;

  const axisColor = token.colorBorderSecondary;
  const chartColor = color ?? token.colorPrimary;

  return (
    <Flex vertical gap={16}>
      {(title || subtitle) && (
        <div>
          {title ? <Typography.Title level={5} style={{ margin: 0 }}>{title}</Typography.Title> : null}
          {subtitle ? (
            <Typography.Text type="secondary">{subtitle}</Typography.Text>
          ) : null}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="趋势图">
        <defs>
          <linearGradient id="line-chart-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity="0.24" />
            <stop offset="100%" stopColor={chartColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((tick) => {
          const y = padding + ((height - padding * 2) / 3) * tick;
          return (
            <line
              key={tick}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke={axisColor}
              strokeDasharray="4 4"
              strokeOpacity="0.6"
            />
          );
        })}

        <path d={areaPath} fill="url(#line-chart-area)" />
        <path d={linePath} fill="none" stroke={chartColor} strokeWidth="3" strokeLinecap="round" />

        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="4" fill={chartColor} />
            <text
              x={point.x}
              y={height - 4}
              textAnchor="middle"
              fontSize="12"
              fill={token.colorTextSecondary}
            >
              {point.label}
            </text>
            <text
              x={point.x}
              y={point.y - 12}
              textAnchor="middle"
              fontSize="12"
              fill={token.colorTextSecondary}
            >
              {point.value}{suffix}
            </text>
          </g>
        ))}
      </svg>
    </Flex>
  );
}
