import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { FaCog, FaUsers, FaUser, FaFutbol, FaSave, FaTrash } from 'react-icons/fa';
import { db } from '../../firebase';
import { ref, update } from 'firebase/database';
import { toast } from 'react-toastify';

const TournamentDetailsModal = ({ show, onHide, tournament }) => {
  const [tournamentDetails, setTournamentDetails] = useState({
    numberOfTeams: '',
    playersPerTeam: '',
    oversPerInnings: '',
    maxOversPerPlayer: '',
    customRules: []
  });
  const [newCustomRule, setNewCustomRule] = useState('');

  useEffect(() => {
    if (tournament?.tournamentDetails) {
      setTournamentDetails({
        numberOfTeams: tournament.tournamentDetails.numberOfTeams || '',
        playersPerTeam: tournament.tournamentDetails.playersPerTeam || '',
        oversPerInnings: tournament.tournamentDetails.oversPerInnings || '',
        maxOversPerPlayer: tournament.tournamentDetails.maxOversPerPlayer || '',
        customRules: tournament.tournamentDetails.customRules || []
      });
    }
  }, [tournament]);

  const handleSave = async () => {
    if (!tournamentDetails.numberOfTeams || !tournamentDetails.playersPerTeam || 
        !tournamentDetails.oversPerInnings || !tournamentDetails.maxOversPerPlayer) {
      return toast.error('Please fill all required fields');
    }

    try {
      const tournamentRef = ref(db, `tournaments/${tournament.id}`);
      await update(tournamentRef, {
        tournamentDetails: {
          numberOfTeams: parseInt(tournamentDetails.numberOfTeams),
          playersPerTeam: parseInt(tournamentDetails.playersPerTeam),
          oversPerInnings: parseInt(tournamentDetails.oversPerInnings),
          maxOversPerPlayer: parseInt(tournamentDetails.maxOversPerPlayer),
          customRules: tournamentDetails.customRules
        },
        updatedAt: new Date().toISOString(),
      });
      toast.success('Tournament details saved successfully!');
      onHide();
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
    }
  };

  const handleRemoveCustomRule = (index) => {
    const updatedRules = tournamentDetails.customRules.filter((_, i) => i !== index);
    setTournamentDetails({
      ...tournamentDetails,
      customRules: updatedRules
    });
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title><FaCog className="me-2" /> Tournament Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label><FaUsers className="me-2" /> Number of Teams *</Form.Label>
                <Form.Control
                  type="number"
                  min="2"
                  value={tournamentDetails.numberOfTeams}
                  onChange={(e) => setTournamentDetails({ ...tournamentDetails, numberOfTeams: e.target.value })}
                  required
                  placeholder="e.g., 8"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label><FaUser className="me-2" /> Players per Team *</Form.Label>
                <Form.Control
                  type="number"
                  min="11"
                  value={tournamentDetails.playersPerTeam}
                  onChange={(e) => setTournamentDetails({ ...tournamentDetails, playersPerTeam: e.target.value })}
                  required
                  placeholder="e.g., 15"
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label><FaFutbol className="me-2" /> Overs per Innings *</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={tournamentDetails.oversPerInnings}
                  onChange={(e) => setTournamentDetails({ ...tournamentDetails, oversPerInnings: e.target.value })}
                  required
                  placeholder="e.g., 20"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label><FaCog className="me-2" /> Max Overs per Player *</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={tournamentDetails.maxOversPerPlayer}
                  onChange={(e) => setTournamentDetails({ ...tournamentDetails, maxOversPerPlayer: e.target.value })}
                  required
                  placeholder="e.g., 4"
                />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label><FaCog className="me-2" /> Custom Rules</Form.Label>
            <div className="d-flex mb-2">
              <Form.Control
                type="text"
                value={newCustomRule}
                onChange={(e) => setNewCustomRule(e.target.value)}
                placeholder="Enter a custom rule"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomRule();
                  }
                }}
              />
              <Button variant="outline-primary" onClick={handleAddCustomRule} className="ms-2">
                Add Rule
              </Button>
            </div>
            {tournamentDetails.customRules.length > 0 && (
              <div className="custom-rules-list">
                {tournamentDetails.customRules.map((rule, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
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
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>
          <FaSave className="me-2" /> Save Details
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TournamentDetailsModal;

