import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, FunnelChart, GaugeChart, LineChart, PieChart, TreemapChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { Scalar, ValueFormat } from '../engine/model';
import { autoUnits, formatKey, formatTick, formatValue, isHorizontal, isLineLike } from '../engine/visual';
import type { VisualFormat, VisualResult, VisualType } from '../engine/visual';

echarts.use([BarChart, FunnelChart, GaugeChart, LineChart, PieChart, TreemapChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent, CanvasRenderer]);

/** Default report theme colors (the classic BI data palette). */
export const PALETTE = ['#118DFF', '#12239E', '#E66C37', '#6B007B', '#E044A7', '#744EC2', '#D9B300', '#D64550'];
const FONT = '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif';
const SUB = '#605E5C';
const TEXT = '#252423';

const keyLabel = (keys: Scalar[]) => keys.map(formatKey).join(' ');
const num = (v: Scalar | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const toNum = (v: Scalar) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function EChart({
  option,
  onClickName,
  onContextName,
}: {
  option: echarts.EChartsCoreOption;
  onClickName?: (name: string) => void;
  onContextName?: (name: string, x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const clickRef = useRef(onClickName);
  clickRef.current = onClickName;
  const contextRef = useRef(onContextName);
  contextRef.current = onContextName;
  useEffect(() => {
    if (!ref.current) return;
    chart.current = echarts.init(ref.current);
    chart.current.on('click', (p: { name?: string }) => {
      if (p.name) clickRef.current?.(p.name);
    });
    chart.current.on('contextmenu', (p) => {
      const e = p.event?.event as unknown as MouseEvent | undefined;
      if (!p.name || !e || !contextRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      contextRef.current(p.name, e.clientX, e.clientY);
    });
    const ro = new ResizeObserver(() => chart.current?.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);
  useEffect(() => {
    chart.current?.setOption(option, true);
  }, [option]);
  return <div ref={ref} className="h-full w-full" />;
}

function tooltipHtml(rows: [string, string][]): string {
  return rows
    .map(
      ([k, v]) =>
        `<div style="display:flex;justify-content:space-between;gap:24px;line-height:20px"><span style="color:${SUB}">${k}</span><span style="color:${TEXT};font-weight:600">${v}</span></div>`,
    )
    .join('');
}

const tooltipBase = {
  backgroundColor: '#fff',
  borderColor: '#E1DFDD',
  borderWidth: 1,
  padding: [6, 10],
  textStyle: { fontFamily: FONT, fontSize: 12, color: TEXT },
  extraCssText: 'box-shadow: 0 3.2px 7.2px rgba(0,0,0,.13), 0 .6px 1.8px rgba(0,0,0,.11); border-radius: 2px;',
};

/** Legend in the top-left corner, preceded by the legend field name. */
function legendParts(title: string | null, names: string[], compact: boolean) {
  const titleWidth = title ? Math.ceil(title.length * 6.6) + 10 : 0;
  return {
    title: title ? { text: title, left: 0, top: 0, textStyle: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: TEXT } } : undefined,
    legend: {
      show: !compact,
      type: 'scroll',
      data: names,
      left: titleWidth,
      top: 0,
      icon: 'circle',
      itemWidth: 9,
      itemHeight: 9,
      itemGap: 14,
      textStyle: { fontFamily: FONT, fontSize: 12, color: SUB },
    },
  };
}

function cartesianOption(r: VisualResult, type: VisualType, fmtOpts: VisualFormat, compact: boolean): echarts.EChartsCoreOption {
  const horizontal = isHorizontal(type);
  const lineLike = isLineLike(type);
  const combo = type === 'lineColumn';
  const lineFrom = combo ? r.valueLabels.length - (r.lineCount ?? 0) : Infinity;
  const pct = type === 'pctColumn' || type === 'pctBar';
  const fmt: ValueFormat | undefined = r.formats[0];
  const hasSeries = r.seriesLabels.length > 0;
  const stacked = (hasSeries && (type === 'column' || type === 'bar' || type === 'stackedArea')) || pct;

  const catKeys: Scalar[][] = [];
  const seen = new Set<string>();
  for (const row of r.rows) {
    const k = JSON.stringify(row.keys);
    if (!seen.has(k)) {
      seen.add(k);
      catKeys.push(row.keys);
    }
  }
  const lookup = new Map(r.rows.map((row) => [JSON.stringify(row.keys) + '#' + JSON.stringify(row.series), row]));
  const rowVal = (keys: Scalar[], j: number) => lookup.get(JSON.stringify(keys) + '#' + JSON.stringify([]))?.values[j] ?? null;

  // Bar/column charts sort by value (descending) by default; line charts keep the axis order.
  let cats: Scalar[][];
  let series: { name: string; data: (number | null)[] }[];
  if (hasSeries) {
    cats = lineLike || r.sorted ? catKeys : [...catKeys].sort((a, b) => num(r.rowTotals.get(JSON.stringify(b))?.[0]) - num(r.rowTotals.get(JSON.stringify(a))?.[0]));
    series = r.seriesKeys.map((s) => ({
      name: keyLabel(s),
      data: cats.map((c) => toNum(lookup.get(JSON.stringify(c) + '#' + JSON.stringify(s))?.values[0] ?? null)),
    }));
  } else {
    cats = lineLike || combo || r.sorted ? catKeys : [...catKeys].sort((a, b) => num(rowVal(b, 0)) - num(rowVal(a, 0)));
    series = r.valueLabels.map((name, j) => ({ name, data: cats.map((c) => toNum(rowVal(c, j))) }));
  }

  // 100% stacked charts show each segment as a share of its category.
  const raw = series.map((x) => [...x.data]);
  if (pct) {
    const totals = cats.map((_, ci) => series.reduce((acc, x) => acc + (x.data[ci] ?? 0), 0));
    series = series.map((x) => ({ ...x, data: x.data.map((v, ci) => (v === null || !totals[ci] ? null : v / totals[ci])) }));
  }
  // Display units from the largest plotted value (stacked totals for stacked charts).
  const stackedMax = stacked && !pct ? Math.max(0, ...cats.map((c) => num(r.rowTotals.get(JSON.stringify(c))?.[0]))) : 0;
  const plainMax = Math.max(0, ...series.flatMap((x) => x.data.map((v) => Math.abs(v ?? 0))));
  const unit = autoUnits(Math.max(stackedMax, plainMax));
  const tick = (v: number) => formatTick(v, pct ? 'percent' : fmt, unit);

  if (horizontal) {
    cats = [...cats].reverse();
    series = series.map((x) => ({ ...x, data: [...x.data].reverse() }));
    raw.forEach((d, i) => (raw[i] = [...d].reverse()));
  }

  const showLegend = !compact && fmtOpts.legend !== false && (hasSeries || series.length > 1);
  const legendTitle = hasSeries ? r.seriesLabels.join(' ') : null;
  const lp = legendParts(legendTitle, series.map((s) => s.name), compact || !showLegend);
  const showCatTitle = !compact && fmtOpts.xTitle !== false;
  const showValTitle = !compact && fmtOpts.yTitle !== false;
  const longestTick = tick(Math.max(stackedMax, plainMax)).length + 1;

  const labelStyle = { fontFamily: FONT, fontSize: compact ? 9 : 12, color: SUB };
  const catAxis = {
    type: 'category',
    data: cats.map(keyLabel),
    axisLabel: { ...labelStyle, hideOverlap: true },
    axisTick: { show: false },
    axisLine: { show: false },
    name: showCatTitle ? r.categoryLabels.join(' and ') : '',
    nameLocation: 'middle',
    nameGap: horizontal ? Math.min(140, 12 + Math.max(...cats.map((c) => keyLabel(c).length)) * 6.5) : 26,
    nameTextStyle: { fontFamily: FONT, fontSize: 12, color: TEXT },
  };
  const valAxis = {
    type: 'value',
    axisLabel: { ...labelStyle, formatter: tick },
    ...(pct ? { max: 1 } : {}),
    splitLine: { show: true, lineStyle: { color: '#C8C6C4', type: [1, 3], width: 1 } },
    name: showValTitle ? (hasSeries ? r.valueLabels[0] : r.valueLabels.join(' and ')) : '',
    nameLocation: 'middle',
    nameGap: horizontal ? 26 : 14 + longestTick * 6.5,
    nameTextStyle: { fontFamily: FONT, fontSize: 12, color: TEXT },
  };

  const yTitlePad = (horizontal ? showCatTitle : showValTitle) ? 22 : 4;
  return {
    color: PALETTE,
    animationDuration: 250,
    textStyle: { fontFamily: FONT },
    ...(lp.title ? { title: showLegend ? lp.title : undefined } : {}),
    legend: showLegend ? lp.legend : { show: false },
    grid: { left: yTitlePad, right: 12, top: showLegend ? 30 : 10, bottom: (horizontal ? showValTitle : showCatTitle) ? 22 : 4, containLabel: true },
    tooltip: {
      ...tooltipBase,
      trigger: 'item',
      formatter: (p: { name: string; seriesName: string; value: number; seriesIndex: number; dataIndex: number }) => {
        const rows: [string, string][] = [[r.categoryLabels.join(' '), p.name]];
        if (hasSeries) rows.push([r.seriesLabels.join(' '), p.seriesName]);
        rows.push([hasSeries ? r.valueLabels[0] : p.seriesName, formatValue(pct ? raw[p.seriesIndex][p.dataIndex] : p.value, fmt)]);
        if (pct) rows.push(['% of total', `${(p.value * 100).toFixed(2)}%`]);
        return tooltipHtml(rows);
      },
    },
    xAxis: horizontal ? valAxis : catAxis,
    yAxis: horizontal ? catAxis : valAxis,
    series: series.map((s, si) => ({
      name: s.name,
      type: lineLike || si >= lineFrom ? 'line' : 'bar',
      data: s.data,
      stack: stacked ? 'total' : undefined,
      areaStyle: type === 'area' || type === 'stackedArea' ? { opacity: type === 'area' ? 0.35 : 0.85 } : undefined,
      showSymbol: false,
      symbolSize: 6,
      lineStyle: { width: 2 },
      barCategoryGap: '20%',
      barMaxWidth: 120,
      emphasis: { focus: 'none' },
      label: {
        show: !!fmtOpts.dataLabels && !compact,
        position: stacked && !lineLike ? 'inside' : horizontal ? 'right' : 'top',
        fontFamily: FONT,
        fontSize: 11,
        color: stacked && !lineLike ? '#fff' : SUB,
        formatter: (p: { value: number }) => tick(p.value),
      },
    })),
  };
}

/** Waterfall: each category moves the running total up (green) or down (red), with a Total bar at the end. */
function waterfallOption(r: VisualResult, fmtOpts: VisualFormat, compact: boolean): echarts.EChartsCoreOption {
  const fmt = r.formats[0];
  const cats = r.rows.map((row) => keyLabel(row.keys));
  const deltas = r.rows.map((row) => num(row.values[0]));
  const base: number[] = [];
  const up: (number | null)[] = [];
  const down: (number | null)[] = [];
  let run = 0;
  for (const d of deltas) {
    base.push(d >= 0 ? run : run + d);
    up.push(d >= 0 ? d : null);
    down.push(d < 0 ? -d : null);
    run += d;
  }
  const unit = autoUnits(Math.max(Math.abs(run), ...deltas.map(Math.abs)));
  const tick = (v: number) => formatTick(v, fmt, unit);
  const labelStyle = { fontFamily: FONT, fontSize: compact ? 9 : 12, color: SUB };
  const bar = (name: string, data: (number | null)[], color: string) => ({
    name,
    type: 'bar',
    stack: 'wf',
    data: [...data, name === 'Total' ? run : null],
    itemStyle: { color },
    barCategoryGap: '25%',
    label: { show: !!fmtOpts.dataLabels && !compact, position: 'top', fontFamily: FONT, fontSize: 11, color: SUB, formatter: (p: { value: number }) => tick(p.value) },
  });
  return {
    animationDuration: 250,
    textStyle: { fontFamily: FONT },
    legend: { show: !compact && fmtOpts.legend !== false, data: ['Increase', 'Decrease', 'Total'], left: 0, top: 0, icon: 'circle', itemWidth: 9, itemHeight: 9, textStyle: { fontFamily: FONT, fontSize: 12, color: SUB } },
    grid: { left: 4, right: 12, top: compact ? 10 : 30, bottom: 4, containLabel: true },
    tooltip: {
      ...tooltipBase,
      trigger: 'item',
      formatter: (p: { name: string; seriesName: string; dataIndex: number }) =>
        tooltipHtml([
          [r.categoryLabels.join(' ') || 'Category', p.name],
          [r.valueLabels[0], formatValue(p.dataIndex < deltas.length ? deltas[p.dataIndex] : run, fmt)],
        ]),
    },
    xAxis: { type: 'category', data: [...cats, 'Total'], axisLabel: { ...labelStyle, hideOverlap: true }, axisTick: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'value', axisLabel: { ...labelStyle, formatter: tick }, splitLine: { show: true, lineStyle: { color: '#C8C6C4', type: [1, 3], width: 1 } } },
    series: [
      { name: 'base', type: 'bar', stack: 'wf', data: [...base, 0], itemStyle: { color: 'transparent' }, emphasis: { disabled: true }, tooltip: { show: false }, silent: true },
      bar('Increase', up, '#1AAB40'),
      bar('Decrease', down, '#D64554'),
      bar('Total', deltas.map(() => null), '#118DFF'),
    ],
  };
}

/** Funnel: stages from widest to narrowest, with the share of the first stage. */
function funnelOption(r: VisualResult, compact: boolean): echarts.EChartsCoreOption {
  const fmt = r.formats[0];
  const data = r.rows.map((row) => ({ name: keyLabel(row.keys), value: num(row.values[0]) })).sort((a, b) => b.value - a.value);
  const first = data[0]?.value || 1;
  return {
    animationDuration: 250,
    textStyle: { fontFamily: FONT },
    tooltip: {
      ...tooltipBase,
      trigger: 'item',
      formatter: (p: { name: string; value: number }) =>
        tooltipHtml([
          [r.categoryLabels.join(' '), p.name],
          [r.valueLabels[0], formatValue(p.value, fmt)],
          ['% of first', `${((p.value / first) * 100).toFixed(1)}%`],
        ]),
    },
    series: [
      {
        type: 'funnel',
        sort: 'descending',
        left: '8%',
        right: '8%',
        top: 8,
        bottom: 8,
        minSize: '8%',
        gap: 2,
        data,
        itemStyle: { color: '#118DFF', borderWidth: 0 },
        label: { show: true, position: 'inside', fontFamily: FONT, fontSize: compact ? 9 : 12, color: '#fff', formatter: (p: { name: string; value: number }) => `${p.name}  ${formatTick(p.value, fmt, autoUnits(first))}` },
      },
    ],
  };
}

/** Gauge: one value on an arc from 0 to a round maximum (twice the value, like the default). */
function gaugeOption(r: VisualResult, compact: boolean): echarts.EChartsCoreOption {
  const fmt = r.formats[0];
  const v = num(r.totals[0]);
  // Like the default gauge: the arc ends at twice the value, rounded up to two significant digits.
  const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(1, v * 2))) - 1));
  const max = Math.ceil((v * 2) / step) * step || 1;
  const unit = autoUnits(max);
  return {
    animationDuration: 250,
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max,
        radius: '95%',
        center: ['50%', '75%'],
        progress: { show: true, width: compact ? 14 : 26, itemStyle: { color: '#118DFF' } },
        axisLine: { lineStyle: { width: compact ? 14 : 26, color: [[1, '#E6E6E6']] } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: !compact, distance: compact ? -20 : -40, fontFamily: FONT, fontSize: 11, color: SUB, formatter: (x: number) => (x === 0 || x === max ? formatTick(x, fmt, unit) : '') },
        detail: { valueAnimation: false, offsetCenter: [0, '-12%'], fontFamily: FONT, fontSize: compact ? 15 : 26, fontWeight: 300, color: TEXT, formatter: () => formatTick(v, fmt, autoUnits(v)) },
        title: { offsetCenter: [0, '18%'], fontFamily: FONT, fontSize: compact ? 9 : 12, color: SUB },
        data: [{ value: v, name: r.valueLabels[0] }],
      },
    ],
  };
}

/** KPI: the value of the latest period, its change from the previous one, and a small trend area behind. */
function Kpi({ r, compact }: { r: VisualResult; compact: boolean }) {
  const fmt = r.formats[0];
  const points = r.rows.map((row) => num(row.values[0]));
  if (!points.length) return <div className="flex h-full items-center justify-center text-xs text-[#605e5c]">Add a Trend axis</div>;
  const last = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : null;
  const change = prev ? (last - prev) / Math.abs(prev) : null;
  const max = Math.max(...points);
  const min = Math.min(0, ...points);
  const path = points.map((p, i) => `${(i / Math.max(1, points.length - 1)) * 100},${40 - ((p - min) / (max - min || 1)) * 38}`).join(' ');
  const good = change === null || change >= 0;
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden" style={{ fontFamily: FONT }}>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-1/2 w-full" aria-hidden>
        <polygon points={`0,40 ${path} 100,40`} fill={good ? '#DFF5E1' : '#FADBD8'} />
        <polyline points={path} fill="none" stroke={good ? '#1AAB40' : '#D64554'} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="relative" style={{ color: TEXT, fontSize: compact ? 18 : 34, fontWeight: 300 }}>
        {formatTick(last, fmt, autoUnits(last))}
      </div>
      <div className="relative" style={{ color: SUB, fontSize: compact ? 9 : 12 }}>
        {r.valueLabels[0]} · {keyLabel(r.rows[r.rows.length - 1].keys)}
      </div>
      {change !== null && (
        <div className="relative font-semibold" style={{ color: good ? '#1AAB40' : '#D64554', fontSize: compact ? 9 : 12 }}>
          {good ? '▲' : '▼'} {(Math.abs(change) * 100).toFixed(1)}% vs previous
        </div>
      )}
    </div>
  );
}

function pieOption(r: VisualResult, fmtOpts: VisualFormat, compact: boolean, donut = false): echarts.EChartsCoreOption {
  const fmt = r.formats[0];
  const total = r.rows.reduce((s, row) => s + num(row.values[0]), 0);
  const unit = autoUnits(Math.max(0, ...r.rows.map((row) => Math.abs(num(row.values[0])))));
  const names = r.rows.map((row) => keyLabel(row.keys));
  const showLegend = !compact && fmtOpts.legend !== false;
  const lp = legendParts(r.categoryLabels.join(' '), names, !showLegend);
  return {
    color: PALETTE,
    animationDuration: 250,
    textStyle: { fontFamily: FONT },
    ...(showLegend ? { title: lp.title } : {}),
    legend: showLegend ? lp.legend : { show: false },
    tooltip: {
      ...tooltipBase,
      trigger: 'item',
      formatter: (p: { name: string; value: number; percent: number }) =>
        tooltipHtml([
          [r.categoryLabels.join(' '), p.name],
          [r.valueLabels[0], formatValue(p.value, fmt)],
          ['% of total', `${p.percent.toFixed(2)}%`],
        ]),
    },
    series: [
      {
        type: 'pie',
        radius: donut ? (compact ? ['42%', '72%'] : ['38%', '62%']) : compact ? '72%' : '62%',
        center: ['50%', compact ? '50%' : '56%'],
        startAngle: 90,
        avoidLabelOverlap: true,
        label: {
          show: !compact && fmtOpts.dataLabels !== false,
          fontFamily: FONT,
          fontSize: 12,
          color: SUB,
          formatter: (p: { value: number }) => `${formatTick(p.value, fmt, unit)} (${total ? ((p.value / total) * 100).toFixed(2) : 0}%)`,
        },
        labelLine: { show: !compact, length: 10, length2: 12, lineStyle: { color: '#C8C6C4' } },
        itemStyle: { borderColor: '#fff', borderWidth: 1 },
        emphasis: { scale: false },
        data: r.rows.map((row) => ({ name: keyLabel(row.keys), value: toNum(row.values[0]) })),
      },
    ],
  };
}

function treemapOption(r: VisualResult, compact: boolean): echarts.EChartsCoreOption {
  const fmt = r.formats[0];
  const unit = autoUnits(Math.max(0, ...r.rows.map((row) => Math.abs(num(row.values[0])))));
  const rows = [...r.rows].sort((a, b) => num(b.values[0]) - num(a.values[0]));
  return {
    animationDuration: 250,
    textStyle: { fontFamily: FONT },
    tooltip: {
      ...tooltipBase,
      trigger: 'item',
      formatter: (p: { name: string; value: number }) => tooltipHtml([[r.categoryLabels.join(' '), p.name], [r.valueLabels[0], formatValue(p.value, fmt)]]),
    },
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 },
        label: {
          show: true,
          position: 'insideTopLeft',
          fontFamily: FONT,
          fontSize: compact ? 9 : 12,
          color: '#fff',
          formatter: (p: { name: string; value: number }) => (compact ? p.name : `${p.name}\n${formatTick(p.value, fmt, unit)}`),
        },
        data: rows.map((row, i) => ({ name: keyLabel(row.keys), value: toNum(row.values[0]), itemStyle: { color: PALETTE[i % PALETTE.length] } })),
      },
    ],
  };
}

function MultiCard({ r, compact }: { r: VisualResult; compact: boolean }) {
  return (
    <div className="flex h-full flex-col justify-center gap-3 overflow-auto" style={{ fontFamily: FONT }}>
      {r.valueLabels.map((label, i) => {
        const v = r.totals[i] ?? null;
        const text = v === null ? '(Blank)' : typeof v === 'number' ? formatTick(v, r.formats[i], autoUnits(Math.abs(v))) : String(v);
        return (
          <div key={label} className="border-l-[3px] pl-3" style={{ borderColor: PALETTE[0] }}>
            <div style={{ color: TEXT, fontSize: compact ? 15 : 26, fontWeight: 300, lineHeight: 1.15 }}>{text}</div>
            <div style={{ color: SUB, fontSize: compact ? 9 : 12 }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Background color scale (white → theme blue) and data bars for table/matrix values. */
function useConditional(r: VisualResult, fmtOpts: VisualFormat) {
  const rules = fmtOpts.conditional ?? [];
  const ranges = rules.map((c) => {
    const vals = r.rows.map((row) => row.values[c.valueIndex]).filter((v): v is number => typeof v === 'number');
    return { rule: c, min: Math.min(0, ...vals), max: Math.max(0, ...vals) };
  });
  return (j: number, v: Scalar): { style?: CSSProperties; bar?: Bar } => {
    const rr = ranges.find((x) => x.rule.valueIndex === j);
    if (!rr || typeof v !== 'number') return {};
    const t = rr.max === rr.min ? 0 : (v - rr.min) / (rr.max - rr.min);
    const style: CSSProperties = {};
    if (rr.rule.background) {
      const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
      style.background = `rgb(${mix(255, 17)}, ${mix(255, 141)}, ${mix(255, 255)})`;
      if (t > 0.6) style.color = '#fff';
    }
    // Data bars grow from the zero line: right and blue for positive values, left and red for negative ones.
    const span = rr.max - rr.min || 1;
    const zero = -rr.min / span;
    const bar: Bar | undefined = rr.rule.dataBars ? (v >= 0 ? { from: zero, to: zero + v / span, negative: false } : { from: zero + v / span, to: zero, negative: true }) : undefined;
    return { style, bar };
  };
}

interface Bar {
  /** Start and end of the bar as a fraction of the cell width. */
  from: number;
  to: number;
  negative: boolean;
}

function ValueCell({ v, fmt, cond }: { v: Scalar; fmt: ValueFormat | undefined; cond: { style?: CSSProperties; bar?: Bar } }) {
  const b = cond.bar;
  return (
    <td className={`${cellBase} relative text-right tabular-nums`} style={cond.style}>
      {b && (
        <span className="absolute inset-y-[3px] right-1 left-1">
          <span
            className="absolute inset-y-0"
            style={{ left: `${(b.from * 100).toFixed(1)}%`, width: `${((b.to - b.from) * 100).toFixed(1)}%`, background: b.negative ? '#f4a3a3' : '#a0d1ff' }}
          />
        </span>
      )}
      <span className="relative">{formatValue(v, fmt)}</span>
    </td>
  );
}

function Card({ r, fmtOpts, compact }: { r: VisualResult; fmtOpts: VisualFormat; compact: boolean }) {
  const v = r.totals[0] ?? null;
  const text = v === null ? '(Blank)' : typeof v === 'number' ? formatTick(v, r.formats[0], autoUnits(Math.abs(v))) : String(v);
  return (
    <div className="flex h-full flex-col items-center justify-center" style={{ fontFamily: FONT }}>
      <div style={{ color: TEXT, fontWeight: 300, fontSize: compact ? 26 : 'clamp(28px, 7vw, 56px)', lineHeight: 1.1 }}>{text}</div>
      {fmtOpts.categoryLabel !== false && <div style={{ color: SUB, fontSize: compact ? 10 : 13, marginTop: 4 }}>{r.valueLabels[0]}</div>}
    </div>
  );
}

const cellBase = 'px-1.5 py-[3px] whitespace-nowrap';

function TableVisual({ r, fmtOpts, compact }: { r: VisualResult; fmtOpts: VisualFormat; compact: boolean }) {
  const cond = useConditional(r, fmtOpts);
  return (
    <div className="h-full overflow-auto" style={{ fontFamily: FONT }}>
      <table className="w-full border-collapse" style={{ fontSize: compact ? 9 : 12, color: TEXT }}>
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-[#c8c6c4]">
            {r.categoryLabels.map((l, i) => (
              <th key={l} className={`${cellBase} text-left font-semibold`}>
                {l}
                {i === 0 && <span className="ml-1 text-[9px] text-[#605e5c]">▴</span>}
              </th>
            ))}
            {r.valueLabels.map((l) => (
              <th key={l} className={`${cellBase} text-right font-semibold`}>
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {r.rows.map((row, i) => (
            <tr key={i} className="hover:bg-[#f3f2f1]">
              {row.keys.map((k, j) => (
                <td key={j} className={cellBase}>
                  {formatKey(k)}
                </td>
              ))}
              {row.values.map((v, j) => (
                <ValueCell key={j} v={v} fmt={r.formats[j]} cond={cond(j, v)} />
              ))}
            </tr>
          ))}
        </tbody>
        {fmtOpts.totals !== false && (
          <tfoot>
            <tr className="border-t border-[#252423] font-semibold">
              {r.categoryLabels.map((l, i) => (
                <td key={l} className={cellBase}>
                  {i === 0 ? 'Total' : ''}
                </td>
              ))}
              {r.totals.map((v, j) => (
                <td key={j} className={`${cellBase} text-right tabular-nums`}>
                  {formatValue(v, r.formats[j])}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function MatrixVisual({ r, fmtOpts, compact }: { r: VisualResult; fmtOpts: VisualFormat; compact: boolean }) {
  const cond = useConditional(r, fmtOpts);
  if (!r.seriesLabels.length) return <TableVisual r={r} fmtOpts={fmtOpts} compact={compact} />;
  const catKeys: Scalar[][] = [];
  const seen = new Set<string>();
  for (const row of r.rows) {
    const k = JSON.stringify(row.keys);
    if (!seen.has(k)) {
      seen.add(k);
      catKeys.push(row.keys);
    }
  }
  const lookup = new Map(r.rows.map((row) => [JSON.stringify(row.keys) + '#' + JSON.stringify(row.series), row]));
  const multi = r.valueLabels.length > 1;
  const totals = fmtOpts.totals !== false;
  return (
    <div className="h-full overflow-auto" style={{ fontFamily: FONT }}>
      <table className="w-full border-collapse" style={{ fontSize: compact ? 9 : 12, color: TEXT }}>
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-[#c8c6c4]">
            <th className={`${cellBase} text-left font-semibold`}>{r.categoryLabels.join(' ')}</th>
            {r.seriesKeys.map((s) =>
              r.valueLabels.map((l) => (
                <th key={JSON.stringify(s) + l} className={`${cellBase} text-right font-semibold`}>
                  {keyLabel(s)}
                  {multi && <div className="font-normal text-[#605e5c]">{l}</div>}
                </th>
              )),
            )}
            {totals &&
              r.valueLabels.map((l) => (
                <th key={'t' + l} className={`${cellBase} text-right font-semibold`}>
                  Total{multi && <div className="font-normal text-[#605e5c]">{l}</div>}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {catKeys.map((c) => (
            <tr key={JSON.stringify(c)} className="hover:bg-[#f3f2f1]">
              <td className={cellBase}>{keyLabel(c)}</td>
              {r.seriesKeys.map((s) =>
                r.valueLabels.map((_, j) => {
                  const v = lookup.get(JSON.stringify(c) + '#' + JSON.stringify(s))?.values[j] ?? null;
                  return <ValueCell key={JSON.stringify(s) + j} v={v} fmt={r.formats[j]} cond={cond(j, v)} />;
                }),
              )}
              {totals &&
                r.valueLabels.map((_, j) => (
                  <td key={'t' + j} className={`${cellBase} text-right font-semibold tabular-nums`}>
                    {formatValue(r.rowTotals.get(JSON.stringify(c))?.[j] ?? null, r.formats[j])}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr className="border-t border-[#252423] font-semibold">
              <td className={cellBase}>Total</td>
              {r.seriesKeys.map((s) =>
                r.valueLabels.map((_, j) => (
                  <td key={JSON.stringify(s) + j} className={`${cellBase} text-right tabular-nums`}>
                    {formatValue(r.seriesTotals.get(JSON.stringify(s))?.[j] ?? null, r.formats[j])}
                  </td>
                )),
              )}
              {r.totals.map((v, j) => (
                <td key={'t' + j} className={`${cellBase} text-right tabular-nums`}>
                  {formatValue(v, r.formats[j])}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function EChartVisual({
  result,
  type,
  format,
  compact,
  onCategoryClick,
  onCategoryContext,
}: {
  result: VisualResult;
  type: VisualType;
  format: VisualFormat;
  compact: boolean;
  onCategoryClick?: (key: Scalar[]) => void;
  onCategoryContext?: (key: Scalar[], x: number, y: number) => void;
}) {
  const option = useMemo(
    () =>
      type === 'pie' || type === 'donut'
        ? pieOption(result, format, compact, type === 'donut')
        : type === 'waterfall'
          ? waterfallOption(result, format, compact)
          : type === 'funnel'
            ? funnelOption(result, compact)
            : type === 'treemap'
          ? treemapOption(result, compact)
          : cartesianOption(result, type, format, compact),
    [result, type, format, compact],
  );
  const onClickName = onCategoryClick
    ? (name: string) => {
        const row = result.rows.find((x) => keyLabel(x.keys) === name);
        if (row) onCategoryClick(row.keys);
      }
    : undefined;
  const onContextName = onCategoryContext
    ? (name: string, x: number, y: number) => {
        const row = result.rows.find((r) => keyLabel(r.keys) === name);
        if (row) onCategoryContext(row.keys, x, y);
      }
    : undefined;
  return <EChart option={option} onClickName={onClickName} onContextName={onContextName} />;
}

export function Chart({
  result,
  type,
  format,
  compact = false,
  onCategoryClick,
  onCategoryContext,
}: {
  result: VisualResult;
  type: VisualType;
  format?: VisualFormat;
  compact?: boolean;
  /** Called with the category keys of a clicked bar/slice (used for drill-down and cross-filtering). */
  onCategoryClick?: (key: Scalar[]) => void;
  /** Right-click on a bar/slice (used for drillthrough). */
  onCategoryContext?: (key: Scalar[], x: number, y: number) => void;
}) {
  const f = format ?? {};
  if (type === 'card') return <Card r={result} fmtOpts={f} compact={compact} />;
  if (type === 'multiCard') return <MultiCard r={result} compact={compact} />;
  if (type === 'gauge') return <EChart option={gaugeOption(result, compact)} />;
  if (type === 'kpi') return <Kpi r={result} compact={compact} />;
  if (type === 'table') return <TableVisual r={result} fmtOpts={f} compact={compact} />;
  if (type === 'matrix') return <MatrixVisual r={result} fmtOpts={f} compact={compact} />;
  if (!result.rows.length) return <div className="flex h-full items-center justify-center text-xs text-[#605e5c]">No data</div>;
  return <EChartVisual result={result} type={type} format={f} compact={compact} onCategoryClick={onCategoryClick} onCategoryContext={onCategoryContext} />;
}
