import { Line, LineChart, CartesianGrid, Legend, XAxis, YAxis, Tooltip, RechartsThemeProvider, type TooltipContentProps} from 'recharts';
import { graphTheme } from './GraphTheme'

type GraphProps = {
  data: GraphDataPoint[];
  className?: string;
};

export interface GraphDataPoint {
  id: string;
  score: number;
}

function MessageToolTipContent({active, payload, label}: TooltipContentProps){
  if (!active || payload == null || payload.length === 0){
    return null;
  }

  const score = payload[0]?.value;

  return(
    <div style={graphTheme.tooltip?.contentStyle}>
      <p>{label}</p>
      <p><strong>Score: </strong>{typeof score === 'number' ? score.toPrecision(2) : score}</p>
    </div>
  )
}

// const xAxisLabel: LabelProps = { position: 'insideBottomRight', value: 'Month' };
// const yAxisLabel: LabelProps = { value: 'Revenue [AUD]', angle: -90, textAnchor: 'end', position: 'insideTopLeft' };
// const referenceLineLabel: LabelProps = { position: 'insideTopRight', value: 6000 };

// #endregion
export default function Graph({data}: GraphProps) {
  const chartWidth = Math.max(data.length * 60, 600);

  return (
    <RechartsThemeProvider value = {graphTheme}>
      <div className="w-full overflow-x-auto">
        <div style={{ width: `${chartWidth}px` }}>
          <LineChart style={{ width: '100%', aspectRatio: 1.618 }} responsive data={data}>
            <CartesianGrid />
            <Line dataKey="score" strokeWidth={2} />
            <XAxis dataKey="id" />
            <YAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              width="auto"
              label={{ value: 'Score', position: 'insideLeft', angle: -90 }}
            />
            <Legend />
            <Tooltip content={MessageToolTipContent} contentStyle={graphTheme.tooltip?.contentStyle} />
          </LineChart>
        </div>
      </div>
    </RechartsThemeProvider>
  );
}
