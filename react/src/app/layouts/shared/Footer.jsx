import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

export default function Footer() {
  return (
    <footer className="app-footer">
      <Row>
        <Col md={9}>
          <p>
            <strong>Gull - Laravel + Bootstrap 4 admin template</strong>
          </p>

          <p>
            Lorem ipsum, dolor sit amet consectetur adipisicing elit. Libero quis beatae officia
            saepe perferendis voluptatum minima eveniet voluptates dolorum, temporibus nisi maxime
            nesciunt totam repudiandae commodi sequi dolor quibusdam sunt.
          </p>
        </Col>

        <Col xs={12}>
          <div className="footer-bottom border-top pt-3 d-flex flex-column flex-sm-row align-items-sm-center justify-content-sm-between gap-2">
            <a
              id="buy-gull"
              className="btn btn-primary text-white btn-rounded"
              href="https://1.envato.market/LV1va"
              target="_blank"
              rel="noopener noreferrer">
              Buy Gull React
            </a>

            <div className="d-flex align-items-center">
              <img className="logo" src="/assets/images/logo.png" alt="Logo" />
              <p className="m-0 line-height-1">&copy; 2019 Gull HTML | All rights reserved</p>
            </div>
          </div>
        </Col>
      </Row>
    </footer>
  );
}
