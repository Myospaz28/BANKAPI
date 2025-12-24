import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Breadcrumb from "app/components/Breadcrumb";
//PAGE SECTION COMPONENTS
import UserList from "./UserList";
import SalesGraphs from "./SalesGraphs";
import UserActivity from "./UserActivity";
import LastDaysLead from "./LastDaysLead";
import ThisYearSales from "./ThisYearSales";
import TopSellingProducts from "./TopSellingProducts";

export default function Dashboard1() {
  const routeSegments = [{ name: "Dashboard", path: "/dashboard" }, { name: "Version 1" }];

  return (
    <div>
      <Breadcrumb routeSegments={routeSegments} />

      {/* THIS YEAR SALES CARDS */}
      <ThisYearSales />

      <Row>
        <Col lg={6}>
          {/* LAST MONTH & WEEK SALES GRAPHS */}
          <SalesGraphs />

          {/* USER LIST TABLE */}
          <UserList />
        </Col>

        <Col lg={6}>
          {/* TOP SELLING PRODUCTS  */}
          <TopSellingProducts />

          {/* USER ACTIVITY ANALYTICS */}
          <UserActivity />
        </Col>

        {/* LAST 20 DAYS LEADS GRAPH */}
        <LastDaysLead />
      </Row>
    </div>
  );
}
