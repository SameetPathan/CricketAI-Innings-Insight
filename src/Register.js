import React, { useState } from 'react';
import { Container, Form, Button, Row, Col, Card } from 'react-bootstrap';
import { FaUserPlus, FaEnvelope, FaLock, FaUser, FaCalendar, FaPhone, FaUserTag, FaArrowRight } from 'react-icons/fa';
import { ref, set, get, push } from 'firebase/database';
import { db } from './firebase';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'Scorer',
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const submitHandler = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    if (formData.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setLoading(true);
    
    try {
      // Check if email already exists
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        const emailExists = Object.values(users).some(user => user.email === formData.email);
        
        if (emailExists) {
          toast.error('Email already registered. Please use a different email.');
          setLoading(false);
          return;
        }
      }

      // Create new user in Realtime Database
      const newUserRef = push(ref(db, 'users'));
      const userId = newUserRef.key;

      const userData = {
        uid: userId,
        fullName: formData.fullName,
        dob: formData.dob,
        phone: formData.phone,
        email: formData.email,
        password: formData.password, // Store password (in production, hash it)
        userType: formData.userType,
        createdAt: new Date().toISOString(),
        approvalStatus: 'pending', // Default status for Scorers
      };

      await set(newUserRef, userData);

      toast.success('Registration successful! Your account is pending approval. You will be able to login once approved by Master Admin.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error("Error during registration: ", error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-background">
        <div className="gradient-overlay-register"></div>
        <div className="floating-shapes-register">
          <div className="shape-register shape-1"></div>
          <div className="shape-register shape-2"></div>
          <div className="shape-register shape-3"></div>
        </div>
      </div>
      
      <Container className="register-container-wrapper">
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col xs={12} md={10} lg={8} xl={7}>
            <Card className="register-card-modern">
              <Card.Body className="p-4 p-md-5">
                <div className="register-header-modern">
                  <div className="icon-wrapper-register">
                    <FaUserPlus />
                  </div>
                  <h1 className="register-title-modern">Create Account</h1>
                  <p className="register-subtitle-modern">Join CricketAI and start your journey</p>
                </div>

                <Form onSubmit={submitHandler} className="register-form-modern">
                  <Form.Group className="mb-3 form-group-register">
                    <Form.Label className="form-label-register">
                      <FaUserTag className="me-2" /> Register As
                    </Form.Label>
                    <Form.Select
                      name="userType"
                      value={formData.userType}
                      onChange={onChange}
                      className="form-control-register"
                    >
                      <option>Scorer</option>
                    </Form.Select>
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3 form-group-register">
                        <Form.Label className="form-label-register">
                          <FaUser className="me-2" /> Full Name
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={onChange}
                          required
                          className="form-control-register"
                          placeholder="Enter your full name"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3 form-group-register">
                        <Form.Label className="form-label-register">
                          <FaCalendar className="me-2" /> Date of Birth
                        </Form.Label>
                        <Form.Control
                          type="date"
                          name="dob"
                          value={formData.dob}
                          onChange={onChange}
                          required
                          className="form-control-register"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3 form-group-register">
                        <Form.Label className="form-label-register">
                          <FaPhone className="me-2" /> Phone Number
                        </Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={onChange}
                          required
                          className="form-control-register"
                          placeholder="Enter phone number"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3 form-group-register">
                        <Form.Label className="form-label-register">
                          <FaEnvelope className="me-2" /> Email Address
                        </Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={onChange}
                          required
                          className="form-control-register"
                          placeholder="Enter your email"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3 form-group-register">
                        <Form.Label className="form-label-register">
                          <FaLock className="me-2" /> Password
                        </Form.Label>
                        <Form.Control
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={onChange}
                          required
                          className="form-control-register"
                          placeholder="Enter password"
                          minLength="6"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3 form-group-register">
                        <Form.Label className="form-label-register">
                          <FaLock className="me-2" /> Confirm Password
                        </Form.Label>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={onChange}
                          required
                          className="form-control-register"
                          placeholder="Confirm password"
                          minLength="6"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-100 register-btn-modern"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account <FaArrowRight className="ms-2" />
                      </>
                    )}
                  </Button>
                </Form>

                <div className="register-footer-modern mt-4 text-center">
                  <p className="mb-0">
                    Already have an account? <Link to="/login" className="login-link-register">Sign in</Link>
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Register;
