
// import api from "./../../../services/api.js";
// import { Fragment, useEffect, useState } from "react";
// import { Card, Col, Row, Spinner } from "react-bootstrap";
// import { useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import UserSessionCard from "./UserSessionCard.jsx";

// export default function AppCards() {
//   const navigate = useNavigate();

//   const [wallet, setWallet] = useState(0);
//   const [categories, setCategories] = useState([]);
//   const [loading, setLoading] = useState(true);

//   /* ================= FETCH DATA ================= */

//   useEffect(() => {
//     fetchWallet();
//     fetchCategories();
//   }, []);

//   const fetchWallet = async () => {
//     try {
//       const res = await api.get("api/getLoggedInUserWallet");
//       setWallet(Number(res.data?.data?.wallet_amount || 0));
//     } catch {
//       swal.fire("Error", "Failed to load wallet", "error");
//     }
//   };

//   const fetchCategories = async () => {
//     try {
//       const res = await api.get("api/getUserActiveCategories");
//       setCategories(res.data?.data || []);
//     } catch {
//       swal.fire("Error", "Failed to load categories", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= CATEGORY CARD ================= */

//   const CategoryCard = ({ category }) => {
//     return (
//       <Col md={4}>
//         <Card body className="card-profile-1 text-center mb-4">
//           {/* Avatar */}
//           <div className="avatar box-shadow-2 mb-3 d-flex align-items-center justify-content-center">
//             <div
//               style={{
//                 width: 80,
//                 height: 80,
//                 borderRadius: "50%",
//                 backgroundColor: "#000",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//               }}
//             >
//               <i className="i-Folder text-white" style={{ fontSize: 26 }} />
//             </div>
//           </div>

//           {/* Category Name */}
//           <h5 className="m-0">{category.category_name}</h5>

//           {/* Description */}
//           <p className="mt-2 text-muted">
//             Click to view available services
//           </p>

//           {/* Action */}
//           <button
//             className="btn btn-primary btn-rounded"
//             onClick={() =>
//               navigate(`/services/UserCategoryServices/${category.mas_cat_id}`, {
//                 state: {
//                   categoryName: category.category_name,
//                 },
//               })
//             }
//           >
//             View Services
//           </button>
//         </Card>
//       </Col>
//     );
//   };

//   /* ================= UI ================= */

//   if (loading) {
//     return (
//       <div className="text-center mt-5">
//         <Spinner animation="border" />
//       </div>
//     );
//   }

//   return (
//     <Fragment>
//       {/* ================= WALLET ================= */}
//       {/* <Row className="mb-4">
//         <Col md={12}>
//           <Card className="text-center shadow-sm">
//             <Card.Body>
//               <h5 className="mb-1">💰 Wallet Balance</h5>
//               <h2 className="text-success">
//                 {wallet.toLocaleString("en-IN")} Credits
//               </h2>
//               <small className="text-muted">
//                 Credits will be deducted per verification
//               </small>
//             </Card.Body>
//           </Card>
//         </Col>
//       </Row> */}
//         <Row className="mb-4">
//         <Col md={12}>
//           <Card className="text-center shadow-sm">
//             <Card.Body>
//               <h2 className="text-success">
//                  Available Services
//               </h2>
//             </Card.Body>
//           </Card>
//         </Col>
//       </Row>
//       <UserSessionCard/>

//       {/* ================= CATEGORIES ================= */}
//       <Row>
//         {categories.map((cat) => (
//           <CategoryCard key={cat.mas_cat_id} category={cat} />
//         ))}
//       </Row>
//     </Fragment>
//   );
// }


import api from "./../../../services/api.js";
import { Fragment, useEffect, useState } from "react";
import { Card, Col, Row, Spinner, Badge } from "react-bootstrap";
import { Layers ,ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import UserSessionCard from "./UserSessionCard.jsx";
import { encryptId } from "@utils.js";

export default function AppCards() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [accessDetails, setAccessDetails] = useState(null);
  const [isWithinSession, setIsWithinSession] = useState(true);
  const [disableReason, setDisableReason] = useState("");

  /* ================= TIME HELPERS ================= */

  const timeToSeconds = (time) => {
    const [h = 0, m = 0, s = 0] = time.split(":").map(Number);
    return h * 3600 + m * 60 + s;
  };

  const evaluateAccessWindow = ({ login_time, logout_time, role }) => {
    // ✅ ADMIN → ALWAYS ALLOWED
    if (role === "admin") {
      setIsWithinSession(true);
      setDisableReason("");
      return;
    }

    // No time restriction
    if (!login_time || !logout_time) {
      setIsWithinSession(true);
      return;
    }

    // IST time (local + prod safe)
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    const currentSeconds =
      now.getHours() * 3600 +
      now.getMinutes() * 60 +
      now.getSeconds();

    const loginSeconds = timeToSeconds(login_time);
    const logoutSeconds = timeToSeconds(logout_time);

    let allowed = true;

    // Normal window (09:00 → 18:00)
    if (loginSeconds <= logoutSeconds) {
      if (
        currentSeconds < loginSeconds ||
        currentSeconds > logoutSeconds
      ) {
        allowed = false;
      }
    }
    // Overnight window (22:00 → 06:00)
    else {
      if (
        currentSeconds > logoutSeconds &&
        currentSeconds < loginSeconds
      ) {
        allowed = false;
      }
    }

    setIsWithinSession(allowed);

    if (!allowed) {
      setDisableReason(
        `Services available only between ${login_time} and ${logout_time}`
      );
    }
  };

  /* ================= API CALLS ================= */

  const fetchCategories = async () => {
    try {
      const res = await api.get("api/getUserActiveCategories");
      setCategories(res.data?.data || []);
    } catch {
      swal.fire("Error", "Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessDetails = async () => {
    try {
      const res = await api.get("api/getUserAccessDetailsController");
      const data = res.data?.data;
      console.log("data" ,data)
      setAccessDetails(data);
      evaluateAccessWindow(data);
    } catch {
      // Fail-safe: allow access
      setIsWithinSession(true);
    }
  };

  /* ================= INIT ================= */

  useEffect(() => {
    fetchCategories();
    fetchAccessDetails();
  }, []);

  /* ================= CATEGORY CARD ================= */

  const CategoryCard = ({ category }) => (
    <Col md={4}>
      <Card body className="card-profile-1 text-center mb-4">
        <div className="avatar box-shadow-2 mb-3 d-flex align-items-center justify-content-center">
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              backgroundColor: "#257428",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="i-Folder text-white" style={{ fontSize: 26 }} />
          </div>
        </div>

        <h5 className="m-0">{category.category_name}</h5>

        <p className="mt-2 text-muted">
          Click to view available services
        </p>

        <button
          className="btn btn-primary btn-rounded"
          disabled={!isWithinSession}
          title={!isWithinSession ? disableReason : ""}
          onClick={() =>
            navigate(`/services/UserCategoryServices`, {
              state: {
                categoryName: category.category_name,
                mas_cat_id : category.mas_cat_id
              },
            })
          }
        >
          {isWithinSession ? "View Services" : "Service Unavailable"}
        </button>

        {!isWithinSession && (
          <small className="text-danger d-block mt-2">
            {disableReason}
          </small>
        )}
      </Card>
    </Col>
  );
const CategoryCard2 = ({ category }) => (
  <Col md={4}>
    <Card
      body
      className="mb-4 shadow-sm border-0 border-start border-4 border-primary bg-primary bg-opacity-10"
    >
      {/* Icon */}
      <div className="mb-3">
        <i
          className="i-Folder text-primary"
          style={{ fontSize: 32 }}
        />
      </div>

      {/* Title */}
      <h5 className="fw-semibold text-dark mb-1">
        {category.category_name}
      </h5>

      {/* Subtitle */}
      <p className="text-success small mb-3">
        Click to view available services
      </p>

      {/* Button */}
      <button
        className={`btn ${
          isWithinSession ? "btn-primary" : "btn-outline-primary"
        } btn-sm px-3`}
        disabled={!isWithinSession}
        title={!isWithinSession ? disableReason : ""}
        onClick={() =>
          navigate(`/services/UserCategoryServices`, {
            state: {
              categoryName: category.category_name,
              mas_cat_id: category.mas_cat_id,
            },
          })
        }
      >
        {isWithinSession ? "View Services" : "Service Unavailable"}
      </button>

      {!isWithinSession && (
        <small className="text-danger d-block mt-2">
          {disableReason}
        </small>
      )}
    </Card>
  </Col>
);

  /* ================= UI ================= */

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Fragment>
      {/* HEADER */}
      <Row className="mb-4">
        <Col md={12}>
          <Card className="text-center shadow-sm">
            <Card.Body>
              <h2 className="text-success mb-1">Available Services</h2>

              {accessDetails?.role === "admin" && (
                <Badge bg="success">Admin </Badge>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* <UserSessionCard /> */}

      {/* WARNING BANNER */}
      {/* {!isWithinSession && (
        <Row className="mb-3">
          <Col md={12}>
            <Card className="border-warning text-center">
              <Card.Body className="text-warning fw-bold">
                ⏰ {disableReason}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )} */}

      {/* CATEGORIES */}
      <Row>
        {categories.map((cat) => (
          <CategoryCard key={cat.mas_cat_id} category={cat} />
        ))}
      </Row>
    </Fragment>
  );
}
