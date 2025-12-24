import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";

import LineChart1 from "app/views/charts/echarts/LineChart1";
import LineChart2 from "app/views/charts/echarts/LineChart2";

export default function SalesGraphs() {
  return (
    <Row>
      <Col lg={6}>
        <Card className="mb-4">
          <Card.Body className="pb-0">
            <Card.Title className="mb-3">Last Month Sales</Card.Title>
            <p className="text-primary mb-0 text-24 fw-semibold">$40250</p>
          </Card.Body>

          <LineChart1 height="260px" />
        </Card>
      </Col>

      <Col lg={6}>
        <Card className="mb-4">
          <Card.Body className="pb-0">
            <Card.Title className="mb-3">Last Week Sales</Card.Title>
            <p className="text-primary mb-0 text-24 fw-semibold">$10250</p>
          </Card.Body>

          <LineChart2 height="260px" />
        </Card>
      </Col>
    </Row>
  );
}
