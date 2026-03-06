// import React, { useEffect, useState } from "react";
// import { Row, Col, Card, Button, Form, Table, Spinner } from "react-bootstrap";
// import { useNavigate, useParams } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "./../services/api.js";

// export default function UserWalletPage() {
//   const navigate = useNavigate();
//   const { userId } = useParams();

//   const [balance, setBalance] = useState(0);
//   const [amount, setAmount] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [txnLoading, setTxnLoading] = useState(false);
//   const [transactions, setTransactions] = useState([]);

//   /* ================= FETCH WALLET ================= */

//   useEffect(() => {
//     if (userId) {
//       fetchWallet();
//       fetchTransactions();
//     }
//   }, [userId]);

//   const fetchWallet = async () => {
//     try {
//       const res = await api.get(`api/getUserWallet/${userId}`);
//       setBalance(res.data.data.wallet_amount || 0);
//     } catch (err) {
//       console.error("❌ Failed to load wallet", err);
//       swal.fire("Error", "Failed to load wallet", "error");
//     }
//   };

//   /* ================= FETCH TRANSACTIONS ================= */

//   const fetchTransactions = async () => {
//     try {
//       setTxnLoading(true);
//       const res = await api.get(
//         `api/getUserWalletCreditHistory/${userId}`
//       );
//       setTransactions(res.data.data || []);
//     } catch (err) {
//       console.error("❌ Failed to load transactions", err);
//       swal.fire("Error", "Failed to load transactions", "error");
//     } finally {
//       setTxnLoading(false);
//     }
//   };

//   /* ================= ADD AMOUNT ================= */

//   const handleAddAmount = async () => {
//     if (!amount || Number(amount) <= 0) {
//       swal.fire("Invalid Amount", "Enter a valid amount", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm Wallet Top-Up",
//       html: `<b>₹ ${Number(amount).toLocaleString("en-IN")}</b> will be added`,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Add Amount",
//     });

//     if (!confirm.isConfirmed) return;

//     try {
//       setLoading(true);

//       await api.post("api/addUserWalletAmount", {
//         user_id: userId,
//         amount: Number(amount),
//       });

//       swal.fire("Success", "Amount added successfully", "success");
//       setAmount("");
//       fetchWallet();
//       fetchTransactions();
//     } catch (err) {
//       swal.fire("Error", "Failed to add amount", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= UI ================= */

//   return (
//     <Row>
//       <Col md={12}>
//         <Card body className="mb-4">
//           {/* Header */}
//           <div className="d-flex align-items-center mb-4">
//             <Button
//               variant="primary"
//               className="me-3"
//               onClick={() => navigate(-1)}
//             >
//               ← Back
//             </Button>
//             <Card.Title className="m-0">User Wallet</Card.Title>
//           </div>

//           {/* ===== BALANCE + ADD AMOUNT ===== */}
//           <Row className="mb-4">
//             {/* Balance */}
//             <Col md={6}>
//               <Card
//                 body
//                 className="h-100 d-flex justify-content-center align-items-center text-center"
//               >
//                 <div>
//                   <h6 className="text-muted mb-2">Current Balance</h6>
//                   <h2 className="text-success mb-0">
//                     ₹ {balance.toLocaleString("en-IN")}
//                   </h2>
//                 </div>
//               </Card>
//             </Col>

//             {/* Add Amount */}
//             <Col md={6}>
//               <Card body className="h-100">
//                 <Card.Title>Add Amount</Card.Title>

//                 <Form.Group className="mb-3">
//                   <Form.Label>Enter Amount</Form.Label>
//                   <Form.Control
//                     type="number"
//                     min={1}
//                     placeholder="Enter amount"
//                     value={amount}
//                     onChange={(e) => setAmount(e.target.value)}
//                   />
//                 </Form.Group>

//                 <Button
//                   variant="success"
//                   disabled={loading}
//                   onClick={handleAddAmount}
//                 >
//                   {loading ? "Processing..." : "Add to Wallet"}
//                 </Button>
//               </Card>
//             </Col>
//           </Row>

//           {/* ===== TRANSACTION HISTORY ===== */}
//           <Row>
//             <Col md={12}>
//               <Card body>
//                 <Card.Title>Credit Transaction History</Card.Title>

//                 {txnLoading ? (
//                   <div className="text-center py-4">
//                     <Spinner animation="border" />
//                   </div>
//                 ) : (
//                   <Table responsive striped hover className="text-center mt-3">
//                     <thead>
//                       <tr>
//                         <th>#</th>
//                         <th>Date</th>
//                         <th>Type</th>
//                         <th>Amount</th>
//                         <th>Reference</th>
//                         <th>Added By</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {transactions.length === 0 ? (
//                         <tr>
//                           <td colSpan="6" className="text-muted">
//                             No transactions found
//                           </td>
//                         </tr>
//                       ) : (
//                         transactions.map((txn, index) => (
//                           <tr key={txn.wt_id}>
//                             <td>{index + 1}</td>
//                             <td>
//                               {new Date(txn.created_at).toLocaleString(
//                                 "en-IN"
//                               )}
//                             </td>
//                             <td className="text-success fw-bold">
//                               {txn.transaction_type.toUpperCase()}
//                             </td>
//                             <td>₹ {Number(txn.amount).toLocaleString("en-IN")}</td>
//                             <td>{txn.reference_type}</td>
//                             <td>{txn.created_by_name}</td>
//                           </tr>
//                         ))
//                       )}
//                     </tbody>
//                   </Table>
//                 )}
//               </Card>
//             </Col>
//           </Row>
//         </Card>
//       </Col>
//     </Row>
//   );
// }
import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Form,
  Table,
  Spinner,
  Badge,
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import swal from "sweetalert2";
import api from "./../services/api.js";

export default function UserWalletPage() {
  const navigate = useNavigate();
  const { userId } = useParams();

  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txnLoading, setTxnLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  
    const [userDetails, setUserDetails] = useState(null);

  /* ================= FETCH WALLET ================= */

  useEffect(() => {
    if (userId) {
      fetchUserDetails()
      fetchWallet();
      fetchTransactions();
    }
  }, [userId]);

  const fetchWallet = async () => {
    try {
      const res = await api.get(`api/getUserWallet/${userId}`);
      setBalance(Number(res.data.data.wallet_amount || 0));
    } catch (err) {
      swal.fire("Error", "Failed to load wallet", "error");
    }
  };

  /* ================= FETCH TRANSACTIONS ================= */
const fetchUserDetails = async () => {
  try {
    const res = await api.get(`api/getUserById/${userId}`);
    setUserDetails(res.data.data);
  } catch (err) {
    console.error("❌ Failed to load user details", err);
  }
};
  const fetchTransactions = async () => {
    try {
      setTxnLoading(true);
      const res = await api.get(
        `api/getUserWalletCreditHistory/${userId}`
      );
      setTransactions(res.data.data || []);
    } catch (err) {
      swal.fire("Error", "Failed to load transactions", "error");
    } finally {
      setTxnLoading(false);
    }
  };

  /* ================= WALLET UPDATE (CREDIT / DEBIT) ================= */

  const handleWalletUpdate = async (type) => {
    if (!amount || Number(amount) <= 0) {
      swal.fire("Invalid Amount", "Enter a valid amount", "error");
      return;
    }

    const txnAmount = Number(amount);

    if (type === "debit" && txnAmount > balance) {
      swal.fire(
        "Insufficient Balance",
        "Cannot deduct more than available balance",
        "error"
      );
      return;
    }

    const confirm = await swal.fire({
      title:
        type === "credit"
          ? "Confirm Wallet Credit"
          : "Confirm Wallet Deduction",
      html: `
        <b>₹ ${txnAmount.toLocaleString("en-IN")}</b>
        will be ${type === "credit" ? "added to" : "deducted from"} wallet.
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText:
        type === "credit" ? "Add Amount" : "Deduct Amount",
    });

    if (!confirm.isConfirmed) return;

    try {
      setLoading(true);

      await api.post("api/updateUserWalletAmount", {
        user_id: userId,
        amount: txnAmount,
        type,
      });

      swal.fire(
        "Success",
        type === "credit"
          ? "Amount added successfully"
          : "Amount deducted successfully",
        "success"
      );

      setAmount("");
      fetchWallet();
      fetchTransactions();
    } catch (err) {
      swal.fire(
        "Error",
        err.response?.data?.message || "Operation failed",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-4">

          {/* HEADER */}
          <div className="d-flex align-items-center mb-4">
            <Button
              variant="primary"
              className="me-3"
              onClick={() => navigate(-1)}
            >
              ← Back
            </Button>
            <Card.Title className="m-0">User Wallet</Card.Title>
          </div>
             {userDetails && (
            <div
              className="mt-4 mb-4 p-4 rounded-4 shadow-sm"
              style={{
                background: "linear-gradient(135deg, #f8f9fa, #ffffff)",
                border: "1px solid #e9ecef",
              }}
            >
              <Row className="align-items-center">
          
                {/* Avatar + Name Section */}
                <Col xs={12}>
                  <div className="d-flex align-items-center gap-3">
          
                    {/* Avatar Circle */}
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle"
                      style={{
                        width: "60px",
                        height: "60px",
                        background: "#0d6efd",
                        color: "#fff",
                        fontSize: "22px",
                        fontWeight: "bold",
                      }}
                    >
                      {userDetails.name?.charAt(0).toUpperCase()}
                    </div>
          
                    {/* Name + Username */}
                    <div>
                      <h5 className="mb-1 fw-bold">
                        {userDetails.name}
                      </h5>
          
                      <div className="text-muted">
                        @{userDetails.username}
                      </div>
                    </div>
          
                  </div>
                </Col>
          
              </Row>
            </div>
          )}

          {/* BALANCE + ACTIONS */}
          <Row className="mb-4">

            {/* BALANCE CARD */}
            <Col md={6}>
              <Card
                body
                className="h-100 d-flex justify-content-center align-items-center text-center"
              >
                <div>
                  <h6 className="text-muted mb-2">Current Balance</h6>
                  <h2
                    className={
                      balance >= 0 ? "text-success mb-0" : "text-danger mb-0"
                    }
                  >
                    ₹ {balance.toLocaleString("en-IN")}
                  </h2>
                </div>
              </Card>
            </Col>

            {/* ADD / DEDUCT CARD */}
            <Col md={6}>
              <Card body className="h-100">
                <Card.Title>Wallet Adjustment</Card.Title>

                <Form.Group className="mb-3">
                  <Form.Label>Enter Amount</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Form.Group>

                <div className="d-flex">
                  <Button
                    variant="success"
                    disabled={loading}
                    className="me-2"
                    onClick={() => handleWalletUpdate("credit")}
                  >
                    {loading ? "Processing..." : "Add to Wallet"}
                  </Button>

                  <Button
                    variant="warning"
                    disabled={loading}
                    onClick={() => handleWalletUpdate("debit")}
                  >
                    {loading ? "Processing..." : "Deduct from Wallet"}
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>

          {/* TRANSACTION HISTORY */}
          <Row>
            <Col md={12}>
              <Card body>
                <Card.Title>Transaction History</Card.Title>

                {txnLoading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" />
                  </div>
                ) : (
                  <Table
                    responsive
                    striped
                    hover
                    bordered
                    className="text-center mt-3"
                  >
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Opening</th>
                        <th>Closing</th>
                        <th>Reference</th>
                        <th>Added By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-muted">
                            No transactions found
                          </td>
                        </tr>
                      ) : (
                        transactions.map((txn, index) => (
                          <tr key={txn.wt_id}>
                            <td>{index + 1}</td>
                            <td>
                              {new Date(txn.created_at).toLocaleString(
                                "en-IN"
                              )}
                            </td>
                            <td>
                              <Badge
                                bg={
                                  txn.transaction_type === "credit"
                                    ? "success"
                                    : "danger"
                                }
                              >
                                {txn.transaction_type.toUpperCase()}
                              </Badge>
                            </td>
                            <td>
                              ₹ {Number(txn.amount).toLocaleString("en-IN")}
                            </td>
                            <td>
                              ₹{" "}
                              {Number(txn.opening_balance).toLocaleString(
                                "en-IN"
                              )}
                            </td>
                            <td>
                              ₹{" "}
                              {Number(txn.closing_balance).toLocaleString(
                                "en-IN"
                              )}
                            </td>
                            <td>{txn.reference_type}</td>
                            <td>{txn.created_by_name}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                )}
              </Card>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
}
