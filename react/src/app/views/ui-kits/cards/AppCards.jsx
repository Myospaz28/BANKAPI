
import api from "./../../../services/api.js";
import { Fragment, useEffect, useState } from "react";
import { Card, Col, Row, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import swal from "sweetalert2";

export default function AppCards() {
  const navigate = useNavigate();

  const [wallet, setWallet] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    fetchWallet();
    fetchCategories();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await api.get("api/getLoggedInUserWallet");
      setWallet(Number(res.data?.data?.wallet_amount || 0));
    } catch {
      swal.fire("Error", "Failed to load wallet", "error");
    }
  };

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

  /* ================= CATEGORY CARD ================= */

  const CategoryCard = ({ category }) => {
    return (
      <Col md={4}>
        <Card body className="card-profile-1 text-center mb-4">
          {/* Avatar */}
          <div className="avatar box-shadow-2 mb-3 d-flex align-items-center justify-content-center">
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                backgroundColor: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="i-Folder text-white" style={{ fontSize: 26 }} />
            </div>
          </div>

          {/* Category Name */}
          <h5 className="m-0">{category.category_name}</h5>

          {/* Description */}
          <p className="mt-2 text-muted">
            Click to view available services
          </p>

          {/* Action */}
          <button
            className="btn btn-primary btn-rounded"
            onClick={() =>
              navigate(`/services/UserCategoryServices/${category.mas_cat_id}`, {
                state: {
                  categoryName: category.category_name,
                },
              })
            }
          >
            View Services
          </button>
        </Card>
      </Col>
    );
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
    <Fragment>
      {/* ================= WALLET ================= */}
      <Row className="mb-4">
        <Col md={12}>
          <Card className="text-center shadow-sm">
            <Card.Body>
              <h5 className="mb-1">💰 Wallet Balance</h5>
              <h2 className="text-success">
                {wallet.toLocaleString("en-IN")} Credits
              </h2>
              <small className="text-muted">
                Credits will be deducted per verification
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ================= CATEGORIES ================= */}
      <Row>
        {categories.map((cat) => (
          <CategoryCard key={cat.mas_cat_id} category={cat} />
        ))}
      </Row>
    </Fragment>
  );
}
