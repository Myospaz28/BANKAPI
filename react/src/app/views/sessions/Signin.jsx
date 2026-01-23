import { Link, useNavigate } from "react-router-dom";
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { Formik } from "formik";
import * as yup from "yup";
import { useState } from "react";

import jwtAuthService from "app/services/jwtAuthService";
import { userLoggedIn } from "app/redux/auth/authSlice";

import TextField from "app/components/sessions/TextField";
import SocialButtons from "app/components/sessions/SocialButtons";

/**
 * ✅ Validation schema (ONLY required checks)
 * ❌ NO password length validation
 */
const validationSchema = yup.object().shape({
  username: yup.string().required("Username is required"),
  password: yup.string().required("Password is required"),
});

export default function Signin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const initialValues = {
    username: "",
    password: "",
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);

      const result = await jwtAuthService.loginWithUsernameAndPassword(values);

      if (result?.token) {
        dispatch(
          userLoggedIn({
            accessToken: result.token,
            user: result,
          })
        );
        navigate("/");
      } else {
        throw new Error("Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      window.alert("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout-wrap">
      <div className="auth-content">
        <Card className="o-hidden">
          <Row>
            {/* LEFT */}
            <Col md={6}>
              <div className="p-4">
                <div className="auth-logo text-center mb-4">
                  <img src="/assets/images/logo.png" alt="Logo" />
                </div>

                <h1 className="mb-3 text-18">Sign In</h1>

                <Formik
                  initialValues={initialValues}
                  validationSchema={validationSchema}
                  onSubmit={handleSubmit}
                >
                  {({
                    values,
                    errors,
                    touched,
                    handleChange,
                    handleBlur,
                    handleSubmit,
                  }) => (
                    <form onSubmit={handleSubmit}>
                      {/* USERNAME */}
                      <TextField
                        type="text"
                        name="username"
                        label="Username"
                        onBlur={handleBlur}
                        value={values.username}
                        onChange={handleChange}
                        helperText={errors.username}
                        error={errors.username && touched.username}
                      />

                      {/* PASSWORD */}
                      <TextField
                        type="password"
                        name="password"
                        label="Password"
                        onBlur={handleBlur}
                        value={values.password}
                        onChange={handleChange}
                        helperText={errors.password}
                        error={errors.password && touched.password}
                      />

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-rounded btn-primary w-100 my-1 mt-2"
                      >
                        {loading ? "Please wait..." : "Sign In"}
                      </button>
                    </form>
                  )}
                </Formik>

                <div className="mt-3 text-center">
                  <Link to="/sessions/forgot-password" className="text-muted">
                    Forgot Password?
                  </Link>
                </div>
              </div>
            </Col>

            {/* RIGHT */}
            <Col md={6} className="text-center auth-cover">
              <div className="pe-3 auth-right">
                <SocialButtons
                  routeUrl="/sessions/signup"
                  googleHandler={() => alert("Google login not implemented")}
                  facebookHandler={() => alert("Facebook login not implemented")}
                />
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
}
