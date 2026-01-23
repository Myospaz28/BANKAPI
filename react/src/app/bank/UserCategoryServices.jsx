// import React, { useEffect, useState } from "react";
// import { Row, Col, Card, Button, ListGroup, Spinner } from "react-bootstrap";
// import { useNavigate, useParams } from "react-router-dom";
// import swal from "sweetalert2";

// import api from "./../services/api.js";

// export default function UserCategoryServices() {
//   const navigate = useNavigate();
//   const { mas_cat_id } = useParams();

//   const [wallet, setWallet] = useState(null);
//   const [category, setCategory] = useState(null);
//   const [services, setServices] = useState([]);
//   const [loading, setLoading] = useState(true);

//   /* ================= FETCH DATA ================= */

//   useEffect(() => {
//     if (mas_cat_id) {
//       fetchWallet();
//       fetchServices();
//     }
//   }, [mas_cat_id]);

//   const fetchWallet = async () => {
//     try {
//       const res = await api.get("api/getLoggedInUserWallet");
//       setWallet(Number(res.data?.data?.wallet_amount || 0));
//     } catch (err) {
//       console.error("❌ Wallet fetch failed", err);
//     }
//   };

//   const fetchServices = async () => {
//     try {
//       const res = await api.get(
//         `api/getUserActiveServicesByCategory/${mas_cat_id}`
//       );

//       setCategory(res.data?.data?.category || null);
//       setServices(res.data?.data?.services || []);
//     } catch (err) {
//       console.error("❌ Services fetch failed", err);
//       swal.fire("Error", "Failed to load services", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= NAVIGATE ================= */

//   const handleUseService = (usr_ser_id) => {
//     navigate(
//       `/services/use/${mas_cat_id}/${usr_ser_id}`
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
//     <Row>
//       <Col md={12}>
//         {/* ================= HEADER ================= */}
//         <Card body className="mb-4">
//           <Button
//             variant="primary"
//             className="mb-3"
//             onClick={() => navigate(-1)}
//           >
//             ← Back
//           </Button>

//           <h4 className="mb-1">
//             {category?.category_name || "Services"}
//           </h4>

//           <p className="text-muted mb-0">
//             Choose a service to continue
//           </p>
//         </Card>

//         {/* ================= WALLET ================= */}
//         <Card body className="mb-4 text-center">
//           <h6 className="text-muted mb-1">💰 Wallet Balance</h6>
//           <h2 className="text-success">
//             {wallet !== null ? wallet : 0} Credits
//           </h2>
//         </Card>

//         {/* ================= SERVICES LIST ================= */}
//         <Card body>
//           <Card.Title>Available Services</Card.Title>

//           {services.length === 0 ? (
//             <p className="text-muted text-center mt-3">
//               No active services available
//             </p>
//           ) : (
//             <ListGroup variant="flush">
//               {services.map((service) => {
//                 const hasCredits = wallet >= service.actual_credits;

//                 return (
//                   <ListGroup.Item
//                     key={service.usr_ser_id}
//                     className="d-flex justify-content-between align-items-center"
//                   >
//                     <div>
//                       <h6 className="mb-1">
//                         {service.service_name}
//                       </h6>
//                       <small className="text-muted">
//                         Credits Required:{" "}
//                         <b>{service.actual_credits}</b>
//                       </small>
//                     </div>

//                     <Button
//                       variant={hasCredits ? "success" : "secondary"}
//                       disabled={!hasCredits}
//                       onClick={() =>
//                         handleUseService(service.usr_ser_id)
//                       }
//                     >
//                       {hasCredits ? "Use Service" : "Insufficient Credits"}
//                     </Button>
//                   </ListGroup.Item>
//                 );
//               })}
//             </ListGroup>
//           )}
//         </Card>
//       </Col>
//     </Row>
//   );
// }
import React, { useEffect, useState } from "react";
import { Row, Col, Card, Button, ListGroup, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import swal from "sweetalert2";
import api from "./../services/api.js";

export default function UserCategoryServices() {
  const navigate = useNavigate();
  const { mas_cat_id } = useParams();

  const [wallet, setWallet] = useState(0);
  const [category, setCategory] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    if (mas_cat_id) {
      fetchWallet();
      fetchServices();
    }
  }, [mas_cat_id]);

  const fetchWallet = async () => {
    try {
      const res = await api.get("api/getLoggedInUserWallet");
      setWallet(Number(res.data?.data?.wallet_amount || 0));
    } catch (err) {
      console.error("❌ Wallet fetch failed", err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await api.get(
        `api/getUserActiveServicesByCategory/${mas_cat_id}`
      );

      setCategory(res.data?.data?.category || null);
      setServices(res.data?.data?.services || []);
    } catch (err) {
      console.error("❌ Services fetch failed", err);
      swal.fire("Error", "Failed to load services", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= NAVIGATION ================= */

const handleUseService = (service) => {
  if (!service.route_path) {
    swal.fire(
      "Coming Soon",
      "This service is not yet configured",
      "info"
    );
    return;
  }

  navigate(service.route_path, {
    state: {
      mas_cat_id,
      usr_ser_id: service.usr_ser_id,
      service_name: service.service_name,
      credits: service.actual_credits,
    },
  });
};


  /* ================= UI ================= */

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body className="mb-4">
          <Button variant="primary" className="mb-3" onClick={() => navigate(-1)}>
            ← Back
          </Button>

          <h4 className="mb-1">
            {category?.category_name || "Services"}
          </h4>

          <p className="text-muted mb-0">
            Choose a service to continue
          </p>
        </Card>

        {/* WALLET */}
        <Card body className="mb-4 text-center">
          <h6 className="text-muted mb-1">💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet} Credits</h2>
        </Card>

        {/* SERVICES */}
        <Card body>
          <Card.Title>Available Services</Card.Title>

          {services.length === 0 ? (
            <p className="text-muted text-center mt-3">
              No active services available
            </p>
          ) : (
            <ListGroup variant="flush">
              {services.map((service) => {
                const hasCredits = wallet >= service.actual_credits;

                return (
                  <ListGroup.Item
                    key={service.usr_ser_id}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <h6 className="mb-1">{service.service_name}</h6>
                      <small className="text-muted">
                        Credits Required:{" "}
                        <b>{service.actual_credits}</b>
                      </small>
                    </div>

                    <Button
                      variant={hasCredits ? "success" : "secondary"}
                      disabled={!hasCredits}
                      onClick={() => handleUseService(service)}
                    >
                      {hasCredits ? "Use Service" : "Insufficient Credits"}
                    </Button>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          )}
        </Card>
      </Col>
    </Row>
  );
}
