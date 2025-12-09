import React, { useState } from 'react';
import { Container, Form, Button, Row, Col, Card, Alert } from 'react-bootstrap';
import { FaTrophy, FaImage, FaUser, FaEnvelope, FaLock, FaSave, FaArrowRight } from 'react-icons/fa';
import { db } from './firebase';
import { ref, push, set, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './AddTournament.css';

const AddTournament = () => {
  const [tournamentData, setTournamentData] = useState({
    tournamentName: '',
    logo: '',
  });

  const [adminData, setAdminData] = useState({
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
  });

  const [scorerData, setScorerData] = useState({
    scorerName: '',
    scorerEmail: '',
    scorerPassword: '',
    scorerConfirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTournamentChange = (e) => {
    setTournamentData({ ...tournamentData, [e.target.name]: e.target.value });
  };

  const handleAdminChange = (e) => {
    setAdminData({ ...adminData, [e.target.name]: e.target.value });
  };

  const handleScorerChange = (e) => {
    setScorerData({ ...scorerData, [e.target.name]: e.target.value });
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    
    if (!tournamentData.tournamentName.trim()) {
      return toast.error('Please enter tournament name');
    }

    if (!adminData.adminName.trim()) {
      return toast.error('Please enter admin name');
    }

    if (!adminData.adminEmail.trim()) {
      return toast.error('Please enter admin email');
    }

    if (adminData.adminPassword !== adminData.confirmPassword) {
      return toast.error('Admin passwords do not match');
    }

    if (adminData.adminPassword.length < 6) {
      return toast.error('Admin password must be at least 6 characters');
    }

    setLoading(true);
    
    try {
      // Check if admin email already exists
      const usersRef = ref(db, 'users');
      const usersSnapshot = await get(usersRef);
      
      if (usersSnapshot.exists()) {
        const users = usersSnapshot.val();
        const emailExists = Object.values(users).some(user => user.email === adminData.adminEmail);
        
        if (emailExists) {
          toast.error('Admin email already exists. Please use a different email.');
          setLoading(false);
          return;
        }
      }

      // Create tournament
      const tournamentsRef = ref(db, 'tournaments');
      const newTournamentRef = push(tournamentsRef);
      const tournamentId = newTournamentRef.key;

      const tournament = {
        id: tournamentId,
        tournamentName: tournamentData.tournamentName,
        logo: tournamentData.logo || '',
        createdAt: new Date().toISOString(),
        status: 'active',
      };

      await set(newTournamentRef, tournament);

      // Create admin user
      const newAdminRef = push(ref(db, 'users'));
      const adminId = newAdminRef.key;

      const adminUser = {
        uid: adminId,
        fullName: adminData.adminName,
        email: adminData.adminEmail,
        password: adminData.adminPassword,
        userType: 'Admin',
        tournamentId: tournamentId,
        tournamentName: tournamentData.tournamentName,
        createdAt: new Date().toISOString(),
        approvalStatus: 'approved', // Admins are auto-approved
      };

      await set(newAdminRef, adminUser);

      // Create scorer user if provided
      if (scorerData.scorerName.trim() && scorerData.scorerEmail.trim() && scorerData.scorerPassword) {
        // Check if scorer email already exists
        if (usersSnapshot.exists()) {
          const users = usersSnapshot.val();
          const scorerEmailExists = Object.values(users).some(user => user.email === scorerData.scorerEmail);
          
          if (scorerEmailExists) {
            toast.error('Scorer email already exists. Tournament and Admin created, but scorer was not added.');
            setTimeout(() => {
              navigate('/dashboard');
            }, 1500);
            setLoading(false);
            return;
          }
        }

        if (scorerData.scorerPassword !== scorerData.scorerConfirmPassword) {
          toast.error('Scorer passwords do not match. Tournament and Admin created, but scorer was not added.');
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
          setLoading(false);
          return;
        }

        if (scorerData.scorerPassword.length < 6) {
          toast.error('Scorer password must be at least 6 characters. Tournament and Admin created, but scorer was not added.');
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
          setLoading(false);
          return;
        }

        const newScorerRef = push(ref(db, 'users'));
        const scorerId = newScorerRef.key;

        const scorerUser = {
          uid: scorerId,
          fullName: scorerData.scorerName,
          email: scorerData.scorerEmail,
          password: scorerData.scorerPassword,
          userType: 'Scorer',
          tournamentId: tournamentId,
          tournamentName: tournamentData.tournamentName,
          createdAt: new Date().toISOString(),
          approvalStatus: 'approved', // Auto-approved when created with tournament
        };

        await set(newScorerRef, scorerUser);
        toast.success('Tournament, Admin, and Scorer created successfully!');
      } else {
        toast.success('Tournament and Admin created successfully!');
      }

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error('Failed to create tournament. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-tournament-container">
      <Container>
        <div className="tournament-form-wrapper">
          <Card className="tournament-form-card">
            <Card.Body className="p-4 p-md-5">
              <div className="form-header mb-4">
                <h1 className="form-title">
                  <FaTrophy className="me-2" /> Create Tournament
                </h1>
                <p className="form-subtitle">Create a new tournament and assign an admin</p>
              </div>

              <Form onSubmit={submitHandler}>
                <div className="section-divider mb-4">
                  <h3 className="section-title">Tournament Details</h3>
                </div>

                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-4 form-group-custom">
                      <Form.Label className="fw-bold">
                        <FaTrophy className="me-2" /> Tournament Name
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="tournamentName"
                        placeholder="Enter tournament name"
                        value={tournamentData.tournamentName}
                        onChange={handleTournamentChange}
                        required
                        className="form-control-custom"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-4 form-group-custom">
                      <Form.Label className="fw-bold">
                        <FaImage className="me-2" /> Logo URL (Optional)
                      </Form.Label>
                      <Form.Control
                        type="url"
                        name="logo"
                        placeholder="Enter logo URL"
                        value={tournamentData.logo}
                        onChange={handleTournamentChange}
                        className="form-control-custom"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="section-divider mb-4 mt-5">
                  <h3 className="section-title">Create Tournament Admin</h3>
                  <p className="section-subtitle">This admin will manage this tournament</p>
                </div>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-4 form-group-custom">
                      <Form.Label className="fw-bold">
                        <FaUser className="me-2" /> Admin Name
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="adminName"
                        placeholder="Enter admin full name"
                        value={adminData.adminName}
                        onChange={handleAdminChange}
                        required
                        className="form-control-custom"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-4 form-group-custom">
                      <Form.Label className="fw-bold">
                        <FaEnvelope className="me-2" /> Admin Email
                      </Form.Label>
                      <Form.Control
                        type="email"
                        name="adminEmail"
                        placeholder="Enter admin email"
                        value={adminData.adminEmail}
                        onChange={handleAdminChange}
                        required
                        className="form-control-custom"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-4 form-group-custom">
                      <Form.Label className="fw-bold">
                        <FaLock className="me-2" /> Admin Password
                      </Form.Label>
                      <Form.Control
                        type="password"
                        name="adminPassword"
                        placeholder="Enter admin password"
                        value={adminData.adminPassword}
                        onChange={handleAdminChange}
                        required
                        minLength="6"
                        className="form-control-custom"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-4 form-group-custom">
                      <Form.Label className="fw-bold">
                        <FaLock className="me-2" /> Confirm Password
                      </Form.Label>
                      <Form.Control
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm admin password"
                        value={adminData.confirmPassword}
                        onChange={handleAdminChange}
                        required
                        minLength="6"
                        className="form-control-custom"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="section-divider mb-4 mt-5">
                  <h3 className="section-title">Create Tournament Scorer (Optional)</h3>
                  <p className="section-subtitle">Add a scorer for this tournament</p>
                </div>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-4 form-group-custom">
                      <Form.Label className="fw-bold">
                        <FaUser className="me-2" /> Scorer Name
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="scorerName"
                        placeholder="Enter scorer full name"
                        value={scorerData.scorerName}
                        onChange={handleScorerChange}
                        className="form-control-custom"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-4 form-group-custom">
                      <Form.Label className="fw-bold">
                        <FaEnvelope className="me-2" /> Scorer Email
                      </Form.Label>
                      <Form.Control
                        type="email"
                        name="scorerEmail"
                        placeholder="Enter scorer email"
                        value={scorerData.scorerEmail}
                        onChange={handleScorerChange}
                        className="form-control-custom"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-4 form-group-custom">
                      <Form.Label className="fw-bold">
                        <FaLock className="me-2" /> Scorer Password
                      </Form.Label>
                      <Form.Control
                        type="password"
                        name="scorerPassword"
                        placeholder="Enter scorer password (min 6 characters)"
                        value={scorerData.scorerPassword}
                        onChange={handleScorerChange}
                        minLength="6"
                        className="form-control-custom"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-4 form-group-custom">
                      <Form.Label className="fw-bold">
                        <FaLock className="me-2" /> Confirm Password
                      </Form.Label>
                      <Form.Control
                        type="password"
                        name="scorerConfirmPassword"
                        placeholder="Confirm scorer password"
                        value={scorerData.scorerConfirmPassword}
                        onChange={handleScorerChange}
                        minLength="6"
                        className="form-control-custom"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Alert variant="info" className="mt-4">
                  <strong>Note:</strong> The admin account will be created automatically and can login immediately. Scorer is optional and can be added later.
                </Alert>

                <div className="form-actions mt-4">
                  <Button
                    type="button"
                    variant="outline-secondary"
                    onClick={() => navigate('/dashboard')}
                    className="me-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="gradient-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" /> Create Tournament
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
};

export default AddTournament;

