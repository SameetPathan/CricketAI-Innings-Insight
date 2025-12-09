import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Row, Col, Card, Alert, Badge } from 'react-bootstrap';
import { FaPlusCircle, FaUsers, FaSave, FaArrowRight } from 'react-icons/fa';
import { db } from './firebase';
import { ref, push, set, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './AddMatch.css';

const AddMatch = () => {
  const [matchDetails, setMatchDetails] = useState({
    matchType: 'Friendly Match',
    tournamentId: '',
    matchTitle: '',
    matchNumber: '',
    matchDate: '',
    matchTime: '',
    venue: '',
    matchFormat: 'T20',
    overs: 20,
    tournamentStage: 'Group',
    status: 'upcoming',
  });

  const [team1, setTeam1] = useState({ name: '', players: [] });
  const [team2, setTeam2] = useState({ name: '', players: [] });
  const [currentStep, setCurrentStep] = useState(1);
  const [newPlayer, setNewPlayer] = useState({ name: '', role: 'Batsman' });
  const [selectedTeam, setSelectedTeam] = useState(1);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch available players from database
    const fetchPlayers = async () => {
      try {
        const snapshot = await get(ref(db, 'users'));
        if (snapshot.exists()) {
          const users = snapshot.val();
          const players = Object.entries(users)
            .filter(([_, user]) => user.userType === 'Player')
            .map(([uid, user]) => ({ uid, ...user }));
          setAvailablePlayers(players);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    };
    fetchPlayers();
  }, []);

  const onChange = (e) =>
    setMatchDetails({ ...matchDetails, [e.target.name]: e.target.value });

  const addPlayerToTeam = (teamNum) => {
    if (!newPlayer.name.trim()) {
      toast.error('Please enter player name');
      return;
    }

    const player = {
      id: Date.now(),
      name: newPlayer.name,
      role: newPlayer.role,
    };

    if (teamNum === 1) {
      setTeam1({ ...team1, players: [...team1.players, player] });
    } else {
      setTeam2({ ...team2, players: [...team2.players, player] });
    }

    setNewPlayer({ name: '', role: 'Batsman' });
  };

  const removePlayer = (teamNum, playerId) => {
    if (teamNum === 1) {
      setTeam1({ ...team1, players: team1.players.filter(p => p.id !== playerId) });
    } else {
      setTeam2({ ...team2, players: team2.players.filter(p => p.id !== playerId) });
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    
    if (currentStep === 1) {
      if (!matchDetails.matchTitle || !matchDetails.matchDate || !matchDetails.venue) {
        toast.error('Please fill all required fields');
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!team1.name || !team2.name) {
        toast.error('Please enter both team names');
        return;
      }
      if (team1.players.length < 11 || team2.players.length < 11) {
        toast.error('Each team must have at least 11 players');
        return;
      }
      setCurrentStep(3);
      return;
    }

    // Final submission
    try {
      const matchesRef = ref(db, 'matches');
      const newMatchRef = push(matchesRef);
      const matchId = newMatchRef.key;

      const matchData = {
        ...matchDetails,
        id: matchId,
        team1: {
          ...team1,
          score: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
        },
        team2: {
          ...team2,
          score: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
        },
        currentInnings: 1,
        currentBattingTeam: 1,
        createdAt: new Date().toISOString(),
      };

      await set(newMatchRef, matchData);
      toast.success('Match created successfully!');
      navigate(`/match/${matchId}/score`);
    } catch (error) {
      console.error('Error adding match:', error);
      toast.error('Failed to add match. Please try again.');
    }
  };

  return (
    <div className="add-match-container">
      <Container>
        <div className="match-form-wrapper">
          <Card className="match-form-card">
            <Card.Body className="p-4 p-md-5">
              <div className="step-indicator mb-4">
                <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
                  <span className="step-number">1</span>
                  <span className="step-label">Match Details</span>
                </div>
                <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
                  <span className="step-number">2</span>
                  <span className="step-label">Teams</span>
                </div>
                <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
                  <span className="step-number">3</span>
                  <span className="step-label">Review</span>
                </div>
              </div>

              <Form onSubmit={submitHandler}>
                {currentStep === 1 && (
                  <div className="step-content">
                    <h2 className="form-title mb-4">
                      <FaPlusCircle className="me-2" /> Match Information
                    </h2>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Match Type</Form.Label>
                          <Form.Select name="matchType" value={matchDetails.matchType} onChange={onChange}>
                            <option>Friendly Match</option>
                            <option>Practice Match</option>
                            <option>Tournament Match</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      {matchDetails.matchType === 'Tournament Match' && (
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Tournament Stage</Form.Label>
                            <Form.Select name="tournamentStage" value={matchDetails.tournamentStage} onChange={onChange}>
                              <option>Group</option>
                              <option>Knockout</option>
                              <option>Final</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      )}
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Match Title</Form.Label>
                      <Form.Control
                        type="text"
                        name="matchTitle"
                        placeholder="e.g., India vs Australia"
                        value={matchDetails.matchTitle}
                        onChange={onChange}
                        required
                      />
                    </Form.Group>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Date</Form.Label>
                          <Form.Control
                            type="date"
                            name="matchDate"
                            value={matchDetails.matchDate}
                            onChange={onChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Time</Form.Label>
                          <Form.Control
                            type="time"
                            name="matchTime"
                            value={matchDetails.matchTime}
                            onChange={onChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Venue</Form.Label>
                      <Form.Control
                        type="text"
                        name="venue"
                        placeholder="Enter match venue"
                        value={matchDetails.venue}
                        onChange={onChange}
                        required
                      />
                    </Form.Group>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Match Format</Form.Label>
                          <Form.Select name="matchFormat" value={matchDetails.matchFormat} onChange={onChange}>
                            <option>T20</option>
                            <option>ODI</option>
                            <option>Test</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Overs per Innings</Form.Label>
                          <Form.Control
                            type="number"
                            name="overs"
                            placeholder="e.g., 20"
                            value={matchDetails.overs}
                            onChange={onChange}
                            required
                            min="1"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="step-content">
                    <h2 className="form-title mb-4">
                      <FaUsers className="me-2" /> Team Setup
                    </h2>

                    <Row>
                      <Col md={6}>
                        <Card className="team-card mb-4">
                          <Card.Body>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-bold">Team 1 Name</Form.Label>
                              <Form.Control
                                type="text"
                                placeholder="Enter Team 1 name"
                                value={team1.name}
                                onChange={(e) => setTeam1({ ...team1, name: e.target.value })}
                                required
                              />
                            </Form.Group>

                            <div className="players-list mb-3">
                              <h6 className="mb-3">Players ({team1.players.length})</h6>
                              {team1.players.map((player) => (
                                <Badge key={player.id} bg="primary" className="me-2 mb-2 player-badge">
                                  {player.name} ({player.role})
                                  <button
                                    type="button"
                                    className="btn-close btn-close-white ms-2"
                                    onClick={() => removePlayer(1, player.id)}
                                    style={{ fontSize: '0.7rem' }}
                                  />
                                </Badge>
                              ))}
                            </div>

                            <Row className="mb-3">
                              <Col md={7}>
                                <Form.Control
                                  type="text"
                                  placeholder="Player name"
                                  value={newPlayer.name}
                                  onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && selectedTeam === 1) {
                                      e.preventDefault();
                                      addPlayerToTeam(1);
                                    }
                                  }}
                                />
                              </Col>
                              <Col md={5}>
                                <Form.Select
                                  value={newPlayer.role}
                                  onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value })}
                                >
                                  <option>Batsman</option>
                                  <option>Bowler</option>
                                  <option>All-rounder</option>
                                  <option>Wicket-keeper</option>
                                </Form.Select>
                              </Col>
                            </Row>
                            <Button
                              type="button"
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setSelectedTeam(1);
                                addPlayerToTeam(1);
                              }}
                              className="w-100"
                            >
                              Add to Team 1
                            </Button>
                          </Card.Body>
                        </Card>
                      </Col>

                      <Col md={6}>
                        <Card className="team-card mb-4">
                          <Card.Body>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-bold">Team 2 Name</Form.Label>
                              <Form.Control
                                type="text"
                                placeholder="Enter Team 2 name"
                                value={team2.name}
                                onChange={(e) => setTeam2({ ...team2, name: e.target.value })}
                                required
                              />
                            </Form.Group>

                            <div className="players-list mb-3">
                              <h6 className="mb-3">Players ({team2.players.length})</h6>
                              {team2.players.map((player) => (
                                <Badge key={player.id} bg="success" className="me-2 mb-2 player-badge">
                                  {player.name} ({player.role})
                                  <button
                                    type="button"
                                    className="btn-close btn-close-white ms-2"
                                    onClick={() => removePlayer(2, player.id)}
                                    style={{ fontSize: '0.7rem' }}
                                  />
                                </Badge>
                              ))}
                            </div>

                            <Row className="mb-3">
                              <Col md={7}>
                                <Form.Control
                                  type="text"
                                  placeholder="Player name"
                                  value={newPlayer.name}
                                  onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && selectedTeam === 2) {
                                      e.preventDefault();
                                      addPlayerToTeam(2);
                                    }
                                  }}
                                />
                              </Col>
                              <Col md={5}>
                                <Form.Select
                                  value={newPlayer.role}
                                  onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value })}
                                >
                                  <option>Batsman</option>
                                  <option>Bowler</option>
                                  <option>All-rounder</option>
                                  <option>Wicket-keeper</option>
                                </Form.Select>
                              </Col>
                            </Row>
                            <Button
                              type="button"
                              variant="outline-success"
                              size="sm"
                              onClick={() => {
                                setSelectedTeam(2);
                                addPlayerToTeam(2);
                              }}
                              className="w-100"
                            >
                              Add to Team 2
                            </Button>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <Alert variant="info" className="mt-3">
                      <strong>Note:</strong> Each team must have at least 11 players. You can add more players as substitutes.
                    </Alert>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="step-content">
                    <h2 className="form-title mb-4">Review & Confirm</h2>
                    <Card className="review-card mb-4">
                      <Card.Body>
                        <h5 className="mb-3">Match Details</h5>
                        <p><strong>Title:</strong> {matchDetails.matchTitle}</p>
                        <p><strong>Type:</strong> {matchDetails.matchType}</p>
                        <p><strong>Format:</strong> {matchDetails.matchFormat}</p>
                        <p><strong>Overs:</strong> {matchDetails.overs}</p>
                        <p><strong>Date:</strong> {matchDetails.matchDate}</p>
                        <p><strong>Time:</strong> {matchDetails.matchTime}</p>
                        <p><strong>Venue:</strong> {matchDetails.venue}</p>
                      </Card.Body>
                    </Card>

                    <Row>
                      <Col md={6}>
                        <Card className="review-card">
                          <Card.Body>
                            <h5 className="mb-3">{team1.name}</h5>
                            <p><strong>Players:</strong> {team1.players.length}</p>
                            <ul className="list-unstyled">
                              {team1.players.map((p) => (
                                <li key={p.id}>• {p.name} ({p.role})</li>
                              ))}
                            </ul>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6}>
                        <Card className="review-card">
                          <Card.Body>
                            <h5 className="mb-3">{team2.name}</h5>
                            <p><strong>Players:</strong> {team2.players.length}</p>
                            <ul className="list-unstyled">
                              {team2.players.map((p) => (
                                <li key={p.id}>• {p.name} ({p.role})</li>
                              ))}
                            </ul>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                )}

                <div className="form-actions mt-4">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="me-2"
                    >
                      Previous
                    </Button>
                  )}
                  <Button type="submit" variant="primary" className="gradient-btn">
                    {currentStep < 3 ? (
                      <>
                        Next <FaArrowRight className="ms-2" />
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" /> Create Match
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

export default AddMatch;
