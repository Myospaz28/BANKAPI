// import React from "react";
// import { Table } from "react-bootstrap";

// export default function JsonTableViewer({ data }) {
//   const renderValue = (value) => {
//     if (value === null || value === undefined) return "-";

//     if (typeof value !== "object") {
//       return <span style={{ whiteSpace: "pre-wrap" }}>{String(value)}</span>;
//     }

//     if (Array.isArray(value)) {
//       return (
//         <Table bordered size="sm" className="mb-2">
//           <tbody>
//             {value.map((item, index) => (
//               <tr key={index}>
//                 <th style={{ width: "30%" }}>#{index + 1}</th>
//                 <td>{renderValue(item)}</td>
//               </tr>
//             ))}
//           </tbody>
//         </Table>
//       );
//     }

//     return (
//       <Table bordered size="sm" className="mb-2">
//         <tbody>
//           {Object.entries(value).map(([key, val]) => (
//             <tr key={key}>
//               <th style={{ width: "30%" }}>
//                 {key.replaceAll("_", " ").toUpperCase()}
//               </th>
//               <td>{renderValue(val)}</td>
//             </tr>
//           ))}
//         </tbody>
//       </Table>
//     );
//   };

//   return (
//     <div style={{ maxHeight: 400, overflow: "auto" }}>
//       {data ? renderValue(data) : "No Data"}
//     </div>
//   );
// }
import React from "react";
import { Table } from "react-bootstrap";

export default function JsonTableViewer({ data }) {

  const renderValue = (value, keyName = "") => {

    if (value === null || value === undefined) return "-";

    // ⭐ Primitive values
    if (typeof value !== "object") {

      const stringValue = String(value);

      // ✅ ONLY FOR PHOTO BASE64 (HARDCODED CONDITION)
      if (keyName === "photo_base64" && stringValue.length > 150) {
        return (
          <div style={{ maxWidth: 300 }}>
            <span style={{ wordBreak: "break-all" }}>
              {stringValue.slice(0, 150)}...
            </span>

            <div>
              <button
                className="btn btn-sm btn-outline-primary mt-1"
                onClick={() => window.alert(stringValue)}
              >
                View More
              </button>
            </div>
          </div>
        );
      }

      return (
        <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {stringValue}
        </span>
      );
    }

    // ⭐ Array handling
    if (Array.isArray(value)) {
      return (
        <Table
          bordered
          size="sm"
          className="mb-2"
          style={{ tableLayout: "fixed", width: "100%" }}
        >
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

    // ⭐ Object handling
    return (
      <Table
        bordered
        size="sm"
        className="mb-2"
        style={{ tableLayout: "fixed", width: "100%" }}
      >
        <tbody>
          {Object.entries(value).map(([key, val]) => (
            <tr key={key}>
              <th style={{ width: "30%" }}>
                {key.replaceAll("_", " ").toUpperCase()}
              </th>
              <td>{renderValue(val, key)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <div
      style={{
        maxHeight: 400,
        overflow: "auto",
        wordBreak: "break-word",
      }}
    >
      {data ? renderValue(data) : "No Data"}
    </div>
  );
}