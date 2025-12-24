import clsx from "clsx";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import Dropdown from "react-bootstrap/Dropdown";

const USER_LIST = [
  {
    status: "active",
    name: "Smith Doe",
    email: "Smith@gmail.com",
    photoUrl: "/assets/images/faces/1.jpg"
  },
  {
    name: "Jhon Doe",
    status: "pending",
    email: "Jhon@gmail.com",
    photoUrl: "/assets/images/faces/2.jpg"
  },
  {
    name: "Alex",
    status: "inactive",
    email: "Otttio@gmail.com",
    photoUrl: "/assets/images/faces/3.jpg"
  },
  {
    status: "active",
    name: "Mathew Doe",
    email: "matheo@gmail.com",
    photoUrl: "/assets/images/faces/4.jpg"
  }
];

export default function UserList() {
  return (
    <Row>
      <Col xs={12}>
        <Card className="mb-4">
          <Card.Header className="mb-0 d-flex align-items-center justify-content-between border-0">
            <Card.Title as="h3" className="w-50 m-0">
              New Users
            </Card.Title>

            <Dropdown>
              <Dropdown.Toggle as="span" className="toggle-hidden cursor-pointer">
                <i className="nav-icon i-Gear-2 text-19" />
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item>Add new user</Dropdown.Item>
                <Dropdown.Item>View All users</Dropdown.Item>
                <Dropdown.Item>Something else here</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Card.Header>

          <Table responsive>
            <thead>
              <tr>
                {["#", "Name", "Avatar", "Email", "Status", "Action"].map((item) => (
                  <th className="py-3" scope="col" key={item}>
                    {item}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {USER_LIST.map((user, index) => (
                <tr key={index}>
                  <th className="py-3" scope="row">
                    {index + 1}
                  </th>

                  <td className="py-3">{user.name}</td>
                  <td className="py-3">
                    <img
                      className="rounded-circle m-0 avatar-sm-table"
                      src={user.photoUrl}
                      alt=""
                    />
                  </td>

                  <td className="py-3">{user.email}</td>

                  <td className="py-3">
                    <span
                      className={clsx({
                        badge: true,
                        "bg-success": user.status === "active",
                        "bg-warning": user.status === "pending",
                        "bg-danger": user.status === "inactive"
                      })}>
                      {user.status}
                    </span>
                  </td>

                  <td className="py-3">
                    <div className="d-flex gap-2">
                      <span className="cursor-pointer text-success">
                        <i className="nav-icon i-Pen-2 font-weight-bold" />
                      </span>

                      <span className="cursor-pointer text-danger">
                        <i className="nav-icon i-Close-Window font-weight-bold" />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </Col>
    </Row>
  );
}
