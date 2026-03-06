// import { useEffect, useState } from "react";
// import { Button, Card, Col, Form, Row } from "react-bootstrap";
// import { Formik } from "formik";
// import * as yup from "yup";
// import swal from "sweetalert2";

// import Breadcrumb from "app/components/Breadcrumb";
// import api from "./../services/api.js";

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function FormValidation() {
//   const [categories, setCategories] = useState([]);
//   const [roles, setRoles] = useState([]);
//   const [loading, setLoading] = useState(false);

//   /* ================= FETCH DATA ================= */
//   useEffect(() => {
//     fetchMasterServices();
//     fetchUserRoles();
//   }, []);

//   const fetchMasterServices = async () => {
//     try {
//       const res = await api.get("api/getActiveMasterServicesByCategory");
//       setCategories(res.data.data || []);
//     } catch (err) {
//       console.error("❌ Failed to load services", err);
//     }
//   };

//   const fetchUserRoles = async () => {
//     try {
//       const res = await api.get("api/getAllUserRoles");
//       setRoles(res.data.data || []);
//     } catch (err) {
//       console.error("❌ Failed to load roles", err);
//     }
//   };

//   /* ================= INITIAL VALUES ================= */
//   const initialValues = {
//     name: "",
//     mobile: "",
//     username: "",
//     city: "",
//     address: "",
//     email: "",
//     password: "",
//     role_id: "",
//     walletAmount: "",
//     services: [],
//     login_time: "",
//     logout_time: "",
//     log_session_time: "",
//     latitude: "",
//     longitude: "",
//   };

//   /* ================= SUBMIT ================= */
//   const handleSubmit = async (values, { resetForm }) => {
//     try {
//       setLoading(true);

//       const payload = {
//         name: values.name,
//         mobile: values.mobile,
//         username: values.username,
//         address: values.address,
//         email: values.email,
//         password: values.password,
//         role_id: values.role_id,
//         wallet_amount: values.walletAmount,

//         // ✅ NEW FIELDS
//         login_time: values.login_time || null,
//         logout_time: values.logout_time || null,

//         // minutes (number) – backend will convert to TIME
//         log_session_time: values.log_session_time || null,

//         latitude: values.latitude || null,
//         longitude: values.longitude || null,

//         services: values.services.map((s) => ({
//           mas_ser_id: s.mas_ser_id,
//           credits: s.default_credits,
//         })),
//       };

//       console.log("🚀 CREATE USER PAYLOAD:", payload);
//       const res = await api.post("auth/signup", payload);

//       swal.fire({
//         icon: "success",
//         title: "User Created Successfully",
//         text: res.data?.message || "User created",
//       });

//       resetForm();
//     } catch (error) {
//       console.error("❌ Create user error:", error);

//       swal.fire({
//         icon: "error",
//         title: "Failed to create user",
//         text:
//           error.response?.data?.message ||
//           "Something went wrong. Please try again.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div>
//       <Breadcrumb
//         routeSegments={[
//           { name: "Users", path: "/users" },
//           { name: "Add User" },
//         ]}
//       />

//       <Row>
//         <Col md={10}>
//           <Card body>
//             <Formik
//               initialValues={initialValues}
//               validationSchema={schema}
//               onSubmit={handleSubmit}
//               validateOnMount={true}
//             >
//               {({
//                 values,
//                 errors,
//                 touched,
//                 handleChange,
//                 handleSubmit,
//                 isValid,
//               }) => (
//                 <Form onSubmit={handleSubmit}>
//                   {/* ================= BASIC DETAILS ================= */}
//                   <Row>
//                     <Col md={4}>
//                       <Form.Group className="mb-3">
//                         <Form.Label>
//                           Name <Required />
//                         </Form.Label>
//                         <Form.Control
//                           name="name"
//                           value={values.name}
//                           onChange={handleChange}
//                           isInvalid={touched.name && errors.name}
//                         />
//                         <Form.Control.Feedback type="invalid">
//                           {errors.name}
//                         </Form.Control.Feedback>
//                       </Form.Group>
//                     </Col>

//                     <Col md={4}>
//                       <Form.Group className="mb-3">
//                         <Form.Label>
//                           Mobile <Required />
//                         </Form.Label>
//                         <Form.Control
//                           name="mobile"
//                           value={values.mobile}
//                           onChange={handleChange}
//                           isInvalid={touched.mobile && errors.mobile}
//                         />
//                       </Form.Group>
//                     </Col>

//                     <Col md={4}>
//                       <Form.Group className="mb-3">
//                         <Form.Label>
//                           Username <Required />
//                         </Form.Label>
//                         <Form.Control
//                           name="username"
//                           value={values.username}
//                           onChange={handleChange}
//                           autoComplete="new-username"
//                           isInvalid={touched.username && errors.username}
//                         />
//                       </Form.Group>
//                     </Col>
//                   </Row>

//                   <Row>
//                     <Col md={4}>
//                       <Form.Group className="mb-3">
//                         <Form.Label>
//                           Email <Required />
//                         </Form.Label>
//                         <Form.Control
//                           name="email"
//                           value={values.email}
//                           onChange={handleChange}
//                           isInvalid={touched.email && errors.email}
//                         />
//                       </Form.Group>
//                     </Col>

//                     <Col md={4}>
//                       <Form.Group className="mb-3">
//                         <Form.Label>
//                           Password <Required />
//                         </Form.Label>
//                         <Form.Control
//                           type="password"
//                           name="password"
//                           value={values.password}
//                           onChange={handleChange}
//                           autoComplete="new-password"
//                           isInvalid={touched.password && errors.password}
//                         />
//                       </Form.Group>
//                     </Col>

//                     <Col md={4}>
//                       <Form.Group className="mb-3">
//                         <Form.Label>
//                           Role <Required />
//                         </Form.Label>
//                         <Form.Select
//                           name="role_id"
//                           value={values.role_id}
//                           onChange={handleChange}
//                           isInvalid={touched.role_id && errors.role_id}
//                         >
//                           <option value="">Select Role</option>
//                           {roles.map((r) => (
//                             <option key={r.ur_id} value={r.ur_id}>
//                               {r.role}
//                             </option>
//                           ))}
//                         </Form.Select>
//                       </Form.Group>
//                     </Col>
//                   </Row>

//                   {/* ================= LOGIN / LOCATION DETAILS ================= */}

//                   <Row>
//                     <Col md={4}>
//                       <Form.Group className="mb-3">
//                         <Form.Label>Login Time</Form.Label>
//                         <Form.Control
//                           type="time"
//                           name="login_time"
//                           value={values.login_time}
//                           onChange={handleChange}
//                         />
//                       </Form.Group>
//                     </Col>

//                     <Col md={4}>
//                       <Form.Group className="mb-3">
//                         <Form.Label>Logout Time</Form.Label>
//                         <Form.Control
//                           type="time"
//                           name="logout_time"
//                           value={values.logout_time}
//                           onChange={handleChange}
//                         />
//                       </Form.Group>
//                     </Col>

//                     <Col md={4}>
//                       <Form.Group className="mb-3">
//                         <Form.Label>Session Time (Minutes)</Form.Label>
//                         <Form.Control
//                           type="number"
//                           min="0"
//                           name="log_session_time"
//                           value={values.log_session_time}
//                           onChange={handleChange}
//                           placeholder="Enter session time in minutes"
//                         />
//                       </Form.Group>
//                     </Col>
//                   </Row>

//                   <Row>
//                     <Col md={6}>
//                       <Form.Group className="mb-3">
//                         <Form.Label>Latitude</Form.Label>
//                         <Form.Control
//                           type="number"
//                           step="0.00000001"
//                           name="latitude"
//                           value={values.latitude}
//                           onChange={handleChange}
//                           placeholder="Eg: 19.076090"
//                         />
//                       </Form.Group>
//                     </Col>

//                     <Col md={6}>
//                       <Form.Group className="mb-3">
//                         <Form.Label>Longitude</Form.Label>
//                         <Form.Control
//                           type="number"
//                           step="0.00000001"
//                           name="longitude"
//                           value={values.longitude}
//                           onChange={handleChange}
//                           placeholder="Eg: 72.877426"
//                         />
//                       </Form.Group>
//                     </Col>
//                   </Row>

//                   <Row>
//                     <Col md={6}>
//                       <Form.Group className="mb-3">
//                         <Form.Label>
//                           Address <Required />
//                         </Form.Label>
//                         <Form.Control
//                           as="textarea"
//                           rows={2}
//                           name="address"
//                           value={values.address}
//                           onChange={handleChange}
//                           isInvalid={touched.address && errors.address}
//                         />
//                       </Form.Group>
//                     </Col>

//                     <Col md={6}>
//                       <Form.Group className="mb-3">
//                         <Form.Label>
//                           Wallet Amount <Required />
//                         </Form.Label>
//                         <Form.Control
//                           type="number"
//                           name="walletAmount"
//                           value={values.walletAmount}
//                           onChange={handleChange}
//                           isInvalid={
//                             touched.walletAmount && errors.walletAmount
//                           }
//                         />
//                       </Form.Group>
//                     </Col>
//                   </Row>

//                   {/* ================= SERVICES ================= */}
//                   <Card body className="mb-3">
//                     <Card.Title>
//                       Select Services <Required />
//                     </Card.Title>

//                     {categories.map((cat) => (
//                       <div key={cat.mas_cat_id} className="mb-3">
//                         <h6 className="text-primary">{cat.category_name}</h6>

//                         {cat.services.map((ser) => {
//                           const checked = values.services.some(
//                             (s) => s.mas_ser_id === ser.mas_ser_id,
//                           );

//                           return (
//                             <Form.Check
//                               key={ser.mas_ser_id}
//                               type="checkbox"
//                               className="mb-2"
//                               label={`${ser.service_name} (Credits: ${ser.default_credits})`}
//                               checked={checked}
//                               onChange={(e) => {
//                                 let updated = [...values.services];
//                                 if (e.target.checked) updated.push(ser);
//                                 else
//                                   updated = updated.filter(
//                                     (s) => s.mas_ser_id !== ser.mas_ser_id,
//                                   );

//                                 handleChange({
//                                   target: {
//                                     name: "services",
//                                     value: updated,
//                                   },
//                                 });
//                               }}
//                             />
//                           );
//                         })}
//                       </div>
//                     ))}
//                   </Card>

//                   {/* ================= TERMS ================= */}

//                   {/* ================= SUBMIT ================= */}
//                   <Button
//                     type="submit"
//                     disabled={
//                       !isValid || values.services.length === 0 || loading
//                     }
//                   >
//                     {loading ? "Creating..." : "Create User"}
//                   </Button>
//                 </Form>
//               )}
//             </Formik>
//           </Card>
//         </Col>
//       </Row>
//     </div>
//   );
// }

// /* ================= VALIDATION ================= */
// const schema = yup.object().shape({
//   name: yup.string().required(),
//   mobile: yup.string().required(),
//   username: yup.string().required(),
//   address: yup.string().required(),
//   email: yup.string().email().required(),
//   password: yup.string().required(),
//   role_id: yup.string().required(),
//   walletAmount: yup.number().min(0).required(),
//   services: yup.array().min(1, "Select at least one service"),
// });
import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { Formik } from 'formik';
import * as yup from 'yup';
import swal from 'sweetalert2';

import Breadcrumb from 'app/components/Breadcrumb';
import api from './../services/api.js';

const Required = () => <span style={{ color: 'red' }}> *</span>;

export default function FormValidation() {
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    fetchMasterServices();
    fetchUserRoles();
  }, []);

  const fetchMasterServices = async () => {
    try {
      const res = await api.get('api/getActiveMasterServicesByCategory');
      setCategories(res.data.data || []);
    } catch (err) {
      console.error('❌ Failed to load services', err);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const res = await api.get('api/getAllUserRoles');
      setRoles(res.data.data || []);
    } catch (err) {
      console.error('❌ Failed to load roles', err);
    }
  };

  /* ================= INITIAL VALUES ================= */
  const initialValues = {
    name: '',
    mobile: '',
    username: '',
    city: '',
    address: '',
    email: '',
    password: '',
    role_id: '',
    walletAmount: '',
    services: [],
    login_time: '',
    logout_time: '',
    log_session_time: '',
    latitude: '',
    longitude: '',
    allowed_radius: 300,
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (values, { resetForm }) => {
    try {
      setLoading(true);

      const payload = {
        name: values.name,
        mobile: values.mobile,
        username: values.username,
        address: values.address,
        email: values.email,
        password: values.password,
        role_id: values.role_id,
        wallet_amount: values.walletAmount,
        login_time: values.login_time || null,
        logout_time: values.logout_time || null,
        log_session_time: values.log_session_time || null,
        latitude: values.latitude || null,
        longitude: values.longitude || null,

        allowed_radius: values.allowed_radius || 300,

        services: values.services.map((s) => ({
          mas_ser_id: s.mas_ser_id,
          credits: s.default_credits,
        })),
      };

      // console.log("🚀 CREATE USER PAYLOAD:", payload);
      const res = await api.post('auth/signup', payload);

      swal.fire({
        icon: 'success',
        title: 'User Created Successfully',
        text: res.data?.message || 'User created',
      });

      resetForm();
    } catch (error) {
      console.error('❌ Create user error:', error);

      swal.fire({
        icon: 'error',
        title: 'Failed to create user',
        text:
          error.response?.data?.message ||
          'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Breadcrumb
        routeSegments={[
          { name: 'Users', path: '/users' },
          { name: 'Add User' },
        ]}
      />

      <Row>
        <Col md={10}>
          <Card body>
            <Formik
              initialValues={initialValues}
              validationSchema={schema}
              onSubmit={handleSubmit}
              validateOnMount={true}
            >
              {({
                values,
                errors,
                touched,
                handleChange,
                handleSubmit,
                setFieldValue,
                isValid,
              }) => (
                <Form onSubmit={handleSubmit}>
                  {/* ================= BASIC DETAILS ================= */}
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Name <Required />
                        </Form.Label>
                        <Form.Control
                          name="name"
                          value={values.name}
                          onChange={handleChange}
                          isInvalid={touched.name && errors.name}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Mobile <Required />
                        </Form.Label>
                        <Form.Control
                          name="mobile"
                          value={values.mobile}
                          onChange={handleChange}
                          isInvalid={touched.mobile && errors.mobile}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Username <Required />
                        </Form.Label>
                        <Form.Control
                          name="username"
                          value={values.username}
                          onChange={handleChange}
                          autoComplete="new-username"
                          isInvalid={touched.username && errors.username}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Email <Required />
                        </Form.Label>
                        <Form.Control
                          name="email"
                          value={values.email}
                          onChange={handleChange}
                          isInvalid={touched.email && errors.email}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Password <Required />
                        </Form.Label>
                        <Form.Control
                          type="password"
                          name="password"
                          value={values.password}
                          onChange={handleChange}
                          autoComplete="new-password"
                          isInvalid={touched.password && errors.password}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Role <Required />
                        </Form.Label>
                        <Form.Select
                          name="role_id"
                          value={values.role_id}
                          onChange={handleChange}
                          isInvalid={touched.role_id && errors.role_id}
                        >
                          <option value="">Select Role</option>
                          {roles.map((r) => (
                            <option key={r.ur_id} value={r.ur_id}>
                              {r.role}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* ================= LOGIN / LOCATION DETAILS ================= */}

                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Login Time</Form.Label>
                        <Form.Control
                          type="time"
                          name="login_time"
                          value={values.login_time}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Logout Time</Form.Label>
                        <Form.Control
                          type="time"
                          name="logout_time"
                          value={values.logout_time}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Session Time (Minutes)</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          name="log_session_time"
                          value={values.log_session_time}
                          onChange={handleChange}
                          placeholder="Enter session time in minutes"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Latitude</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.00000001"
                          name="latitude"
                          value={values.latitude}
                          onChange={handleChange}
                          placeholder="e.g. 28.613939"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Longitude</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.00000001"
                          name="longitude"
                          value={values.longitude}
                          onChange={handleChange}
                          placeholder="e.g. 77.209023"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Address <Required />
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          name="address"
                          value={values.address}
                          onChange={handleChange}
                          isInvalid={touched.address && errors.address}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Wallet Amount <Required />
                        </Form.Label>
                        <Form.Control
                          type="number"
                          name="walletAmount"
                          value={values.walletAmount}
                          onChange={handleChange}
                          isInvalid={
                            touched.walletAmount && errors.walletAmount
                          }
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* ================= SERVICES ================= */}
                  <Card body className="mb-3">
                    <Card.Title>
                      Select Services <Required />
                    </Card.Title>

                    {categories.map((cat) => (
                      <div key={cat.mas_cat_id} className="mb-3">
                        <h6 className="text-primary">{cat.category_name}</h6>

                        {cat.services.map((ser) => {
                          const checked = values.services.some(
                            (s) => s.mas_ser_id === ser.mas_ser_id,
                          );

                          return (
                            <Form.Check
                              key={ser.mas_ser_id}
                              type="checkbox"
                              className="mb-2"
                              label={`${ser.service_name} (Credits: ${ser.default_credits})`}
                              checked={checked}
                              onChange={(e) => {
                                let updated = [...values.services];
                                if (e.target.checked) updated.push(ser);
                                else
                                  updated = updated.filter(
                                    (s) => s.mas_ser_id !== ser.mas_ser_id,
                                  );

                                handleChange({
                                  target: {
                                    name: 'services',
                                    value: updated,
                                  },
                                });
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </Card>

                  {/* ================= SUBMIT ================= */}
                  <Button
                    type="submit"
                    disabled={
                      !isValid || values.services.length === 0 || loading
                    }
                  >
                    {loading ? 'Creating...' : 'Create User'}
                  </Button>
                </Form>
              )}
            </Formik>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/* ================= VALIDATION ================= */
const schema = yup.object().shape({
  name: yup.string().required(),
  mobile: yup.string().required(),
  username: yup.string().required(),
  address: yup.string().required(),
  email: yup.string().email().required(),
  password: yup.string().required(),
  role_id: yup.string().required(),
  walletAmount: yup.number().min(0).required(),
  services: yup.array().min(1, 'Select at least one service'),
});