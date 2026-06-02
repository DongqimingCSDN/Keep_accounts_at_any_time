import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';

interface PieDataItem {
  name: string;
  amount: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

interface SimplePieChartProps {
  data: PieDataItem[];
  width: number;
  height: number;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
    'Z',
  ].join(' ');
}

export default function SimplePieChart({ data, width, height }: SimplePieChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.amount, 0), [data]);

  const slices = useMemo(() => {
    let currentAngle = 0;
    return data.map((item) => {
      const sliceAngle = total > 0 ? (item.amount / total) * 360 : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;
      return { ...item, startAngle, endAngle, sliceAngle };
    });
  }, [data, total]);

  if (data.length === 0) {
    return <View style={[styles.empty, { width, height }]} />;
  }

  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(cx, cy) - 10;

  // 标签位置（在饼图内部）
  const getLabelPosition = (startAngle: number, endAngle: number) => {
    const midAngle = (startAngle + endAngle) / 2;
    const labelR = r * 0.65;
    const pos = polarToCartesian(cx, cy, labelR, midAngle);
    return { x: pos.x, y: pos.y, angle: midAngle };
  };

  return (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={width} height={height}>
        <G>
          {slices.map((slice, i) => {
            const path = describeArc(cx, cy, r, slice.startAngle, slice.endAngle);
            const labelPos = getLabelPosition(slice.startAngle, slice.endAngle);
            const pct = total > 0 ? ((slice.amount / total) * 100).toFixed(0) : '0';

            return (
              <G key={i}>
                <Path d={path} fill={slice.color} />
                {Number(pct) >= 5 && (
                  <SvgText
                    x={labelPos.x}
                    y={labelPos.y}
                    fill="#FFFFFF"
                    fontSize={11}
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="central"
                  >
                    {pct}%
                  </SvgText>
                )}
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});