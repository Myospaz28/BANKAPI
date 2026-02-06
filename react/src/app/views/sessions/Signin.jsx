


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

// /**
//  * ✅ Validation schema
//  */
// const validationSchema = yup.object().shape({
//   username: yup.string().required("Username is required"),
//   password: yup.string().required("Password is required"),
// });

// export default function Signin() {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(false);

//   const initialValues = {
//     username: "",
//     password: "",
//   };

//   const handleSubmit = async (values) => {
//     try {
//       setLoading(true);

//       // 🔐 Call backend login API
//       const result = await jwtAuthService.loginWithUsernameAndPassword(values);

//       /**
//        * Expected response shape:
//        * {
//        *   success: true,
//        *   user: { userId, name, username, email, role },
//        *   token
//        * }
//        */
//       if (result?.token && result?.user) {
//         // ✅ Store in Redux
//         dispatch(
//           userLoggedIn({
//             accessToken: result.token,
//             user: result.user,
//           })
//         );

//         // ✅ Persist token for API calls
//         localStorage.setItem("token", result.token);

//         // ✅ Redirect after login
//         navigate("/");
//       } else {
//         throw new Error("Invalid login response");
//       }
//     } catch (error) {
//       console.error("Login error:", error);
//       window.alert(
//         error?.response?.data?.message || "Invalid username or password"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="auth-layout-wrap">
//       <div className="auth-content">
//         <Card className="o-hidden">
//           <Row>
//             {/* LEFT SIDE */}
//             <Col md={6}>
//               <div className="p-4">
//                 <div className="auth-logo text-center mb-4">
//                   <img src="/assets/images/logo.jpeg" alt="Logo" />
//                 </div>

//                 <h1 className="mb-3 text-18">Sign In</h1>

//                 <Formik
//                   initialValues={initialValues}
//                   validationSchema={validationSchema}
//                   onSubmit={handleSubmit}
//                 >
//                   {({
//                     values,
//                     errors,
//                     touched,
//                     handleChange,
//                     handleBlur,
//                     handleSubmit,
//                   }) => (
//                     <form onSubmit={handleSubmit}>
//                       {/* USERNAME */}
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

//                       {/* PASSWORD */}
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

//                       <button
//                         type="submit"
//                         disabled={loading}
//                         className="btn btn-rounded btn-primary w-100 my-1 mt-2"
//                       >
//                         {loading ? "Please wait..." : "Sign In"}
//                       </button>
//                     </form>
//                   )}
//                 </Formik>

//                 {/* <div className="mt-3 text-center">
//                   <Link
//                     to="/sessions/forgot-password"
//                     className="text-muted"
//                   >
//                     Forgot Password?
//                   </Link>
//                 </div> */}
//               </div>
//             </Col>

//             {/* RIGHT SIDE */}
//             <Col md={6} className="text-center auth-cover">
//               <div className="pe-3 auth-right">
//                 <SocialButtons
//                   routeUrl="/sessions/signup"
//                   googleHandler={() =>
//                     alert("Google login not implemented")
//                   }
//                   facebookHandler={() =>
//                     alert("Facebook login not implemented")
//                   }
//                 />
//               </div>
//             </Col>
//           </Row>
//         </Card>
//       </div>
//     </div>
   

//   );
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
import SocialButtons from "app/components/sessions/SocialButtons";

/**
 * ✅ Validation schema
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

// const handleSubmit = async (values) => {
//   try {
//     setLoading(true);

//     const result = await jwtAuthService.loginWithUsernameAndPassword(values);

//     if (result?.token && result?.user) {
//       // ✅ Store in Redux
//       dispatch(
//         userLoggedIn({
//           accessToken: result.token,
//           user: result.user,
//         })
//       );

//       // localStorage.setItem("token", result.token);

//       localStorage.setItem(
//   "auth_user",
//   JSON.stringify({
//     user: result.user,
//     token: result.token,
//   })
// );


//       const sessionTime = result.user.log_session_time || "00:15:00";
//       startAutoLogout(sessionTime);

//       navigate("/");
//     } else {
//       throw new Error("Invalid login response");
//     }
//   } catch (error) {
//     console.error("Login error:", error);
//     window.alert(
//       error?.response?.data?.message || "Invalid username or password"
//     );
//   } finally {
//     setLoading(false);
//   }
// };

const handleSubmit = async (values) => {
  try {
    setLoading(true);

    const result = await jwtAuthService.loginWithUsernameAndPassword(values);

    if (result?.token && result?.user) {
      // ✅ Redux only
      dispatch(
        userLoggedIn({
          accessToken: result.token,
          user: result.user,
        })
      );

      // ❌ DO NOT TOUCH localStorage HERE
      // ❌ DO NOT SET session_expiry HERE

      navigate("/");
    } else {
      throw new Error("Invalid login response");
    }
  } catch (error) {
    console.error("Login error:", error);
    window.alert(
      error?.response?.data?.message || "Invalid username or password"
    );
  } finally {
    setLoading(false);
  }
};



  return (
    <div className="auth-layout-wrap">
      <div className="auth-content">
        <Card className="o-hidden">
          <Row>
            {/* LEFT SIDE */}
            <Col md={6}>
              <div className="p-4">
                <div className="auth-logo text-center mb-4">
                  <img src="/assets/images/logo.jpeg" alt="Logo" />
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
                        value={values.username}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        helperText={errors.username}
                        error={errors.username && touched.username}
                      />

                      {/* PASSWORD */}
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
                  <Link
                    to="/sessions/forgot-password"
                    className="text-muted"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>
            </Col>

            {/* RIGHT SIDE */}
            <Col md={6} className="text-center auth-cover">
              <div className="pe-3 auth-right">
                <SocialButtons
                  routeUrl="/sessions/signup"
                  googleHandler={() =>
                    alert("Google login not implemented")
                  }
                  facebookHandler={() =>
                    alert("Facebook login not implemented")
                  }
                />
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
}