import { useState } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import { Formik } from "formik";
import * as yup from "yup";

import Breadcrumb from "app/components/Breadcrumb";

export default function FormValidation() {
  const [state] = useState({
    Name: "",
    mobileNumber: "",
    phone: "",
    username: "",
    city: "",
    cardNumber: "4444444444444444",
    email: "",
    password: "",
    repassword: "",
    zip: "",
    agree: false,
    checkbox1: "",
    checkbox2: "",
    radio: "",
    range: {
      startDate: new Date(),
      endDate: (() => {
        let date = new Date();
        date.setDate(date.getDate() + 7);
        return date;
      })()
    }
  });

  const handleSubmit = (values, { setSubmitting }) => {
    console.log(values);
  };

  return (
    <div>
      <Breadcrumb
        routeSegments={[{ name: "Users", path: "/users" }, { name: "Add Admin" }]}
      />

      <Row>
        <Col md={8}>
          
          <Card body className="mb-4">
            <Formik
              initialValues={state}
              onSubmit={handleSubmit}
              validationSchema={basicFormSchema}>
              {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => {
                return (
                  <form className="needs-validation" onSubmit={handleSubmit} noValidate>
                    <Row>
                      <Form.Group
                        as={Col}
                        md={4}
                        controlId="Name"
                        className="mb-3 position-relative">
                        <Form.Label>Name</Form.Label>

                        <Form.Control
                          required
                          type="text"
                          placeholder="Name"
                          name="Name"
                          onBlur={handleBlur}
                          onChange={handleChange}
                          value={values.Name}
                          isValid={touched.Name && !errors.Name}
                          isInvalid={touched.Name && errors.Name}
                        />

                        <Form.Control.Feedback type="invalid">
                        Name is required
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group
                        as={Col}
                        md={4}
                        controlId="lastName"
                        className="mb-3 position-relative">
                        <Form.Label>Mobile Number</Form.Label>

                        <Form.Control
                          required
                          type="text"
                          name="mobileNumber"
                          placeholder="Mobile Number"
                          onBlur={handleBlur}
                          onChange={handleChange}
                          value={values.mobileNumber}
                          isValid={touched.mobileNumber && !errors.mobileNumber}
                          isInvalid={touched.mobileNumber && errors.mobileNumber}
                        />

                        <Form.Control.Feedback type="invalid">
                          Mobile Number is required
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group
                        as={Col}
                        md={4}
                        controlId="username"
                        className="mb-3 position-relative">
                        <Form.Label>Username</Form.Label>

                        <Form.Control
                          required
                          type="text"
                          name="username"
                          placeholder="Username"
                          onBlur={handleBlur}
                          onChange={handleChange}
                          value={values.username}
                          isValid={touched.username && !errors.username}
                          isInvalid={touched.username && errors.username}
                        />

                        <Form.Control.Feedback type="invalid">
                          Username is required
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Row>

                    <Row>
                      <Form.Group
                        as={Col}
                        md={4}
                        controlId="userName"
                        className="mb-3 position-relative">
                        <Form.Label>City</Form.Label>

                        <Form.Control
                          required
                          type="text"
                          name="city"
                          placeholder="City"
                          onBlur={handleBlur}
                          onChange={handleChange}
                          value={values.city}
                          isValid={touched.city && !errors.city}
                          isInvalid={touched.city && errors.city}
                        />

                        <Form.Control.Feedback type="invalid">
                          City is required
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group
                        as={Col}
                        md={4}
                        controlId="state"
                        className="mb-3 position-relative">
                        <Form.Label>Email</Form.Label>

                        <Form.Control
                          required
                          type="text"
                          name="email"
                          placeholder="Email"
                          onBlur={handleBlur}
                          onChange={handleChange}
                          value={values.email}
                          isInvalid={touched.email && errors.email}
                          isValid={touched.email && !errors.email}
                        />

                        <Form.Control.Feedback type="invalid">
                          Email is required
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group
                        as={Col}
                        md={4}
                        controlId="password"
                        className="mb-3 position-relative">
                        <Form.Label>Password</Form.Label>

                        <Form.Control
                          required
                          type="text"
                          name="password"
                          placeholder="Password"
                          value={values.password}
                          onBlur={handleBlur}
                          onChange={handleChange}
                          isInvalid={touched.password && errors.password}
                          isValid={touched.password && !errors.password}
                        />

                        <Form.Control.Feedback type="invalid">
                          Password is required
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Row>

                    <Form.Group controlId="agree" className="position-relative mb-3">
                      <Form.Check
                        type="checkbox"
                        name="agree"
                        label="Agree to terms and conditions"
                        onBlur={handleBlur}
                        value={values.agree}
                        onChange={handleChange}
                        checked={values.agree}
                        isInvalid={touched.agree && errors.agree}
                        required
                        feedbackType="invalid"
                        feedback="You must agree before submitting"
                      />
                    </Form.Group>

                    <Button type="submit">Submit form</Button>
                  </form>
                );
              }}
            </Formik>
          </Card>
        </Col>

   
      </Row>
    </div>
  );
}

const basicFormSchema = yup.object().shape({
  Name: yup.string().required("first name is required"),
  mobileNumber: yup.string().required("Mobile Numberis required"),
  username: yup.string().required("select any option"),
  city: yup.string().required("city is required"),
  password: yup.string().required("password is required"),
  agree: yup.bool().oneOf([true], "terms must be accepted"),
  email: yup.string().required("Required")
});
