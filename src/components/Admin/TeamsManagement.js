import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, Form, Table, Badge } from 'react-bootstrap';
import { FaUsers, FaPlus, FaEdit, FaTrash, FaUser, FaUserPlus } from 'react-icons/fa';
import { db } from '../../firebase';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { toast } from 'react-toastify';
import './TeamsManagement.css';

const TeamsManagement = ({ tournamentId, tournamentDetails }) => {
  const [teams, setTeams] = useState([]);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [playerData, setPlayerData] = useState({ name: '', role: 'Batsman', jerseyNumber: '' });
  const [editingPlayer, setEditingPlayer] = useState(null);

  useEffect(() => {
    if (tournamentId) {
      const teamsRef = ref(db, `tournaments/${tournamentId}/teams`);
      
      const unsubscribe = onValue(teamsRef, (snapshot) => {
        if (snapshot.exists()) {
          const teamsData = snapshot.val();
          const teamsList = Object.entries(teamsData).map(([id, team]) => ({
            id,
            ...team,
            players: team.players || []
          }));
          setTeams(teamsList);
        } else {
          setTeams([]);
        }
      });

      return () => unsubscribe();
    }
  }, [tournamentId]);

  const handleAddTeam = async () => {
    if (!teamName.trim()) {
      return toast.error('Please enter team name');
    }

    // Check max teams limit
    if (tournamentDetails?.numberOfTeams && teams.length >= parseInt(tournamentDetails.numberOfTeams)) {
      return toast.error(`Maximum ${tournamentDetails.numberOfTeams} teams allowed for this tournament`);
    }

    try {
      const teamsRef = ref(db, `tournaments/${tournamentId}/teams`);
      const newTeamRef = push(teamsRef);
      
      await set(newTeamRef, {
        name: teamName.trim(),
        createdAt: new Date().toISOString(),
        players: []
      });

      toast.success('Team added successfully!');
      setShowAddTeamModal(false);
      setTeamName('');
    } catch (error) {
      console.error('Error adding team:', error);
      toast.error('Failed to add team');
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (window.confirm('Are you sure you want to delete this team? All players will be removed.')) {
      try {
        await remove(ref(db, `tournaments/${tournamentId}/teams/${teamId}`));
        toast.success('Team deleted successfully!');
      } catch (error) {
        console.error('Error deleting team:', error);
        toast.error('Failed to delete team');
      }
    }
  };

  const handleOpenPlayersModal = (team) => {
    setSelectedTeam(team);
    setShowPlayersModal(true);
  };

  const handleAddPlayer = async () => {
    if (!playerData.name.trim()) {
      return toast.error('Please enter player name');
    }

    if (!playerData.jerseyNumber.trim()) {
      return toast.error('Please enter jersey number');
    }

    // Check max players limit
    if (tournamentDetails?.playersPerTeam && selectedTeam.players.length >= parseInt(tournamentDetails.playersPerTeam)) {
      return toast.error(`Maximum ${tournamentDetails.playersPerTeam} players allowed per team`);
    }

    // Check if jersey number already exists
    if (selectedTeam.players.some(p => p.jerseyNumber === playerData.jerseyNumber)) {
      return toast.error('Jersey number already exists in this team');
    }

    try {
      const teamRef = ref(db, `tournaments/${tournamentId}/teams/${selectedTeam.id}`);
      const updatedPlayers = [...selectedTeam.players, {
        id: Date.now().toString(),
        name: playerData.name.trim(),
        role: playerData.role,
        jerseyNumber: playerData.jerseyNumber.trim(),
        createdAt: new Date().toISOString()
      }];

      await update(teamRef, { players: updatedPlayers });
      toast.success('Player added successfully!');
      setPlayerData({ name: '', role: 'Batsman', jerseyNumber: '' });
    } catch (error) {
      console.error('Error adding player:', error);
      toast.error('Failed to add player');
    }
  };

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setPlayerData({
      name: player.name,
      role: player.role,
      jerseyNumber: player.jerseyNumber
    });
  };

  const handleUpdatePlayer = async () => {
    if (!playerData.name.trim()) {
      return toast.error('Please enter player name');
    }

    if (!playerData.jerseyNumber.trim()) {
      return toast.error('Please enter jersey number');
    }

    // Check if jersey number already exists (excluding current player)
    if (selectedTeam.players.some(p => p.jerseyNumber === playerData.jerseyNumber && p.id !== editingPlayer.id)) {
      return toast.error('Jersey number already exists in this team');
    }

    try {
      const teamRef = ref(db, `tournaments/${tournamentId}/teams/${selectedTeam.id}`);
      const updatedPlayers = selectedTeam.players.map(p =>
        p.id === editingPlayer.id
          ? { ...p, name: playerData.name.trim(), role: playerData.role, jerseyNumber: playerData.jerseyNumber.trim() }
          : p
      );

      await update(teamRef, { players: updatedPlayers });
      toast.success('Player updated successfully!');
      setEditingPlayer(null);
      setPlayerData({ name: '', role: 'Batsman', jerseyNumber: '' });
    } catch (error) {
      console.error('Error updating player:', error);
      toast.error('Failed to update player');
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (window.confirm('Are you sure you want to delete this player?')) {
      try {
        const teamRef = ref(db, `tournaments/${tournamentId}/teams/${selectedTeam.id}`);
        const updatedPlayers = selectedTeam.players.filter(p => p.id !== playerId);
        await update(teamRef, { players: updatedPlayers });
        toast.success('Player deleted successfully!');
      } catch (error) {
        console.error('Error deleting player:', error);
        toast.error('Failed to delete player');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingPlayer(null);
    setPlayerData({ name: '', role: 'Batsman', jerseyNumber: '' });
  };

  return (
    <div className="teams-management-section">
      <div className="section-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <h2 className="section-title">
            <FaUsers className="me-2" /> Teams Management
          </h2>
          <Button
            variant="primary"
            onClick={() => setShowAddTeamModal(true)}
            disabled={tournamentDetails?.numberOfTeams && teams.length >= parseInt(tournamentDetails.numberOfTeams)}
          >
            <FaPlus className="me-2" /> Add Team
          </Button>
        </div>
        {tournamentDetails?.numberOfTeams && (
          <p className="text-muted mt-2">
            {teams.length} / {tournamentDetails.numberOfTeams} teams created
          </p>
        )}
      </div>

      {teams.length === 0 ? (
        <Card className="empty-teams-card">
          <Card.Body className="text-center p-5">
            <FaUsers size={64} className="mb-3 text-muted" />
            <h3>No Teams Created</h3>
            <p className="text-muted">Start by adding your first team to the tournament.</p>
            <Button variant="primary" onClick={() => setShowAddTeamModal(true)} className="mt-3">
              <FaPlus className="me-2" /> Add First Team
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {teams.map((team) => (
            <Col key={team.id} md={6} lg={4} className="mb-4">
              <Card className="team-card">
                <Card.Body>
                  <div className="team-card-header mb-3">
                    <h5 className="team-name">{team.name}</h5>
                    <Badge bg={team.players.length >= (tournamentDetails?.playersPerTeam || 0) ? 'success' : 'warning'}>
                      {team.players.length} Players
                    </Badge>
                  </div>
                  
                  <div className="team-info mb-3">
                    <p className="team-detail">
                      <FaUsers className="me-2" />
                      Players: {team.players.length} / {tournamentDetails?.playersPerTeam || 'N/A'}
                    </p>
                  </div>

                  <div className="team-actions">
                    <Button
                      variant="primary"
                      size="sm"
                      className="me-2"
                      onClick={() => handleOpenPlayersModal(team)}
                    >
                      <FaUser className="me-1" /> Manage Players
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteTeam(team.id)}
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

      {/* Add Team Modal */}
      <Modal show={showAddTeamModal} onHide={() => setShowAddTeamModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><FaPlus className="me-2" /> Add New Team</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Team Name *</Form.Label>
              <Form.Control
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddTeamModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddTeam}>Add Team</Button>
        </Modal.Footer>
      </Modal>

      {/* Players Management Modal */}
      <Modal show={showPlayersModal} onHide={() => {
        setShowPlayersModal(false);
        setEditingPlayer(null);
        setPlayerData({ name: '', role: 'Batsman', jerseyNumber: '' });
      }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUsers className="me-2" /> Manage Players - {selectedTeam?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="add-player-section mb-4">
            <h5 className="mb-3">
              {editingPlayer ? <FaEdit className="me-2" /> : <FaUserPlus className="me-2" />}
              {editingPlayer ? 'Edit Player' : 'Add New Player'}
            </h5>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Player Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={playerData.name}
                    onChange={(e) => setPlayerData({ ...playerData, name: e.target.value })}
                    placeholder="Enter player name"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Jersey Number *</Form.Label>
                  <Form.Control
                    type="text"
                    value={playerData.jerseyNumber}
                    onChange={(e) => setPlayerData({ ...playerData, jerseyNumber: e.target.value })}
                    placeholder="e.g., 7"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Role *</Form.Label>
                  <Form.Select
                    value={playerData.role}
                    onChange={(e) => setPlayerData({ ...playerData, role: e.target.value })}
                  >
                    <option>Batsman</option>
                    <option>Bowler</option>
                    <option>All-rounder</option>
                    <option>Wicket-keeper</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                {editingPlayer ? (
                  <>
                    <Button variant="success" size="sm" className="me-1" onClick={handleUpdatePlayer}>
                      <FaEdit />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" className="w-100" onClick={handleAddPlayer}>
                    <FaUserPlus />
                  </Button>
                )}
              </Col>
            </Row>
          </div>

          <div className="players-list">
            <h5 className="mb-3">Players List ({selectedTeam?.players.length || 0})</h5>
            {selectedTeam?.players.length === 0 ? (
              <p className="text-muted text-center py-4">No players added yet</p>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Jersey #</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTeam?.players.map((player) => (
                    <tr key={player.id}>
                      <td>{player.jerseyNumber}</td>
                      <td>{player.name}</td>
                      <td>
                        <Badge bg="info">{player.role}</Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEditPlayer(player)}
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeletePlayer(player.id)}
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowPlayersModal(false);
            setEditingPlayer(null);
            setPlayerData({ name: '', role: 'Batsman', jerseyNumber: '' });
          }}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TeamsManagement;

