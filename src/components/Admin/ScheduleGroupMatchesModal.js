import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Table, Badge, Card, Alert } from 'react-bootstrap';
import { FaCalendarAlt, FaFutbol, FaSave, FaTrash, FaEdit, FaPlus, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { db } from '../../firebase';
import { ref, onValue, push, set, remove, get } from 'firebase/database';
import { toast } from 'react-toastify';
import './ScheduleGroupMatchesModal.css';

const ScheduleGroupMatchesModal = ({ show, onHide, tournament }) => {
  const [groups, setGroups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedGroup1, setSelectedGroup1] = useState('');
  const [selectedGroup2, setSelectedGroup2] = useState('');
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [matchPlace, setMatchPlace] = useState('');
  const [editingMatch, setEditingMatch] = useState(null);
  const [filteredTeams1, setFilteredTeams1] = useState([]);
  const [filteredTeams2, setFilteredTeams2] = useState([]);

  // Fetch groups
  useEffect(() => {
    if (tournament?.id) {
      const groupsRef = ref(db, `tournaments/${tournament.id}/groups`);
      const unsubscribe = onValue(groupsRef, (snapshot) => {
        if (snapshot.exists()) {
          const groupsData = snapshot.val();
          setGroups(Object.entries(groupsData).map(([id, group]) => ({ id, ...group })));
        } else {
          setGroups([]);
        }
      });
      return () => unsubscribe();
    }
  }, [tournament?.id]);

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

  // Fetch existing matches
  useEffect(() => {
    if (tournament?.id) {
      const matchesRef = ref(db, `tournaments/${tournament.id}/matches`);
      const unsubscribe = onValue(matchesRef, (snapshot) => {
        if (snapshot.exists()) {
          const matchesData = snapshot.val();
          const matchesList = Object.entries(matchesData)
            .map(([id, match]) => ({ id, ...match }))
            .filter(match => match.matchType === 'group') // Only group matches
            .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
          setMatches(matchesList);
        } else {
          setMatches([]);
        }
      });
      return () => unsubscribe();
    }
  }, [tournament?.id]);

  // Filter teams for Team 1 based on selected group 1
  useEffect(() => {
    if (selectedGroup1) {
      const filtered = teams.filter(team => team.groupId === selectedGroup1);
      setFilteredTeams1(filtered);
      // Reset team1 selection when group changes
      setTeam1('');
    } else {
      setFilteredTeams1([]);
      setTeam1('');
    }
  }, [selectedGroup1, teams]);

  // Filter teams for Team 2 based on selected group 2
  useEffect(() => {
    if (selectedGroup2) {
      const filtered = teams.filter(team => team.groupId === selectedGroup2);
      setFilteredTeams2(filtered);
      // Reset team2 selection when group changes
      setTeam2('');
    } else {
      setFilteredTeams2([]);
      setTeam2('');
    }
  }, [selectedGroup2, teams]);

  // Get next match number
  const getNextMatchNumber = async () => {
    try {
      const matchesRef = ref(db, `tournaments/${tournament.id}/matches`);
      const snapshot = await get(matchesRef);
      
      if (snapshot.exists()) {
        const matchesData = snapshot.val();
        const groupMatches = Object.values(matchesData)
          .filter(match => match.matchType === 'group')
          .map(match => match.matchNumber || 0);
        return groupMatches.length > 0 ? Math.max(...groupMatches) + 1 : 1;
      }
      return 1;
    } catch (error) {
      console.error('Error getting next match number:', error);
      return matches.length + 1;
    }
  };

  const handleAddMatch = async () => {
    if (!selectedGroup1 || !selectedGroup2) {
      return toast.error('Please select groups for both teams');
    }
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
      const matchNumber = await getNextMatchNumber();
      const group1Data = groups.find(g => g.id === selectedGroup1);
      const group2Data = groups.find(g => g.id === selectedGroup2);
      const team1Data = teams.find(t => t.id === team1);
      const team2Data = teams.find(t => t.id === team2);

      const matchesRef = ref(db, `tournaments/${tournament.id}/matches`);
      const newMatchRef = push(matchesRef);

      await set(newMatchRef, {
        matchNumber,
        matchType: 'group',
        group1Id: selectedGroup1,
        group1Name: group1Data?.name || 'Unknown Group',
        group2Id: selectedGroup2,
        group2Name: group2Data?.name || 'Unknown Group',
        team1Id: team1,
        team1Name: team1Data?.name || 'Unknown Team',
        team1GroupId: selectedGroup1,
        team1GroupName: group1Data?.name || 'Unknown Group',
        team2Id: team2,
        team2Name: team2Data?.name || 'Unknown Team',
        team2GroupId: selectedGroup2,
        team2GroupName: group2Data?.name || 'Unknown Group',
        date: matchDate,
        time: matchTime,
        place: matchPlace.trim(),
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      });

      toast.success('Match scheduled successfully!');
      // Reset form
      setSelectedGroup1('');
      setSelectedGroup2('');
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
    // Support both old format (single groupId) and new format (separate groups)
    setSelectedGroup1(match.team1GroupId || match.groupId || match.group1Id || '');
    setSelectedGroup2(match.team2GroupId || match.groupId || match.group2Id || '');
    setTeam1(match.team1Id || '');
    setTeam2(match.team2Id || '');
    setMatchDate(match.date || '');
    setMatchTime(match.time || '');
    setMatchPlace(match.place || '');
  };

  const handleUpdateMatch = async () => {
    if (!selectedGroup1 || !selectedGroup2 || !team1 || !team2) {
      return toast.error('Please fill all required fields');
    }
    if (team1 === team2) {
      return toast.error('Both teams cannot be the same');
    }
    if (!matchDate || !matchTime || !matchPlace.trim()) {
      return toast.error('Please fill all match details');
    }

    try {
      const group1Data = groups.find(g => g.id === selectedGroup1);
      const group2Data = groups.find(g => g.id === selectedGroup2);
      const team1Data = teams.find(t => t.id === team1);
      const team2Data = teams.find(t => t.id === team2);

      const matchRef = ref(db, `tournaments/${tournament.id}/matches/${editingMatch.id}`);
      await set(matchRef, {
        ...editingMatch,
        group1Id: selectedGroup1,
        group1Name: group1Data?.name || 'Unknown Group',
        group2Id: selectedGroup2,
        group2Name: group2Data?.name || 'Unknown Group',
        team1Id: team1,
        team1Name: team1Data?.name || 'Unknown Team',
        team1GroupId: selectedGroup1,
        team1GroupName: group1Data?.name || 'Unknown Group',
        team2Id: team2,
        team2Name: team2Data?.name || 'Unknown Team',
        team2GroupId: selectedGroup2,
        team2GroupName: group2Data?.name || 'Unknown Group',
        date: matchDate,
        time: matchTime,
        place: matchPlace.trim(),
        updatedAt: new Date().toISOString(),
      });

      toast.success('Match updated successfully!');
      // Reset form
      setEditingMatch(null);
      setSelectedGroup1('');
      setSelectedGroup2('');
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
    setSelectedGroup1('');
    setSelectedGroup2('');
    setTeam1('');
    setTeam2('');
    setMatchDate('');
    setMatchTime('');
    setMatchPlace('');
  };

  return (
    <Modal show={show} onHide={onHide} centered size="xl" dialogClassName="schedule-matches-modal">
      <Modal.Header closeButton className="modal-header-custom">
        <Modal.Title className="modal-title-custom">
          <FaCalendarAlt className="me-2" /> Schedule Group Matches
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-body-custom">
        <Card className="add-match-form-card mb-4">
          <Card.Header>
            <h5 className="mb-0">
              {editingMatch ? <FaEdit className="me-2" /> : <FaPlus className="me-2" />}
              {editingMatch ? 'Edit Match' : 'Add New Match'}
            </h5>
          </Card.Header>
          <Card.Body>
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Select Group for Team 1 *</Form.Label>
                    <Form.Select
                      value={selectedGroup1}
                      onChange={(e) => setSelectedGroup1(e.target.value)}
                      required
                    >
                      <option value="">Choose a group...</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
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
                      disabled={!selectedGroup1}
                    >
                      <option value="">Select Team 1...</option>
                      {filteredTeams1.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Select Group for Team 2 *</Form.Label>
                    <Form.Select
                      value={selectedGroup2}
                      onChange={(e) => setSelectedGroup2(e.target.value)}
                      required
                    >
                      <option value="">Choose a group...</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Team 2 *</Form.Label>
                    <Form.Select
                      value={team2}
                      onChange={(e) => setTeam2(e.target.value)}
                      required
                      disabled={!selectedGroup2}
                    >
                      <option value="">Select Team 2...</option>
                      {filteredTeams2.map(team => (
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
            <FaFutbol className="me-2" />
            No matches scheduled yet. Add your first match above.
          </Alert>
        ) : (
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <FaFutbol className="me-2" /> Scheduled Matches ({matches.length})
              </h5>
            </Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Match #</th>
                    <th>Team 1 (Group)</th>
                    <th>vs</th>
                    <th>Team 2 (Group)</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Venue</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map(match => {
                    const team1Group = match.team1GroupName || match.group1Name || match.groupName || 'N/A';
                    const team2Group = match.team2GroupName || match.group2Name || match.groupName || 'N/A';
                    return (
                      <tr key={match.id}>
                        <td><Badge bg="primary">#{match.matchNumber}</Badge></td>
                        <td>
                          <div>{match.team1Name}</div>
                          <small className="text-muted">({team1Group})</small>
                        </td>
                        <td className="text-center"><strong>vs</strong></td>
                        <td>
                          <div>{match.team2Name}</div>
                          <small className="text-muted">({team2Group})</small>
                        </td>
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
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}
      </Modal.Body>
      <Modal.Footer className="modal-footer-custom">
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ScheduleGroupMatchesModal;

