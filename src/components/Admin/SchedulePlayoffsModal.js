import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Table, Badge, Card, Alert } from 'react-bootstrap';
import { FaTrophy, FaSave, FaTrash, FaEdit, FaPlus, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { db } from '../../firebase';
import { ref, onValue, push, set, remove, get } from 'firebase/database';
import { toast } from 'react-toastify';
import './SchedulePlayoffsModal.css';

const SchedulePlayoffsModal = ({ show, onHide, tournament }) => {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchType, setMatchType] = useState('quarterfinal');
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [matchPlace, setMatchPlace] = useState('');
  const [editingMatch, setEditingMatch] = useState(null);

  // Fetch teams
  useEffect(() => {
    if (tournament?.id) {
      const teamsRef = ref(db, `tournaments/${tournament.id}/teams`);
      const unsubscribe = onValue(teamsRef, (snapshot) => {
        if (snapshot.exists()) {
          const teamsData = snapshot.val();
          setTeams(Object.entries(teamsData).map(([id, team]) => ({ id, ...team })));
        } else {
          setTeams([]);
        }
      });
      return () => unsubscribe();
    }
  }, [tournament?.id]);

  // Fetch existing playoff matches
  useEffect(() => {
    if (tournament?.id) {
      const matchesRef = ref(db, `tournaments/${tournament.id}/matches`);
      const unsubscribe = onValue(matchesRef, (snapshot) => {
        if (snapshot.exists()) {
          const matchesData = snapshot.val();
          const matchesList = Object.entries(matchesData)
            .map(([id, match]) => ({ id, ...match }))
            .filter(match => match.matchType !== 'group') // Only playoff matches
            .sort((a, b) => {
              // Sort by match type priority and then by match number
              const typeOrder = { 'quarterfinal': 1, 'semifinal': 2, 'final': 3 };
              const aOrder = typeOrder[a.matchType] || 0;
              const bOrder = typeOrder[b.matchType] || 0;
              if (aOrder !== bOrder) return aOrder - bOrder;
              return (a.matchNumber || 0) - (b.matchNumber || 0);
            });
          setMatches(matchesList);
        } else {
          setMatches([]);
        }
      });
      return () => unsubscribe();
    }
  }, [tournament?.id]);

  // Get next match number for the selected match type
  const getNextMatchNumber = async (type) => {
    try {
      const matchesRef = ref(db, `tournaments/${tournament.id}/matches`);
      const snapshot = await get(matchesRef);
      
      if (snapshot.exists()) {
        const matchesData = snapshot.val();
        const playoffMatches = Object.values(matchesData)
          .filter(match => match.matchType === type)
          .map(match => match.matchNumber || 0);
        return playoffMatches.length > 0 ? Math.max(...playoffMatches) + 1 : 1;
      }
      return 1;
    } catch (error) {
      console.error('Error getting next match number:', error);
      const typeMatches = matches.filter(m => m.matchType === type);
      return typeMatches.length + 1;
    }
  };

  const handleAddMatch = async () => {
    if (!team1 || !team2) {
      return toast.error('Please select both teams');
    }
    if (team1 === team2) {
      return toast.error('Both teams cannot be the same');
    }
    if (!matchDate || !matchTime || !matchPlace.trim()) {
      return toast.error('Please fill all match details (date, time, place)');
    }

    try {
      const matchNumber = await getNextMatchNumber(matchType);
      const team1Data = teams.find(t => t.id === team1);
      const team2Data = teams.find(t => t.id === team2);

      const matchesRef = ref(db, `tournaments/${tournament.id}/matches`);
      const newMatchRef = push(matchesRef);

      const matchTypeLabels = {
        'quarterfinal': 'Quarter Final',
        'semifinal': 'Semi Final',
        'final': 'Final'
      };

      await set(newMatchRef, {
        matchNumber,
        matchType,
        matchTypeLabel: matchTypeLabels[matchType] || matchType,
        team1Id: team1,
        team1Name: team1Data?.name || 'Unknown Team',
        team2Id: team2,
        team2Name: team2Data?.name || 'Unknown Team',
        date: matchDate,
        time: matchTime,
        place: matchPlace.trim(),
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      });

      toast.success('Playoff match scheduled successfully!');
      // Reset form
      setMatchType('quarterfinal');
      setTeam1('');
      setTeam2('');
      setMatchDate('');
      setMatchTime('');
      setMatchPlace('');
    } catch (error) {
      console.error('Error adding match:', error);
      toast.error('Failed to schedule match');
    }
  };

  const handleEditMatch = (match) => {
    setEditingMatch(match);
    setMatchType(match.matchType || 'quarterfinal');
    setTeam1(match.team1Id || '');
    setTeam2(match.team2Id || '');
    setMatchDate(match.date || '');
    setMatchTime(match.time || '');
    setMatchPlace(match.place || '');
  };

  const handleUpdateMatch = async () => {
    if (!team1 || !team2) {
      return toast.error('Please select both teams');
    }
    if (team1 === team2) {
      return toast.error('Both teams cannot be the same');
    }
    if (!matchDate || !matchTime || !matchPlace.trim()) {
      return toast.error('Please fill all match details');
    }

    try {
      const team1Data = teams.find(t => t.id === team1);
      const team2Data = teams.find(t => t.id === team2);

      const matchTypeLabels = {
        'quarterfinal': 'Quarter Final',
        'semifinal': 'Semi Final',
        'final': 'Final'
      };

      const matchRef = ref(db, `tournaments/${tournament.id}/matches/${editingMatch.id}`);
      await set(matchRef, {
        ...editingMatch,
        matchType,
        matchTypeLabel: matchTypeLabels[matchType] || matchType,
        team1Id: team1,
        team1Name: team1Data?.name || 'Unknown Team',
        team2Id: team2,
        team2Name: team2Data?.name || 'Unknown Team',
        date: matchDate,
        time: matchTime,
        place: matchPlace.trim(),
        updatedAt: new Date().toISOString(),
      });

      toast.success('Match updated successfully!');
      // Reset form
      setEditingMatch(null);
      setMatchType('quarterfinal');
      setTeam1('');
      setTeam2('');
      setMatchDate('');
      setMatchTime('');
      setMatchPlace('');
    } catch (error) {
      console.error('Error updating match:', error);
      toast.error('Failed to update match');
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      try {
        await remove(ref(db, `tournaments/${tournament.id}/matches/${matchId}`));
        toast.success('Match deleted successfully!');
      } catch (error) {
        console.error('Error deleting match:', error);
        toast.error('Failed to delete match');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingMatch(null);
    setMatchType('quarterfinal');
    setTeam1('');
    setTeam2('');
    setMatchDate('');
    setMatchTime('');
    setMatchPlace('');
  };

  const getMatchTypeBadgeColor = (type) => {
    switch (type) {
      case 'final':
        return 'danger';
      case 'semifinal':
        return 'warning';
      case 'quarterfinal':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const groupedMatches = {
    quarterfinal: matches.filter(m => m.matchType === 'quarterfinal'),
    semifinal: matches.filter(m => m.matchType === 'semifinal'),
    final: matches.filter(m => m.matchType === 'final')
  };

  return (
    <Modal show={show} onHide={onHide} centered size="xl" dialogClassName="schedule-playoffs-modal">
      <Modal.Header closeButton className="modal-header-custom">
        <Modal.Title className="modal-title-custom">
          <FaTrophy className="me-2" /> Schedule Playoff Matches
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-body-custom">
        <Card className="add-match-form-card mb-4">
          <Card.Header>
            <h5 className="mb-0">
              {editingMatch ? <FaEdit className="me-2" /> : <FaPlus className="me-2" />}
              {editingMatch ? 'Edit Playoff Match' : 'Add New Playoff Match'}
            </h5>
          </Card.Header>
          <Card.Body>
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Match Type *</Form.Label>
                    <Form.Select
                      value={matchType}
                      onChange={(e) => setMatchType(e.target.value)}
                      required
                    >
                      <option value="quarterfinal">Quarter Final</option>
                      <option value="semifinal">Semi Final</option>
                      <option value="final">Final</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Team 1 *</Form.Label>
                    <Form.Select
                      value={team1}
                      onChange={(e) => setTeam1(e.target.value)}
                      required
                    >
                      <option value="">Select Team 1...</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Team 2 *</Form.Label>
                    <Form.Select
                      value={team2}
                      onChange={(e) => setTeam2(e.target.value)}
                      required
                    >
                      <option value="">Select Team 2...</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Match Date *</Form.Label>
                    <Form.Control
                      type="date"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Match Time *</Form.Label>
                    <Form.Control
                      type="time"
                      value={matchTime}
                      onChange={(e) => setMatchTime(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Venue/Place *</Form.Label>
                    <Form.Control
                      type="text"
                      value={matchPlace}
                      onChange={(e) => setMatchPlace(e.target.value)}
                      placeholder="Enter match venue"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <div className="d-flex gap-2">
                {editingMatch ? (
                  <>
                    <Button variant="success" onClick={handleUpdateMatch}>
                      <FaSave className="me-2" /> Update Match
                    </Button>
                    <Button variant="secondary" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" onClick={handleAddMatch}>
                    <FaPlus className="me-2" /> Add Match
                  </Button>
                )}
              </div>
            </Form>
          </Card.Body>
        </Card>

        {matches.length === 0 ? (
          <Alert variant="info" className="text-center">
            <FaTrophy className="me-2" />
            No playoff matches scheduled yet. Add your first match above.
          </Alert>
        ) : (
          <div>
            {groupedMatches.quarterfinal.length > 0 && (
              <Card className="mb-3">
                <Card.Header className="bg-info text-white">
                  <h5 className="mb-0">
                    <FaTrophy className="me-2" /> Quarter Finals ({groupedMatches.quarterfinal.length})
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Match #</th>
                        <th>Team 1</th>
                        <th>vs</th>
                        <th>Team 2</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Venue</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedMatches.quarterfinal.map(match => (
                        <tr key={match.id}>
                          <td><Badge bg="info">#{match.matchNumber}</Badge></td>
                          <td>{match.team1Name}</td>
                          <td className="text-center"><strong>vs</strong></td>
                          <td>{match.team2Name}</td>
                          <td>{new Date(match.date).toLocaleDateString()}</td>
                          <td>{match.time}</td>
                          <td><FaMapMarkerAlt className="me-1" />{match.place}</td>
                          <td>
                            <Badge bg={match.status === 'scheduled' ? 'info' : match.status === 'completed' ? 'success' : 'warning'}>
                              {match.status}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEditMatch(match)}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteMatch(match.id)}
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            {groupedMatches.semifinal.length > 0 && (
              <Card className="mb-3">
                <Card.Header className="bg-warning text-dark">
                  <h5 className="mb-0">
                    <FaTrophy className="me-2" /> Semi Finals ({groupedMatches.semifinal.length})
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Match #</th>
                        <th>Team 1</th>
                        <th>vs</th>
                        <th>Team 2</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Venue</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedMatches.semifinal.map(match => (
                        <tr key={match.id}>
                          <td><Badge bg="warning">#{match.matchNumber}</Badge></td>
                          <td>{match.team1Name}</td>
                          <td className="text-center"><strong>vs</strong></td>
                          <td>{match.team2Name}</td>
                          <td>{new Date(match.date).toLocaleDateString()}</td>
                          <td>{match.time}</td>
                          <td><FaMapMarkerAlt className="me-1" />{match.place}</td>
                          <td>
                            <Badge bg={match.status === 'scheduled' ? 'info' : match.status === 'completed' ? 'success' : 'warning'}>
                              {match.status}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEditMatch(match)}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteMatch(match.id)}
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            {groupedMatches.final.length > 0 && (
              <Card className="mb-3">
                <Card.Header className="bg-danger text-white">
                  <h5 className="mb-0">
                    <FaTrophy className="me-2" /> Final ({groupedMatches.final.length})
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Match #</th>
                        <th>Team 1</th>
                        <th>vs</th>
                        <th>Team 2</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Venue</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedMatches.final.map(match => (
                        <tr key={match.id}>
                          <td><Badge bg="danger">#{match.matchNumber}</Badge></td>
                          <td>{match.team1Name}</td>
                          <td className="text-center"><strong>vs</strong></td>
                          <td>{match.team2Name}</td>
                          <td>{new Date(match.date).toLocaleDateString()}</td>
                          <td>{match.time}</td>
                          <td><FaMapMarkerAlt className="me-1" />{match.place}</td>
                          <td>
                            <Badge bg={match.status === 'scheduled' ? 'info' : match.status === 'completed' ? 'success' : 'warning'}>
                              {match.status}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEditMatch(match)}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteMatch(match.id)}
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="modal-footer-custom">
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SchedulePlayoffsModal;

