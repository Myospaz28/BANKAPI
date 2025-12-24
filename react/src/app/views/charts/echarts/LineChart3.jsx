import ReactEcharts from "echarts-for-react";
import echartOptions from "app/components/charts/echartOptions";
import { generateLastDays } from "@utils";

export default function LineChart3({ height }) {
  const option = {
    ...echartOptions.lineSplitNoAxis,
    grid: { top: 15, left: 15, right: 15, bottom: 0 },

    series: [
      {
        data: [
          40, 80, 20, 90, 30, 80, 40, 90, 20, 80, 30, 45, 50, 110, 90, 145, 120, 135, 120, 140
        ],
        type: "line",
        smooth: true,
        // label: { show: true, color: "#212121" },
        itemStyle: { borderColor: "rgba(102, 51, 153, 1)" },
        lineStyle: { width: 3, color: "rgba(102, 51, 153, 0.8)", ...echartOptions.lineShadow }
      }
    ],
    tooltip: { borderWidth: 0, className: "rounded" },
    xAxis: { type: "category", data: generateLastDays(20) }
  };

  return <ReactEcharts style={{ height }} option={option} />;
}
