import ReactEcharts from "echarts-for-react";
import echartOptions from "app/components/charts/echartOptions";

export default function LineChart2({ height }) {
  const option = {
    ...echartOptions.lineNoAxis,
    series: [
      {
        ...echartOptions.smoothLine,
        data: [30, 10, 40, 10, 40, 20, 90],
        markArea: { label: { show: true } },
        areaStyle: { color: "rgba(255, 193, 7, 0.2)", origin: "start" },
        lineStyle: { color: "#FFC107" },
        itemStyle: { color: "#FFC107" }
      }
    ]
  };

  return <ReactEcharts style={{ height }} option={option} />;
}
