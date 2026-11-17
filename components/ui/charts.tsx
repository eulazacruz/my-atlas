'use client';
/* Gráficos com Recharts, carregados sob demanda (fora do pacote inicial). */
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface AreaProps {
  data: Record<string, unknown>[];
  x: string;
  y: string;
  stroke: string;
  fill?: string;
  gradient?: boolean;
  light: boolean;
  domain?: [string | number, string | number];
  interval?: number;
  left?: number;
  refY?: number;
  refX?: string;
  unit?: [string, string];
}

export default function AreaMini({ data, x, y, stroke, fill, gradient, light, domain, interval, left = -28, refY, refX, unit }: AreaProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 4, left, bottom: 0 }}>
        {gradient && (
          <defs>
            <linearGradient id={`g-${y}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
        )}
        <XAxis dataKey={x} tickLine={false} axisLine={false} interval={interval} tick={{ fill: '#888', fontSize: 10 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#888', fontSize: 10 }} domain={domain} />
        <Tooltip contentStyle={{ background: light ? '#fff' : '#111', border: 'none', borderRadius: 12, fontSize: 12 }} formatter={unit ? (v) => [`${v} ${unit[0]}`, unit[1]] : undefined} />
        {refY !== undefined && <ReferenceLine y={refY} stroke="#f59e0b" strokeDasharray="4 4" />}
        {refX && <ReferenceLine x={refX} stroke="#888" strokeDasharray="2 4" />}
        <Area type="monotone" dataKey={y} stroke={stroke} strokeWidth={2} fill={gradient ? `url(#g-${y})` : fill} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
