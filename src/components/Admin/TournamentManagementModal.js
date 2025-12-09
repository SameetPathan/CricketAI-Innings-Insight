import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Tab, Form, Button, Row, Col, Table, Badge, Card, Accordion } from 'react-bootstrap';
import { FaCog, FaUsers, FaUser, FaFutbol, FaSave, FaTrash, FaEdit, FaUserPlus, FaPlus, FaTrophy, FaLayerGroup } from 'react-icons/fa';
import { db } from '../../firebase';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { toast } from 'react-toastify';
import './TournamentManagementModal.css';

const TournamentManagementModal = ({ show, onHide, tournament }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [tournamentDetails, setTournamentDetails] = useState({
    numberOfGroups: '',
    teamsPerGroup: '',
    numberOfTeams: '',
    playersPerTeam: '',
    oversPerInnings: '',
    maxOversPerPlayer: '',
    customRules: []
  });
  const [newCustomRule, setNewCustomRule] = useState('');
  const [groups, setGroups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [playerData, setPlayerData] = useState({ name: '', role: 'Batsman', jerseyNumber: '' });
  const [editingPlayer, setEditingPlayer] = useState(null);

  useEffect(() => {
    if (tournament?.tournamentDetails) {
      setTournamentDetails({
        numberOfGroups: tournament.tournamentDetails.numberOfGroups || '',
        teamsPerGroup: tournament.tournamentDetails.teamsPerGroup || '',
        numberOfTeams: tournament.tournamentDetails.numberOfTeams || '',
        playersPerTeam: tournament.tournamentDetails.playersPerTeam || '',
        oversPerInnings: tournament.tournamentDetails.oversPerInnings || '',
        maxOversPerPlayer: tournament.tournamentDetails.maxOversPerPlayer || '',
        customRules: tournament.tournamentDetails.customRules || []
      });
    }
  }, [tournament]);

  useEffect(() => {
    if (tournament?.id) {
      const groupsRef = ref(db, `tournaments/${tournament.id}/groups`);
      
      const unsubscribeGroups = onValue(groupsRef, (snapshot) => {
        if (snapshot.exists()) {
          const groupsData = snapshot.val();
          const groupsList = Object.entries(groupsData).map(([id, group]) => ({
            id,
            ...group
          }));
          setGroups(groupsList.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        } else {
          setGroups([]);
        }
      });

      return () => unsubscribeGroups();
    }
  }, [tournament?.id]);

  useEffect(() => {
    if (tournament?.id) {
      const teamsRef = ref(db, `tournaments/${tournament.id}/teams`);
      
      const unsubscribeTeams = onValue(teamsRef, (snapshot) => {
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

      return () => unsubscribeTeams();
    }
  }, [tournament?.id]);

  // Update selectedTeam when teams change
  useEffect(() => {
    if (selectedTeam && teams.length > 0) {
      const updatedTeam = teams.find(t => t.id === selectedTeam.id);
      if (updatedTeam && JSON.stringify(updatedTeam) !== JSON.stringify(selectedTeam)) {
        setSelectedTeam(updatedTeam);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  const handleSaveDetails = async () => {
    if (!tournamentDetails.numberOfGroups || !tournamentDetails.teamsPerGroup || 
        !tournamentDetails.playersPerTeam || !tournamentDetails.oversPerInnings || 
        !tournamentDetails.maxOversPerPlayer) {
      return toast.error('Please fill all required fields');
    }

    const totalTeams = parseInt(tournamentDetails.numberOfGroups) * parseInt(tournamentDetails.teamsPerGroup);
    
    try {
      const tournamentRef = ref(db, `tournaments/${tournament.id}`);
      await update(tournamentRef, {
        tournamentDetails: {
          numberOfGroups: parseInt(tournamentDetails.numberOfGroups),
          teamsPerGroup: parseInt(tournamentDetails.teamsPerGroup),
          numberOfTeams: totalTeams,
          playersPerTeam: parseInt(tournamentDetails.playersPerTeam),
          oversPerInnings: parseInt(tournamentDetails.oversPerInnings),
          maxOversPerPlayer: parseInt(tournamentDetails.maxOversPerPlayer),
          customRules: tournamentDetails.customRules
        },
        updatedAt: new Date().toISOString(),
      });
      toast.success('Tournament details saved successfully!');
    } catch (error) {
      console.error('Error saving tournament details:', error);
      toast.error('Failed to save tournament details');
    }
  };

  const handleAddCustomRule = () => {
    if (newCustomRule.trim()) {
      setTournamentDetails({
        ...tournamentDetails,
        customRules: [...tournamentDetails.customRules, newCustomRule.trim()]
      });
      setNewCustomRule('');
      toast.success('Custom rule added!');
    }
  };

  const handleRemoveCustomRule = (index) => {
    const updatedRules = tournamentDetails.customRules.filter((_, i) => i !== index);
    setTournamentDetails({
      ...tournamentDetails,
      customRules: updatedRules
    });
    toast.success('Custom rule removed!');
  };

  const handleAddGroup = async () => {
    if (!groupName.trim()) {
      return toast.error('Please enter group name');
    }

    if (tournamentDetails?.numberOfGroups && groups.length >= parseInt(tournamentDetails.numberOfGroups)) {
      return toast.error(`Maximum ${tournamentDetails.numberOfGroups} groups allowed for this tournament`);
    }

    try {
      const groupsRef = ref(db, `tournaments/${tournament.id}/groups`);
      const newGroupRef = push(groupsRef);
      
      await set(newGroupRef, {
        name: groupName.trim(),
        tournamentId: tournament.id,
        createdAt: new Date().toISOString()
      });

      toast.success('Group added successfully!');
      setShowAddGroupModal(false);
      setGroupName('');
    } catch (error) {
      console.error('Error adding group:', error);
      toast.error('Failed to add group');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      // Delete all teams in this group first
      const groupTeams = teams.filter(t => t.groupId === groupId);
      for (const team of groupTeams) {
        await remove(ref(db, `tournaments/${tournament.id}/teams/${team.id}`));
      }
      
      // Delete the group
      await remove(ref(db, `tournaments/${tournament.id}/groups/${groupId}`));
      toast.success('Group deleted successfully!');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const handleAddTeam = async () => {
    if (!teamName.trim()) {
      return toast.error('Please enter team name');
    }

    if (!selectedGroup) {
      return toast.error('Please select a group first');
    }

    // Get teams in selected group
    const groupTeams = teams.filter(t => t.groupId === selectedGroup.id);
    
    if (tournamentDetails?.teamsPerGroup && groupTeams.length >= parseInt(tournamentDetails.teamsPerGroup)) {
      return toast.error(`Maximum ${tournamentDetails.teamsPerGroup} teams allowed per group`);
    }

    try {
      const teamsRef = ref(db, `tournaments/${tournament.id}/teams`);
      const newTeamRef = push(teamsRef);
      
      await set(newTeamRef, {
        name: teamName.trim(),
        tournamentId: tournament.id,
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
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
    try {
      await remove(ref(db, `tournaments/${tournament.id}/teams/${teamId}`));
      toast.success('Team deleted successfully!');
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team');
    }
  };

  const handleAddPlayer = async () => {
    if (!playerData.name.trim()) {
      return toast.error('Please enter player name');
    }

    if (!playerData.jerseyNumber.trim()) {
      return toast.error('Please enter jersey number');
    }

    if (!selectedTeam) {
      return toast.error('Please select a team first');
    }

    if (tournamentDetails?.playersPerTeam && selectedTeam.players && selectedTeam.players.length >= parseInt(tournamentDetails.playersPerTeam)) {
      return toast.error(`Maximum ${tournamentDetails.playersPerTeam} players allowed per team`);
    }

    const currentPlayers = selectedTeam.players || [];
    if (currentPlayers.some(p => p.jerseyNumber === playerData.jerseyNumber)) {
      return toast.error('Jersey number already exists in this team');
    }

    try {
      const teamRef = ref(db, `tournaments/${tournament.id}/teams/${selectedTeam.id}`);
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newPlayer = {
        id: playerId,
        name: playerData.name.trim(),
        role: playerData.role,
        jerseyNumber: playerData.jerseyNumber.trim(),
        tournamentId: tournament.id,
        teamId: selectedTeam.id,
        groupId: selectedTeam.groupId,
        createdAt: new Date().toISOString()
      };
      
      const updatedPlayers = [...currentPlayers, newPlayer];

      await update(teamRef, { players: updatedPlayers });
      toast.success('Player added successfully!');
      setPlayerData({ name: '', role: 'Batsman', jerseyNumber: '' });
    } catch (error) {
      console.error('Error adding player:', error);
      toast.error('Failed to add player. Please try again.');
    }
  };

  const handleUpdatePlayer = async () => {
    if (!playerData.name.trim()) {
      return toast.error('Please enter player name');
    }

    if (!playerData.jerseyNumber.trim()) {
      return toast.error('Please enter jersey number');
    }

    if (!selectedTeam || !editingPlayer) {
      return toast.error('Invalid player data');
    }

    const currentPlayers = selectedTeam.players || [];
    if (currentPlayers.some(p => p.jerseyNumber === playerData.jerseyNumber && p.id !== editingPlayer.id)) {
      return toast.error('Jersey number already exists in this team');
    }

    try {
      const teamRef = ref(db, `tournaments/${tournament.id}/teams/${selectedTeam.id}`);
      const updatedPlayers = currentPlayers.map(p =>
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
      toast.error('Failed to update player. Please try again.');
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (!selectedTeam) {
      return toast.error('No team selected');
    }

    try {
      const teamRef = ref(db, `tournaments/${tournament.id}/teams/${selectedTeam.id}`);
      const currentPlayers = selectedTeam.players || [];
      const updatedPlayers = currentPlayers.filter(p => p.id !== playerId);
      await update(teamRef, { players: updatedPlayers });
      toast.success('Player deleted successfully!');
    } catch (error) {
      console.error('Error deleting player:', error);
      toast.error('Failed to delete player. Please try again.');
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

  const handleCancelEdit = () => {
    setEditingPlayer(null);
    setPlayerData({ name: '', role: 'Batsman', jerseyNumber: '' });
  };

  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
    setActiveTab('edit-team');
    setEditingPlayer(null);
    setPlayerData({ name: '', role: 'Batsman', jerseyNumber: '' });
  };

  const getTeamsByGroup = (groupId) => {
    return teams.filter(team => team.groupId === groupId);
  };

  const getTotalTeams = () => {
    return teams.length;
  };

  const getTotalPlayers = () => {
    return teams.reduce((total, team) => total + (team.players?.length || 0), 0);
  };

  return (
    <Modal show={show} onHide={onHide} centered size="xl" className="tournament-management-modal">
      <Modal.Header closeButton className="modal-header-custom">
        <Modal.Title>
          <FaTrophy className="me-2" /> {tournament?.tournamentName} - Management
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-body-custom">
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => {
            setActiveTab(k);
            if (k !== 'edit-team') {
              setSelectedTeam(null);
            }
          }}
          className="custom-tabs"
        >
          {/* Tournament Details Tab */}
          <Tab eventKey="details" title={
            <span><FaCog className="me-2" /> Tournament Details</span>
          }>
            <div className="tab-content-wrapper">
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-4 form-group-modern">
                      <Form.Label className="form-label-modern">
                        <FaLayerGroup className="me-2" /> Number of Groups *
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        value={tournamentDetails.numberOfGroups}
                        onChange={(e) => setTournamentDetails({ ...tournamentDetails, numberOfGroups: e.target.value })}
                        required
                        placeholder="e.g., 4"
                        className="form-control-modern"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-4 form-group-modern">
                      <Form.Label className="form-label-modern">
                        <FaUsers className="me-2" /> Teams per Group *
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min="2"
                        value={tournamentDetails.teamsPerGroup}
                        onChange={(e) => setTournamentDetails({ ...tournamentDetails, teamsPerGroup: e.target.value })}
                        required
                        placeholder="e.g., 4"
                        className="form-control-modern"
                      />
                      {tournamentDetails.numberOfGroups && tournamentDetails.teamsPerGroup && (
                        <Form.Text className="text-muted">
                          Total Teams: {parseInt(tournamentDetails.numberOfGroups) * parseInt(tournamentDetails.teamsPerGroup)}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-4 form-group-modern">
                      <Form.Label className="form-label-modern">
                        <FaUser className="me-2" /> Players per Team *
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min="11"
                        value={tournamentDetails.playersPerTeam}
                        onChange={(e) => setTournamentDetails({ ...tournamentDetails, playersPerTeam: e.target.value })}
                        required
                        placeholder="e.g., 15"
                        className="form-control-modern"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-4 form-group-modern">
                      <Form.Label className="form-label-modern">
                        <FaFutbol className="me-2" /> Overs per Innings *
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        value={tournamentDetails.oversPerInnings}
                        onChange={(e) => setTournamentDetails({ ...tournamentDetails, oversPerInnings: e.target.value })}
                        required
                        placeholder="e.g., 20"
                        className="form-control-modern"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-4 form-group-modern">
                      <Form.Label className="form-label-modern">
                        <FaCog className="me-2" /> Max Overs per Player *
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        value={tournamentDetails.maxOversPerPlayer}
                        onChange={(e) => setTournamentDetails({ ...tournamentDetails, maxOversPerPlayer: e.target.value })}
                        required
                        placeholder="e.g., 4"
                        className="form-control-modern"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-4 form-group-modern">
                  <Form.Label className="form-label-modern">
                    <FaCog className="me-2" /> Custom Rules
                  </Form.Label>
                  <div className="d-flex mb-3">
                    <Form.Control
                      type="text"
                      value={newCustomRule}
                      onChange={(e) => setNewCustomRule(e.target.value)}
                      placeholder="Enter a custom rule"
                      className="form-control-modern"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomRule();
                        }
                      }}
                    />
                    <Button variant="outline-primary" onClick={handleAddCustomRule} className="ms-2">
                      <FaPlus className="me-2" /> Add Rule
                    </Button>
                  </div>
                  {tournamentDetails.customRules.length > 0 && (
                    <div className="custom-rules-list">
                      {tournamentDetails.customRules.map((rule, index) => (
                        <div key={index} className="custom-rule-item">
                          <span>{rule}</span>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleRemoveCustomRule(index)}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.Group>
                <div className="d-flex justify-content-end">
                  <Button variant="primary" onClick={handleSaveDetails} className="gradient-btn">
                    <FaSave className="me-2" /> Save Details
                  </Button>
                </div>
              </Form>
            </div>
          </Tab>

          {/* Groups Tab */}
          <Tab eventKey="groups" title={
            <span><FaLayerGroup className="me-2" /> Groups ({groups.length})</span>
          }>
            <div className="tab-content-wrapper">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="mb-0">Tournament Groups</h5>
                  {tournamentDetails?.numberOfGroups && (
                    <p className="text-muted mb-0 mt-1">
                      {groups.length} / {tournamentDetails.numberOfGroups} groups created
                    </p>
                  )}
                </div>
                <Button
                  variant="primary"
                  onClick={() => setShowAddGroupModal(true)}
                  disabled={tournamentDetails?.numberOfGroups && groups.length >= parseInt(tournamentDetails.numberOfGroups)}
                  className="gradient-btn"
                >
                  <FaPlus className="me-2" /> Add Group
                </Button>
              </div>
              
              {groups.length === 0 ? (
                <Card className="empty-card">
                  <Card.Body className="text-center p-5">
                    <FaLayerGroup size={64} className="mb-3 text-muted" />
                    <h4>No Groups Created</h4>
                    <p className="text-muted">Start by adding your first group to the tournament.</p>
                    <Button variant="primary" onClick={() => setShowAddGroupModal(true)} className="mt-3 gradient-btn">
                      <FaPlus className="me-2" /> Add First Group
                    </Button>
                  </Card.Body>
                </Card>
              ) : (
                <Row>
                  {groups.map((group) => {
                    const groupTeams = getTeamsByGroup(group.id);
                    const totalPlayers = groupTeams.reduce((sum, team) => sum + (team.players?.length || 0), 0);
                    return (
                      <Col key={group.id} md={6} lg={4} className="mb-3">
                        <Card className="group-card-modern">
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div>
                                <h5 className="group-name-modern mb-1">{group.name}</h5>
                                <p className="text-muted mb-0 small">
                                  {groupTeams.length} / {tournamentDetails?.teamsPerGroup || 'N/A'} teams
                                </p>
                              </div>
                              <Badge bg={groupTeams.length >= (tournamentDetails?.teamsPerGroup || 0) ? 'success' : 'warning'}>
                                {groupTeams.length} Teams
                              </Badge>
                            </div>
                            <div className="group-stats mb-3">
                              <p className="text-muted mb-1 small">
                                <FaUsers className="me-1" /> {totalPlayers} Players
                              </p>
                            </div>
                            <div className="d-flex gap-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="flex-fill"
                                onClick={() => {
                                  setSelectedGroup(group);
                                  setActiveTab('teams');
                                }}
                              >
                                <FaEdit className="me-1" /> Manage Teams
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteGroup(group.id)}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </div>
          </Tab>

          {/* Teams Tab */}
          <Tab eventKey="teams" title={
            <span><FaUsers className="me-2" /> Teams ({getTotalTeams()})</span>
          }>
            <div className="tab-content-wrapper">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="mb-0">Tournament Teams</h5>
                  <p className="text-muted mb-0 mt-1">
                    Total: {getTotalTeams()} teams, {getTotalPlayers()} players
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (groups.length === 0) {
                      toast.error('Please create groups first');
                      setActiveTab('groups');
                    } else {
                      setShowAddTeamModal(true);
                    }
                  }}
                  className="gradient-btn"
                >
                  <FaPlus className="me-2" /> Add Team
                </Button>
              </div>
              
              {groups.length === 0 ? (
                <Card className="empty-card">
                  <Card.Body className="text-center p-5">
                    <FaLayerGroup size={64} className="mb-3 text-muted" />
                    <h4>No Groups Created</h4>
                    <p className="text-muted">Please create groups first before adding teams.</p>
                    <Button variant="primary" onClick={() => setActiveTab('groups')} className="mt-3 gradient-btn">
                      <FaLayerGroup className="me-2" /> Go to Groups
                    </Button>
                  </Card.Body>
                </Card>
              ) : teams.length === 0 ? (
                <Card className="empty-card">
                  <Card.Body className="text-center p-5">
                    <FaUsers size={64} className="mb-3 text-muted" />
                    <h4>No Teams Created</h4>
                    <p className="text-muted">Start by adding your first team to a group.</p>
                    <Button variant="primary" onClick={() => setShowAddTeamModal(true)} className="mt-3 gradient-btn">
                      <FaPlus className="me-2" /> Add First Team
                    </Button>
                  </Card.Body>
                </Card>
              ) : (
                <Accordion defaultActiveKey="0">
                  {groups.map((group, groupIndex) => {
                    const groupTeams = getTeamsByGroup(group.id);
                    if (groupTeams.length === 0) return null;
                    
                    return (
                      <Accordion.Item key={group.id} eventKey={groupIndex.toString()}>
                        <Accordion.Header>
                          <div className="d-flex justify-content-between align-items-center w-100 me-3">
                            <div>
                              <strong>{group.name}</strong>
                              <Badge bg="info" className="ms-2">{groupTeams.length} teams</Badge>
                            </div>
                          </div>
                        </Accordion.Header>
                        <Accordion.Body>
                          <Row>
                            {groupTeams.map((team) => (
                              <Col key={team.id} md={6} lg={4} className="mb-3">
                                <Card className="team-card-modern" onClick={() => handleSelectTeam(team)}>
                                  <Card.Body>
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                      <h6 className="team-name-modern mb-0">{team.name}</h6>
                                      <Badge bg={team.players?.length >= (tournamentDetails?.playersPerTeam || 0) ? 'success' : 'warning'}>
                                        {team.players?.length || 0} Players
                                      </Badge>
                                    </div>
                                    <p className="text-muted mb-2 small">
                                      <FaUsers className="me-1" />
                                      {team.players?.length || 0} / {tournamentDetails?.playersPerTeam || 'N/A'} players
                                    </p>
                                    <div className="d-flex gap-2">
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        className="flex-fill"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectTeam(team);
                                        }}
                                      >
                                        <FaEdit className="me-1" /> Edit
                                      </Button>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTeam(team.id);
                                        }}
                                      >
                                        <FaTrash />
                                      </Button>
                                    </div>
                                  </Card.Body>
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        </Accordion.Body>
                      </Accordion.Item>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </Tab>

          {/* Edit Team Tab */}
          <Tab eventKey="edit-team" title={
            <span><FaEdit className="me-2" /> Edit Team</span>
          } disabled={!selectedTeam}>
            {selectedTeam ? (
              <div className="tab-content-wrapper">
                <div className="team-header mb-4">
                  <h4 className="mb-2">
                    <FaUsers className="me-2" /> {selectedTeam.name}
                  </h4>
                  <p className="text-muted">
                    Group: <strong>{selectedTeam.groupName || 'N/A'}</strong> | Manage players for this team
                  </p>
                </div>

                <Card className="add-player-card mb-4">
                  <Card.Body>
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
                            className="form-control-modern"
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
                            className="form-control-modern"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>Role *</Form.Label>
                          <Form.Select
                            value={playerData.role}
                            onChange={(e) => setPlayerData({ ...playerData, role: e.target.value })}
                            className="form-control-modern"
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
                          <Button variant="primary" className="w-100 gradient-btn" onClick={handleAddPlayer}>
                            <FaUserPlus />
                          </Button>
                        )}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <div className="players-list-section">
                  <h5 className="mb-3">Players List ({(selectedTeam.players || []).length})</h5>
                  {!selectedTeam.players || selectedTeam.players.length === 0 ? (
                    <Card className="empty-card">
                      <Card.Body className="text-center p-5">
                        <FaUser size={48} className="mb-3 text-muted" />
                        <p className="text-muted">No players added yet</p>
                      </Card.Body>
                    </Card>
                  ) : (
                    <div className="table-responsive">
                      <Table striped bordered hover className="players-table">
                        <thead>
                          <tr>
                            <th>Jersey #</th>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedTeam.players || []).map((player) => (
                            <tr key={player.id}>
                              <td><strong>{player.jerseyNumber}</strong></td>
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
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="tab-content-wrapper text-center p-5">
                <FaUsers size={64} className="mb-3 text-muted" />
                <p className="text-muted">Please select a team from the Teams tab to edit</p>
              </div>
            )}
          </Tab>
        </Tabs>
      </Modal.Body>
      <Modal.Footer className="modal-footer-custom">
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>

      {/* Add Group Modal */}
      <Modal show={showAddGroupModal} onHide={() => setShowAddGroupModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><FaPlus className="me-2" /> Add New Group</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Group Name *</Form.Label>
              <Form.Control
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Group A, Pool 1, etc."
                required
                className="form-control-modern"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGroup();
                  }
                }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddGroupModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddGroup} className="gradient-btn">Add Group</Button>
        </Modal.Footer>
      </Modal>

      {/* Add Team Modal */}
      <Modal show={showAddTeamModal} onHide={() => {
        setShowAddTeamModal(false);
        setSelectedGroup(null);
      }} centered>
        <Modal.Header closeButton>
          <Modal.Title><FaPlus className="me-2" /> Add New Team</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Select Group *</Form.Label>
              <Form.Select
                value={selectedGroup?.id || ''}
                onChange={(e) => {
                  const group = groups.find(g => g.id === e.target.value);
                  setSelectedGroup(group);
                }}
                required
                className="form-control-modern"
              >
                <option value="">Select a group</option>
                {groups.map((group) => {
                  const groupTeams = getTeamsByGroup(group.id);
                  const isFull = tournamentDetails?.teamsPerGroup && groupTeams.length >= parseInt(tournamentDetails.teamsPerGroup);
                  return (
                    <option key={group.id} value={group.id} disabled={isFull}>
                      {group.name} {isFull ? '(Full)' : `(${groupTeams.length}/${tournamentDetails?.teamsPerGroup || 'N/A'})`}
                    </option>
                  );
                })}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Team Name *</Form.Label>
              <Form.Control
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                required
                className="form-control-modern"
                disabled={!selectedGroup}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && selectedGroup) {
                    e.preventDefault();
                    handleAddTeam();
                  }
                }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowAddTeamModal(false);
            setSelectedGroup(null);
          }}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleAddTeam} 
            className="gradient-btn"
            disabled={!selectedGroup}
          >
            Add Team
          </Button>
        </Modal.Footer>
      </Modal>
    </Modal>
  );
};

export default TournamentManagementModal;
