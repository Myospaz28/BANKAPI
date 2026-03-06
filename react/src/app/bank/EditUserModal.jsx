// import React from 'react';
// import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
// import { Formik } from 'formik';
// import * as yup from 'yup';
// import api from './../services/api.js';

// /* ================= HELPERS ================= */
// const minutesToTime = (minutes) => {
//   if (minutes === '' || minutes === null) return null;
//   const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
//   const mm = String(minutes % 60).padStart(2, '0');
//   return `${hh}:${mm}:00`;
// };

// /* ================= COMPONENT ================= */
// export default function EditUserModal({
//   show,
//   onHide,
//   selectedUser,
//   onSuccess,
// }) {
//   return (
//     <Modal show={show} onHide={onHide} centered size="lg">
//       <Modal.Header closeButton>
//         <Modal.Title>Edit User</Modal.Title>
//       </Modal.Header>

//       <Formik
//         enableReinitialize
//         initialValues={{
//           users_id: selectedUser?.users_id || '',
//           name: selectedUser?.name || '',
//           username: selectedUser?.username || '',
//           email: selectedUser?.email || '',
//           mobile: selectedUser?.mobile || '',
//           address: selectedUser?.address || '',
//           login_time: selectedUser?.login_time || '',
//           logout_time: selectedUser?.logout_time || '',
//           log_session_time: selectedUser?.log_session_time || '',
//           latitude: selectedUser?.latitude || '',
//           longitude: selectedUser?.longitude || '',
//           new_password: '',
//         }}
//         validationSchema={editUserSchema}
//         onSubmit={async (values, { setSubmitting }) => {
//           try {
//             const payload = {
//               ...values,
//               log_session_time: minutesToTime(values.log_session_time),
//             };

//             await api.put('auth/update-user', payload);
//             onSuccess();
//             onHide();
//           } catch (err) {
//             console.error('❌ Update User Failed', err);
//           } finally {
//             setSubmitting(false);
//           }
//         }}
//       >
//         {({
//           values,
//           errors,
//           touched,
//           handleChange,
//           handleSubmit,
//           isSubmitting,
//         }) => (
//           <Form onSubmit={handleSubmit}>
//             <Modal.Body>
//               {/* ================= BASIC DETAILS ================= */}
//               <Row>
//                 <Col md={4}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>Name</Form.Label>
//                     <Form.Control
//                       name="name"
//                       value={values.name}
//                       onChange={handleChange}
//                       isInvalid={touched.name && errors.name}
//                     />
//                     <Form.Control.Feedback type="invalid">
//                       {errors.name}
//                     </Form.Control.Feedback>
//                   </Form.Group>
//                 </Col>

//                 <Col md={4}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>Mobile</Form.Label>
//                     <Form.Control
//                       name="mobile"
//                       value={values.mobile}
//                       onChange={handleChange}
//                       isInvalid={touched.mobile && errors.mobile}
//                     />
//                     <Form.Control.Feedback type="invalid">
//                       {errors.mobile}
//                     </Form.Control.Feedback>
//                   </Form.Group>
//                 </Col>

//                 <Col md={4}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>Username</Form.Label>
//                     <Form.Control
//                       name="username"
//                       value={values.username}
//                       onChange={handleChange}
//                       isInvalid={touched.username && errors.username}
//                     />
//                     <Form.Control.Feedback type="invalid">
//                       {errors.username}
//                     </Form.Control.Feedback>
//                   </Form.Group>
//                 </Col>
//               </Row>

//               <Row>
//                 <Col md={6}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>Email</Form.Label>
//                     <Form.Control
//                       name="email"
//                       value={values.email}
//                       onChange={handleChange}
//                       isInvalid={touched.email && errors.email}
//                     />
//                     <Form.Control.Feedback type="invalid">
//                       {errors.email}
//                     </Form.Control.Feedback>
//                   </Form.Group>
//                 </Col>

//                 <Col md={6}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>Address</Form.Label>
//                     <Form.Control
//                       as="textarea"
//                       rows={2}
//                       name="address"
//                       value={values.address}
//                       onChange={handleChange}
//                       isInvalid={touched.address && errors.address}
//                     />
//                     <Form.Control.Feedback type="invalid">
//                       {errors.address}
//                     </Form.Control.Feedback>
//                   </Form.Group>
//                 </Col>
//               </Row>

//               {/* ================= LOGIN / SESSION ================= */}
//               <Row>
//                 <Col md={4}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>Login Time</Form.Label>
//                     <Form.Control
//                       type="time"
//                       name="login_time"
//                       value={values.login_time}
//                       onChange={handleChange}
//                     />
//                   </Form.Group>
//                 </Col>

//                 <Col md={4}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>Logout Time</Form.Label>
//                     <Form.Control
//                       type="time"
//                       name="logout_time"
//                       value={values.logout_time}
//                       onChange={handleChange}
//                     />
//                   </Form.Group>
//                 </Col>

//                 <Col md={4}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>Session Time (Minutes)</Form.Label>
//                     <Form.Control
//                       type="number"
//                       min="0"
//                       name="log_session_time"
//                       value={values.log_session_time}
//                       onChange={handleChange}
//                     />
//                   </Form.Group>
//                 </Col>
//               </Row>

//               {/* ================= LOCATION ================= */}
//               <Row>
//                 <Col md={6}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>Latitude</Form.Label>
//                     <Form.Control
//                       type="number"
//                       step="0.00000001"
//                       name="latitude"
//                       value={values.latitude}
//                       onChange={handleChange}
//                     />
//                   </Form.Group>
//                 </Col>

//                 <Col md={6}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>Longitude</Form.Label>
//                     <Form.Control
//                       type="number"
//                       step="0.00000001"
//                       name="longitude"
//                       value={values.longitude}
//                       onChange={handleChange}
//                     />
//                   </Form.Group>
//                 </Col>
//               </Row>

//               {/* ================= PASSWORD ================= */}
//               <Row>
//                 <Col md={12}>
//                   <Form.Group className="mb-3">
//                     <Form.Label>New Password</Form.Label>
//                     <Form.Control
//   type="password"
//   name="new_password"
//   value={values.new_password}
//   onChange={handleChange}
//   placeholder="Leave blank to keep current password"
//   autoComplete="new-password"
//   isInvalid={touched.new_password && errors.new_password}
// />
//                     <Form.Control.Feedback type="invalid">
//                       {errors.new_password}
//                     </Form.Control.Feedback>
//                   </Form.Group>
//                 </Col>
//               </Row>
//             </Modal.Body>

//             <Modal.Footer>
//               <Button
//                 variant="secondary"
//                 onClick={onHide}
//                 disabled={isSubmitting}
//               >
//                 Cancel
//               </Button>
//               <Button type="submit" variant="primary" disabled={isSubmitting}>
//                 {isSubmitting ? 'Updating...' : 'Update User'}
//               </Button>
//             </Modal.Footer>
//           </Form>
//         )}
//       </Formik>
//     </Modal>
//   );
// }

// /* ================= VALIDATION ================= */
// const editUserSchema = yup.object().shape({
//   name: yup.string().required('Name is required'),
//   mobile: yup.string().required('Mobile is required'),
//   username: yup.string().required('Username is required'),
//   email: yup.string().email('Invalid email').required('Email is required'),
//   address: yup.string().required('Address is required'),
//   new_password: yup.string().min(6, 'Minimum 6 characters').notRequired(),
// });
import React from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { Formik } from 'formik';
import * as yup from 'yup';
import api from './../services/api.js';

/* ================= HELPERS ================= */
const minutesToTime = (minutes) => {
  if (minutes === '' || minutes === null) return null;
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}:00`;
};

/* ================= COMPONENT ================= */
export default function EditUserModal({
  show,
  onHide,
  selectedUser,
  onSuccess,
}) {
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Edit User</Modal.Title>
      </Modal.Header>

      <Formik
        enableReinitialize
        initialValues={{
          users_id: selectedUser?.users_id || '',
          name: selectedUser?.name || '',
          username: selectedUser?.username || '',
          email: selectedUser?.email || '',
          mobile: selectedUser?.mobile || '',
          address: selectedUser?.address || '',
          login_time: selectedUser?.login_time || '',
          logout_time: selectedUser?.logout_time || '',
          log_session_time: selectedUser?.log_session_time || '',
          latitude: selectedUser?.latitude || '',
          longitude: selectedUser?.longitude || '',
          new_password: '',
        }}
        validationSchema={editUserSchema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            const payload = {
              ...values,
              log_session_time: minutesToTime(values.log_session_time),
            };

            await api.put('auth/update-user', payload);
            onSuccess();
            onHide();
          } catch (err) {
            console.error('❌ Update User Failed', err);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleSubmit,
          isSubmitting,
        }) => (
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              {/* ================= BASIC DETAILS ================= */}
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Name</Form.Label>
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
                    <Form.Label>Mobile</Form.Label>
                    <Form.Control
                      name="mobile"
                      value={values.mobile}
                      onChange={handleChange}
                      isInvalid={touched.mobile && errors.mobile}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.mobile}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                      name="username"
                      value={values.username}
                      onChange={handleChange}
                      isInvalid={touched.username && errors.username}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.username}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      name="email"
                      value={values.email}
                      onChange={handleChange}
                      isInvalid={touched.email && errors.email}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Address</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="address"
                      value={values.address}
                      onChange={handleChange}
                      isInvalid={touched.address && errors.address}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.address}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              {/* ================= LOGIN / SESSION ================= */}
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
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* ================= LOCATION ================= */}
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Latitude</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.00000001"
                      name="latitude"
                      value={values.latitude}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Longitude</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.00000001"
                      name="longitude"
                      value={values.longitude}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* ================= PASSWORD ================= */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>New Password</Form.Label>
                    <Form.Control
  type="password"
  name="new_password"
  value={values.new_password}
  onChange={handleChange}
  placeholder="Leave blank to keep current password"
  autoComplete="new-password"
  isInvalid={touched.new_password && errors.new_password}
/>
                    <Form.Control.Feedback type="invalid">
                      {errors.new_password}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={onHide}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update User'}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}

/* ================= VALIDATION ================= */
const editUserSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  mobile: yup.string().required('Mobile is required'),
  username: yup.string().required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  address: yup.string().required('Address is required'),
  new_password: yup.string().min(6, 'Minimum 6 characters').notRequired(),
});