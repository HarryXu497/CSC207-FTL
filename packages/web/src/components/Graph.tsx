import { Line, LineChart, CartesianGrid, Legend, XAxis, YAxis, Tooltip, type TooltipContentProps, RechartsThemeProvider} from 'recharts';
import { graphTheme } from './GraphTheme'
// #region Sample data
const data = [
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page B',
    uv: 300,
    pv: 4567,
    amt: 2400,
  },
  {
    name: 'Page C',
    uv: 320,
    pv: 1398,
    amt: 2400,
  },
  {
    name: 'Page D',
    uv: 200,
    pv: 9800,
    amt: 2400,
  },
  {
    name: 'Page E',
    uv: 278,
    pv: 3908,
    amt: 2400,
  },
  {
    name: 'Page F',
    uv: 189,
    pv: 4800,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
];

function MessageToolTipContent({active, payload, label}: TooltipContentProps){
  if (!active || payload == null || payload.length === 0){
    return null;
  }

  return(
    <div></div>
  )
}

// const xAxisLabel: LabelProps = { position: 'insideBottomRight', value: 'Month' };
// const yAxisLabel: LabelProps = { value: 'Revenue [AUD]', angle: -90, textAnchor: 'end', position: 'insideTopLeft' };
// const referenceLineLabel: LabelProps = { position: 'insideTopRight', value: 6000 };

// #endregion
export default function Graph() {
  const chartWidth = Math.max(data.length * 60, 600);

  return (
    <RechartsThemeProvider value = {graphTheme}>
      <div className="w-full overflow-x-auto">
        <div style={{ width: `${chartWidth}px` }}>
          <LineChart style={{ width: '100%', aspectRatio: 1.618 }} responsive data={data}>
            <CartesianGrid />
            <Line dataKey="uv" strokeWidth={2} />
            <XAxis dataKey="name" />
            <YAxis width="auto" label={{ value: 'UV', position: 'insideLeft', angle: -90 }} />
            <Legend />
            <Tooltip />
          </LineChart>
        </div>
      </div>
    </RechartsThemeProvider>
  );
}
