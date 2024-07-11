import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { useQuery } from 'react-query';

// Material-UI components
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Typography from '@material-ui/core/Typography';

// Components
import Instances, { InstanceContext } from './instances';
import Nothing from './nothing';
import Pane from 'react-split-pane/lib/Pane';
import SplitPane from 'react-split-pane';
import Toolbar from './toolbar';

const SCROLL_BAR_STYLE = {
  overflowX: 'hidden',
  overflowY: 'scroll',
  scrollbarWidth: 'thin',
  '&::-webkit-scrollbar': {
    width: '8px',
    backgroundColor: '#303030',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#383838',
  },
};

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  main: {
    height: `calc(100% - ${theme.TOOLBAR_HEIGHT}px)`,
  },
  instanceListPane: {
    height: '100%',
    backgroundColor: '#282828',
    padding: theme.spacing(1),
    ...SCROLL_BAR_STYLE,
  },
  metricListPane: {
    height: '100%',
    backgroundColor: '#252525',
    padding: theme.spacing(1),
    ...SCROLL_BAR_STYLE,
  },
  metricChartPane: {
    height: '100%',
    backgroundColor: '#202020',
    padding: theme.spacing(1),
    ...SCROLL_BAR_STYLE,
  },
  listItem: {
    width: '100%',
  },
  listIcon: {
    minWidth: 36,
  },
  sparkline: {
    width: '100%',
  },
  pointNumber: {
    position: 'relative',
    top: '-38px',
    height: 0,
    ...theme.typography.h6,
    pointerEvents: 'none',
  },
  chart: {
    width: '100%',
  },
  chartRow: {
    backgroundColor: '#1c1c1c',
  },
  chartRowTitle: {
    color: theme.palette.text.secondary,
  },
  chartRowNumber: {
    width: '100px',
  },
  chartRowSparkline: {
    width: '50%',
  },
  chartNumber: {
    fontSize: 1,
  },
  summary: {
    width: '100%',
  },
  summaryHeader: {
    display: 'flex',
    flexDirection: 'row',
  },
  summaryTitle: {
    flexGrow: 1,
    color: theme.palette.text.secondary,
    ...theme.typography.h6,
  },
  summaryNumber: {
    flexGrow: 0,
    ...theme.typography.h6,
  },
}));

// Global state
const splitPos = [
  ['600px', 100],
  [1, 1],
];

function makePath(values) {
  if (!values) return '';
  const line = [];
  for (let i = 1; i <= 60; i++) {
    const x = 60 - i;
    const y = -(values[values.length - i] || 0);
    line.push(i > 1 ? `L ${x},${y}` : `M ${x},${y}`);
  }
  return line.join(' ');
}

function formatNumber(n) {
  if (Math.floor(n) === n) {
    return n.toString();
  } else {
    return n.toFixed(2);
  }
}

function computeDelta(values) {
  let v0 = values[0];
  for (let i = 0, n = values.length; i < n; i++) {
    const v = values[i];
    const d = v < v0 ? v : v - v0;
    values[i] = d;
    v0 = v;
  }
  if (values.length > 1) values[0] = values[1];
}

function computeRate(values) {
  const factor = 1 / 5;
  computeDelta(values);
  for (let i = 0, n = values.length; i < n; i++) {
    values[i] = values[i] * factor;
  }
}

function computeAverage(sums, counts) {
  const n = sums.length;
  const a = new Array(n);
  for (let i = 0; i < n; i++) {
    a[i] = sums[i] / counts[i];
  }
  return a;
}

function computeCumulative(values) {
  const w = values[0].length;
  const h = values.length;
  for (let i = 0; i < h; i++) computeDelta(values[i]);
  for (let t = 0; t < w; t++) {
    for (let i = 1, n = h - 2; i < n; i++) {
      values[i][t] += values[i-1][t];
    }
  }
}

function computePercentile(values, buckets, target) {
  const w = values[0].length;
  const h = values.length - 2;
  const v = new Array(w);
  for (let t = 0; t < w; t++) {
    const sum = values[h][t];
    const cnt = sum * target;
    for (let i = 0; i < h; i++) {
      const n = values[i][t];
      if (n >= cnt) {
        const diff = n - cnt;
        const limit = buckets[i];
        const base = buckets[i-1] || 0;
        v[t] = limit - (limit - base) * diff / n;
        break;
      }
    }
  }
  return v;
}

function Metrics({ root }) {
  const classes = useStyles();
  const instanceContext = React.useContext(InstanceContext);
  const instance = instanceContext.currentInstance;
  const status = instance?.status;
  const uuid = status?.uuid || '';

  const [currentMetric, setCurrentMetric] = React.useState('');
  const [cursorX, setCursorX] = React.useState(-1);

  const queryMetricList = useQuery(
    `metrics:${root}:${uuid}`,
    async () => {
      if (instance?.id) {
        const res = await fetch(`/api/v1/metrics/${uuid}/`);
        if (res.status === 200) {
          const data = await res.json();
          return data.metrics;
        }
      } else {
        const res = await fetch(`/api/v1/metrics/`);
        if (res.status === 200) {
          const data = await res.json();
          return data.metrics;
        }
      }
      return null;
    },
    {
      cacheTime: 0,
      refetchInterval: 1000,
    }
  );

  const metricList = React.useMemo(
    () => {
      const metricList = queryMetricList.data instanceof Array ? queryMetricList.data : [];
      metricList.forEach(
        metric => {
          if (metric.t === 'Counter') {
            computeRate(metric.v);
          } else if (metric.t.startsWith('Histogram[')) {
            const buckets = JSON.parse(metric.t.substring(9)).map(
              v => {
                switch (v) {
                  case 'NaN': return NaN;
                  case 'Inf': return Infinity;
                  case '-Inf': return -Infinity;
                  default: return v;
                }
              }
            );
            computeCumulative(metric.v);
            metric.v = computePercentile(metric.v, buckets, 0.9);
          }
        }
      );
      return metricList;
    },
    [queryMetricList.data]
  );

  const handleCursorMove = (x) => {
    setCursorX(x);
  }

  return (
    <div className={classes.root}>

      {/* Toolbar */}
      <Toolbar/>

      {/* Main View */}
      <div className={classes.main}>
        <SplitPane split="vertical" onChange={pos => splitPos[0] = pos}>

          <SplitPane initialSize={splitPos[0][0]} onChange={pos => splitPos[1] = pos}>

            {/* Instance List */}
            <Pane initialSize={splitPos[1][0]} className={classes.instanceListPane}>
              <Instances root={root}/>
            </Pane>

            {/* Metric List */}
            <Pane initialSize={splitPos[1][1]} className={classes.metricListPane}>
              {instance === null || metricList.length === 0 ? (
                <Nothing text="No metrics"/>
              ) : (
                <List dense disablePadding>
                  {metricList.map(({ k: name, v: values }) => (
                    <ListItem
                      key={name}
                      selected={currentMetric === name}
                      disableGutters
                      button
                      onClick={() => setCurrentMetric(name)}
                    >
                      <div className={classes.listItem}>
                        <MetricItem
                          title={name}
                          values={values}
                          cursorX={cursorX}
                          onCursorMove={handleCursorMove}
                        />
                      </div>
                    </ListItem>
                  ))}
                </List>
              )}
            </Pane>

          </SplitPane>

          {/* Metric Chart */}
          <Pane initialSize={splitPos[0][1]} className={classes.metricChartPane}>
            {currentMetric ? (
              <Chart path={root} uuid={instance?.id ? uuid : ''} title={currentMetric}/>
            ) : (
              <Nothing text="No metric selected"/>
            )}
          </Pane>

        </SplitPane>
      </div>
    </div>
  );
}

function MetricItem({ title, values, cursorX, onCursorMove }) {
  const classes = useStyles();

  const { min, max } = React.useMemo(
    () => {
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;

      values.forEach(
        v => {
          const y = -(v || 0);
          if (y < min) min = y;
          if (y > max) max = y;
        }
      );

      if (max < 0) max = 0;
      if (max - min < 10) min = max - 10;

      return { min, max };
    },
    [values]
  );

  const i = 60 - cursorX;
  const n = values.length;
  const y = cursorX < 0 ? values[n-1] : (values[n-i] || 0);

  return (
    <div>
      <Typography color="textSecondary">{title}</Typography>
      <Sparkline
        values={values}
        min={min}
        max={max}
        height={50}
        color="#0c0"
        cursorX={cursorX}
        onCursorMove={onCursorMove}
      />
      <div className={classes.pointNumber}>
        {formatNumber(y || 0)}
      </div>
    </div>
  );
}

function Chart({ path, uuid, title }) {
  const classes = useStyles();
  const [cursorX, setCursorX] = React.useState(-1);

  const queryMetric = useQuery(
    `metrics:${path}:${uuid}:${title}`,
    async () => {
      if (uuid) {
        const res = await fetch(`/api/v1/metrics/${uuid}/${title}`);
        if (res.status === 200) {
          const data = await res.json();
          return data.metrics;
        }
      } else {
        const res = await fetch(`/api/v1/metrics/${title}`);
        if (res.status === 200) {
          const data = await res.json();
          return data.metrics;
        }
      }
      return null;
    },
    {
      refetchInterval: 1000,
    }
  );

  const { sum, list, min, max } = React.useMemo(
    () => {
      const root = queryMetric.data?.[0];
      const list = [];

      let sum = null;
      let avg = null;
      let p95 = null;
      let p99 = null;
      let type = root?.t;
      let buckets = null;

      if (type && type.startsWith('Histogram[')) {
        type = 'Histogram';
        buckets = JSON.parse(root.t.substring(type.length));
      }

      const traverse = (k, m) => {
        let values = m.v;
        switch (type) {
          case 'Counter':
            computeRate(values);
            break;
          case 'Histogram':
            computeCumulative(values);
            if (!sum) {
              const n = values.length;
              avg = computeAverage(values[n-1], values[n-2]);
              p95 = computePercentile(values, buckets, 0.95);
              p99 = computePercentile(values, buckets, 0.99);
            }
            values = computePercentile(values, buckets, 0.9);
            break;
          default: break;
        }
        if (!sum) sum = { key: k, values, avg, p95, p99 };
        if (m.s instanceof Array) {
          if (k.length > 0) k += '/';
          m.s.forEach(
            m => traverse(k + m.k, m)
          );
        } else {
          list.push({ key: k, values });
        }
      }

      if (root) {
        traverse('', root);
      }

      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;

      list.forEach(
        ({values}) => (
          values.forEach(
            v => {
              const y = -(v || 0);
              if (y < min) min = y;
              if (y > max) max = y;
            }
          )
        )
      );

      if (max < 0) max = 0;
      if (max - min < 10) min = max - 10;

      return { sum, list, min, max };
    },
    [queryMetric.data]
  );

  const handleCursorMove = (x) => {
    setCursorX(x);
  }

  return (
    <div>
      <ChartSummary
        title={title}
        metric={sum}
        cursorX={cursorX}
        onCursorMove={handleCursorMove}
      />
      <table className={classes.chart}>
        {list.map(
          ({ key, values }) => (
            <ChartRow
              title={key}
              values={values}
              min={min}
              max={max}
              cursorX={cursorX}
              onCursorMove={handleCursorMove}
            />
          )
        )}
      </table>
    </div>
  );
}

function ChartSummary({ title, metric, cursorX, onCursorMove }) {
  const classes = useStyles();
  const canvasEl = React.useRef(null);

  const { sum, min, max, edge, area, avg, p95, p99 } = React.useMemo(
    () => {
      const sum = metric ? metric.values : [];

      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;

      const visit = v => {
        const y = -v;
        if (y < min) min = y;
        if (y > max) max = y;
      }

      sum.forEach(visit);
      metric?.avg?.forEach?.(visit);
      metric?.p95?.forEach?.(visit);
      metric?.p99?.forEach?.(visit);

      if (max < 0) max = 0;
      if (max - min < 10) min = max - 10;

      const margin = (max - min) * 0.1;
      min -= margin;
      max += margin;

      const edge = makePath(sum);
      const area = edge + `L 0,${max-margin} L 59,${max-margin} z`;
      const avg = makePath(metric?.avg);
      const p95 = makePath(metric?.p95);
      const p99 = makePath(metric?.p99);

      return { sum, min, max, edge, area, avg, p95, p99 };
    },
    [metric]
  );

  const handleMouseMove = e => {
    const rect = canvasEl.current.getBoundingClientRect();
    const d = rect.x + rect.width - e.pageX;
    const i = Math.max(0, Math.min(59, (d * 59 / rect.width) | 0));
    const x = 59 - i;
    onCursorMove(x);
  }

  const x = cursorX;
  const i = 59 - x;
  const n = sum.length;
  const v = sum[cursorX < 0 ? n-1 : n-1-i] || 0;
  const y = -v;
  const k = 15 / (max - min);

  return (
    <React.Fragment>
      <div className={classes.summaryHeader}>
        <div className={classes.summaryTitle}>{title}</div>
        <div className={classes.summaryNumber}>{formatNumber(v || 0)}</div>
      </div>
      <svg
        ref={canvasEl}
        viewBox="0 0 60 15"
        className={classes.summary}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onCursorMove(-1)}
      >
        <ChartGrid min={min} max={max} scale={k}/>
        <g transform={`scale(1 ${k}) translate(0 ${-min})`}>
          <path
            d={area}
            fill="green"
            fillOpacity="15%"
            stroke="none"
          />
          <path
            d={avg}
            vectorEffect="non-scaling-stroke"
            fill="none"
            stroke="#0f0"
            strokeOpacity="50%"
            strokeWidth="1"
            strokeDasharray="2 2"
            strokeLinejoin="round"
          />
          <path
            d={p99}
            vectorEffect="non-scaling-stroke"
            fill="none"
            stroke="#08f"
            strokeOpacity="50%"
            strokeWidth="1"
            strokeDasharray="1 1"
            strokeLinejoin="round"
          />
          <path
            d={p95}
            vectorEffect="non-scaling-stroke"
            fill="none"
            stroke="#f80"
            strokeOpacity="50%"
            strokeWidth="1"
            strokeDasharray="1 1"
            strokeLinejoin="round"
          />
          <path
            d={edge}
            vectorEffect="non-scaling-stroke"
            fill="none"
            stroke="#0f0"
            strokeOpacity="50%"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <line
            x1={x}
            x2={x}
            y1={min}
            y2={max}
            vectorEffect="non-scaling-stroke"
            stroke={cursorX >= 0 ? '#0c0' : 'none'}
            strokeWidth="1"
            strokeDasharray="3 2"
            strokeLinejoin="round"
          />
          <line
            vectorEffect="non-scaling-stroke"
            x1={x}
            y1={y}
            x2={x}
            y2={y}
            stroke={cursorX >= 0 ? 'white' : 'none'}
            strokeWidth="8"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </React.Fragment>
  );
}

function ChartGrid({ min, max, scale }) {
  const classes = useStyles();

  const { lines, step } = React.useMemo(
    () => {
      const negRange = Math.abs(min);
      const posRange = Math.abs(max);
      const range = Math.max(negRange, posRange);
      const power = Math.floor(Math.log10(range));
      const step = Math.pow(10, Math.max(1, power));
      const negSteps = Math.ceil(negRange / step);
      const posSteps = Math.ceil(posRange / step);

      const lines = new Array(negSteps + posSteps).fill(0).map(
        (_, i) => (i - negSteps)
      );

      return { lines, step };
    },
    [min, max]
  );

  return (
    <React.Fragment>
      {lines.map(
        i => {
          const v = (i * step);
          const y = (v - min) * scale;
          return (
            <React.Fragment>
              <line
                vectorEffect="non-scaling-stroke"
                x1={0}
                x2={60}
                y1={y}
                y2={y}
                stroke={i === 0 ? '#555' : '#333'}
                strokeWidth="1"
              />
              {(lines.length <= 5 || i%2 === 0) && (
                <text
                  y={y}
                  stroke="none"
                  fill="#555"
                  class={classes.chartNumber}
                >
                  {-v}
                </text>
              )}
            </React.Fragment>
          );
        }
      )}
      {new Array(20).fill(0).map(
        (_, i) => (
          <line
            vectorEffect="non-scaling-stroke"
            x1={(20-i)*3-1}
            x2={(20-i)*3-1}
            y1={0}
            y2={60}
            stroke={i % 4 === 0 ? '#555' : '#333'}
            strokeDasharray={i % 4 === 0 ? 'none' : '1 1'}
            strokeWidth="1"
          />
        )
      )}
      {new Array(5).fill(0).map(
        (_, i) => (
          <text
            textAnchor="end"
            x={(5-i)*12-2}
            y={15}
            stroke="none"
            fill="#555"
            class={classes.chartNumber}
          >
            {(-i).toString() + 'm'}
          </text>
        )
      )}
    </React.Fragment>
  );
}

function ChartRow({ title, values, min, max, cursorX, onCursorMove }) {
  const classes = useStyles();
  const i = 60 - cursorX;
  const n = values.length;
  const y = cursorX < 0 ? values[n-1] : (values[n-i] || 0);
  return (
    <tr className={classes.chartRow}>
      <td className={classes.chartRowTitle}>
        <Typography>{title}</Typography>
      </td>
      <td className={classes.chartRowNumber}>
        <Typography>{formatNumber(y || 0)}</Typography>
      </td>
      <td className={classes.chartRowSparkline}>
        <Sparkline
          values={values}
          min={min}
          max={max}
          height={26}
          color="#ccc"
          cursorX={cursorX}
          onCursorMove={onCursorMove}
        />
      </td>
    </tr>
  );
}

function Sparkline({ values, min, max, height, color, cursorX, onCursorMove }) {
  const classes = useStyles();
  const canvasEl = React.useRef(null);

  const margin = (max - min) * 0.1;
  min -= margin;
  max += margin;

  const { edge, area } = React.useMemo(
    () => {
      const edge = makePath(values);
      const area = edge + `L 0,${max-margin} L 59,${max-margin} z`;
      return { edge, area };
    },
    [values, max, margin]
  );

  const handleMouseMove = e => {
    const rect = canvasEl.current.getBoundingClientRect();
    const d = rect.x + rect.width - e.pageX;
    const i = Math.max(0, Math.min(59, (d * 59 / rect.width) | 0));
    const x = 59 - i;
    onCursorMove(x);
  }

  const x = cursorX;
  const i = 59 - x;
  const n = values.length;
  const v = values[n - 1 - i] || 0;
  const y = -v;

  return (
    <svg
      ref={canvasEl}
      viewBox={`0 ${min} 60 ${max - min}`}
      preserveAspectRatio="none"
      className={classes.sparkline}
      style={{ height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onCursorMove(-1)}
    >
      <path
        d={area}
        fill={color}
        fillOpacity="15%"
        stroke="none"
      />
      <path
        d={edge}
        vectorEffect="non-scaling-stroke"
        fill="none"
        stroke={color}
        strokeOpacity="80%"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <line
        x1={x}
        x2={x}
        y1={min}
        y2={max}
        vectorEffect="non-scaling-stroke"
        stroke={cursorX >= 0 ? color : 'none'}
        strokeWidth="1"
        strokeDasharray="1 1"
        strokeLinejoin="round"
      />
      <line
        vectorEffect="non-scaling-stroke"
        x1={x}
        y1={y}
        x2={x}
        y2={y}
        stroke={cursorX >= 0 ? 'white' : 'none'}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default Metrics;
