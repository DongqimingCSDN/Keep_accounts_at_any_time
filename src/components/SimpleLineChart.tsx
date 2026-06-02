import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text,
} from 'react-native-svg';

interface Dataset {
  data: number[];
  color: string;
  strokeWidth: number;
}

interface LineChartData {
  labels: string[];
  datasets: Dataset[];
  legend?: string[];
}

interface SimpleLineChartProps {
  data: LineChartData;
  width: number;
  height: number;
  color: string;
  labelColor: string;
  backgroundColor: string;
}

function calculateYRange(dataArr: number[]) {
  if (dataArr.length === 0) return { min: 0, max: 10 };
  const values = dataArr.filter(v => typeof v === 'number' && isFinite(v));
  if (values.length === 0) return { min: 0, max: 10 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return { min: 0, max: max * 1.1 || 10 };
  }
  const padding = (max - min) * 0.15 || 1;
  return { min: Math.max(0, min - padding), max: max + padding };
}

export default function SimpleLineChart({
  data,
  width,
  height,
  color,
  labelColor,
  backgroundColor,
}: SimpleLineChartProps) {
  const { labels, datasets } = data;
  const padding = { top: 16, right: 16, bottom: 32, left: 8 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = useMemo(() => {
    return datasets.reduce((acc, ds) => acc.concat(ds.data), [] as number[]);
  }, [datasets]);

  const { min, max } = calculateYRange(allValues);

  const getX = (index: number) => {
    if (labels.length <= 1) return padding.left + chartWidth / 2;
    const step = chartWidth / (labels.length - 1);
    return padding.left + index * step;
  };

  const getY = (value: number) => {
    if (max === min) return padding.top + chartHeight / 2;
    const ratio = (value - min) / (max - min);
    return padding.top + chartHeight - ratio * chartHeight;
  };

  const createPath = (dataset: Dataset) => {
    let path = '';
    dataset.data.forEach((value, i) => {
      const x = getX(i);
      const y = getY(value);
      if (i === 0) {
        path += `M ${x} ${y}`;
      } else {
        const prevX = getX(i - 1);
        const prevY = getY(dataset.data[i - 1]);
        const cpX = (prevX + x) / 2;
        path += ` Q ${cpX} ${prevY}, ${x} ${y}`;
      }
    });
    return path;
  };

  if (labels.length === 0) {
    return <View style={{ width, height }} />;
  }

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Background */}
        <Rect x={0} y={0} width={width} height={height} fill={backgroundColor} />

        {/* Horizontal grid lines */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding.top + (chartHeight / 4) * i;
          return (
            <Line
              key={i}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke={labelColor}
              strokeOpacity={0.2}
              strokeWidth={1}
            />
          );
        })}

        {/* X labels */}
        {labels.map((label, i) => {
          const x = getX(i);
          const yLabel = height - 8;
          return (
            <Text
              key={i}
              x={x}
              y={yLabel}
              fill={labelColor}
              fontSize={12}
              textAnchor="middle"
            >
              {label}
            </Text>
          );
        })}

        {/* Lines and dots */}
        {datasets.map((dataset, dsIndex) => {
          const path = createPath(dataset);
          const strokeWidth = dataset.strokeWidth || 2;

          return (
            <G key={dsIndex}>
              <Path
                d={path}
                fill="none"
                stroke={dataset.color}
                strokeWidth={strokeWidth}
              />
              {dataset.data.map((value, i) => {
                const x = getX(i);
                const y = getY(value);
                return (
                  <Circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={4}
                    fill={dataset.color}
                  />
                );
              })}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}