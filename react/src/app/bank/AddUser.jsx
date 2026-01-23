// import { useState } from "react";
// import { Button, Card, Col, Form, Row } from "react-bootstrap";
// import { Formik } from "formik";
// import * as yup from "yup";

// import Breadcrumb from "app/components/Breadcrumb";

// export default function FormValidation() {
//   const [state] = useState({
//     Name: "",
//     mobileNumber: "",
//     phone: "",
//     username: "",
//     city: "",
//     cardNumber: "4444444444444444",
//     email: "",
//     password: "",
//     repassword: "",
//     zip: "",
//     agree: false,
//     checkbox1: "",
//     checkbox2: "",
//     radio: "",
//     range: {
//       startDate: new Date(),
//       endDate: (() => {
//         let date = new Date();
//         date.setDate(date.getDate() + 7);
//         return date;
//       })()
//     }
//   });

//   const handleSubmit = (values, { setSubmitting }) => {
//     console.log(values);
//   };

//   return (
//     <div>
//       <Breadcrumb
//         routeSegments={[{ name: "Users", path: "/users" }, { name: "Add Users" }]}
//       />

//       <Row>
//         <Col md={8}>

//           <Card body className="mb-4">
//             <Formik
//               initialValues={state}
//               onSubmit={handleSubmit}
//               validationSchema={basicFormSchema}>
//               {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => {
//                 return (
//                   <form className="needs-validation" onSubmit={handleSubmit} noValidate>
//                     <Row>
//                       <Form.Group
//                         as={Col}
//                         md={4}
//                         controlId="Name"
//                         className="mb-3 position-relative">
//                         <Form.Label>Name</Form.Label>

//                         <Form.Control
//                           required
//                           type="text"
//                           placeholder="Name"
//                           name="Name"
//                           onBlur={handleBlur}
//                           onChange={handleChange}
//                           value={values.Name}
//                           isValid={touched.Name && !errors.Name}
//                           isInvalid={touched.Name && errors.Name}
//                         />

//                         <Form.Control.Feedback type="invalid">
//                         Name is required
//                         </Form.Control.Feedback>
//                       </Form.Group>

//                       <Form.Group
//                         as={Col}
//                         md={4}
//                         controlId="lastName"
//                         className="mb-3 position-relative">
//                         <Form.Label>Mobile Number</Form.Label>

//                         <Form.Control
//                           required
//                           type="text"
//                           name="mobileNumber"
//                           placeholder="Mobile Number"
//                           onBlur={handleBlur}
//                           onChange={handleChange}
//                           value={values.mobileNumber}
//                           isValid={touched.mobileNumber && !errors.mobileNumber}
//                           isInvalid={touched.mobileNumber && errors.mobileNumber}
//                         />

//                         <Form.Control.Feedback type="invalid">
//                           Mobile Number is required
//                         </Form.Control.Feedback>
//                       </Form.Group>

//                       <Form.Group
//                         as={Col}
//                         md={4}
//                         controlId="username"
//                         className="mb-3 position-relative">
//                         <Form.Label>Username</Form.Label>

//                         <Form.Control
//                           required
//                           type="text"
//                           name="username"
//                           placeholder="Username"
//                           onBlur={handleBlur}
//                           onChange={handleChange}
//                           value={values.username}
//                           isValid={touched.username && !errors.username}
//                           isInvalid={touched.username && errors.username}
//                         />

//                         <Form.Control.Feedback type="invalid">
//                           Username is required
//                         </Form.Control.Feedback>
//                       </Form.Group>
//                     </Row>

//                     <Row>
//                       <Form.Group
//                         as={Col}
//                         md={4}
//                         controlId="userName"
//                         className="mb-3 position-relative">
//                         <Form.Label>City</Form.Label>

//                         <Form.Control
//                           required
//                           type="text"
//                           name="city"
//                           placeholder="City"
//                           onBlur={handleBlur}
//                           onChange={handleChange}
//                           value={values.city}
//                           isValid={touched.city && !errors.city}
//                           isInvalid={touched.city && errors.city}
//                         />

//                         <Form.Control.Feedback type="invalid">
//                           City is required
//                         </Form.Control.Feedback>
//                       </Form.Group>

//                       <Form.Group
//                         as={Col}
//                         md={4}
//                         controlId="state"
//                         className="mb-3 position-relative">
//                         <Form.Label>Email</Form.Label>

//                         <Form.Control
//                           required
//                           type="text"
//                           name="email"
//                           placeholder="Email"
//                           onBlur={handleBlur}
//                           onChange={handleChange}
//                           value={values.email}
//                           isInvalid={touched.email && errors.email}
//                           isValid={touched.email && !errors.email}
//                         />

//                         <Form.Control.Feedback type="invalid">
//                           Email is required
//                         </Form.Control.Feedback>
//                       </Form.Group>

//                       <Form.Group
//                         as={Col}
//                         md={4}
//                         controlId="password"
//                         className="mb-3 position-relative">
//                         <Form.Label>Password</Form.Label>

//                         <Form.Control
//                           required
//                           type="text"
//                           name="password"
//                           placeholder="Password"
//                           value={values.password}
//                           onBlur={handleBlur}
//                           onChange={handleChange}
//                           isInvalid={touched.password && errors.password}
//                           isValid={touched.password && !errors.password}
//                         />

//                         <Form.Control.Feedback type="invalid">
//                           Password is required
//                         </Form.Control.Feedback>
//                       </Form.Group>
//                     </Row>

//                     <Form.Group controlId="agree" className="position-relative mb-3">
//                       <Form.Check
//                         type="checkbox"
//                         name="agree"
//                         label="Agree to terms and conditions"
//                         onBlur={handleBlur}
//                         value={values.agree}
//                         onChange={handleChange}
//                         checked={values.agree}
//                         isInvalid={touched.agree && errors.agree}
//                         required
//                         feedbackType="invalid"
//                         feedback="You must agree before submitting"
//                       />
//                     </Form.Group>

//                     <Button type="submit">Submit form</Button>
//                   </form>
//                 );
//               }}
//             </Formik>
//           </Card>
//         </Col>

//       </Row>
//     </div>
//   );
// }

// const basicFormSchema = yup.object().shape({
//   Name: yup.string().required("first name is required"),
//   mobileNumber: yup.string().required("Mobile Numberis required"),
//   username: yup.string().required("select any option"),
//   city: yup.string().required("city is required"),
//   password: yup.string().required("password is required"),
//   agree: yup.bool().oneOf([true], "terms must be accepted"),
//   email: yup.string().required("Required")
// });

// import { useState } from "react";
// import { Button, Card, Col, Form, Row } from "react-bootstrap";
// import { Formik } from "formik";
// import * as yup from "yup";
// import clsx from "clsx";
// import swal from "sweetalert2";

// import Breadcrumb from "app/components/Breadcrumb";

// /* ===== SERVICES SOURCE (FROM h5 NAMES) ===== */
// const ALL_SERVICES = [
//   "Criminal and Court Record Verification",
//   "Aadhaar verification",
//   "Driving License verification",
//   "PAN verification",
//   "Profile Lookup",
//   "GSTIN verification",
//   "Bank Account Verification",
//   "Voter ID verification",
//   "Liveness",
//   "Facematch",
//   "Passport Verification",
//   "DigiLocker",
// ];

// export default function FormValidation() {
//   const [state] = useState({
//     Name: "",
//     mobileNumber: "",
//     username: "",
//     city: "",
//     email: "",
//     password: "",
//     agree: false,

//     /* NEW */
//     services: [],
//     walletAmount: "",
//   });

//   const handleSubmit = (values, { setSubmitting, resetForm }) => {
//     console.log("CREATE USER PAYLOAD:", values);

//     swal.fire({
//       icon: "success",
//       title: "User Created Successfully",
//       html: `
//         <b>Name:</b> ${values.Name}<br/>
//         <b>Services:</b> ${values.services.length ? values.services.join(", ") : "None"}<br/>
//         <b>Initial Wallet Amount:</b> ₹ ${values.walletAmount || 0}
//       `,
//     });

//     setSubmitting(false);
//     resetForm();
//   };

//   return (
//     <div>
//       <Breadcrumb
//         routeSegments={[
//           { name: "Users", path: "/users" },
//           { name: "Add Users" },
//         ]}
//       />

//       <Row>
//         <Col md={8}>
//           <Card body className="mb-4">
//             <Formik
//               initialValues={state}
//               onSubmit={handleSubmit}
//               validationSchema={basicFormSchema}
//             >
//               {({
//                 values,
//                 errors,
//                 touched,
//                 handleChange,
//                 handleBlur,
//                 handleSubmit,
//               }) => (
//                 <form
//                   className="needs-validation"
//                   onSubmit={handleSubmit}
//                   noValidate
//                 >
//                   {/* ===== BASIC DETAILS ===== */}
//                   <Row>
//                     <Form.Group as={Col} md={4} className="mb-3">
//                       <Form.Label>Name</Form.Label>
//                       <Form.Control
//                         type="text"
//                         name="Name"
//                         placeholder="Name"
//                         onBlur={handleBlur}
//                         onChange={handleChange}
//                         value={values.Name}
//                         isInvalid={touched.Name && errors.Name}
//                       />
//                       <Form.Control.Feedback type="invalid">
//                         {errors.Name}
//                       </Form.Control.Feedback>
//                     </Form.Group>

//                     <Form.Group as={Col} md={4} className="mb-3">
//                       <Form.Label>Mobile Number</Form.Label>
//                       <Form.Control
//                         type="text"
//                         name="mobileNumber"
//                         placeholder="Mobile Number"
//                         onBlur={handleBlur}
//                         onChange={handleChange}
//                         value={values.mobileNumber}
//                         isInvalid={touched.mobileNumber && errors.mobileNumber}
//                       />
//                       <Form.Control.Feedback type="invalid">
//                         {errors.mobileNumber}
//                       </Form.Control.Feedback>
//                     </Form.Group>

//                     <Form.Group as={Col} md={4} className="mb-3">
//                       <Form.Label>Username</Form.Label>
//                       <Form.Control
//                         type="text"
//                         name="username"
//                         placeholder="Username"
//                         onBlur={handleBlur}
//                         onChange={handleChange}
//                         value={values.username}
//                         isInvalid={touched.username && errors.username}
//                       />
//                       <Form.Control.Feedback type="invalid">
//                         {errors.username}
//                       </Form.Control.Feedback>
//                     </Form.Group>
//                   </Row>

//                   <Row>
//                     <Form.Group as={Col} md={4} className="mb-3">
//                       <Form.Label>City</Form.Label>
//                       <Form.Control
//                         type="text"
//                         name="city"
//                         placeholder="City"
//                         onBlur={handleBlur}
//                         onChange={handleChange}
//                         value={values.city}
//                         isInvalid={touched.city && errors.city}
//                       />
//                       <Form.Control.Feedback type="invalid">
//                         {errors.city}
//                       </Form.Control.Feedback>
//                     </Form.Group>

//                     <Form.Group as={Col} md={4} className="mb-3">
//                       <Form.Label>Email</Form.Label>
//                       <Form.Control
//                         type="email"
//                         name="email"
//                         placeholder="Email"
//                         onBlur={handleBlur}
//                         onChange={handleChange}
//                         value={values.email}
//                         isInvalid={touched.email && errors.email}
//                       />
//                       <Form.Control.Feedback type="invalid">
//                         {errors.email}
//                       </Form.Control.Feedback>
//                     </Form.Group>

//                     <Form.Group as={Col} md={4} className="mb-3">
//                       <Form.Label>Password</Form.Label>
//                       <Form.Control
//                         type="password"
//                         name="password"
//                         placeholder="Password"
//                         onBlur={handleBlur}
//                         onChange={handleChange}
//                         value={values.password}
//                         isInvalid={touched.password && errors.password}
//                       />
//                       <Form.Control.Feedback type="invalid">
//                         {errors.password}
//                       </Form.Control.Feedback>
//                     </Form.Group>
//                   </Row>

//                   {/* ===== SERVICE SELECTION ===== */}
//                   <Card body className="mb-4 mt-3">
//                     <Card.Title>Select Services</Card.Title>

//                     {ALL_SERVICES.map((service, index) => (
//                       <div
//                         key={service}
//                         className={clsx("ul-widget1", {
//                           "mt-3": index !== 0,
//                         })}
//                       >
//                         <div className="ul-widget2__item">
//                           <label className="checkbox checkbox-outline-primary">
//                             <input
//                               type="checkbox"
//                               checked={values.services.includes(service)}
//                               onChange={(e) => {
//                                 const updated = e.target.checked
//                                   ? [...values.services, service]
//                                   : values.services.filter(
//                                       (s) => s !== service
//                                     );

//                                 handleChange({
//                                   target: {
//                                     name: "services",
//                                     value: updated,
//                                   },
//                                 });
//                               }}
//                             />
//                             <span className="checkmark" />
//                           </label>

//                           <div className="ul-widget2__info">
//                             <span className="ul-widget2__title">
//                               {service}
//                             </span>
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </Card>

//                   {/* ===== WALLET AMOUNT ===== */}
//                   <Row>
//                     <Form.Group as={Col} md={4} className="mb-3">
//                       <Form.Label>Initial Wallet Amount (₹)</Form.Label>
//                       <Form.Control
//                         type="number"
//                         name="walletAmount"
//                         placeholder="Enter amount"
//                         onChange={handleChange}
//                         value={values.walletAmount}
//                       />
//                     </Form.Group>
//                   </Row>

//                   {/* ===== TERMS ===== */}
//                   <Form.Group className="mb-3">
//                     <Form.Check
//                       type="checkbox"
//                       name="agree"
//                       label="Agree to terms and conditions"
//                       onChange={handleChange}
//                       checked={values.agree}
//                       isInvalid={touched.agree && errors.agree}
//                     />
//                     <Form.Control.Feedback type="invalid">
//                       {errors.agree}
//                     </Form.Control.Feedback>
//                   </Form.Group>

//                   <Button type="submit">Create User</Button>
//                 </form>
//               )}
//             </Formik>
//           </Card>
//         </Col>
//       </Row>
//     </div>
//   );
// }

// /* ===== VALIDATION ===== */
// const basicFormSchema = yup.object().shape({
//   Name: yup.string().required("Name is required"),
//   mobileNumber: yup.string().required("Mobile Number is required"),
//   username: yup.string().required("Username is required"),
//   city: yup.string().required("City is required"),
//   email: yup.string().required("Email is required"),
//   password: yup.string().required("Password is required"),
//   agree: yup.bool().oneOf([true], "You must accept terms"),
//   walletAmount: yup.number().min(0, "Invalid amount"),
// });

import { useEffect, useState } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import { Formik } from "formik";
import * as yup from "yup";
import swal from "sweetalert2";

import Breadcrumb from "app/components/Breadcrumb";
import api from "./../services/api.js";

const Required = () => <span style={{ color: "red" }}> *</span>;

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
      const res = await api.get("api/getActiveMasterServicesByCategory");
      setCategories(res.data.data || []);
    } catch (err) {
      console.error("❌ Failed to load services", err);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const res = await api.get("api/getAllUserRoles");
      setRoles(res.data.data || []);
    } catch (err) {
      console.error("❌ Failed to load roles", err);
    }
  };

  /* ================= INITIAL VALUES ================= */
  const initialValues = {
    name: "",
    mobile: "",
    username: "",
    city: "",
    address: "",
    email: "",
    password: "",
    role_id: "",
    walletAmount: "",
    services: [],
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (values, { resetForm }) => {
    try {
      setLoading(true);

      const payload = {
        name: values.name,
        mobile: values.mobile,
        username: values.username,
        city: values.city,
        address: values.address,
        email: values.email,
        password: values.password,
        role_id: values.role_id,
        wallet_amount: values.walletAmount,
        services: values.services.map((s) => ({
          mas_ser_id: s.mas_ser_id,
          credits: s.default_credits,
        })),
      };

      // console.log("🚀 CREATE USER PAYLOAD:", payload);

      // ✅ API CALL
      const res = await api.post("auth/signup", payload);

      swal.fire({
        icon: "success",
        title: "User Created Successfully",
        text: res.data?.message || "User created",
      });

      resetForm();
    } catch (error) {
      console.error("❌ Create user error:", error);

      swal.fire({
        icon: "error",
        title: "Failed to create user",
        text:
          error.response?.data?.message ||
          "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Breadcrumb
        routeSegments={[
          { name: "Users", path: "/users" },
          { name: "Add User" },
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
                            (s) => s.mas_ser_id === ser.mas_ser_id
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
                                    (s) => s.mas_ser_id !== ser.mas_ser_id
                                  );

                                handleChange({
                                  target: {
                                    name: "services",
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

                  {/* ================= TERMS ================= */}

                  {/* ================= SUBMIT ================= */}
                  <Button
                    type="submit"
                    disabled={
                      !isValid || values.services.length === 0 || loading
                    }
                  >
                    {loading ? "Creating..." : "Create User"}
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
  services: yup.array().min(1, "Select at least one service"),
});
