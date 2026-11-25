import type { RechartsTheme } from 'recharts';

/*
 * A theme is a plain object. There is no `createTheme` helper and none is needed:
 * you can build it inline, import it from a shared module, or parse it from JSON.
 */
export const graphTheme: RechartsTheme = {
  typography: {
    color: '#2e2e2e',
    fontSize: 13,
  },
  graphicalItems: [
    {
      stroke: '#f96c49',
      strokeWidth: 3,
      active: { fill: '#ffffff', stroke: '#f96c49', strokeWidth: 3 },
    },
    {
      stroke: '#53a3f1',
      strokeWidth: 3,
      strokeDasharray: '6 3',
      active: { fill: '#ffffff', stroke: '#53a3f1', strokeWidth: 3 },
    },
  ],
  grid: {
    stroke: '#cdd2e0',
    strokeDasharray: '1 4',
    fill: 'none',
  },
  axis: {
    stroke: '#2e2e2e',
    strokeWidth: 1,
  },
  reference: {
    stroke: '#be123c',
    strokeWidth: 2,
    strokeDasharray: '4 4',
  },
  cursor: {
    stroke: '#2e2e2e',
    strokeWidth: 1,
    strokeDasharray: '3 3',
    fill: '#4338ca',
    fillOpacity: 0.08,
  },
  tooltip: {
    contentStyle: {
      margin: 0,
      padding: 12,
      backgroundColor: '#fff8f0',
      border: '2px solid #cdd2e0',
      borderRadius: 2,
    },
    labelStyle: { margin: 0, fontWeight: 'bold', color: '#1e1b4b' },
    itemStyle: { display: 'block', paddingTop: 2, paddingBottom: 2 },
  },
  legend: {
    wrapperStyle: { paddingTop: 8 },
    labelStyle: { letterSpacing: '0.05em', textTransform: 'uppercase' },
  },
  pageBackground: '#ffffff',
  chart: {
    width: '100%',
    maxHeight: '70vh',
    aspectRatio: 1.618,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
};