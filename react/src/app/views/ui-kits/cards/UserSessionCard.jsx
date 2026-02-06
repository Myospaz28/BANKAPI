// import { useEffect, useState } from "react";
// import { Card, Col, Row, Spinner } from "react-bootstrap";
// import swal from "sweetalert2";
// import api from "./../../../services/api.js";

// export default function UserSessionCard() {
//   const [loading, setLoading] = useState(true);
//   const [sessionTimes, setSessionTimes] = useState({
//     login_time: null,
//     logout_time: null,
//     log_session_time: null,
//   });

//   /* ================= FETCH SESSION TIMES ================= */

//   const fetchSessionTimes = async () => {
//     try {
//       const res = await api.post("api/getUserSessionTimesController");
//       setSessionTimes(res.data?.data || {});
//     } catch {
//       swal.fire("Error", "Failed to load session info", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchSessionTimes();
//   }, []);

//   /* ================= UI ================= */

//   if (loading) {
//     return (
//       <div className="text-center mt-4">
//         <Spinner animation="border" />
//       </div>
//     );
//   }

//   return (
//     <Row className="mb-4">
//       <Col md={12}>
//         <Card className="text-center shadow-sm">
//           <Card.Body>
//             <h5 className="mb-3">🕒 Session Information</h5>

//             <div className="d-flex justify-content-center gap-5 flex-wrap">
//               <div>
//                 <small className="text-muted">Login Time</small>
//                 <h5 className="mb-0">
//                   {sessionTimes.login_time || "--"}
//                 </h5>
//               </div>

//               <div>
//                 <small className="text-muted">Logout Time</small>
//                 <h5 className="mb-0">
//                   {sessionTimes.logout_time || "--"}
//                 </h5>
//               </div>

//               {/* {sessionTimes.log_session_time && (
//                 <div>
//                   <small className="text-muted">Session Duration</small>
//                   <h5 className="mb-0">
//                     {sessionTimes.log_session_time}
//                   </h5>
//                 </div>
//               )} */}
//             </div>

//             {!sessionTimes.logout_time && (
//               <small className="text-success d-block mt-3">
//                 ● Currently Logged In
//               </small>
//             )}
//           </Card.Body>
//         </Card>
//       </Col>
//     </Row>
//   );
// }
import { useEffect, useState } from "react";
import { Card, Spinner } from "react-bootstrap";
import api from "./../../../services/api.js";

export default function UserSessionCard({ compact = false }) {
  const [loading, setLoading] = useState(true);
  const [sessionTimes, setSessionTimes] = useState({
    login_time: null,
    logout_time: null,
  });

  /* ================= FETCH SESSION TIMES ================= */

  const fetchSessionTimes = async () => {
    try {
      const res = await api.post("api/getUserSessionTimesController");
      setSessionTimes(res.data?.data || {});
    } catch {
      // silent fail (important for header)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionTimes();
  }, []);

  /* ================= COMPACT (HEADER) VIEW ================= */

  if (compact) {
    if (loading) {
      return (
        <span className="text-muted small">Loading...</span>
      );
    }

    return (
      <div className="d-flex flex-column text-end small lh-sm">
        <span className="text-muted">
          Login:{" "}
          <strong>
            {sessionTimes.login_time || "--"}
          </strong>
        </span>

        <span className="text-muted">
          Logout:{" "}
          <strong>
            {sessionTimes.logout_time || "--"}
          </strong>
        </span>

        {!sessionTimes.logout_time && (
          <span className="text-success fw-bold">
            ● Online
          </span>
        )}
      </div>
    );
  }

  /* ================= FULL (DASHBOARD) VIEW ================= */

  if (loading) {
    return (
      <div className="text-center mt-4">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Card className="text-center shadow-sm mb-4">
      <Card.Body>
        <h5 className="mb-3">🕒 Session Information</h5>

        <div className="d-flex justify-content-center gap-5 flex-wrap">
          <div>
            <small className="text-muted">Login Time</small>
            <h5 className="mb-0">
              {sessionTimes.login_time || "--"}
            </h5>
          </div>

          <div>
            <small className="text-muted">Logout Time</small>
            <h5 className="mb-0">
              {sessionTimes.logout_time || "--"}
            </h5>
          </div>
        </div>

        {!sessionTimes.logout_time && (
          <small className="text-success d-block mt-3">
            ● Currently Logged In
          </small>
        )}
      </Card.Body>
    </Card>
  );
}
