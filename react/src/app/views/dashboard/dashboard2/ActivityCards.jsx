// import Col from "react-bootstrap/Col";
// import Row from "react-bootstrap/Row";
// import Card from "react-bootstrap/Card";

// const CARDS = [
//   { icon: "i-Data-Download", subtitle: "Today's Hit Api", title: "21" },
//   { icon: "i-Add-User", subtitle: "users", title: "53" },
//   { icon: "i-Money-2", subtitle: "total sales", title: "4031" },
//   { icon: "i-Money-2", title: "4031" },
//   { icon: "i-Gear", title: "4031" },
//   { icon: "i-Bell", title: "4031" }
// ];

// export default function ActivityCards() {
//   return (
//     <Col md={6}>
//       <Row>
//         {CARDS.map((card, index) => (
//           <Col md={4} key={index}>
//             <Card className="card-icon-big mb-4">
//               <Card.Body className="text-center">
//                 <i className={card.icon} />
//                 <p className="text-muted mt-2 mb-0 text-capitalize">{card.subtitle}</p>
//                 <p className="lead mt-2 mb-0 text-capitalize">{card.title}</p>
//               </Card.Body>
//             </Card>
//           </Col>
//         ))}
//       </Row>
//     </Col>
//   );
// }

import { useEffect, useState } from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";

import api from "app/services/api";

import swal from "sweetalert2";
export default function ActivityCards() {

    const [userRole, setUserRole] = useState(null);
  const [stats, setStats] = useState({
    todayUsage: 0,
    totalUsers: 0,
    totalCredits: 0,
    todayCredits: 0,
    totalLogs: 0,
    activeServices: 0,
  });

    const fetchLoggedInUser = async () => {
      try {
        setLoading(true);
        const res = await api.get("api/getLoggedInUserController");
        setUserRole(res.data?.data || null);
      } catch (error) {
        swal.fire("Error", "Failed to load user profile", "error");
      } finally {
        setLoading(false);
      }
    };

  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchLoggedInUser()
  }, []);

  const fetchStats = async () => {
    try {
      const logsRes = await api.get("api/getUserServiceLogsCount");
      const usersRes = await api.get("api/getUsersCount");
      const totalCreditsRes = await api.get("api/getTotalCreditsUsed");
      const todayCreditsRes = await api.get("api/getTodayCreditsUsed");
      const activeServicesRes = await api.get("api/getTotalActiveServices");
      const todayUsageRes = await api.get("api/getTodayServicesUsedCount");
      const topUsersRes = await api.get("api/getTopApiUsers");

      setStats({
        todayUsage: todayUsageRes.data.data.today_services_used,
        totalUsers: usersRes.data.data.total_count,
        totalCredits: totalCreditsRes.data.data.total_credits_used,
        todayCredits: todayCreditsRes.data.data.total_credits_used,
        totalLogs: logsRes.data.data.total_count,
        activeServices:
          activeServicesRes.data.data.total_active_services,
      });

      setTopUsers(topUsersRes.data.data || []);
    } catch (err) {
      console.log("Dashboard Error", err);
    } finally {
      setLoading(false);
    }
  };
const isAdmin = userRole?.role?.toLowerCase() === "admin";

const CARDS = [
    ...(isAdmin
    ? [
     {
          icon: "i-Add-User",
          subtitle: "Total Users",
          title: stats.totalUsers,
        },
      ]
    : []),
  {
    icon: "i-Data-Download",
    subtitle: "Today's Api Calls",
    title: stats.todayUsage,
  },

  // ⭐ ADMIN ONLY
  ...(isAdmin
    ? [
        {
          icon: "i-Money-2",
          subtitle: "Today's Credits Used",
          title: stats.todayCredits,
        },
   
      ]
    : []),

  {
    icon: "i-File-Horizontal",
    subtitle: "Total API Calls",
    title: stats.totalLogs,
  },

  // ⭐ ADMIN ONLY
  ...(isAdmin
    ? [
        { 
          icon: "i-Money-2",
          subtitle: "Total Credits Used",
          title: stats.totalCredits,
        },
      ]
    : []),

  {
    icon: "i-Gear",
    subtitle: "Active Services",
    title: stats.activeServices,
  },
];

  return (
    <>
      {/* ===== CARDS ROW ===== */}
      <Row>
        {CARDS.map((card, index) => (
          <Col md={2} key={index}>
            <Card className="card-icon-big mb-4">
              <Card.Body className="text-center">
                <i className={card.icon} />
                <p className="text-muted mt-2 mb-0 text-capitalize">
                  {card.subtitle}
                </p>
                <p className="lead mt-2 mb-0 text-capitalize">
                  {loading ? "Loading..." : card.title}
                </p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ===== TABLE BELOW CARDS ===== */}
        {userRole?.role?.toLowerCase() === "admin" && (
      <Row className="mb-4">
        <Col md={12}>
          <Card body>
            <Card.Title>Top API Users</Card.Title>
            <Card.Subtitle className="mb-3 text-muted">
              Usage Report
            </Card.Subtitle>

            <Table responsive striped hover className="text-center w-100">
              <thead>
                <tr>
                  <th>#</th>
                  {/* <th>User ID</th> */}
                  <th>Name</th>
                  <th>Usage Count</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4}>Loading...</td>
                  </tr>
                ) : topUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No data found</td>
                  </tr>
                ) : (
                  topUsers.map((u, index) => (
                    <tr key={u.user_id}>
                      <td>{index + 1}</td>
                      {/* <td>{u.user_id}</td> */}
                      <td>{u.name}</td>
                      <td>{u.usage_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card>
        </Col>
      </Row>
        )}
    </>
  );
}