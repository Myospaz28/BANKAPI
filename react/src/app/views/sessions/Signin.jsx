

// import { Link, useNavigate } from "react-router-dom";
// import { Card, Col, Row } from "react-bootstrap";
// import { useDispatch } from "react-redux";
// import { Formik } from "formik";
// import * as yup from "yup";
// import { useState } from "react";

// import jwtAuthService from "app/services/jwtAuthService";
// import { userLoggedIn } from "app/redux/auth/authSlice";

// import TextField from "app/components/sessions/TextField";
// import SocialButtons from "app/components/sessions/SocialButtons";


// const validationSchema = yup.object().shape({
//   username: yup.string().required("Username is required"),
//   password: yup.string().required("Password is required"),
// });

// const sessionExpiredFlag = localStorage.getItem("session_expired");

// export default function Signin() {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(false);

//   const initialValues = {
//     username: "",
//     password: "",
//   };


// let cachedLocation = null;
//  const getCurrentLocation = () =>
//   new Promise((resolve, reject) => {
//     if (cachedLocation) {
//       return resolve(cachedLocation);
//     }

//     navigator.geolocation.getCurrentPosition(
//       (pos) => {
//         cachedLocation = {
//           latitude: pos.coords.latitude,
//           longitude: pos.coords.longitude,
//         };
//         resolve(cachedLocation);
//       },
//       reject,
//       {
//         enableHighAccuracy: false,
//         maximumAge: 60000,
//       }
//     );
//   });

//   const handleSubmit = async (values) => {
//     try {
//       setLoading(true);

//       const location = await getCurrentLocation();

//       const result = await jwtAuthService.loginWithUsernameAndPassword({
//         ...values,
//         latitude: location.latitude,
//         longitude: location.longitude,
//         sessionExpired: sessionExpiredFlag === "true",

//       });
//       localStorage.removeItem("session_expired");

//       if (result?.token && result?.user) {
//         dispatch(
//           userLoggedIn({
//             accessToken: result.token,
//             user: result.user,
//           })
//         );

//         navigate("/");
//       } else {
//         throw new Error("Invalid login response");
//       }
//     } catch (error) {
//       console.error("Login error:", error);

//       alert(
//         error?.response?.data?.message ||
//           error?.message ||
//           "Unable to login"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };



//  return (
//   <div className="auth-layout-wrap d-flex align-items-center justify-content-center min-vh-100">
//     <div className="auth-content w-100">
//       <Row className="justify-content-center">
//         <Col xs={11} sm={9} md={7} lg={6} xl={5}>
//           <Card className="shadow border-0 rounded-4">
//             <Card.Body className="p-4 p-md-5">
              
//               {/* LOGO */}
//               <div className="text-center mb-4">
//                 <img
//                   src="/assets/images/logo.jpeg"
//                   alt="Logo"
//                   style={{
//                     maxWidth: "160px",
//                     width: "100%",
//                     height: "auto",
//                   }}
//                 />
//               </div>

//               {/* TITLE */}
//               <h4 className="text-center mb-4 fw-bold">
//                 Sign In to Your Account
//               </h4>

//               <Formik
//                 initialValues={initialValues}
//                 validationSchema={validationSchema}
//                 onSubmit={handleSubmit}
//               >
//                 {({
//                   values,
//                   errors,
//                   touched,
//                   handleChange,
//                   handleBlur,
//                   handleSubmit,
//                 }) => (
//                   <form onSubmit={handleSubmit}>
                    
//                     {/* USERNAME */}
//                     <div className="mb-3">
//                       <TextField
//                         type="text"
//                         name="username"
//                         label="Username"
//                         value={values.username}
//                         onChange={handleChange}
//                         onBlur={handleBlur}
//                         helperText={errors.username}
//                         error={errors.username && touched.username}
//                       />
//                     </div>

//                     {/* PASSWORD */}
//                     <div className="mb-3">
//                       <TextField
//                         type="password"
//                         name="password"
//                         label="Password"
//                         value={values.password}
//                         onChange={handleChange}
//                         onBlur={handleBlur}
//                         helperText={errors.password}
//                         error={errors.password && touched.password}
//                       />
//                     </div>

//                     {/* BUTTON */}
//                     <button
//                       type="submit"
//                       disabled={loading}
//                       className="btn btn-primary w-100 rounded-pill py-2"
//                     >
//                       {loading ? "Please wait..." : "Sign In"}
//                     </button>
//                   </form>
//                 )}
//               </Formik>

//               {/* FORGOT PASSWORD */}
//               {/* <div className="mt-3 text-center">
//                 <Link
//                   to="/sessions/forgot-password"
//                   className="text-muted"
//                 >
//                   Forgot Password?
//                 </Link>
//               </div> */}

//             </Card.Body>
//           </Card>
//         </Col>
//       </Row>
//     </div>
//   </div>
// );

// }




import { Link, useNavigate } from "react-router-dom";
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { Formik } from "formik";
import * as yup from "yup";
import { useState } from "react";

import jwtAuthService from "app/services/jwtAuthService";
import { userLoggedIn } from "app/redux/auth/authSlice";

import TextField from "app/components/sessions/TextField";

const validationSchema = yup.object().shape({
  username: yup.string().required("Username is required"),
  password: yup.string().required("Password is required"),
});

const sessionExpiredFlag = localStorage.getItem("session_expired");

export default function Signin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const initialValues = {
    username: "",
    password: "",
  };

  let cachedLocation = null;

  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (cachedLocation) return resolve(cachedLocation);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          cachedLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          resolve(cachedLocation);
        },
        (err) => reject(err),
        {
          enableHighAccuracy: false,
          maximumAge: 60000,
        }
      );
    });

  const performLogin = async (payload) => {
    const result = await jwtAuthService.loginWithUsernameAndPassword(payload);

    if (result?.token && result?.user) {
      dispatch(
        userLoggedIn({
          accessToken: result.token,
          user: result.user,
        })
      );
      navigate("/");
    } else {
      throw new Error("Invalid login response");
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);

      // 🔹 First attempt WITHOUT location
      try {
        await performLogin({
          ...values,
          sessionExpired: sessionExpiredFlag === "true",
        });

        localStorage.removeItem("session_expired");
        return;
      } catch (err) {
        // If backend says location required → fetch it
        if (
          err?.response?.data?.message === "Location required"
        ) {
          const location = await getCurrentLocation();

          await performLogin({
            ...values,
            latitude: location.latitude,
            longitude: location.longitude,
            sessionExpired: sessionExpiredFlag === "true",
          });

          localStorage.removeItem("session_expired");
          return;
        }

        throw err;
      }
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to login"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout-wrap d-flex align-items-center justify-content-center min-vh-100">
      <div className="auth-content w-100">
        <Row className="justify-content-center">
          <Col xs={11} sm={9} md={7} lg={6} xl={5}>
            <Card className="shadow border-0 rounded-4">
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <img
                    src="/assets/images/logo.jpeg"
                    alt="Logo"
                    style={{
                      maxWidth: "160px",
                      width: "100%",
                      height: "auto",
                    }}
                  />
                </div>

                <h4 className="text-center mb-4 fw-bold">
                  Sign In to Your Account
                </h4>

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
                      <div className="mb-3">
                        <TextField
                          type="text"
                          name="username"
                          label="Username"
                          value={values.username}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          helperText={errors.username}
                          error={errors.username && touched.username}
                        />
                      </div>

                      <div className="mb-3">
                        <TextField
                          type="password"
                          name="password"
                          label="Password"
                          value={values.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          helperText={errors.password}
                          error={errors.password && touched.password}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-100 rounded-pill py-2"
                      >
                        {loading ? "Please wait..." : "Sign In"}
                      </button>
                    </form>
                  )}
                </Formik>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}