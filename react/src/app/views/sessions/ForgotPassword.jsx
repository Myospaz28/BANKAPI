import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Card, Col, Row } from "react-bootstrap";
import { Formik } from "formik";
import * as yup from "yup";

import { resetPassword } from "app/redux/auth/authSlice";
import TextField from "app/components/sessions/TextField";
import SocialButtons from "app/components/sessions/SocialButtons";

const validationSchema = yup.object().shape({
  email: yup.string().email("Invalid email").required("email is required")
});

export default function ForgotPassword() {
  const dispatch = useDispatch();

  const initialValues = { email: "watson@example.com" };

  const handleSubmit = (value) => {
    dispatch(resetPassword(value));
  };

  return (
    <div className="auth-layout-wrap">
      <div className="auth-content">
        <Card className="o-hidden">
          <Row>
            <Col md={6}>
              <div className="p-4">
                <div className="auth-logo text-center mb-4">
                  <img src="/assets/images/logo.jpeg" alt="Gull" />
                </div>

                <h1 className="mb-3 text-18">Forgot Password</h1>

                <Formik
                  onSubmit={handleSubmit}
                  initialValues={initialValues}
                  validationSchema={validationSchema}>
                  {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
                    <form onSubmit={handleSubmit}>
                      <TextField
                        type="email"
                        name="email"
                        label="Email address"
                        onBlur={handleBlur}
                        value={values.email}
                        onChange={handleChange}
                        helperText={errors.email}
                        error={errors.email && touched.email}
                      />

                      <button className="btn btn-rounded btn-primary w-100 mt-2" type="submit">
                        Reset Password
                      </button>
                    </form>
                  )}
                </Formik>

                <div className="mt-3 text-center">
                  <Link to="/sessions/signin" className="text-muted">
                    Go back to signin
                  </Link>
                </div>
              </div>
            </Col>

            <Col md={6} className="text-center auth-cover">
              <div className="pe-3 auth-right">
                <SocialButtons
                  routeUrl="/sessions/signup"
                  googleHandler={() => alert("google")}
                  facebookHandler={() => alert("facebook")}
                />
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
}
