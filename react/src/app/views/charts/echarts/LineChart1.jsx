import ReactEcharts from "echarts-for-react";
import echartOptions from "app/components/charts/echartOptions";

export default function LineChart1({ height }) {
  const option = {
    ...echartOptions.lineNoAxis,
    series: [
      {
        ...echartOptions.smoothLine,
        data: [30, 40, 20, 50, 40, 80, 90],
        markArea: { label: { show: true } },
        lineStyle: { color: "#663399" },
        itemStyle: { color: "#663399" },
        areaStyle: { color: "rgba(102, 51, 153, .2)", origin: "start" }
      }
    ]
  };

  return <ReactEcharts style={{ height }} option={option} />;
}
