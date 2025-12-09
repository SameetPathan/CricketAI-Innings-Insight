import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Tabs, Tab, ListGroup } from 'react-bootstrap';
import { FaList, FaFutbol, FaClock, FaTrophy, FaMapMarkerAlt, FaUsers, FaCalendarAlt, FaPlay, FaEye, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { ref, onValue, get } from 'firebase/database';
import './ScorerDashboard.css';

const ScorerDashboard = ({ user }) => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [groupMatches, setGroupMatches] = useState([]);
  const [playoffMatches, setPlayoffMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('group');
  const navigate = useNavigate();

  // Fetch tournaments linked to scorer
  useEffect(() => {
    if (!user?.tournamentId) {
      setLoading(false);
      return;
    }

    // Fetch tournament
    const tournamentRef = ref(db, `tournaments/${user.tournamentId}`);
    const unsubscribeTournament = onValue(tournamentRef, (snapshot) => {
      if (snapshot.exists()) {
        const tournamentData = { id: user.tournamentId, ...snapshot.val() };
        setTournaments([tournamentData]);
      } else {
        setTournaments([]);
      }
      setLoading(false);
    });

    return () => unsubscribeTournament();
  }, [user?.tournamentId]);

  // Fetch matches when tournament is selected
  useEffect(() => {
    if (!selectedTournament?.id) {
      setGroupMatches([]);
      setPlayoffMatches([]);
      return;
    }

    const matchesRef = ref(db, `tournaments/${selectedTournament.id}/matches`);
    const unsubscribeMatches = onValue(matchesRef, (snapshot) => {
      if (snapshot.exists()) {
        const matchesData = snapshot.val();
        const matchesList = Object.entries(matchesData)
          .map(([id, match]) => ({ id, ...match }))
          .sort((a, b) => {
            // Sort by match number first, then by date
            if (a.matchNumber !== b.matchNumber) {
              return (a.matchNumber || 0) - (b.matchNumber || 0);
            }
            return new Date(a.date || 0) - new Date(b.date || 0);
          });

        // Separate group and playoff matches
        const group = matchesList.filter(m => m.matchType === 'group');
        const playoff = matchesList.filter(m => m.matchType !== 'group');

        setGroupMatches(group);
        setPlayoffMatches(playoff);
      } else {
        setGroupMatches([]);
        setPlayoffMatches([]);
      }
    });

    return () => unsubscribeMatches();
  }, [selectedTournament?.id]);

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: { bg: 'info', text: 'Scheduled' },
      live: { bg: 'success', text: 'Live' },
      completed: { bg: 'primary', text: 'Completed' },
      cancelled: { bg: 'danger', text: 'Cancelled' },
    };
    const badge = badges[status] || { bg: 'secondary', text: status || 'Scheduled' };
    return <Badge bg={badge.bg}>{badge.text}</Badge>;
  };

  const getMatchTypeBadge = (matchType, matchTypeLabel) => {
    const typeLabels = {
      quarterfinal: { bg: 'info', text: 'Quarter Final' },
      semifinal: { bg: 'warning', text: 'Semi Final' },
      final: { bg: 'danger', text: 'Final' },
    };
    const badge = typeLabels[matchType] || { bg: 'secondary', text: matchTypeLabel || matchType || 'Group Match' };
    return <Badge bg={badge.bg}>{badge.text}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (date, time) => {
    const dateStr = formatDate(date);
    return time ? `${dateStr} at ${time}` : dateStr;
  };

  const handleStartMatch = (match) => {
    // Navigate to scorer match scoring screen
    navigate(`/scorer/tournament/${selectedTournament.id}/match/${match.id}/score`);
  };

  const handleViewMatchDetails = (match) => {
    // Navigate to match details view
    navigate(`/scorer/tournament/${selectedTournament.id}/match/${match.id}/details`);
  };

  if (loading) {
    return (
      <div className="scorer-dashboard-container">
        <Container>
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading tournaments...</p>
          </div>
        </Container>
      </div>
    );
  }

  // Show tournament list if no tournament is selected
  if (!selectedTournament) {
    return (
      <div className="scorer-dashboard-container">
        <Container>
          <div className="dashboard-header mb-4">
            <h1 className="dashboard-title">
              Welcome, {user.fullName || 'Scorer'}!
            </h1>
            <p className="dashboard-subtitle">
              Select a tournament to view matches
            </p>
          </div>

          {tournaments.length === 0 ? (
            <div className="empty-state-container">
              <Card className="empty-state-card">
                <Card.Body className="text-center p-5">
                  <div className="empty-state-icon mb-4">
                    <FaTrophy size={64} />
                  </div>
                  <h3 className="empty-state-title mb-3">No Tournament Assigned</h3>
                  <p className="empty-state-text mb-4">
                    Please contact Master Admin to assign a tournament.
                  </p>
                </Card.Body>
              </Card>
            </div>
          ) : (
            <Card className="tournaments-list-card">
              <Card.Header className="tournaments-list-header">
                <h3 className="mb-0">
                  <FaTrophy className="me-2" /> My Tournaments
                </h3>
              </Card.Header>
              <Card.Body className="p-0">
                <ListGroup variant="flush">
                  {tournaments.map((tournament) => (
                    <ListGroup.Item
                      key={tournament.id}
                      className="tournament-list-item"
                      onClick={() => setSelectedTournament(tournament)}
                    >
                      <div className="tournament-list-content">
                        <div className="tournament-list-info">
                          {tournament.logo && (
                            <img src={tournament.logo} alt={tournament.tournamentName} className="tournament-list-logo" />
                          )}
                          <div className="tournament-list-details">
                            <h5 className="tournament-list-name">{tournament.tournamentName}</h5>
                            <p className="tournament-list-meta">
                              <FaClock className="me-1" />
                              Created: {formatDate(tournament.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Button variant="primary" className="tournament-select-btn">
                          View Matches <FaArrowLeft className="ms-2" />
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card.Body>
            </Card>
          )}
        </Container>
      </div>
    );
  }

  // Show matches for selected tournament
  return (
    <div className="scorer-dashboard-container">
      <Container>
        <div className="dashboard-header mb-4">
          <Button
            variant="outline-light"
            className="back-button mb-3"
            onClick={() => setSelectedTournament(null)}
          >
            <FaArrowLeft className="me-2" /> Back to Tournaments
          </Button>
          <h1 className="dashboard-title">
            {selectedTournament.tournamentName}
          </h1>
          <p className="dashboard-subtitle">
            Match Schedule
          </p>
        </div>

        <Card className="matches-section-card">
          <Card.Body className="p-0">
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="matches-tabs"
              fill
            >
              <Tab
                eventKey="group"
                title={
                  <span className="tab-title">
                    <FaUsers className="me-2" />
                    Group Matches
                    {groupMatches.length > 0 && (
                      <Badge bg="info" className="ms-2">{groupMatches.length}</Badge>
                    )}
                  </span>
                }
              >
                <div className="tab-content-wrapper">
                  {groupMatches.length === 0 ? (
                    <div className="empty-state-container">
                      <Card className="empty-state-card">
                        <Card.Body className="text-center p-5">
                          <div className="empty-state-icon mb-4">
                            <FaFutbol size={64} />
                          </div>
                          <h3 className="empty-state-title mb-3">No Group Matches</h3>
                          <p className="empty-state-text mb-4">
                            No group matches scheduled yet for this tournament.
                          </p>
                        </Card.Body>
                      </Card>
                    </div>
                  ) : (
                    <ListGroup variant="flush" className="matches-list">
                      {groupMatches.map((match) => (
                        <ListGroup.Item key={match.id} className="match-list-item">
                          <div className="match-list-content">
                            <div className="match-list-info">
                              <div className="match-list-header">
                                <div className="match-number-badge">
                                  <Badge bg="primary">Match #{match.matchNumber || 'N/A'}</Badge>
                                </div>
                                {getStatusBadge(match.status)}
                              </div>
                              <div className="match-teams-list">
                                <div className="team-name-list">
                                  <strong>{match.team1Name || 'Team 1'}</strong>
                                  <span className="vs-text">vs</span>
                                  <strong>{match.team2Name || 'Team 2'}</strong>
                                </div>
                                {match.group1Name && match.group2Name && (
                                  <div className="match-groups">
                                    <Badge bg="secondary">{match.group1Name}</Badge>
                                    <span className="mx-2">vs</span>
                                    <Badge bg="secondary">{match.group2Name}</Badge>
                                  </div>
                                )}
                              </div>
                              <div className="match-details-list">
                                <span className="match-detail-item">
                                  <FaCalendarAlt className="me-2" />
                                  {formatDateTime(match.date, match.time)}
                                </span>
                                <span className="match-detail-item">
                                  <FaMapMarkerAlt className="me-2" />
                                  {match.place || 'Venue TBA'}
                                </span>
                              </div>
                            </div>
                            <div className="match-list-actions">
                              <Button
                                variant="success"
                                className="me-2"
                                onClick={() => handleStartMatch(match)}
                              >
                                <FaPlay className="me-2" /> Start Match
                              </Button>
                              <Button
                                variant="outline-primary"
                                onClick={() => handleViewMatchDetails(match)}
                              >
                                <FaEye className="me-2" /> View Details
                              </Button>
                            </div>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </div>
              </Tab>

              <Tab
                eventKey="playoff"
                title={
                  <span className="tab-title">
                    <FaTrophy className="me-2" />
                    Playoff Matches
                    {playoffMatches.length > 0 && (
                      <Badge bg="warning" className="ms-2">{playoffMatches.length}</Badge>
                    )}
                  </span>
                }
              >
                <div className="tab-content-wrapper">
                  {playoffMatches.length === 0 ? (
                    <div className="empty-state-container">
                      <Card className="empty-state-card">
                        <Card.Body className="text-center p-5">
                          <div className="empty-state-icon mb-4">
                            <FaTrophy size={64} />
                          </div>
                          <h3 className="empty-state-title mb-3">No Playoff Matches</h3>
                          <p className="empty-state-text mb-4">
                            No playoff matches scheduled yet for this tournament.
                          </p>
                        </Card.Body>
                      </Card>
                    </div>
                  ) : (
                    <ListGroup variant="flush" className="matches-list">
                      {playoffMatches.map((match) => (
                        <ListGroup.Item key={match.id} className="match-list-item">
                          <div className="match-list-content">
                            <div className="match-list-info">
                              <div className="match-list-header">
                                <div className="match-number-badge">
                                  <Badge bg="primary">Match #{match.matchNumber || 'N/A'}</Badge>
                                  {getMatchTypeBadge(match.matchType, match.matchTypeLabel)}
                                </div>
                                {getStatusBadge(match.status)}
                              </div>
                              <div className="match-teams-list">
                                <div className="team-name-list">
                                  <strong>{match.team1Name || 'Team 1'}</strong>
                                  <span className="vs-text">vs</span>
                                  <strong>{match.team2Name || 'Team 2'}</strong>
                                </div>
                              </div>
                              <div className="match-details-list">
                                <span className="match-detail-item">
                                  <FaCalendarAlt className="me-2" />
                                  {formatDateTime(match.date, match.time)}
                                </span>
                                <span className="match-detail-item">
                                  <FaMapMarkerAlt className="me-2" />
                                  {match.place || 'Venue TBA'}
                                </span>
                              </div>
                            </div>
                            <div className="match-list-actions">
                              <Button
                                variant="success"
                                className="me-2"
                                onClick={() => handleStartMatch(match)}
                              >
                                <FaPlay className="me-2" /> Start Match
                              </Button>
                              <Button
                                variant="outline-primary"
                                onClick={() => handleViewMatchDetails(match)}
                              >
                                <FaEye className="me-2" /> View Details
                              </Button>
                            </div>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </div>
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default ScorerDashboard;

