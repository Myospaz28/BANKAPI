
// import React, { useEffect, useState } from "react";
// import { Row, Col, Card, Button, Form, Table } from "react-bootstrap";
// import { useNavigate, useParams } from "react-router-dom";
// import swal from "sweetalert2";


// import api from "./../services/api.js";

// export default function UserWalletPage() {
//   const navigate = useNavigate();
//   const { userId } = useParams();

//   const [balance, setBalance] = useState(0);
//   const [amount, setAmount] = useState("");
//   const [loading, setLoading] = useState(false);

//   /* ================= FETCH WALLET ================= */

//   useEffect(() => {
//     if (userId) {
//       fetchWallet();
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

//           {/* ===== TRANSACTIONS (COMING SOON) ===== */}
//           <Row>
//             <Col md={12}>
//               <Card body>
//                 <Card.Title>Transaction History</Card.Title>

//                 <Table responsive striped className="text-center mt-3">
//                   <thead>
//                     <tr>
//                       <th>#</th>
//                       <th>Date</th>
//                       <th>Type</th>
//                       <th>Amount</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     <tr>
//                       <td colSpan="4" className="text-muted">
//                         Transactions will be available soon
//                       </td>
//                     </tr>
//                   </tbody>
//                 </Table>
//               </Card>
//             </Col>
//           </Row>
//         </Card>
//       </Col>
//     </Row>
//   );
// }


import React, { useEffect, useState } from "react";
import { Row, Col, Card, Button, Form, Table, Spinner } from "react-bootstrap";
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

  /* ================= FETCH WALLET ================= */

  useEffect(() => {
    if (userId) {
      fetchWallet();
      fetchTransactions();
    }
  }, [userId]);

  const fetchWallet = async () => {
    try {
      const res = await api.get(`api/getUserWallet/${userId}`);
      setBalance(res.data.data.wallet_amount || 0);
    } catch (err) {
      console.error("❌ Failed to load wallet", err);
      swal.fire("Error", "Failed to load wallet", "error");
    }
  };

  /* ================= FETCH TRANSACTIONS ================= */

  const fetchTransactions = async () => {
    try {
      setTxnLoading(true);
      const res = await api.get(
        `api/getUserWalletCreditHistory/${userId}`
      );
      setTransactions(res.data.data || []);
    } catch (err) {
      console.error("❌ Failed to load transactions", err);
      swal.fire("Error", "Failed to load transactions", "error");
    } finally {
      setTxnLoading(false);
    }
  };

  /* ================= ADD AMOUNT ================= */

  const handleAddAmount = async () => {
    if (!amount || Number(amount) <= 0) {
      swal.fire("Invalid Amount", "Enter a valid amount", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Wallet Top-Up",
      html: `<b>₹ ${Number(amount).toLocaleString("en-IN")}</b> will be added`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Add Amount",
    });

    if (!confirm.isConfirmed) return;

    try {
      setLoading(true);

      await api.post("api/addUserWalletAmount", {
        user_id: userId,
        amount: Number(amount),
      });

      swal.fire("Success", "Amount added successfully", "success");
      setAmount("");
      fetchWallet();
      fetchTransactions();
    } catch (err) {
      swal.fire("Error", "Failed to add amount", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-4">
          {/* Header */}
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

          {/* ===== BALANCE + ADD AMOUNT ===== */}
          <Row className="mb-4">
            {/* Balance */}
            <Col md={6}>
              <Card
                body
                className="h-100 d-flex justify-content-center align-items-center text-center"
              >
                <div>
                  <h6 className="text-muted mb-2">Current Balance</h6>
                  <h2 className="text-success mb-0">
                    ₹ {balance.toLocaleString("en-IN")}
                  </h2>
                </div>
              </Card>
            </Col>

            {/* Add Amount */}
            <Col md={6}>
              <Card body className="h-100">
                <Card.Title>Add Amount</Card.Title>

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

                <Button
                  variant="success"
                  disabled={loading}
                  onClick={handleAddAmount}
                >
                  {loading ? "Processing..." : "Add to Wallet"}
                </Button>
              </Card>
            </Col>
          </Row>

          {/* ===== TRANSACTION HISTORY ===== */}
          <Row>
            <Col md={12}>
              <Card body>
                <Card.Title>Credit Transaction History</Card.Title>

                {txnLoading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" />
                  </div>
                ) : (
                  <Table responsive striped hover className="text-center mt-3">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Reference</th>
                        <th>Added By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-muted">
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
                            <td className="text-success fw-bold">
                              {txn.transaction_type.toUpperCase()}
                            </td>
                            <td>₹ {Number(txn.amount).toLocaleString("en-IN")}</td>
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
