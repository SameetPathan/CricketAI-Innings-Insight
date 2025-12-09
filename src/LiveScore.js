import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, ButtonGroup, Badge, Alert, Modal, Form } from 'react-bootstrap';
import { FaFutbol, FaUndo, FaPlay, FaCoins, FaBaseballBall } from 'react-icons/fa';
import { db } from './firebase';
import { ref, get, update, onValue } from 'firebase/database';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './LiveScore.css';

const LiveScore = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [user, setUser] = useState(null);
  const [currentBatsman, setCurrentBatsman] = useState({ team: 1, index: 0 });
  const [currentBowler, setCurrentBowler] = useState({ team: 2, index: 0 });
  const [lastBall, setLastBall] = useState(null);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showTossModal, setShowTossModal] = useState(false);
  const [showPlayerSelectionModal, setShowPlayerSelectionModal] = useState(false);
  const [wicketType, setWicketType] = useState('bowled');
  const [wicketBatsman, setWicketBatsman] = useState(null);
  const [ballHistory, setBallHistory] = useState([]);
  const [tossWinner, setTossWinner] = useState(null);
  const [tossDecision, setTossDecision] = useState('bat');
  const [selectedBatsman1, setSelectedBatsman1] = useState(null);
  const [selectedBatsman2, setSelectedBatsman2] = useState(null);
  const [selectedBowler, setSelectedBowler] = useState(null);

  useEffect(() => {
    const loggedInUser = sessionStorage.getItem('authUser');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
    }

    const matchRef = ref(db, `matches/${matchId}`);
    
    const unsubscribe = onValue(matchRef, (snapshot) => {
      if (snapshot.exists()) {
        const matchData = snapshot.val();
        setMatch(matchData);
        
        // Set current batsman and bowler if match is live
        if (matchData.status === 'live' && matchData.currentBattingTeam) {
          if (matchData.currentBattingTeam === 1) {
            const battingTeam = matchData.team1;
            const bowlingTeam = matchData.team2;
            if (battingTeam.players && battingTeam.players.length > 0) {
              setCurrentBatsman({ team: 1, index: 0 });
            }
            if (bowlingTeam.players && bowlingTeam.players.length > 0) {
              setCurrentBowler({ team: 2, index: 0 });
            }
          } else {
            const battingTeam = matchData.team2;
            const bowlingTeam = matchData.team1;
            if (battingTeam.players && battingTeam.players.length > 0) {
              setCurrentBatsman({ team: 2, index: 0 });
            }
            if (bowlingTeam.players && bowlingTeam.players.length > 0) {
              setCurrentBowler({ team: 1, index: 0 });
            }
          }
        }

        // Load ball history
        if (matchData.ballHistory) {
          setBallHistory(Array.isArray(matchData.ballHistory) ? matchData.ballHistory : []);
        }
      }
    });

    return () => unsubscribe();
  }, [matchId]);

  if (!match) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading match...</p>
      </div>
    );
  }

  const battingTeam = match.currentBattingTeam === 1 ? match.team1 : match.team2;
  const bowlingTeam = match.currentBattingTeam === 1 ? match.team2 : match.team1;
  const currentInnings = match.currentInnings || 1;
  const maxOvers = parseInt(match.overs) || 20;
  const currentOver = Math.floor((battingTeam?.balls || 0) / 6);
  const currentBall = (battingTeam?.balls || 0) % 6;
  const isMasterAdmin = user?.userType === 'Master Admin';

  const startMatch = async () => {
    const matchRef = ref(db, `matches/${matchId}`);
    await update(matchRef, {
      status: 'toss',
    });
    setShowTossModal(true);
  };

  const conductToss = async () => {
    if (!tossWinner || !tossDecision) {
      toast.error('Please select toss winner and decision');
      return;
    }

    const matchRef = ref(db, `matches/${matchId}`);
    const tossWinnerTeam = tossWinner === 'team1' ? match.team1.name : match.team2.name;
    const tossLoserTeam = tossWinner === 'team1' ? match.team2.name : match.team1.name;
    
    // Determine batting and bowling teams based on toss
    let battingTeamNum, bowlingTeamNum;
    if (tossDecision === 'bat') {
      battingTeamNum = tossWinner === 'team1' ? 1 : 2;
      bowlingTeamNum = tossWinner === 'team1' ? 2 : 1;
    } else {
      battingTeamNum = tossWinner === 'team1' ? 2 : 1;
      bowlingTeamNum = tossWinner === 'team1' ? 1 : 2;
    }

    await update(matchRef, {
      status: 'player_selection',
      toss: {
        winner: tossWinner,
        winnerTeam: tossWinnerTeam,
        decision: tossDecision,
        timestamp: new Date().toISOString(),
      },
      currentBattingTeam: battingTeamNum,
      currentBowlingTeam: bowlingTeamNum,
    });

    setShowTossModal(false);
    setShowPlayerSelectionModal(true);
  };

  const startMatchWithPlayers = async () => {
    if (!selectedBatsman1 || !selectedBatsman2 || !selectedBowler) {
      toast.error('Please select all players (2 batsmen and 1 bowler)');
      return;
    }

    const matchRef = ref(db, `matches/${matchId}`);
    const battingTeamKey = match.currentBattingTeam === 1 ? 'team1' : 'team2';
    const bowlingTeamKey = match.currentBattingTeam === 1 ? 'team2' : 'team1';

    const playerUpdates = {};
    playerUpdates[`${battingTeamKey}/currentBatsman1`] = selectedBatsman1;
    playerUpdates[`${battingTeamKey}/currentBatsman2`] = selectedBatsman2;
    playerUpdates[`${bowlingTeamKey}/currentBowler`] = selectedBowler;
    playerUpdates['status'] = 'live';

    await update(matchRef, playerUpdates);

    setShowPlayerSelectionModal(false);
    const bowlingTeamNum = match.currentBattingTeam === 1 ? 2 : 1;
    setCurrentBatsman({ team: match.currentBattingTeam, index: selectedBatsman1 });
    setCurrentBowler({ team: bowlingTeamNum, index: selectedBowler });
  };

  const recordBall = async (runs, isExtra = false, extraType = '') => {
    const matchRef = ref(db, `matches/${matchId}`);
    const battingTeamKey = match.currentBattingTeam === 1 ? 'team1' : 'team2';
    
    const updates = {};
    const newBalls = (battingTeam.balls || 0) + 1;
    const newOvers = Math.floor(newBalls / 6);
    const newScore = (battingTeam.score || 0) + runs;

    updates[`${battingTeamKey}/score`] = newScore;
    updates[`${battingTeamKey}/balls`] = newBalls;
    updates[`${battingTeamKey}/overs`] = newOvers;

    // Record ball in history
    const ballRecord = {
      over: `${newOvers}.${newBalls % 6}`,
      runs: runs,
      isExtra: isExtra,
      extraType: extraType,
      batsman: battingTeam.players[currentBatsman.index]?.name || 'Unknown',
      bowler: bowlingTeam.players[currentBowler.index]?.name || 'Unknown',
      timestamp: new Date().toISOString(),
    };

    const historyRef = ref(db, `matches/${matchId}/ballHistory`);
    const historySnapshot = await get(historyRef);
    const existingHistory = historySnapshot.exists() ? historySnapshot.val() : [];
    const newHistory = [...(Array.isArray(existingHistory) ? existingHistory : []), ballRecord];
    
    updates['ballHistory'] = newHistory;
    setLastBall(ballRecord);
    setBallHistory(newHistory);

    // Check if innings is complete
    if (newOvers >= maxOvers || (battingTeam.wickets || 0) >= 10) {
      if (currentInnings === 1) {
        updates['currentInnings'] = 2;
        updates['currentBattingTeam'] = match.currentBattingTeam === 1 ? 2 : 1;
        updates['status'] = 'innings_break';
      } else {
        updates['status'] = 'completed';
      }
    }

    await update(matchRef, updates);
  };

  const recordWicket = async () => {
    const matchRef = ref(db, `matches/${matchId}`);
    const battingTeamKey = match.currentBattingTeam === 1 ? 'team1' : 'team2';
    
    const updates = {};
    const newWickets = (battingTeam.wickets || 0) + 1;
    updates[`${battingTeamKey}/wickets`] = newWickets;

    // Record wicket
    const wicketRecord = {
      over: `${currentOver}.${currentBall}`,
      type: wicketType,
      batsman: battingTeam.players[currentBatsman.index]?.name || 'Unknown',
      bowler: bowlingTeam.players[currentBowler.index]?.name || 'Unknown',
      timestamp: new Date().toISOString(),
    };

    const historyRef = ref(db, `matches/${matchId}/ballHistory`);
    const historySnapshot = await get(historyRef);
    const existingHistory = historySnapshot.exists() ? historySnapshot.val() : [];
    const newHistory = [...(Array.isArray(existingHistory) ? existingHistory : []), { ...wicketRecord, runs: 'W', isWicket: true }];
    
    updates['ballHistory'] = newHistory;
    setBallHistory(newHistory);

    // Move to next batsman
    const nextBatsmanIndex = currentBatsman.index + 1;
    if (nextBatsmanIndex < battingTeam.players.length) {
      setCurrentBatsman({ ...currentBatsman, index: nextBatsmanIndex });
    }

    // Check if innings is complete
    if (newWickets >= 10 || currentOver >= maxOvers) {
      if (currentInnings === 1) {
        updates['currentInnings'] = 2;
        updates['currentBattingTeam'] = match.currentBattingTeam === 1 ? 2 : 1;
        updates['status'] = 'innings_break';
      } else {
        updates['status'] = 'completed';
      }
    }

    await update(matchRef, updates);
    setShowWicketModal(false);
  };

  const undoLastBall = async () => {
    if (ballHistory.length === 0) return;

    const matchRef = ref(db, `matches/${matchId}`);
    const battingTeamKey = match.currentBattingTeam === 1 ? 'team1' : 'team2';
    const lastBallRecord = ballHistory[ballHistory.length - 1];
    
    const updates = {};
    const newBalls = Math.max(0, (battingTeam.balls || 0) - 1);
    const newOvers = Math.floor(newBalls / 6);
    const runsToSubtract = typeof lastBallRecord.runs === 'number' ? lastBallRecord.runs : 0;
    const newScore = Math.max(0, (battingTeam.score || 0) - runsToSubtract);

    updates[`${battingTeamKey}/score`] = newScore;
    updates[`${battingTeamKey}/balls`] = newBalls;
    updates[`${battingTeamKey}/overs`] = newOvers;

    if (lastBallRecord.isWicket) {
      updates[`${battingTeamKey}/wickets`] = Math.max(0, (battingTeam.wickets || 0) - 1);
    }

    const newHistory = ballHistory.slice(0, -1);
    updates['ballHistory'] = newHistory;
    setBallHistory(newHistory);

    await update(matchRef, updates);
  };

  const startInnings2 = async () => {
    const matchRef = ref(db, `matches/${matchId}`);
    await update(matchRef, {
      status: 'live',
      currentInnings: 2,
      currentBattingTeam: match.currentBattingTeam === 1 ? 2 : 1,
    });
  };

  return (
    <div className="live-score-container">
      <Container fluid>
        <div className="score-header mb-4">
          <h1 className="match-title">{match.matchTitle}</h1>
          <p className="match-info">
            {match.matchFormat} • {match.venue} • {new Date(match.matchDate).toLocaleDateString()}
          </p>
        </div>

        {/* Toss Information Display */}
        {match.toss && (
          <Alert variant="info" className="toss-info-alert">
            <FaCoins className="me-2" />
            <strong>Toss:</strong> {match.toss.winnerTeam} won the toss and chose to <strong>{match.toss.decision === 'bat' ? 'BAT' : 'BOWL'}</strong>
          </Alert>
        )}

        {/* Start Match Button for Master Admin */}
        {match.status === 'upcoming' && isMasterAdmin && (
          <Alert variant="warning" className="text-center">
            <h4>Match Not Started</h4>
            <p>Click the button below to start the match and conduct the toss.</p>
            <Button onClick={startMatch} variant="success" size="lg" className="mt-3">
              <FaPlay className="me-2" /> Start Match
            </Button>
          </Alert>
        )}

        {/* Player Selection Required */}
        {match.status === 'player_selection' && isMasterAdmin && (
          <Alert variant="info" className="text-center">
            <h4>Select Playing XI</h4>
            <p>Please select the opening batsmen and opening bowler to start the match.</p>
            <Button onClick={() => setShowPlayerSelectionModal(true)} variant="primary" size="lg" className="mt-3">
              <FaBaseballBall className="me-2" /> Select Players
            </Button>
          </Alert>
        )}

        {match.status === 'innings_break' && currentInnings === 1 && (
          <Alert variant="info" className="text-center">
            <h4>Innings Break</h4>
            <p>{battingTeam?.name} scored {battingTeam?.score || 0}/{battingTeam?.wickets || 0} in {battingTeam?.overs || 0}.{(battingTeam?.balls || 0) % 6} overs</p>
            <Button onClick={startInnings2} variant="primary" size="lg">
              Start 2nd Innings
            </Button>
          </Alert>
        )}

        {match.status === 'completed' && (
          <Alert variant="success" className="text-center">
            <h4>Match Completed!</h4>
            <p>
              {match.team1.score > match.team2.score 
                ? `${match.team1.name} won by ${match.team1.score - match.team2.score} runs`
                : `${match.team2.name} won by ${10 - (match.team2.wickets || 0)} wickets`}
            </p>
            <Button onClick={() => navigate(`/match/${matchId}/scorecard`)} variant="success" size="lg">
              View Full Scorecard
            </Button>
          </Alert>
        )}

        {match.status === 'live' && (
          <Row>
            <Col lg={8}>
              <Card className="score-card mb-4">
                <Card.Body>
                  <div className="team-score-header">
                    <h3 className="batting-team-name">{battingTeam?.name}</h3>
                    <div className="score-display">
                      <span className="score-large">
                        {battingTeam?.score || 0}/{battingTeam?.wickets || 0}
                      </span>
                      <span className="overs">
                        ({(battingTeam?.overs || 0)}.{(battingTeam?.balls || 0) % 6} / {maxOvers} overs)
                      </span>
                    </div>
                  </div>

                  <div className="current-players mt-4">
                    <Row>
                      <Col md={6}>
                        <div className="player-info">
                          <Badge bg="primary" className="mb-2">On Strike</Badge>
                          <h5>{battingTeam?.players?.[currentBatsman.index]?.name || 'N/A'}</h5>
                          <p className="text-muted">Bowler: {bowlingTeam?.players?.[currentBowler.index]?.name || 'N/A'}</p>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="over-display">
                          <h4>Current Over</h4>
                          <div className="over-balls">
                            {ballHistory.slice(-6).map((ball, idx) => (
                              <span
                                key={idx}
                                className={`ball-dot ${ball.isWicket ? 'wicket' : ball.runs === 0 ? 'dot' : ball.runs >= 4 ? 'boundary' : ''}`}
                              >
                                {ball.isWicket ? 'W' : ball.runs}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  <hr className="my-4" />
                  <div className="scoring-controls">
                    <h5 className="mb-3">Record Runs</h5>
                    <ButtonGroup className="mb-3 w-100" size="lg">
                      <Button variant="outline-primary" onClick={() => recordBall(0)}>0</Button>
                      <Button variant="outline-success" onClick={() => recordBall(1)}>1</Button>
                      <Button variant="outline-success" onClick={() => recordBall(2)}>2</Button>
                      <Button variant="outline-success" onClick={() => recordBall(3)}>3</Button>
                      <Button variant="outline-warning" onClick={() => recordBall(4)}>4</Button>
                      <Button variant="outline-danger" onClick={() => recordBall(6)}>6</Button>
                    </ButtonGroup>

                    <h5 className="mb-3 mt-4">Extras</h5>
                    <ButtonGroup className="mb-3 w-100" size="lg">
                      <Button variant="outline-info" onClick={() => recordBall(1, true, 'wide')}>Wide</Button>
                      <Button variant="outline-info" onClick={() => recordBall(1, true, 'no-ball')}>No Ball</Button>
                      <Button variant="outline-info" onClick={() => recordBall(0, true, 'bye')}>Bye</Button>
                      <Button variant="outline-info" onClick={() => recordBall(0, true, 'leg-bye')}>Leg Bye</Button>
                    </ButtonGroup>

                    <div className="d-grid gap-2 mt-4">
                      <Button
                        variant="danger"
                        size="lg"
                        onClick={() => setShowWicketModal(true)}
                      >
                        <FaFutbol className="me-2" /> Wicket
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={undoLastBall}
                        disabled={ballHistory.length === 0}
                      >
                        <FaUndo className="me-2" /> Undo Last Ball
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              {lastBall && (
                <Card className="last-ball-card">
                  <Card.Body>
                    <h6>Last Ball: {lastBall.over}</h6>
                    <p className="mb-0">
                      {lastBall.batsman} scored {lastBall.runs} runs off {lastBall.bowler}
                      {lastBall.isExtra && ` (${lastBall.extraType})`}
                    </p>
                  </Card.Body>
                </Card>
              )}
            </Col>

            <Col lg={4}>
              <Card className="match-summary-card">
                <Card.Body>
                  <h5 className="mb-3">Match Summary</h5>
                  <div className="team-summary mb-3">
                    <div className="team-row">
                      <strong>{match.team1.name}</strong>
                      <span>{match.team1.score || 0}/{match.team1.wickets || 0} ({(match.team1.overs || 0)}.{(match.team1.balls || 0) % 6})</span>
                    </div>
                    <div className="team-row">
                      <strong>{match.team2.name}</strong>
                      <span>{match.team2.score || 0}/{match.team2.wickets || 0} ({(match.team2.overs || 0)}.{(match.team2.balls || 0) % 6})</span>
                    </div>
                  </div>
                  <hr />
                  <div className="match-status">
                    <Badge bg="success">LIVE</Badge>
                    <p className="mt-2">Innings {currentInnings} of 2</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Toss Modal */}
        <Modal show={showTossModal} onHide={() => setShowTossModal(false)} size="lg" centered>
          <Modal.Header closeButton className="toss-modal-header">
            <Modal.Title><FaCoins className="me-2" /> Conduct Toss</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-4">
                <Form.Label className="fw-bold">Who won the toss?</Form.Label>
                <div className="d-grid gap-2">
                  <Button
                    variant={tossWinner === 'team1' ? 'primary' : 'outline-primary'}
                    size="lg"
                    onClick={() => setTossWinner('team1')}
                  >
                    {match.team1.name}
                  </Button>
                  <Button
                    variant={tossWinner === 'team2' ? 'primary' : 'outline-primary'}
                    size="lg"
                    onClick={() => setTossWinner('team2')}
                  >
                    {match.team2.name}
                  </Button>
                </div>
              </Form.Group>

              {tossWinner && (
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">What did they choose?</Form.Label>
                  <div className="d-grid gap-2">
                    <Button
                      variant={tossDecision === 'bat' ? 'success' : 'outline-success'}
                      size="lg"
                      onClick={() => setTossDecision('bat')}
                    >
                      🏏 Bat First
                    </Button>
                    <Button
                      variant={tossDecision === 'bowl' ? 'success' : 'outline-success'}
                      size="lg"
                      onClick={() => setTossDecision('bowl')}
                    >
                      ⚾ Bowl First
                    </Button>
                  </div>
                </Form.Group>
              )}

              {tossWinner && tossDecision && (
                <Alert variant="info">
                  <strong>{tossWinner === 'team1' ? match.team1.name : match.team2.name}</strong> won the toss and chose to <strong>{tossDecision === 'bat' ? 'BAT' : 'BOWL'}</strong>
                </Alert>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowTossModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={conductToss} disabled={!tossWinner || !tossDecision}>
              Confirm Toss
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Player Selection Modal */}
        <Modal show={showPlayerSelectionModal} onHide={() => setShowPlayerSelectionModal(false)} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title><FaBaseballBall className="me-2" /> Select Opening Players</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Opening Batsman 1 (On Strike)</Form.Label>
                    <Form.Select value={selectedBatsman1 || ''} onChange={(e) => setSelectedBatsman1(parseInt(e.target.value))}>
                      <option value="">Select Batsman</option>
                      {battingTeam?.players?.map((player, idx) => (
                        <option key={idx} value={idx}>{player.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Opening Batsman 2</Form.Label>
                    <Form.Select value={selectedBatsman2 || ''} onChange={(e) => setSelectedBatsman2(parseInt(e.target.value))}>
                      <option value="">Select Batsman</option>
                      {battingTeam?.players?.map((player, idx) => (
                        <option key={idx} value={idx}>{player.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Opening Bowler</Form.Label>
                <Form.Select value={selectedBowler || ''} onChange={(e) => setSelectedBowler(parseInt(e.target.value))}>
                  <option value="">Select Bowler</option>
                  {bowlingTeam?.players?.map((player, idx) => (
                    <option key={idx} value={idx}>{player.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPlayerSelectionModal(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={startMatchWithPlayers} disabled={!selectedBatsman1 || !selectedBatsman2 || !selectedBowler}>
              Start Match
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Wicket Modal */}
        <Modal show={showWicketModal} onHide={() => setShowWicketModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Record Wicket</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Wicket Type</Form.Label>
              <Form.Select value={wicketType} onChange={(e) => setWicketType(e.target.value)}>
                <option value="bowled">Bowled</option>
                <option value="caught">Caught</option>
                <option value="lbw">LBW</option>
                <option value="stumped">Stumped</option>
                <option value="run-out">Run Out</option>
                <option value="hit-wicket">Hit Wicket</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Batsman</Form.Label>
              <Form.Select value={wicketBatsman} onChange={(e) => setWicketBatsman(e.target.value)}>
                {battingTeam?.players?.map((player, idx) => (
                  <option key={idx} value={idx}>
                    {player.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowWicketModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={recordWicket}>
              Record Wicket
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default LiveScore;
