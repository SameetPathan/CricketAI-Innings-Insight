import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button } from 'react-bootstrap';
import { FaDownload, FaPrint, FaArrowLeft } from 'react-icons/fa';
import { db } from './firebase';
import { ref, get } from 'firebase/database';
import { useParams, useNavigate } from 'react-router-dom';
import './Scorecard.css';

const Scorecard = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const snapshot = await get(ref(db, `matches/${matchId}`));
        if (snapshot.exists()) {
          setMatch(snapshot.val());
        }
      } catch (error) {
        console.error('Error fetching match:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMatch();
  }, [matchId]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading scorecard...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="error-container">
        <h2>Match not found</h2>
        <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  const formatOvers = (overs, balls) => {
    return `${overs}.${balls % 6}`;
  };

  const getRunRate = (score, overs, balls) => {
    const totalBalls = overs * 6 + (balls % 6);
    if (totalBalls === 0) return '0.00';
    return ((score / totalBalls) * 6).toFixed(2);
  };

  return (
    <div className="scorecard-container">
      <Container>
        <div className="scorecard-header mb-4">
          <Button variant="outline-light" onClick={() => navigate('/dashboard')} className="mb-3">
            <FaArrowLeft className="me-2" /> Back to Dashboard
          </Button>
          <h1 className="scorecard-title">{match.matchTitle}</h1>
          <div className="match-details">
            <Badge bg="info" className="me-2">{match.matchFormat}</Badge>
            <Badge bg="secondary" className="me-2">{match.venue}</Badge>
            <Badge bg="light" text="dark">{new Date(match.matchDate).toLocaleDateString()}</Badge>
          </div>
        </div>

        <Row>
          <Col lg={6} className="mb-4">
            <Card className="innings-card">
              <Card.Body>
                <div className="innings-header">
                  <h3>{match.team1.name} - 1st Innings</h3>
                  <div className="innings-score">
                    <span className="score-large">{match.team1.score}/{match.team1.wickets}</span>
                    <span className="overs-text">
                      ({formatOvers(match.team1.overs, match.team1.balls)} overs)
                    </span>
                  </div>
                  <p className="run-rate">
                    Run Rate: {getRunRate(match.team1.score, match.team1.overs, match.team1.balls)}
                  </p>
                </div>

                <div className="batting-table mt-4">
                  <h5>Batting</h5>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Batsman</th>
                        <th>Runs</th>
                        <th>Balls</th>
                        <th>4s</th>
                        <th>6s</th>
                        <th>SR</th>
                        <th>Dismissal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.team1.players?.slice(0, 11).map((player, idx) => {
                        const playerStats = match.team1.playerStats?.[idx] || {
                          runs: 0,
                          balls: 0,
                          fours: 0,
                          sixes: 0,
                          dismissed: false,
                          dismissalType: '',
                        };
                        const strikeRate = playerStats.balls > 0 
                          ? ((playerStats.runs / playerStats.balls) * 100).toFixed(2)
                          : '0.00';
                        return (
                          <tr key={idx}>
                            <td>
                              {player.name}
                              {!playerStats.dismissed && idx < match.team1.wickets && (
                                <Badge bg="success" className="ms-2">Not Out</Badge>
                              )}
                            </td>
                            <td>{playerStats.runs}</td>
                            <td>{playerStats.balls}</td>
                            <td>{playerStats.fours}</td>
                            <td>{playerStats.sixes}</td>
                            <td>{strikeRate}</td>
                            <td>
                              {playerStats.dismissed 
                                ? `${playerStats.dismissalType} ${playerStats.dismissedBy || ''}`
                                : idx >= match.team1.wickets ? 'Did not bat' : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>

                <div className="bowling-table mt-4">
                  <h5>Bowling (vs {match.team2.name})</h5>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Bowler</th>
                        <th>Overs</th>
                        <th>Maidens</th>
                        <th>Runs</th>
                        <th>Wickets</th>
                        <th>Economy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.team2.players?.filter(p => p.role === 'Bowler' || p.role === 'All-rounder').slice(0, 5).map((player, idx) => {
                        const bowlerStats = match.team2.bowlerStats?.[idx] || {
                          overs: 0,
                          balls: 0,
                          maidens: 0,
                          runs: 0,
                          wickets: 0,
                        };
                        const totalBalls = bowlerStats.overs * 6 + (bowlerStats.balls % 6);
                        const economy = totalBalls > 0 
                          ? ((bowlerStats.runs / totalBalls) * 6).toFixed(2)
                          : '0.00';
                        return (
                          <tr key={idx}>
                            <td>{player.name}</td>
                            <td>{formatOvers(bowlerStats.overs, bowlerStats.balls)}</td>
                            <td>{bowlerStats.maidens}</td>
                            <td>{bowlerStats.runs}</td>
                            <td>{bowlerStats.wickets}</td>
                            <td>{economy}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6} className="mb-4">
            <Card className="innings-card">
              <Card.Body>
                <div className="innings-header">
                  <h3>{match.team2.name} - {match.currentInnings === 2 ? '2nd' : '1st'} Innings</h3>
                  <div className="innings-score">
                    <span className="score-large">{match.team2.score}/{match.team2.wickets}</span>
                    <span className="overs-text">
                      ({formatOvers(match.team2.overs, match.team2.balls)} overs)
                    </span>
                  </div>
                  <p className="run-rate">
                    Run Rate: {getRunRate(match.team2.score, match.team2.overs, match.team2.balls)}
                  </p>
                </div>

                <div className="batting-table mt-4">
                  <h5>Batting</h5>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Batsman</th>
                        <th>Runs</th>
                        <th>Balls</th>
                        <th>4s</th>
                        <th>6s</th>
                        <th>SR</th>
                        <th>Dismissal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.team2.players?.slice(0, 11).map((player, idx) => {
                        const playerStats = match.team2.playerStats?.[idx] || {
                          runs: 0,
                          balls: 0,
                          fours: 0,
                          sixes: 0,
                          dismissed: false,
                          dismissalType: '',
                        };
                        const strikeRate = playerStats.balls > 0 
                          ? ((playerStats.runs / playerStats.balls) * 100).toFixed(2)
                          : '0.00';
                        return (
                          <tr key={idx}>
                            <td>
                              {player.name}
                              {!playerStats.dismissed && idx < match.team2.wickets && (
                                <Badge bg="success" className="ms-2">Not Out</Badge>
                              )}
                            </td>
                            <td>{playerStats.runs}</td>
                            <td>{playerStats.balls}</td>
                            <td>{playerStats.fours}</td>
                            <td>{playerStats.sixes}</td>
                            <td>{strikeRate}</td>
                            <td>
                              {playerStats.dismissed 
                                ? `${playerStats.dismissalType} ${playerStats.dismissedBy || ''}`
                                : idx >= match.team2.wickets ? 'Did not bat' : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>

                <div className="bowling-table mt-4">
                  <h5>Bowling (vs {match.team1.name})</h5>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Bowler</th>
                        <th>Overs</th>
                        <th>Maidens</th>
                        <th>Runs</th>
                        <th>Wickets</th>
                        <th>Economy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.team1.players?.filter(p => p.role === 'Bowler' || p.role === 'All-rounder').slice(0, 5).map((player, idx) => {
                        const bowlerStats = match.team1.bowlerStats?.[idx] || {
                          overs: 0,
                          balls: 0,
                          maidens: 0,
                          runs: 0,
                          wickets: 0,
                        };
                        const totalBalls = bowlerStats.overs * 6 + (bowlerStats.balls % 6);
                        const economy = totalBalls > 0 
                          ? ((bowlerStats.runs / totalBalls) * 6).toFixed(2)
                          : '0.00';
                        return (
                          <tr key={idx}>
                            <td>{player.name}</td>
                            <td>{formatOvers(bowlerStats.overs, bowlerStats.balls)}</td>
                            <td>{bowlerStats.maidens}</td>
                            <td>{bowlerStats.runs}</td>
                            <td>{bowlerStats.wickets}</td>
                            <td>{economy}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {match.status === 'completed' && (
          <Card className="result-card mt-4">
            <Card.Body className="text-center">
              <h2 className="result-title">Match Result</h2>
              {match.team1.score > match.team2.score ? (
                <p className="winner-text">
                  <strong>{match.team1.name}</strong> won by {match.team1.score - match.team2.score} runs
                </p>
              ) : (
                <p className="winner-text">
                  <strong>{match.team2.name}</strong> won by {10 - match.team2.wickets} wickets
                </p>
              )}
            </Card.Body>
          </Card>
        )}

        <div className="scorecard-actions mt-4 text-center">
          <Button variant="primary" className="me-2" onClick={() => window.print()}>
            <FaPrint className="me-2" /> Print Scorecard
          </Button>
          <Button variant="success" onClick={() => navigate(`/match/${matchId}/score`)}>
            <FaArrowLeft className="me-2" /> Back to Live Score
          </Button>
        </div>
      </Container>
    </div>
  );
};

export default Scorecard;

