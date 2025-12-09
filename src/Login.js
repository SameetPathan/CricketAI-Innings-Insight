import React, { useState } from 'react';
import { Container, Form, Button, Row, Col, Card } from 'react-bootstrap';
import { FaSignInAlt, FaEnvelope, FaLock, FaUserTag, FaArrowRight } from 'react-icons/fa';
import { ref, get } from "firebase/database";
import { db } from './firebase';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('Master Admin');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      
      if (!snapshot.exists()) {
        toast.error('No users found. Please register first.');
        setLoading(false);
        return;
      }

      const users = snapshot.val();
      
      // Find user by email and userType
      const userEntry = Object.entries(users).find(([uid, userData]) => {
        return userData.email === email && userData.userType === userType;
      });

      if (!userEntry) {
        toast.error(`No ${userType} found with this email.`);
        setLoading(false);
        return;
      }

      const [userId, userData] = userEntry;

      // Check password
      if (userData.password !== password) {
        toast.error('Invalid password. Please try again.');
        setLoading(false);
        return;
      }

      // Check approval status for Scorers
      if (userType === 'Scorer') {
        if (!userData.approvalStatus || userData.approvalStatus === 'pending') {
          toast.error('Your account is pending approval. Please wait for Master Admin approval.');
          setLoading(false);
          return;
        } else if (userData.approvalStatus === 'rejected') {
          toast.error('Your account has been rejected. Please contact Master Admin.');
          setLoading(false);
          return;
        }
      }
      
      // Store user in session
      sessionStorage.setItem('authUser', JSON.stringify({ uid: userId, ...userData }));
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      console.error("Error during login: ", error);
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="gradient-overlay-login"></div>
        <div className="floating-shapes">
          <div className="shape-login shape-1"></div>
          <div className="shape-login shape-2"></div>
          <div className="shape-login shape-3"></div>
        </div>
      </div>
      
      <Container className="login-container-wrapper">
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col xs={12} md={8} lg={6} xl={5}>
            <Card className="login-card-modern">
              <Card.Body className="p-4 p-md-5">
                <div className="login-header-modern">
                  <div className="icon-wrapper-modern">
                    <FaSignInAlt />
                  </div>
                  <h1 className="login-title-modern">Welcome Back</h1>
                  <p className="login-subtitle-modern">Sign in to continue to CricketAI</p>
                </div>

                <Form onSubmit={submitHandler} className="login-form-modern">
                  <Form.Group className="mb-4 form-group-modern">
                    <Form.Label className="form-label-modern">
                      <FaEnvelope className="me-2" /> Email Address
                    </Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="form-control-modern"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4 form-group-modern">
                    <Form.Label className="form-label-modern">
                      <FaLock className="me-2" /> Password
                    </Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="form-control-modern"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4 form-group-modern">
                    <Form.Label className="form-label-modern">
                      <FaUserTag className="me-2" /> Login As
                    </Form.Label>
                    <Form.Select
                      value={userType}
                      onChange={(e) => setUserType(e.target.value)}
                      className="form-control-modern"
                    >
                      <option>Master Admin</option>
                      <option>Admin</option>
                      <option>Scorer</option>
                    </Form.Select>
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-100 login-btn-modern"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In <FaArrowRight className="ms-2" />
                      </>
                    )}
                  </Button>
                </Form>

                <div className="login-footer-modern mt-4 text-center">
                  <p className="mb-0">
                    New to CricketAI? <Link to="/register" className="register-link-modern">Create an account</Link>
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

export default Login;
