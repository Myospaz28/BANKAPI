import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Card from "react-bootstrap/Card";

const DATA = [
  { icon: "i-Add-User", title: "205", subtitle: "new leads" },
  { icon: "i-Financial", title: "4021", subtitle: "sales" },
  { icon: "i-Checkout-Basket", title: "80", subtitle: "checkout" },
  { icon: "i-Money-2", title: "120", subtitle: "expense" }
];

export default function ThisYearSales() {
  return (
    <Row>
      {DATA.map((card, index) => (
        <Col lg={3} sm={6} key={index}>
          <Card className="card-icon-bg gap-3 card-icon-bg-primary o-hidden mb-4">
            <Card.Body className="align-items-center gap-4">
              <i className={card.icon} />

              <div className="content gap-1">
                <p className="text-muted mb-0 text-capitalize">{card.subtitle}</p>
                <p className="lead text-primary text-24 mb-0 text-capitalize">{card.title}</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
