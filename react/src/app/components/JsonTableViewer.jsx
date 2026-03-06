import React from "react";
import { Table } from "react-bootstrap";

export default function JsonTableViewer({ data }) {
  const renderValue = (value) => {
    if (value === null || value === undefined) return "-";

    if (typeof value !== "object") {
      return <span style={{ whiteSpace: "pre-wrap" }}>{String(value)}</span>;
    }

    if (Array.isArray(value)) {
      return (
        <Table bordered size="sm" className="mb-2">
          <tbody>
            {value.map((item, index) => (
              <tr key={index}>
                <th style={{ width: "30%" }}>#{index + 1}</th>
                <td>{renderValue(item)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      );
    }

    return (
      <Table bordered size="sm" className="mb-2">
        <tbody>
          {Object.entries(value).map(([key, val]) => (
            <tr key={key}>
              <th style={{ width: "30%" }}>
                {key.replaceAll("_", " ").toUpperCase()}
              </th>
              <td>{renderValue(val)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <div style={{ maxHeight: 400, overflow: "auto" }}>
      {data ? renderValue(data) : "No Data"}
    </div>
  );
}
