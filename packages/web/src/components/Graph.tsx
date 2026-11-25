import { Line, LineChart, CartesianGrid, Legend, XAxis, YAxis, Tooltip, type TooltipContentProps, RechartsThemeProvider} from 'recharts';
import { graphTheme } from './GraphTheme'
import Card from './Card'

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

  return(
    <div></div>
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
              domain={[-1, 1]}
              ticks={[-1, -0.5, 0, 0.5, 1]}
              width="auto"
              label={{ value: 'Score', position: 'insideLeft', angle: -90 }}
            />
            <Legend />
            <Tooltip />
          </LineChart>
        </div>
      </div>
    </RechartsThemeProvider>
  );
}
