import React from 'react';

// Format currency
const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// ==========================================
// Area/Line Chart (Revenue Over Time)
// ==========================================
interface TimelineChartProps {
  data: { label: string; value: number }[];
  height?: number;
}

export const AreaChart = ({ data, height = 240 }: TimelineChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-xs font-semibold" style={{ height }}>
        Không có dữ liệu báo cáo
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 100000);
  const padding = { top: 20, right: 20, bottom: 30, left: 70 };
  const chartHeight = height - padding.top - padding.bottom;
  
  // SVG points calculation
  const width = 600;
  const chartWidth = width - padding.left - padding.right;

  const points = data.map((d, index) => {
    const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - (d.value / maxValue) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
    : '';

  // Generate Y axis ticks
  const yTicks = 4;
  const yAxisTicks = Array.from({ length: yTicks + 1 }).map((_, i) => {
    const val = (maxValue / yTicks) * i;
    const y = padding.top + chartHeight - (val / maxValue) * chartHeight;
    return { value: val, y };
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px]" style={{ height }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yAxisTicks.map((tick, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke="var(--border)"
            strokeWidth="0.75"
            strokeDasharray="3 3"
          />
        ))}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

        {/* Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} className="group cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="var(--card)"
              stroke="var(--primary)"
              strokeWidth="2"
              className="transition-all duration-200 group-hover:r-[5px] group-hover:stroke-width-3"
            />
            <title>{`${p.label}: ${formatVND(p.value)}`}</title>
          </g>
        ))}

        {/* X Axis labels */}
        {points.map((p, i) => {
          const showLabel = data.length <= 10 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1;
          if (!showLabel) return null;
          return (
            <text
              key={i}
              x={p.x}
              y={height - 10}
              fill="var(--muted-foreground)"
              fontSize="9"
              fontWeight="500"
              textAnchor="middle"
            >
              {p.label}
            </text>
          );
        })}

        {/* Y Axis labels */}
        {yAxisTicks.map((tick, i) => (
          <text
            key={i}
            x={padding.left - 10}
            y={tick.y + 3}
            fill="var(--muted-foreground)"
            fontSize="9"
            fontWeight="500"
            textAnchor="end"
          >
            {tick.value >= 1000000 
              ? `${(tick.value / 1000000).toFixed(1)}M` 
              : tick.value >= 1000 
              ? `${(tick.value / 1000).toFixed(0)}k` 
              : tick.value}
          </text>
        ))}

        {/* Bottom baseline */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={width - padding.right}
          y2={padding.top + chartHeight}
          stroke="var(--border)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};

// ==========================================
// Multi-Line Chart (Revenue vs Cost, Profit)
// ==========================================
interface MultiLineChartProps {
  data: { label: string; [key: string]: any }[];
  height?: number;
  keys: string[];
  colors: string[];
}

export const MultiLineChart = ({ data, height = 240, keys, colors }: MultiLineChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-xs font-semibold" style={{ height }}>
        Không có dữ liệu báo cáo
      </div>
    );
  }

  // Calculate global max value across all keys to scale chart
  const maxValue = Math.max(
    ...data.flatMap((d) => keys.map((k) => Number(d[k] || 0))),
    100000
  );

  const padding = { top: 20, right: 20, bottom: 30, left: 75 };
  const chartHeight = height - padding.top - padding.bottom;
  
  const width = 600;
  const chartWidth = width - padding.left - padding.right;

  // Generate Y axis ticks
  const yTicks = 4;
  const yAxisTicks = Array.from({ length: yTicks + 1 }).map((_, i) => {
    const val = (maxValue / yTicks) * i;
    const y = padding.top + chartHeight - (val / maxValue) * chartHeight;
    return { value: val, y };
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px]" style={{ height }}>
        <defs>
          {keys.map((key, keyIndex) => (
            <linearGradient key={key} id={`areaGrad-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[keyIndex]} stopOpacity="0.10" />
              <stop offset="100%" stopColor={colors[keyIndex]} stopOpacity="0.0" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {yAxisTicks.map((tick, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke="var(--border)"
            strokeWidth="0.75"
            strokeDasharray="3 3"
          />
        ))}

        {/* Draw Area Fills & Lines for each key */}
        {keys.map((key, keyIndex) => {
          const points = data.map((d, index) => {
            const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
            const y = padding.top + chartHeight - ((d[key] || 0) / maxValue) * chartHeight;
            return { x, y, label: d.label, value: d[key] || 0 };
          });

          const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          const areaPath = points.length > 0 
            ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
            : '';

          return (
            <g key={key}>
              {/* Area fill */}
              {areaPath && <path d={areaPath} fill={`url(#areaGrad-${key})`} />}
              
              {/* Line path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={colors[keyIndex]}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {points.map((p, i) => (
                <g key={i} className="group cursor-pointer">
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="3.5"
                    fill="var(--card)"
                    stroke={colors[keyIndex]}
                    strokeWidth="2"
                    className="transition-all duration-200 group-hover:r-[5px] group-hover:stroke-width-3"
                  />
                  <title>{`${p.label}: ${formatVND(p.value)}`}</title>
                </g>
              ))}
            </g>
          );
        })}

        {/* X Axis labels */}
        {data.map((d, i) => {
          const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
          const showLabel = data.length <= 10 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1;
          if (!showLabel) return null;
          return (
            <text
              key={i}
              x={x}
              y={height - 10}
              fill="var(--muted-foreground)"
              fontSize="9"
              fontWeight="500"
              textAnchor="middle"
            >
              {d.label}
            </text>
          );
        })}

        {/* Y Axis labels */}
        {yAxisTicks.map((tick, i) => (
          <text
            key={i}
            x={padding.left - 10}
            y={tick.y + 3}
            fill="var(--muted-foreground)"
            fontSize="9"
            fontWeight="500"
            textAnchor="end"
          >
            {tick.value >= 1000000 
              ? `${(tick.value / 1000000).toFixed(1)}M` 
              : tick.value >= 1000 
              ? `${(tick.value / 1000).toFixed(0)}k` 
              : tick.value}
          </text>
        ))}

        {/* Bottom baseline */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={width - padding.right}
          y2={padding.top + chartHeight}
          stroke="var(--border)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};

// ==========================================
// Column Chart (Multi-key bar chart)
// ==========================================
interface ColumnChartProps {
  data: { label: string; [key: string]: any }[];
  height?: number;
  keys: string[];
  colors: string[];
}

export const ColumnChart = ({ data, height = 240, keys, colors }: ColumnChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-xs font-semibold" style={{ height }}>
        Không có dữ liệu báo cáo
      </div>
    );
  }

  // Calculate global max and min value across all keys to scale chart
  const allValues = data.flatMap((d) => keys.map((k) => Number(d[k] || 0)));
  const maxValue = Math.max(...allValues, 100000);
  const minValue = Math.min(...allValues, 0); // Include 0 or negative values if any

  const padding = { top: 20, right: 20, bottom: 30, left: 75 };
  const chartHeight = height - padding.top - padding.bottom;
  
  const width = 600;
  const chartWidth = width - padding.left - padding.right;

  // Scale calculations
  const totalRange = maxValue - minValue;
  const getY = (val: number) => {
    return padding.top + chartHeight - ((val - minValue) / totalRange) * chartHeight;
  };

  // Generate Y axis ticks
  const yTicks = 4;
  const yAxisTicks = Array.from({ length: yTicks + 1 }).map((_, i) => {
    const val = minValue + (totalRange / yTicks) * i;
    const y = getY(val);
    return { value: val, y };
  });

  const groupWidth = chartWidth / data.length;
  const numKeys = keys.length;
  // Determine column width based on number of keys
  const columnWidth = Math.min(groupWidth * (numKeys === 1 ? 0.45 : 0.32), 14);
  const columnGap = 2;
  const totalBarWidth = numKeys * columnWidth + (numKeys - 1) * columnGap;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px]" style={{ height }}>
        {/* Grid lines */}
        {yAxisTicks.map((tick, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke="var(--border)"
            strokeWidth="0.75"
            strokeDasharray="3 3"
          />
        ))}

        {/* Draw Columns for each day */}
        {data.map((d, i) => {
          const groupCenterX = padding.left + i * groupWidth + groupWidth / 2;
          const startX = groupCenterX - totalBarWidth / 2;

          // X Axis label visibility
          const showLabel = data.length <= 12 || i % Math.ceil(data.length / 10) === 0 || i === data.length - 1;

          return (
            <g key={i} className="group/day cursor-pointer">
              {/* Background hover highlights */}
              <rect
                x={padding.left + i * groupWidth + 2}
                y={padding.top - 5}
                width={groupWidth - 4}
                height={chartHeight + 10}
                fill="currentColor"
                className="text-slate-100/0 group-hover/day:text-slate-100/50 dark:group-hover/day:text-slate-800/20 transition-colors duration-150"
                rx={4}
              />

              {keys.map((key, keyIndex) => {
                const val = Number(d[key] || 0);
                const barHeight = (Math.abs(val) / totalRange) * chartHeight;
                const barX = startX + keyIndex * (columnWidth + columnGap);
                
                // Position bar above or below baseline (y = 0 position)
                const baselineY = getY(0);
                const barY = val >= 0 ? baselineY - barHeight : baselineY;

                if (barHeight <= 0) return null;

                return (
                  <rect
                    key={key}
                    x={barX}
                    y={barY}
                    width={columnWidth}
                    height={barHeight}
                    fill={colors[keyIndex]}
                    rx={2}
                    className="transition-all duration-300 group-hover/day:opacity-90"
                  />
                );
              })}

              {/* Tooltip */}
              <title>
                {`${d.label}\n` + 
                  keys.map((key, keyIndex) => {
                    const labelName = key === 'revenue' ? 'Doanh thu' : key === 'importPrice' ? 'Chi phí' : 'Lợi nhuận';
                    return `${labelName}: ${formatVND(Number(d[key] || 0))}`;
                  }).join('\n')
                }
              </title>

              {/* X Axis label */}
              {showLabel && (
                <text
                  x={groupCenterX}
                  y={height - 10}
                  fill="var(--muted-foreground)"
                  fontSize="9"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Y Axis labels */}
        {yAxisTicks.map((tick, i) => (
          <text
            key={i}
            x={padding.left - 10}
            y={tick.y + 3}
            fill="var(--muted-foreground)"
            fontSize="9"
            fontWeight="600"
            textAnchor="end"
          >
            {tick.value >= 1000000 
              ? `${(tick.value / 1000000).toFixed(1)}M` 
              : tick.value >= 1000 
              ? `${(tick.value / 1000).toFixed(0)}k` 
              : tick.value}
          </text>
        ))}

        {/* Bottom baseline */}
        <line
          x1={padding.left}
          y1={getY(0)}
          x2={width - padding.right}
          y2={getY(0)}
          stroke="var(--border)"
          strokeWidth="1.25"
        />
      </svg>
    </div>
  );
};


// ==========================================
// Donut Chart (Status distribution)
// ==========================================
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  height?: number;
}

export const DonutChart = ({ data, height = 200 }: DonutChartProps) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm font-semibold" style={{ height }}>
        Không có dữ liệu đơn hàng
      </div>
    );
  }

  const radius = 52;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const center = 70;

  let currentAngle = -90; // Start at top

  const getModernColor = (label: string, defaultColor: string) => {
    const colorMap: Record<string, string> = {
      'Mới tạo': '#8b5cf6', // Indigo / Purple
      'Đang xử lý': '#2563eb', // Blue
      'Đang chạy': '#16a34a', // Success green
      'Sắp hết hạn': '#f59e0b', // Warning amber
      'Đã hết hạn': '#dc2626', // Danger red
      'Đã hủy': '#6b7280', // Gray
    };
    return colorMap[label] || defaultColor;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 justify-center py-2">
      <div className="relative shrink-0" style={{ width: center * 2, height: center * 2 }}>
        <svg width={center * 2} height={center * 2} className="transform -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="var(--border)"
            strokeWidth={strokeWidth - 2}
            className="opacity-45"
          />
          {data.map((item, index) => {
            if (item.value === 0) return null;
            const percentage = item.value / total;
            const strokeDashoffset = circumference - percentage * circumference;
            const strokeDasharray = `${circumference} ${circumference}`;
            const rotation = currentAngle + 90;
            currentAngle += percentage * 360;

            const itemColor = getModernColor(item.label, item.color);

            return (
              <circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={itemColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(${rotation} ${center} ${center})`}
                className="transition-all duration-300 hover:opacity-90 cursor-pointer"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{total}</span>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Đơn hàng</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 shrink-0">
        {data.map((item, index) => {
          const itemColor = getModernColor(item.label, item.color);
          return (
            <div key={index} className="flex items-center gap-2.5 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: itemColor }} />
              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{item.label}:</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">{item.value}</span>
              <span className="text-slate-400 text-[10px] font-normal">({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// Horizontal Bar Chart (Ranking Top Sellers/Products)
// ==========================================
interface HorizontalBarChartProps {
  data: { label: string; value: number; subLabel?: string }[];
  isCurrency?: boolean;
}

export const HorizontalBarChart = ({ data, isCurrency = true }: HorizontalBarChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm font-semibold">
        Không có dữ liệu xếp hạng
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-4">
      {data.map((item, idx) => {
        const percentage = (item.value / maxValue) * 100;
        return (
          <div key={idx} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2 truncate">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold border border-border">
                  {idx + 1}
                </span>
                <span className="truncate text-foreground font-bold">{item.label}</span>
                {item.subLabel && <span className="text-muted-foreground text-[10px] font-normal">({item.subLabel})</span>}
              </div>
              <span className="text-primary font-bold">
                {isCurrency ? formatVND(item.value) : `${item.value} đơn`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
