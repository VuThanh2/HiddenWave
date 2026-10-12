import type { Config, Data, Layout } from 'plotly.js'
import Plotly from 'plotly.js-cartesian-dist-min'
import createPlotlyComponent, { type PlotParams } from 'react-plotly.js/factory'

// Bundle cartesian (scatter, bar, heatmap…) thay cho plotly.js full để giảm kích thước build.
const BasePlot = createPlotlyComponent(Plotly)

type Props = Omit<PlotParams, 'data' | 'layout' | 'config'> & {
  data: Data[]
  layout?: Partial<Layout>
  config?: Partial<Config>
}

export function Plot(props: Props) {
  return <BasePlot {...props} />
}
