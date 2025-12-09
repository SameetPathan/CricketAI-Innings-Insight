import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Form, Table } from 'react-bootstrap';
import { FaTrophy, FaEdit, FaTrash, FaUser, FaEnvelope, FaLock, FaImage, FaArrowRight, FaClock, FaUserPlus, FaPhone, FaCalendar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { ref, onValue, remove, update, get, push, set } from 'firebase/database';
import { toast } from 'react-toastify';
import './MasterAdminDashboard.css';

const MasterAdminDashboard = ({ user }) => {
  const [tournaments, setTournaments] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAdminEditModal, setShowAdminEditModal] = useState(false);
  const [showAddScorerModal, setShowAddScorerModal] = useState(false);
  const [showEditScorerModal, setShowEditScorerModal] = useState(false);
  const [showDeleteScorerModal, setShowDeleteScorerModal] = useState(false);
  const [showViewScorersModal, setShowViewScorersModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedScorer, setSelectedScorer] = useState(null);
  const [editTournamentData, setEditTournamentData] = useState({ tournamentName: '', logo: '' });
  const [editAdminData, setEditAdminData] = useState({ adminName: '', adminEmail: '', adminPassword: '', confirmPassword: '' });
  const [scorerData, setScorerData] = useState({ fullName: '', email: '', password: '', confirmPassword: '', phone: '', dob: '' });

  useEffect(() => {
    const tournamentsRef = ref(db, 'tournaments');
    
    const unsubscribeTournaments = onValue(tournamentsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const tournamentsData = snapshot.val();
        const tournamentsList = await Promise.all(
          Object.entries(tournamentsData).map(async ([id, tournament]) => {
            const usersRef = ref(db, 'users');
            const usersSnapshot = await get(usersRef);
            let admin = null;
            let scorers = [];
            
            if (usersSnapshot.exists()) {
              const users = usersSnapshot.val();
              admin = Object.values(users).find(u => u.tournamentId === id && u.userType === 'Admin');
              scorers = Object.entries(users)
                .map(([uid, user]) => ({ uid, ...user }))
                .filter(u => u.tournamentId === id && u.userType === 'Scorer');
            }
            
            return { id, ...tournament, admin, scorers };
          })
        );
        setTournaments(tournamentsList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
      } else {
        setTournaments([]);
      }
    });

    return () => unsubscribeTournaments();
  }, []);


  const handleEditTournament = (tournament) => {
    setSelectedTournament(tournament);
    setEditTournamentData({
      tournamentName: tournament.tournamentName || '',
      logo: tournament.logo || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateTournament = async () => {
    if (!editTournamentData.tournamentName.trim()) {
      return toast.error('Tournament name is required');
    }

    try {
      const tournamentRef = ref(db, `tournaments/${selectedTournament.id}`);
      await update(tournamentRef, {
        tournamentName: editTournamentData.tournamentName,
        logo: editTournamentData.logo || '',
        updatedAt: new Date().toISOString(),
      });
      toast.success('Tournament updated successfully!');
      setShowEditModal(false);
      setSelectedTournament(null);
    } catch (error) {
      console.error('Error updating tournament:', error);
      toast.error('Failed to update tournament');
    }
  };

  const handleDeleteTournament = async () => {
    try {
      await remove(ref(db, `tournaments/${selectedTournament.id}`));
      if (selectedTournament.admin) {
        await remove(ref(db, `users/${selectedTournament.admin.uid}`));
      }
      // Delete all scorers linked to this tournament
      if (selectedTournament.scorers && selectedTournament.scorers.length > 0) {
        for (const scorer of selectedTournament.scorers) {
          await remove(ref(db, `users/${scorer.uid}`));
        }
      }
      toast.success('Tournament deleted successfully!');
      setShowDeleteModal(false);
      setSelectedTournament(null);
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast.error('Failed to delete tournament');
    }
  };

  const handleEditAdmin = (tournament) => {
    setSelectedTournament(tournament);
    setSelectedAdmin(tournament.admin);
    setEditAdminData({
      adminName: tournament.admin?.fullName || '',
      adminEmail: tournament.admin?.email || '',
      adminPassword: '',
      confirmPassword: '',
    });
    setShowAdminEditModal(true);
  };

  const handleUpdateAdmin = async () => {
    if (!editAdminData.adminName.trim() || !editAdminData.adminEmail.trim()) {
      return toast.error('All fields are required');
    }

    if (editAdminData.adminPassword) {
      if (editAdminData.adminPassword !== editAdminData.confirmPassword) {
        return toast.error('Passwords do not match');
      }
      if (editAdminData.adminPassword.length < 6) {
        return toast.error('Password must be at least 6 characters');
      }
    }

    try {
      if (editAdminData.adminEmail !== selectedAdmin.email) {
        const usersRef = ref(db, 'users');
        const usersSnapshot = await get(usersRef);
        
        if (usersSnapshot.exists()) {
          const users = usersSnapshot.val();
          const emailExists = Object.entries(users).some(
            ([uid, user]) => user.email === editAdminData.adminEmail && uid !== selectedAdmin.uid
          );
          
          if (emailExists) {
            return toast.error('Email already exists. Please use a different email.');
          }
        }
      }

      const adminRef = ref(db, `users/${selectedAdmin.uid}`);
      const updateData = {
        fullName: editAdminData.adminName,
        email: editAdminData.adminEmail,
        updatedAt: new Date().toISOString(),
      };

      if (editAdminData.adminPassword) {
        updateData.password = editAdminData.adminPassword;
      }

      await update(adminRef, updateData);
      toast.success('Admin details updated successfully!');
      setShowAdminEditModal(false);
      setSelectedTournament(null);
      setSelectedAdmin(null);
    } catch (error) {
      console.error('Error updating admin:', error);
      toast.error('Failed to update admin details');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'success', text: 'Active' },
      inactive: { bg: 'secondary', text: 'Inactive' },
    };
    const badge = badges[status] || { bg: 'secondary', text: status };
    return <Badge bg={badge.bg}>{badge.text}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleAddScorer = (tournament) => {
    setSelectedTournament(tournament);
    setScorerData({ fullName: '', email: '', password: '', confirmPassword: '', phone: '', dob: '' });
    setShowAddScorerModal(true);
  };

  const handleCreateScorer = async () => {
    if (!scorerData.fullName.trim() || !scorerData.email.trim() || !scorerData.password) {
      return toast.error('Please fill all required fields');
    }

    if (scorerData.password !== scorerData.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    if (scorerData.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    try {
      // Check if email already exists
      const usersRef = ref(db, 'users');
      const usersSnapshot = await get(usersRef);
      
      if (usersSnapshot.exists()) {
        const users = usersSnapshot.val();
        const emailExists = Object.values(users).some(user => user.email === scorerData.email);
        
        if (emailExists) {
          return toast.error('Email already exists. Please use a different email.');
        }
      }

      // Create new scorer linked to tournament
      const newScorerRef = push(usersRef);
      const scorerId = newScorerRef.key;

      const scorerUserData = {
        uid: scorerId,
        fullName: scorerData.fullName.trim(),
        email: scorerData.email.trim(),
        password: scorerData.password,
        phone: scorerData.phone || '',
        dob: scorerData.dob || '',
        userType: 'Scorer',
        tournamentId: selectedTournament.id,
        tournamentName: selectedTournament.tournamentName,
        approvalStatus: 'approved', // Auto-approved when created by Master Admin
        createdAt: new Date().toISOString(),
      };

      await set(newScorerRef, scorerUserData);
      toast.success('Scorer created successfully! They can now login with their credentials.');
      setShowAddScorerModal(false);
      setSelectedTournament(null);
      setScorerData({ fullName: '', email: '', password: '', confirmPassword: '', phone: '', dob: '' });
    } catch (error) {
      console.error('Error creating scorer:', error);
      toast.error('Failed to create scorer');
    }
  };

  const handleEditScorer = (scorer) => {
    setSelectedScorer(scorer);
    setScorerData({
      fullName: scorer.fullName || '',
      email: scorer.email || '',
      password: '',
      confirmPassword: '',
      phone: scorer.phone || '',
      dob: scorer.dob || '',
    });
    setShowEditScorerModal(true);
  };

  const handleUpdateScorer = async () => {
    if (!scorerData.fullName.trim() || !scorerData.email.trim()) {
      return toast.error('Name and email are required');
    }

    if (scorerData.password) {
      if (scorerData.password !== scorerData.confirmPassword) {
        return toast.error('Passwords do not match');
      }
      if (scorerData.password.length < 6) {
        return toast.error('Password must be at least 6 characters');
      }
    }

    try {
      // Check for duplicate email if email is changed
      if (scorerData.email !== selectedScorer.email) {
        const usersRef = ref(db, 'users');
        const usersSnapshot = await get(usersRef);
        
        if (usersSnapshot.exists()) {
          const users = usersSnapshot.val();
          const emailExists = Object.values(users).some(
            (user) => user.email === scorerData.email && user.uid !== selectedScorer.uid
          );
          
          if (emailExists) {
            return toast.error('Email already exists. Please use a different email.');
          }
        }
      }

      const scorerRef = ref(db, `users/${selectedScorer.uid}`);
      const updateData = {
        fullName: scorerData.fullName.trim(),
        email: scorerData.email.trim(),
        phone: scorerData.phone || '',
        dob: scorerData.dob || '',
        updatedAt: new Date().toISOString(),
      };

      if (scorerData.password) {
        updateData.password = scorerData.password;
      }

      await update(scorerRef, updateData);
      toast.success('Scorer updated successfully!');
      setShowEditScorerModal(false);
      setSelectedScorer(null);
      setScorerData({ fullName: '', email: '', password: '', confirmPassword: '', phone: '', dob: '' });
    } catch (error) {
      console.error('Error updating scorer:', error);
      toast.error('Failed to update scorer');
    }
  };

  const handleDeleteScorer = async () => {
    try {
      await remove(ref(db, `users/${selectedScorer.uid}`));
      toast.success('Scorer deleted successfully!');
      setShowDeleteScorerModal(false);
      setSelectedScorer(null);
    } catch (error) {
      console.error('Error deleting scorer:', error);
      toast.error('Failed to delete scorer');
    }
  };

  return (
    <div className="master-admin-dashboard-container">
      <Container>
        <div className="dashboard-header mb-4">
          <h1 className="dashboard-title">
            Welcome, {user.fullName || 'Master Admin'}!
          </h1>
          <p className="dashboard-subtitle">
            Master Admin Dashboard
          </p>
        </div>

        <Row className="mb-4">
          <Col md={6} lg={4} className="mb-3">
            <Card className="action-card add-tournament-card">
              <Card.Body className="text-center">
                <div className="card-icon-wrapper">
                  <FaTrophy />
                </div>
                <Card.Title className="mt-3">Add Tournament</Card.Title>
                <Card.Text>
                  Create a new tournament and assign an admin.
                </Card.Text>
                <Link to="/add-tournament">
                  <Button variant="primary" className="action-btn">
                    Create Tournament <FaArrowRight className="ms-2" />
                  </Button>
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <div className="tournaments-section mb-5">
          <div className="section-header mb-4">
            <h2 className="section-title">
              <FaTrophy className="me-2" /> Tournaments
            </h2>
          </div>

          {tournaments.length === 0 ? (
            <div className="empty-state-container">
              <Card className="empty-state-card">
                <Card.Body className="text-center p-5">
                  <div className="empty-state-icon mb-4">
                    <FaTrophy size={64} />
                  </div>
                  <h3 className="empty-state-title mb-3">No tournaments found</h3>
                  <p className="empty-state-text mb-4">
                    Create your first tournament to get started!
                  </p>
                  <Link to="/add-tournament">
                    <Button variant="primary" className="empty-state-btn">
                      <FaTrophy className="me-2" /> Add Tournament
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </div>
          ) : (
            <Row>
              {tournaments.map((tournament) => (
                <Col key={tournament.id} md={6} lg={4} className="mb-4">
                  <Card className="tournament-card">
                    <Card.Body>
                      <div className="tournament-card-header mb-3">
                        <h5 className="tournament-card-title">{tournament.tournamentName}</h5>
                        {getStatusBadge(tournament.status)}
                      </div>

                      {tournament.logo && (
                        <div className="tournament-logo mb-3 text-center">
                          <img src={tournament.logo} alt={tournament.tournamentName} className="tournament-logo-img" />
                        </div>
                      )}

                      <div className="tournament-info mb-3">
                        <p className="tournament-detail">
                          <FaClock className="me-2" />
                          Created: {formatDate(tournament.createdAt)}
                        </p>
                        {tournament.admin && (
                          <p className="tournament-detail">
                            <FaUser className="me-2" />
                            Admin: {tournament.admin.fullName}
                          </p>
                        )}
                        {tournament.scorers && tournament.scorers.length > 0 && (
                          <p className="tournament-detail">
                            <FaUserPlus className="me-2" />
                            Scorers: {tournament.scorers.length}
                          </p>
                        )}
                      </div>

                      <div className="tournament-actions">
                        <Button
                          variant="primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEditTournament(tournament)}
                        >
                          <FaEdit className="me-1" /> Edit
                        </Button>
                        <Button
                          variant="info"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEditAdmin(tournament)}
                        >
                          <FaUser className="me-1" /> Edit Admin
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          className="me-2"
                          onClick={() => handleAddScorer(tournament)}
                        >
                          <FaUserPlus className="me-1" /> Add Scorer
                        </Button>
                        <Button
                          variant="warning"
                          size="sm"
                          className="me-2"
                          onClick={() => {
                            setSelectedTournament(tournament);
                            setShowViewScorersModal(true);
                          }}
                        >
                          <FaUserPlus className="me-1" /> View Scorers ({tournament.scorers?.length || 0})
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setSelectedTournament(tournament);
                            setShowDeleteModal(true);
                          }}
                        >
                          <FaTrash className="me-1" /> Delete
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </Container>

      {/* Edit Tournament Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><FaEdit className="me-2" /> Edit Tournament</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label><FaTrophy className="me-2" /> Tournament Name</Form.Label>
              <Form.Control
                type="text"
                value={editTournamentData.tournamentName}
                onChange={(e) => setEditTournamentData({ ...editTournamentData, tournamentName: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label><FaImage className="me-2" /> Logo URL (Optional)</Form.Label>
              <Form.Control
                type="url"
                value={editTournamentData.logo}
                onChange={(e) => setEditTournamentData({ ...editTournamentData, logo: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleUpdateTournament}>Update Tournament</Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Tournament Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><FaTrash className="me-2" /> Delete Tournament</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete <strong>{selectedTournament?.tournamentName}</strong>?</p>
          <p className="text-danger">This action cannot be undone. The tournament and its admin will be permanently deleted.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteTournament}>Delete Tournament</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Admin Modal */}
      <Modal show={showAdminEditModal} onHide={() => setShowAdminEditModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaUser className="me-2" /> Edit Admin Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label><FaUser className="me-2" /> Admin Name</Form.Label>
              <Form.Control
                type="text"
                value={editAdminData.adminName}
                onChange={(e) => setEditAdminData({ ...editAdminData, adminName: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label><FaEnvelope className="me-2" /> Admin Email</Form.Label>
              <Form.Control
                type="email"
                value={editAdminData.adminEmail}
                onChange={(e) => setEditAdminData({ ...editAdminData, adminEmail: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label><FaLock className="me-2" /> New Password (Leave blank to keep current)</Form.Label>
              <Form.Control
                type="password"
                value={editAdminData.adminPassword}
                onChange={(e) => setEditAdminData({ ...editAdminData, adminPassword: e.target.value })}
                placeholder="Enter new password"
              />
            </Form.Group>
            {editAdminData.adminPassword && (
              <Form.Group className="mb-3">
                <Form.Label><FaLock className="me-2" /> Confirm Password</Form.Label>
                <Form.Control
                  type="password"
                  value={editAdminData.confirmPassword}
                  onChange={(e) => setEditAdminData({ ...editAdminData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAdminEditModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleUpdateAdmin}>Update Admin</Button>
        </Modal.Footer>
      </Modal>

      {/* Add Scorer Modal */}
      <Modal show={showAddScorerModal} onHide={() => {
        setShowAddScorerModal(false);
        setSelectedTournament(null);
      }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaUserPlus className="me-2" /> Add Scorer to {selectedTournament?.tournamentName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><FaUser className="me-2" /> Full Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={scorerData.fullName}
                    onChange={(e) => setScorerData({ ...scorerData, fullName: e.target.value })}
                    required
                    placeholder="Enter full name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><FaEnvelope className="me-2" /> Email *</Form.Label>
                  <Form.Control
                    type="email"
                    value={scorerData.email}
                    onChange={(e) => setScorerData({ ...scorerData, email: e.target.value })}
                    required
                    placeholder="Enter email"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><FaLock className="me-2" /> Password *</Form.Label>
                  <Form.Control
                    type="password"
                    value={scorerData.password}
                    onChange={(e) => setScorerData({ ...scorerData, password: e.target.value })}
                    required
                    placeholder="Enter password (min 6 characters)"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><FaLock className="me-2" /> Confirm Password *</Form.Label>
                  <Form.Control
                    type="password"
                    value={scorerData.confirmPassword}
                    onChange={(e) => setScorerData({ ...scorerData, confirmPassword: e.target.value })}
                    required
                    placeholder="Confirm password"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><FaPhone className="me-2" /> Phone (Optional)</Form.Label>
                  <Form.Control
                    type="tel"
                    value={scorerData.phone}
                    onChange={(e) => setScorerData({ ...scorerData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><FaCalendar className="me-2" /> Date of Birth (Optional)</Form.Label>
                  <Form.Control
                    type="date"
                    value={scorerData.dob}
                    onChange={(e) => setScorerData({ ...scorerData, dob: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowAddScorerModal(false);
            setSelectedTournament(null);
          }}>Cancel</Button>
          <Button variant="success" onClick={handleCreateScorer}>Create Scorer</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Scorer Modal */}
      <Modal show={showEditScorerModal} onHide={() => setShowEditScorerModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaEdit className="me-2" /> Edit Scorer Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><FaUser className="me-2" /> Full Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={scorerData.fullName}
                    onChange={(e) => setScorerData({ ...scorerData, fullName: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><FaEnvelope className="me-2" /> Email *</Form.Label>
                  <Form.Control
                    type="email"
                    value={scorerData.email}
                    onChange={(e) => setScorerData({ ...scorerData, email: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><FaLock className="me-2" /> New Password (Leave blank to keep current)</Form.Label>
                  <Form.Control
                    type="password"
                    value={scorerData.password}
                    onChange={(e) => setScorerData({ ...scorerData, password: e.target.value })}
                    placeholder="Enter new password"
                  />
                </Form.Group>
              </Col>
              {scorerData.password && (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><FaLock className="me-2" /> Confirm Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={scorerData.confirmPassword}
                      onChange={(e) => setScorerData({ ...scorerData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </Form.Group>
                </Col>
              )}
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><FaPhone className="me-2" /> Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    value={scorerData.phone}
                    onChange={(e) => setScorerData({ ...scorerData, phone: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><FaCalendar className="me-2" /> Date of Birth</Form.Label>
                  <Form.Control
                    type="date"
                    value={scorerData.dob}
                    onChange={(e) => setScorerData({ ...scorerData, dob: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditScorerModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleUpdateScorer}>Update Scorer</Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Scorer Modal */}
      <Modal show={showDeleteScorerModal} onHide={() => setShowDeleteScorerModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><FaTrash className="me-2" /> Delete Scorer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete scorer <strong>{selectedScorer?.fullName}</strong>?</p>
          <p className="text-danger">This action cannot be undone. The scorer account will be permanently deleted.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteScorerModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteScorer}>Delete Scorer</Button>
        </Modal.Footer>
      </Modal>

      {/* View Scorers Modal */}
      <Modal show={showViewScorersModal} onHide={() => {
        setShowViewScorersModal(false);
        setSelectedTournament(null);
      }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaUserPlus className="me-2" /> Scorers for {selectedTournament?.tournamentName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTournament?.scorers && selectedTournament.scorers.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Date of Birth</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedTournament.scorers.map((scorer) => (
                  <tr key={scorer.uid}>
                    <td>{scorer.fullName}</td>
                    <td>{scorer.email}</td>
                    <td>{scorer.phone || 'N/A'}</td>
                    <td>{scorer.dob ? formatDate(scorer.dob) : 'N/A'}</td>
                    <td>
                      <Badge bg={scorer.approvalStatus === 'approved' ? 'success' : scorer.approvalStatus === 'pending' ? 'warning' : 'danger'}>
                        {scorer.approvalStatus || 'pending'}
                      </Badge>
                    </td>
                    <td>{formatDate(scorer.createdAt)}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => {
                          setShowViewScorersModal(false);
                          handleEditScorer(scorer);
                        }}
                      >
                        <FaEdit className="me-1" /> Edit
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => {
                          setShowViewScorersModal(false);
                          setSelectedScorer(scorer);
                          setShowDeleteScorerModal(true);
                        }}
                      >
                        <FaTrash className="me-1" /> Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center p-4">
              <FaUserPlus size={48} className="mb-3 text-muted" />
              <p className="text-muted">No scorers added for this tournament yet.</p>
              <Button
                variant="success"
                onClick={() => {
                  setShowViewScorersModal(false);
                  handleAddScorer(selectedTournament);
                }}
              >
                <FaUserPlus className="me-2" /> Add Scorer
              </Button>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => {
            setShowViewScorersModal(false);
            handleAddScorer(selectedTournament);
          }}>
            <FaUserPlus className="me-2" /> Add New Scorer
          </Button>
          <Button variant="secondary" onClick={() => {
            setShowViewScorersModal(false);
            setSelectedTournament(null);
          }}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MasterAdminDashboard;

