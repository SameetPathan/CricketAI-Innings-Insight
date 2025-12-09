import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { FaTrophy, FaCog, FaUsers, FaClock, FaLayerGroup, FaUser, FaCalendarAlt, FaFutbol, FaCalendar } from 'react-icons/fa';
import { db } from '../../firebase';
import { ref, onValue } from 'firebase/database';
import TournamentManagementModal from './TournamentManagementModal';
import ScheduleGroupMatchesModal from './ScheduleGroupMatchesModal';
import SchedulePlayoffsModal from './SchedulePlayoffsModal';
import './AdminDashboard.css';

const AdminDashboard = ({ user }) => {
  const [adminTournament, setAdminTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showScheduleMatchesModal, setShowScheduleMatchesModal] = useState(false);
  const [showSchedulePlayoffsModal, setShowSchedulePlayoffsModal] = useState(false);

  useEffect(() => {
    if (user?.tournamentId) {
      const tournamentRef = ref(db, `tournaments/${user.tournamentId}`);
      
      const unsubscribeTournament = onValue(tournamentRef, (snapshot) => {
        if (snapshot.exists()) {
          const tournamentData = snapshot.val();
          setAdminTournament({ id: user.tournamentId, ...tournamentData });
        }
        setLoading(false);
      });

      return () => unsubscribeTournament();
    } else {
      setLoading(false);
    }
  }, [user]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <Container>
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading tournament...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (!adminTournament) {
    return (
      <div className="admin-dashboard-container">
        <Container>
          <Card className="empty-tournament-card">
            <Card.Body className="text-center p-5">
              <FaTrophy size={64} className="mb-3 text-muted" />
              <h3>No Tournament Assigned</h3>
              <p className="text-muted">Please contact Master Admin to assign a tournament.</p>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <Container>
        <div className="dashboard-header mb-5">
          <h1 className="dashboard-title">
            Welcome, {user.fullName || 'Admin'}!
          </h1>
          <p className="dashboard-subtitle">
            Tournament Admin Dashboard
          </p>
        </div>

        <Row className="mb-4">
          <Col md={12}>
            <Card className="tournament-overview-card">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap mb-4">
                  <div className="tournament-header-section">
                    <h2 className="tournament-name mb-2">
                      <FaTrophy className="me-2" /> {adminTournament.tournamentName}
                    </h2>
                    <p className="text-muted mb-0">
                      <FaClock className="me-2" />
                      Created: {formatDate(adminTournament.createdAt)}
                    </p>
                  </div>
                  <div className="d-flex gap-2 flex-wrap mt-2 mt-md-0">
                    <Button
                      variant="primary"
                      onClick={() => setShowTournamentModal(true)}
                      className="manage-tournament-btn"
                      size="lg"
                    >
                      <FaCog className="me-2" /> Manage Tournament
                    </Button>
                  </div>
                </div>

                <Row className="mt-4">
                  <Col md={6} className="mb-3">
                    <Card className="action-card schedule-matches-card">
                      <Card.Body className="text-center p-4">
                        <div className="card-icon-wrapper mb-3">
                          <FaCalendar size={48} />
                        </div>
                        <Card.Title className="mb-3">Schedule Matches</Card.Title>
                        <Card.Text className="mb-4">
                          Schedule group matches for your tournament
                        </Card.Text>
                        <Button
                          variant="primary"
                          onClick={() => setShowScheduleMatchesModal(true)}
                          className="w-100"
                          size="lg"
                        >
                          <FaFutbol className="me-2" /> Schedule Group Matches
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Card className="action-card schedule-playoffs-card">
                      <Card.Body className="text-center p-4">
                        <div className="card-icon-wrapper mb-3">
                          <FaTrophy size={48} />
                        </div>
                        <Card.Title className="mb-3">Schedule Playoffs</Card.Title>
                        <Card.Text className="mb-4">
                          Schedule playoff matches (Quarter Final, Semi Final, Final)
                        </Card.Text>
                        <Button
                          variant="success"
                          onClick={() => setShowSchedulePlayoffsModal(true)}
                          className="w-100"
                          size="lg"
                        >
                          <FaTrophy className="me-2" /> Schedule Playoffs
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {adminTournament.tournamentDetails && (
                  <div className="tournament-details-preview">
                    <Row>
                      <Col md={3} className="mb-3">
                        <div className="detail-item-card">
                          <div className="detail-icon">
                            <FaLayerGroup />
                          </div>
                          <div className="detail-content">
                            <div className="detail-label">Groups</div>
                            <div className="detail-value">
                              {adminTournament.tournamentDetails.numberOfGroups || 'Not set'}
                            </div>
                          </div>
                        </div>
                      </Col>
                      <Col md={3} className="mb-3">
                        <div className="detail-item-card">
                          <div className="detail-icon">
                            <FaUsers />
                          </div>
                          <div className="detail-content">
                            <div className="detail-label">Teams/Group</div>
                            <div className="detail-value">
                              {adminTournament.tournamentDetails.teamsPerGroup || 'Not set'}
                            </div>
                          </div>
                        </div>
                      </Col>
                      <Col md={3} className="mb-3">
                        <div className="detail-item-card">
                          <div className="detail-icon">
                            <FaUsers />
                          </div>
                          <div className="detail-content">
                            <div className="detail-label">Total Teams</div>
                            <div className="detail-value">
                              {adminTournament.tournamentDetails.numberOfTeams || 'Not set'}
                            </div>
                          </div>
                        </div>
                      </Col>
                      <Col md={3} className="mb-3">
                        <div className="detail-item-card">
                          <div className="detail-icon">
                            <FaUser />
                          </div>
                          <div className="detail-content">
                            <div className="detail-label">Players/Team</div>
                            <div className="detail-value">
                              {adminTournament.tournamentDetails.playersPerTeam || 'Not set'}
                            </div>
                          </div>
                        </div>
                      </Col>
                      <Col md={3} className="mb-3">
                        <div className="detail-item-card">
                          <div className="detail-icon">
                            <FaTrophy />
                          </div>
                          <div className="detail-content">
                            <div className="detail-label">Overs/Innings</div>
                            <div className="detail-value">
                              {adminTournament.tournamentDetails.oversPerInnings || 'Not set'}
                            </div>
                          </div>
                        </div>
                      </Col>
                      <Col md={3} className="mb-3">
                        <div className="detail-item-card">
                          <div className="detail-icon">
                            <FaCog />
                          </div>
                          <div className="detail-content">
                            <div className="detail-label">Max Overs/Player</div>
                            <div className="detail-value">
                              {adminTournament.tournamentDetails.maxOversPerPlayer || 'Not set'}
                            </div>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <TournamentManagementModal
        show={showTournamentModal}
        onHide={() => setShowTournamentModal(false)}
        tournament={adminTournament}
      />

      <ScheduleGroupMatchesModal
        show={showScheduleMatchesModal}
        onHide={() => setShowScheduleMatchesModal(false)}
        tournament={adminTournament}
      />

      <SchedulePlayoffsModal
        show={showSchedulePlayoffsModal}
        onHide={() => setShowSchedulePlayoffsModal(false)}
        tournament={adminTournament}
      />
    </div>
  );
};

export default AdminDashboard;
