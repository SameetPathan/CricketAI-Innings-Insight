import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Form, ButtonGroup, Table, Alert } from 'react-bootstrap';
import { FaFutbol, FaPlay, FaUndo, FaTrophy, FaUsers, FaCalendarAlt, FaMapMarkerAlt, FaTimes, FaCheck, FaExclamationTriangle, FaExchangeAlt, FaUser } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { ref, get, update, onValue } from 'firebase/database';
import { toast } from 'react-toastify';
import './ScorerMatchScore.css';

const ScorerMatchScore = () => {
  const { tournamentId, matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [team1, setTeam1] = useState(null);
  const [team2, setTeam2] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerStats, setPlayerStats] = useState({});
  const [currentBatsmanStrike, setCurrentBatsmanStrike] = useState(null);
  const [currentBatsmanNonStrike, setCurrentBatsmanNonStrike] = useState(null);
  const [currentBowler, setCurrentBowler] = useState(null);
  const [ballHistory, setBallHistory] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [showTossModal, setShowTossModal] = useState(false);
  const [tossData, setTossData] = useState({ winner: null, decision: 'bat' });
  const [showPlayerSelectionModal, setShowPlayerSelectionModal] = useState(false);
  const [playerSelectionType, setPlayerSelectionType] = useState(null);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketData, setWicketData] = useState({ type: 'bowled', batsman: null });
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraData, setExtraData] = useState({ type: 'wide', runs: 1 });
  const [showBowlerSelectionModal, setShowBowlerSelectionModal] = useState(false);

  useEffect(() => {
    if (tournamentId) {
      const tournamentRef = ref(db, `tournaments/${tournamentId}`);
      const unsubscribeTournament = onValue(tournamentRef, (snapshot) => {
        if (snapshot.exists()) {
          setTournament({ id: tournamentId, ...snapshot.val() });
        }
      });
      return () => unsubscribeTournament();
    }
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId || !matchId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const matchRef = ref(db, `tournaments/${tournamentId}/matches/${matchId}`);
    const unsubscribeMatch = onValue(matchRef, async (snapshot) => {
      if (!isMounted) return;

      if (snapshot.exists()) {
        const matchData = snapshot.val();
        setMatch({ id: matchId, ...matchData });

        if (matchData.team1Id && matchData.team2Id) {
          const team1Ref = ref(db, `tournaments/${tournamentId}/teams/${matchData.team1Id}`);
          const team2Ref = ref(db, `tournaments/${tournamentId}/teams/${matchData.team2Id}`);

          const [team1Snapshot, team2Snapshot] = await Promise.all([
            get(team1Ref),
            get(team2Ref)
          ]);

          if (isMounted) {
            if (team1Snapshot.exists()) {
              setTeam1({ id: matchData.team1Id, ...team1Snapshot.val() });
            }
            if (team2Snapshot.exists()) {
              setTeam2({ id: matchData.team2Id, ...team2Snapshot.val() });
            }
          }
        }

        if (matchData.ballHistory) {
          setBallHistory(Array.isArray(matchData.ballHistory) ? matchData.ballHistory : []);
        }

        if (matchData.playerStats) {
          setPlayerStats(matchData.playerStats);
        }

        if (matchData.currentBatsmanStrike) {
          setCurrentBatsmanStrike(matchData.currentBatsmanStrike);
        }
        if (matchData.currentBatsmanNonStrike) {
          setCurrentBatsmanNonStrike(matchData.currentBatsmanNonStrike);
        }
        if (matchData.currentBowler) {
          setCurrentBowler(matchData.currentBowler);
        }

        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeMatch();
    };
  }, [tournamentId, matchId]);

  const showConfirmation = (data, callback) => {
    setConfirmData({ ...data, callback });
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (confirmData?.callback) {
      confirmData.callback();
    }
    setShowConfirmModal(false);
    setConfirmData(null);
  };

  const handleStartMatch = () => {
    if (match.tossWinner && match.tossDecision) {
      showConfirmation(
        {
          title: 'Start Match',
          message: 'Are you sure you want to start this match? This will change the match status to Live.',
        },
        async () => {
          try {
            const matchRef = ref(db, `tournaments/${tournamentId}/matches/${matchId}`);
            const matchSnapshot = await get(matchRef);
            const currentMatch = matchSnapshot.val();

            // Determine batting team based on toss
            let battingTeam = 1;
            if (currentMatch.tossWinner === 2) {
              battingTeam = currentMatch.tossDecision === 'bat' ? 2 : 1;
            } else {
              battingTeam = currentMatch.tossDecision === 'bat' ? 1 : 2;
            }

            await update(matchRef, {
              status: 'live',
              startedAt: new Date().toISOString(),
              currentBattingTeam: battingTeam,
              currentInnings: 1,
              team1Score: 0,
              team1Wickets: 0,
              team1Balls: 0,
              team1Overs: 0,
              team2Score: 0,
              team2Wickets: 0,
              team2Balls: 0,
              team2Overs: 0,
              playerStats: {},
            });
            toast.success('Match started! Please select opening batsmen and bowler.');
            setShowPlayerSelectionModal(true);
            setPlayerSelectionType('initial');
          } catch (error) {
            console.error('Error starting match:', error);
            toast.error('Failed to start match');
          }
        }
      );
    } else {
      setShowTossModal(true);
    }
  };

  const handleTossSubmit = () => {
    if (!tossData.winner) {
      toast.error('Please select toss winner');
      return;
    }

    showConfirmation(
      {
        title: 'Confirm Toss',
        message: `Team ${tossData.winner === 1 ? team1?.name : team2?.name} won the toss and chose to ${tossData.decision === 'bat' ? 'bat' : 'bowl'}.`,
      },
      async () => {
        try {
          const matchRef = ref(db, `tournaments/${tournamentId}/matches/${matchId}`);
          await update(matchRef, {
            tossWinner: tossData.winner,
            tossDecision: tossData.decision,
            status: 'toss_completed',
          });
          toast.success('Toss recorded! Click Start Match to begin.');
          setShowTossModal(false);
        } catch (error) {
          console.error('Error recording toss:', error);
          toast.error('Failed to record toss');
        }
      }
    );
  };

  const initializePlayerStats = (playerId, playerName, teamId, type) => {
    if (!playerStats[playerId]) {
      const stats = {
        id: playerId,
        name: playerName,
        teamId: teamId,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
      };
      if (type === 'bowler') {
        stats.wickets = 0;
        stats.overs = 0;
        stats.maidens = 0;
        stats.runsConceded = 0;
        stats.economy = 0;
      }
      return stats;
    }
    return playerStats[playerId];
  };

  const handleInitialPlayerSelection = async () => {
    if (!currentBatsmanStrike || !currentBatsmanNonStrike || !currentBowler) {
      toast.error('Please select both batsmen and bowler');
      return;
    }

    const battingTeam = match.currentBattingTeam === 1 ? team1 : team2;
    const bowlingTeam = match.currentBattingTeam === 1 ? team2 : team1;

    const newPlayerStats = { ...playerStats };

    // Initialize strike batsman
    newPlayerStats[currentBatsmanStrike.id] = initializePlayerStats(
      currentBatsmanStrike.id,
      currentBatsmanStrike.name,
      battingTeam.id,
      'batsman'
    );

    // Initialize non-strike batsman
    newPlayerStats[currentBatsmanNonStrike.id] = initializePlayerStats(
      currentBatsmanNonStrike.id,
      currentBatsmanNonStrike.name,
      battingTeam.id,
      'batsman'
    );

    // Initialize bowler
    newPlayerStats[currentBowler.id] = initializePlayerStats(
      currentBowler.id,
      currentBowler.name,
      bowlingTeam.id,
      'bowler'
    );

    try {
      const matchRef = ref(db, `tournaments/${tournamentId}/matches/${matchId}`);
      await update(matchRef, {
        currentBatsmanStrike: currentBatsmanStrike,
        currentBatsmanNonStrike: currentBatsmanNonStrike,
        currentBowler: currentBowler,
        playerStats: newPlayerStats,
      });
      toast.success('Players selected! Match ready to begin.');
      setShowPlayerSelectionModal(false);
      setPlayerSelectionType(null);
    } catch (error) {
      console.error('Error selecting players:', error);
      toast.error('Failed to select players');
    }
  };

  const getBowlerOversBowled = (bowlerId) => {
    if (!playerStats[bowlerId]) return 0;
    return playerStats[bowlerId].overs || 0;
  };

  const getAvailableBowlers = () => {
    const bowlingTeam = match.currentBattingTeam === 1 ? team2 : team1;
    const maxOversPerBowler = 2;
    
    return bowlingTeam.players.map(player => {
      const oversBowled = getBowlerOversBowled(player.id);
      const oversRemaining = maxOversPerBowler - oversBowled;
      return {
        ...player,
        oversBowled,
        oversRemaining,
        canBowl: player.id !== currentBowler?.id && oversBowled < maxOversPerBowler
      };
    }).filter(player => player.canBowl);
  };

  const handleOverComplete = () => {
    const availableBowlers = getAvailableBowlers();
    
    if (availableBowlers.length === 0) {
      toast.error('No available bowlers. All bowlers have completed their quota.');
      return;
    }

    // Automatically show bowler selection modal when over completes
    setShowBowlerSelectionModal(true);
  };

  const handleBowlerChange = async (newBowler) => {
    showConfirmation(
      {
        title: 'Change Bowler',
        message: `Select ${newBowler.name} as the bowler for the next over? (${newBowler.oversBowled}/2 overs bowled, ${newBowler.oversRemaining} remaining)`,
      },
      async () => {
        const bowlingTeam = match.currentBattingTeam === 1 ? team2 : team1;
        
        const newPlayerStats = { ...playerStats };
        if (!newPlayerStats[newBowler.id]) {
          newPlayerStats[newBowler.id] = initializePlayerStats(
            newBowler.id,
            newBowler.name,
            bowlingTeam.id,
            'bowler'
          );
        }

        try {
          const matchRef = ref(db, `tournaments/${tournamentId}/matches/${matchId}`);
          await update(matchRef, {
            currentBowler: newBowler,
            playerStats: newPlayerStats,
          });
          setCurrentBowler(newBowler);
          toast.success(`Bowler changed to ${newBowler.name} (${newBowler.oversBowled}/2 overs)`);
          setShowBowlerSelectionModal(false);
        } catch (error) {
          console.error('Error changing bowler:', error);
          toast.error('Failed to change bowler');
        }
      }
    );
  };

  const swapStrike = async (newStrike, newNonStrike) => {
    try {
      const matchRef = ref(db, `tournaments/${tournamentId}/matches/${matchId}`);
      await update(matchRef, {
        currentBatsmanStrike: newStrike,
        currentBatsmanNonStrike: newNonStrike,
      });
      setCurrentBatsmanStrike(newStrike);
      setCurrentBatsmanNonStrike(newNonStrike);
    } catch (error) {
      console.error('Error swapping strike:', error);
    }
  };

  const recordBall = (runs, isExtra = false, extraType = '') => {
    if (!currentBatsmanStrike || !currentBowler) {
      toast.error('Please select players first');
      return;
    }

    showConfirmation(
      {
        title: 'Record Ball',
        message: `Record ${runs} run${runs !== 1 ? 's' : ''}${isExtra ? ` (${extraType})` : ''}?`,
      },
      async () => {
        try {
          const matchRef = ref(db, `tournaments/${tournamentId}/matches/${matchId}`);
          const matchSnapshot = await get(matchRef);
          const currentMatch = matchSnapshot.val();

          const battingTeamKey = currentMatch.currentBattingTeam === 1 ? 'team1' : 'team2';
          const currentScore = currentMatch[`${battingTeamKey}Score`] || 0;
          const currentBalls = currentMatch[`${battingTeamKey}Balls`] || 0;
          const currentWickets = currentMatch[`${battingTeamKey}Wickets`] || 0;

          const newBalls = currentBalls + (isExtra && (extraType === 'wide' || extraType === 'noball') ? 0 : 1);
          const newOvers = Math.floor(newBalls / 6);
          const newScore = currentScore + runs;
          const currentOver = Math.floor(newBalls / 6);
          const currentBallInOver = newBalls % 6;

          // Update player stats
          const newPlayerStats = { ...playerStats };
          
          // Update batsman stats (only if not extra or if it's a bye/legbye)
          if (!isExtra || extraType === 'bye' || extraType === 'legbye') {
            if (!newPlayerStats[currentBatsmanStrike.id]) {
              newPlayerStats[currentBatsmanStrike.id] = initializePlayerStats(
                currentBatsmanStrike.id,
                currentBatsmanStrike.name,
                currentMatch.currentBattingTeam === 1 ? team1.id : team2.id,
                'batsman'
              );
            }
            newPlayerStats[currentBatsmanStrike.id].runs += runs;
            newPlayerStats[currentBatsmanStrike.id].balls += (isExtra && (extraType === 'wide' || extraType === 'noball') ? 0 : 1);
            if (runs === 4) newPlayerStats[currentBatsmanStrike.id].fours += 1;
            if (runs === 6) newPlayerStats[currentBatsmanStrike.id].sixes += 1;
            newPlayerStats[currentBatsmanStrike.id].strikeRate = 
              (newPlayerStats[currentBatsmanStrike.id].runs / newPlayerStats[currentBatsmanStrike.id].balls * 100).toFixed(2);
          }

          // Update bowler stats
          if (!newPlayerStats[currentBowler.id]) {
            newPlayerStats[currentBowler.id] = initializePlayerStats(
              currentBowler.id,
              currentBowler.name,
              currentMatch.currentBattingTeam === 1 ? team2.id : team1.id,
              'bowler'
            );
          }
          newPlayerStats[currentBowler.id].runsConceded += runs;
          if (!isExtra || extraType === 'bye' || extraType === 'legbye') {
            newPlayerStats[currentBowler.id].balls += 1;
            if (newPlayerStats[currentBowler.id].balls % 6 === 0) {
              newPlayerStats[currentBowler.id].overs += 1;
            }
          }
          newPlayerStats[currentBowler.id].economy = 
            (newPlayerStats[currentBowler.id].runsConceded / (newPlayerStats[currentBowler.id].overs + newPlayerStats[currentBowler.id].balls / 6)).toFixed(2);

          const ballRecord = {
            over: `${currentOver}.${currentBallInOver}`,
            runs: runs,
            isExtra: isExtra,
            extraType: extraType,
            batsmanStrike: currentBatsmanStrike.name,
            batsmanNonStrike: currentBatsmanNonStrike?.name || 'N/A',
            bowler: currentBowler.name,
            timestamp: new Date().toISOString(),
          };

          const existingHistory = currentMatch.ballHistory || [];
          const newHistory = [...(Array.isArray(existingHistory) ? existingHistory : []), ballRecord];

          const updates = {
            [`${battingTeamKey}Score`]: newScore,
            [`${battingTeamKey}Balls`]: newBalls,
            [`${battingTeamKey}Overs`]: newOvers,
            ballHistory: newHistory,
            playerStats: newPlayerStats,
          };

          // Check if over is complete (after recording the ball)
          const isOverComplete = currentBallInOver === 0 && !isExtra;
          
          if (isOverComplete) {
            // Swap strike at end of over
            const newStrike = currentBatsmanNonStrike;
            const newNonStrike = currentBatsmanStrike;
            await swapStrike(newStrike, newNonStrike);
            
            // Check if over is complete and bowler needs to be changed
            if (isOverComplete) {
              // Always show bowler selection after over completes
              setTimeout(() => {
                handleOverComplete();
              }, 500);
            }
          } else if (!isExtra && runs % 2 === 1) {
            // Odd runs - swap strike
            const newStrike = currentBatsmanNonStrike;
            const newNonStrike = currentBatsmanStrike;
            await swapStrike(newStrike, newNonStrike);
          }

          // Check if innings is complete
          const maxOvers = tournament?.tournamentDetails?.oversPerInnings || 20;
          if (newOvers >= maxOvers || currentWickets >= 10) {
            if (currentMatch.currentInnings === 1) {
              updates.currentInnings = 2;
              updates.currentBattingTeam = currentMatch.currentBattingTeam === 1 ? 2 : 1;
              updates.status = 'innings_break';
              toast.info('First innings completed!');
            } else {
              updates.status = 'completed';
              toast.success('Match completed!');
            }
          }

          await update(matchRef, updates);
          toast.success(`Recorded ${runs} run${runs !== 1 ? 's' : ''}`);
        } catch (error) {
          console.error('Error recording ball:', error);
          toast.error('Failed to record ball');
        }
      }
    );
  };

  const handleWicket = () => {
    setShowWicketModal(true);
  };

  const recordWicket = async () => {
    if (!wicketData.batsman) {
      toast.error('Please select a batsman');
      return;
    }

    showConfirmation(
      {
        title: 'Record Wicket',
        message: `Record wicket: ${wicketData.type} for ${wicketData.batsman?.name || 'selected batsman'}?`,
      },
      async () => {
        try {
          const matchRef = ref(db, `tournaments/${tournamentId}/matches/${matchId}`);
          const matchSnapshot = await get(matchRef);
          const currentMatch = matchSnapshot.val();

          const battingTeamKey = currentMatch.currentBattingTeam === 1 ? 'team1' : 'team2';
          const currentWickets = currentMatch[`${battingTeamKey}Wickets`] || 0;
          const currentBalls = currentMatch[`${battingTeamKey}Balls`] || 0;

          const newBalls = currentBalls + 1;
          const newOvers = Math.floor(newBalls / 6);
          const newWickets = currentWickets + 1;

          // Update player stats
          const newPlayerStats = { ...playerStats };
          
          // Update bowler wicket
          if (!newPlayerStats[currentBowler.id]) {
            newPlayerStats[currentBowler.id] = initializePlayerStats(
              currentBowler.id,
              currentBowler.name,
              currentMatch.currentBattingTeam === 1 ? team2.id : team1.id,
              'bowler'
            );
          }
          newPlayerStats[currentBowler.id].wickets += 1;
          newPlayerStats[currentBowler.id].balls += 1;
          if (newPlayerStats[currentBowler.id].balls % 6 === 0) {
            newPlayerStats[currentBowler.id].overs += 1;
          }

          // Update batsman (out batsman)
          if (!newPlayerStats[wicketData.batsman.id]) {
            newPlayerStats[wicketData.batsman.id] = initializePlayerStats(
              wicketData.batsman.id,
              wicketData.batsman.name,
              currentMatch.currentBattingTeam === 1 ? team1.id : team2.id,
              'batsman'
            );
          }
          newPlayerStats[wicketData.batsman.id].balls += 1;

          const ballRecord = {
            over: `${newOvers}.${newBalls % 6}`,
            runs: 0,
            isWicket: true,
            wicketType: wicketData.type,
            batsman: wicketData.batsman.name,
            bowler: currentBowler.name,
            timestamp: new Date().toISOString(),
          };

          const existingHistory = currentMatch.ballHistory || [];
          const newHistory = [...(Array.isArray(existingHistory) ? existingHistory : []), ballRecord];

          const updates = {
            [`${battingTeamKey}Wickets`]: newWickets,
            [`${battingTeamKey}Balls`]: newBalls,
            [`${battingTeamKey}Overs`]: newOvers,
            ballHistory: newHistory,
            playerStats: newPlayerStats,
          };

          // Select new batsman
          const battingTeam = currentMatch.currentBattingTeam === 1 ? team1 : team2;
          const availableBatsmen = battingTeam.players.filter(p => 
            p.id !== wicketData.batsman.id && 
            p.id !== currentBatsmanNonStrike?.id &&
            !newPlayerStats[p.id]?.balls
          );

          if (availableBatsmen.length > 0) {
            setShowPlayerSelectionModal(true);
            setPlayerSelectionType('newBatsman');
            setWicketData({ ...wicketData, newBatsmanOptions: availableBatsmen });
          }

          await update(matchRef, updates);
          toast.success('Wicket recorded! Please select new batsman.');
          setShowWicketModal(false);
        } catch (error) {
          console.error('Error recording wicket:', error);
          toast.error('Failed to record wicket');
        }
      }
    );
  };

  const handleNewBatsmanSelection = async (newBatsman) => {
    const battingTeam = match.currentBattingTeam === 1 ? team1 : team2;
    const matchRef = ref(db, `tournaments/${tournamentId}/matches/${matchId}`);
    const matchSnapshot = await get(matchRef);
    const currentMatch = matchSnapshot.val();
    
    const battingTeamBalls = currentMatch.currentBattingTeam === 1 ? (currentMatch.team1Balls || 0) : (currentMatch.team2Balls || 0);
    const currentBallInOver = battingTeamBalls % 6;
    
    // If wicket fell on last ball of over, new batsman comes on strike
    // Otherwise, new batsman comes at non-strike
    const isLastBallOfOver = currentBallInOver === 0;
    
    const newPlayerStats = { ...playerStats };
    
    if (!newPlayerStats[newBatsman.id]) {
      newPlayerStats[newBatsman.id] = initializePlayerStats(
        newBatsman.id,
        newBatsman.name,
        battingTeam.id,
        'batsman'
      );
    }

    try {
      if (isLastBallOfOver) {
        // New batsman on strike, other batsman stays at non-strike
        await update(matchRef, {
          currentBatsmanStrike: newBatsman,
          currentBatsmanNonStrike: currentBatsmanNonStrike,
          playerStats: newPlayerStats,
        });
        setCurrentBatsmanStrike(newBatsman);
      } else {
        // New batsman at non-strike, other batsman moves to strike
        await update(matchRef, {
          currentBatsmanStrike: currentBatsmanNonStrike,
          currentBatsmanNonStrike: newBatsman,
          playerStats: newPlayerStats,
        });
        setCurrentBatsmanStrike(currentBatsmanNonStrike);
        setCurrentBatsmanNonStrike(newBatsman);
      }
      toast.success(`New batsman ${newBatsman.name} is ${isLastBallOfOver ? 'on strike' : 'at non-strike'}`);
      setShowPlayerSelectionModal(false);
      setPlayerSelectionType(null);
      setWicketData({ type: 'bowled', batsman: null });
    } catch (error) {
      console.error('Error selecting new batsman:', error);
      toast.error('Failed to select new batsman');
    }
  };

  const handleExtra = () => {
    setShowExtraModal(true);
  };

  const recordExtra = () => {
    showConfirmation(
      {
        title: 'Record Extra',
        message: `Record ${extraData.runs} run${extraData.runs !== 1 ? 's' : ''} as ${extraData.type}?`,
      },
      async () => {
        try {
          const matchRef = ref(db, `tournaments/${tournamentId}/matches/${matchId}`);
          const matchSnapshot = await get(matchRef);
          const currentMatch = matchSnapshot.val();

          const battingTeamKey = currentMatch.currentBattingTeam === 1 ? 'team1' : 'team2';
          const currentScore = currentMatch[`${battingTeamKey}Score`] || 0;
          const currentBalls = currentMatch[`${battingTeamKey}Balls`] || 0;

          const newBalls = currentBalls + (extraData.type === 'wide' || extraData.type === 'noball' ? 0 : 1);
          const newOvers = Math.floor(newBalls / 6);
          const newScore = currentScore + extraData.runs;

          // Update bowler stats for extras
          const newPlayerStats = { ...playerStats };
          if (!newPlayerStats[currentBowler.id]) {
            newPlayerStats[currentBowler.id] = initializePlayerStats(
              currentBowler.id,
              currentBowler.name,
              currentMatch.currentBattingTeam === 1 ? team2.id : team1.id,
              'bowler'
            );
          }
          newPlayerStats[currentBowler.id].runsConceded += extraData.runs;

          const ballRecord = {
            over: `${newOvers}.${newBalls % 6}`,
            runs: extraData.runs,
            isExtra: true,
            extraType: extraData.type,
            batsmanStrike: currentBatsmanStrike?.name || 'N/A',
            batsmanNonStrike: currentBatsmanNonStrike?.name || 'N/A',
            bowler: currentBowler.name,
            timestamp: new Date().toISOString(),
          };

          const existingHistory = currentMatch.ballHistory || [];
          const newHistory = [...(Array.isArray(existingHistory) ? existingHistory : []), ballRecord];

          const updates = {
            [`${battingTeamKey}Score`]: newScore,
            [`${battingTeamKey}Balls`]: newBalls,
            [`${battingTeamKey}Overs`]: newOvers,
            ballHistory: newHistory,
            playerStats: newPlayerStats,
          };

          await update(matchRef, updates);
          toast.success(`Recorded ${extraData.runs} run${extraData.runs !== 1 ? 's' : ''} as ${extraData.type}`);
          setShowExtraModal(false);
          setExtraData({ type: 'wide', runs: 1 });
        } catch (error) {
          console.error('Error recording extra:', error);
          toast.error('Failed to record extra');
        }
      }
    );
  };

  const handleUndo = () => {
    showConfirmation(
      {
        title: 'Undo Last Ball',
        message: 'Are you sure you want to undo the last ball? This action cannot be undone.',
      },
      async () => {
        try {
          const matchRef = ref(db, `tournaments/${tournamentId}/matches/${matchId}`);
          const matchSnapshot = await get(matchRef);
          const currentMatch = matchSnapshot.val();

          const existingHistory = currentMatch.ballHistory || [];
          if (existingHistory.length === 0) {
            return toast.error('No balls to undo');
          }

          const lastBall = existingHistory[existingHistory.length - 1];
          const newHistory = existingHistory.slice(0, -1);

          const battingTeamKey = currentMatch.currentBattingTeam === 1 ? 'team1' : 'team2';
          const currentScore = currentMatch[`${battingTeamKey}Score`] || 0;
          const currentBalls = currentMatch[`${battingTeamKey}Balls`] || 0;
          const currentWickets = currentMatch[`${battingTeamKey}Wickets`] || 0;

          // Revert player stats (simplified - would need more complex logic for full undo)
          const newPlayerStats = { ...playerStats };

          const updates = {
            [`${battingTeamKey}Score`]: Math.max(0, currentScore - (lastBall.runs || 0)),
            [`${battingTeamKey}Balls`]: Math.max(0, currentBalls - (lastBall.isExtra && (lastBall.extraType === 'wide' || lastBall.extraType === 'noball') ? 0 : 1)),
            [`${battingTeamKey}Overs`]: Math.floor(Math.max(0, currentBalls - (lastBall.isExtra && (lastBall.extraType === 'wide' || lastBall.extraType === 'noball') ? 0 : 1)) / 6),
            [`${battingTeamKey}Wickets`]: lastBall.isWicket ? Math.max(0, currentWickets - 1) : currentWickets,
            ballHistory: newHistory,
            playerStats: newPlayerStats,
          };

          await update(matchRef, updates);
          toast.success('Last ball undone');
        } catch (error) {
          console.error('Error undoing ball:', error);
          toast.error('Failed to undo ball');
        }
      }
    );
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

  if (loading) {
    return (
      <div className="scorer-match-score-container">
        <Container>
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading match...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (!match || !team1 || !team2) {
    return (
      <div className="scorer-match-score-container">
        <Container>
          <Alert variant="danger" className="text-center">
            <FaExclamationTriangle className="me-2" />
            Match or team data not found.
          </Alert>
        </Container>
      </div>
    );
  }

  const battingTeam = match.currentBattingTeam === 1 ? team1 : team2;
  const bowlingTeam = match.currentBattingTeam === 1 ? team2 : team1;
  const battingTeamScore = match.currentBattingTeam === 1 ? (match.team1Score || 0) : (match.team2Score || 0);
  const battingTeamWickets = match.currentBattingTeam === 1 ? (match.team1Wickets || 0) : (match.team2Wickets || 0);
  const battingTeamBalls = match.currentBattingTeam === 1 ? (match.team1Balls || 0) : (match.team2Balls || 0);
  const battingTeamOvers = match.currentBattingTeam === 1 ? (match.team1Overs || 0) : (match.team2Overs || 0);
  const currentOver = Math.floor(battingTeamBalls / 6);
  const currentBall = battingTeamBalls % 6;

  const getBatsmanStats = (playerId) => {
    if (!playerStats[playerId]) return { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
    return playerStats[playerId];
  };

  const getBowlerStats = (playerId) => {
    if (!playerStats[playerId]) return { wickets: 0, overs: 0, runsConceded: 0, economy: 0 };
    return playerStats[playerId];
  };

  return (
    <div className="scorer-match-score-container">
      <Container>
        <div className="match-header-section mb-4">
          <Button
            variant="outline-light"
            className="back-button mb-3"
            onClick={() => navigate('/dashboard')}
          >
            <FaTimes className="me-2" /> Back to Dashboard
          </Button>
          <Card className="match-info-card">
            <Card.Body className="p-4">
              <Row className="align-items-center">
                <Col md={8}>
                  <h2 className="match-title mb-2">
                    <FaTrophy className="me-2" />
                    {match.team1Name} vs {match.team2Name}
                  </h2>
                  <div className="match-meta">
                    <span className="match-meta-item">
                      <FaCalendarAlt className="me-2" />
                      {formatDate(match.date)} {match.time}
                    </span>
                    <span className="match-meta-item">
                      <FaMapMarkerAlt className="me-2" />
                      {match.place}
                    </span>
                    {match.matchNumber && (
                      <Badge bg="primary" className="ms-2">Match #{match.matchNumber}</Badge>
                    )}
                    {match.tossWinner && (
                      <Badge bg="info" className="ms-2">
                        Toss: {match.tossWinner === 1 ? team1.name : team2.name} ({match.tossDecision === 'bat' ? 'Bat' : 'Bowl'})
                      </Badge>
                    )}
                  </div>
                </Col>
                <Col md={4} className="text-end">
                  <Badge bg={match.status === 'live' ? 'success' : match.status === 'completed' ? 'primary' : 'info'} className="status-badge-large">
                    {match.status || 'Scheduled'}
                  </Badge>
                  {match.status !== 'live' && match.status !== 'completed' && (
                    <Button
                      variant="success"
                      className="mt-2 start-match-btn"
                      onClick={handleStartMatch}
                    >
                      <FaPlay className="me-2" /> {match.tossWinner ? 'Start Match' : 'Toss & Start'}
                    </Button>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </div>

        {match.status === 'live' && (
          <>
            <Row className="mb-4">
              <Col md={6}>
                <Card className="score-card batting-team-card">
                  <Card.Header className="score-card-header">
                    <h4 className="mb-0">
                      <FaUsers className="me-2" />
                      {battingTeam.name} - Batting
                    </h4>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <div className="score-display">
                      <div className="score-main">
                        <span className="score-number">{battingTeamScore}</span>
                        <span className="score-separator">/</span>
                        <span className="wickets-number">{battingTeamWickets}</span>
                      </div>
                      <div className="overs-display">
                        ({battingTeamOvers}.{currentBall} / {tournament?.tournamentDetails?.oversPerInnings || 20} overs)
                      </div>
                    </div>
                    {currentBatsmanStrike && currentBatsmanNonStrike && (
                      <div className="batsmen-display mt-3">
                        <div className="batsman-item strike-batsman">
                          <FaUser className="me-2" />
                          <strong>{currentBatsmanStrike.name}</strong> (Strike)
                          <Badge bg="success" className="ms-2">
                            {getBatsmanStats(currentBatsmanStrike.id).runs}({getBatsmanStats(currentBatsmanStrike.id).balls})
                          </Badge>
                        </div>
                        <div className="batsman-item non-strike-batsman">
                          <FaUser className="me-2" />
                          {currentBatsmanNonStrike.name} (Non-Strike)
                          <Badge bg="secondary" className="ms-2">
                            {getBatsmanStats(currentBatsmanNonStrike.id).runs}({getBatsmanStats(currentBatsmanNonStrike.id).balls})
                          </Badge>
                        </div>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="score-card bowling-team-card">
                  <Card.Header className="score-card-header">
                    <h4 className="mb-0">
                      <FaFutbol className="me-2" />
                      {bowlingTeam.name} - Bowling
                    </h4>
                  </Card.Header>
                  <Card.Body className="p-4">
                    {currentBowler && (
                      <div className="bowler-display">
                        <div className="bowler-info">
                          <FaUser className="me-2" />
                          <strong>{currentBowler.name}</strong>
                          <Badge bg="warning" className="ms-2">
                            {getBowlerStats(currentBowler.id).overs}.{getBowlerStats(currentBowler.id).balls % 6 || 0} - {getBowlerStats(currentBowler.id).wickets}/{getBowlerStats(currentBowler.id).runsConceded}
                          </Badge>
                        </div>
                        <div className="bowler-stats mt-2">
                          <small className="text-muted">
                            Overs: {getBowlerStats(currentBowler.id).overs}/{2} | 
                            Wickets: {getBowlerStats(currentBowler.id).wickets} | 
                            Economy: {getBowlerStats(currentBowler.id).economy}
                          </small>
                        </div>
                      </div>
                    )}
                    {match.currentInnings === 2 && (
                      <div className="target-info mt-3">
                        <div className="target-label">Target</div>
                        <div className="target-score">
                          {match.team1Score || 0} runs
                        </div>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col md={12}>
                <Card className="scoring-panel-card">
                  <Card.Header className="scoring-panel-header">
                    <h4 className="mb-0">
                      <FaFutbol className="me-2" /> Ball-by-Ball Scoring
                    </h4>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <div className="scoring-controls">
                      <div className="runs-section mb-4">
                        <h5 className="section-label mb-3">Runs</h5>
                        <ButtonGroup className="runs-button-group">
                          {[0, 1, 2, 3, 4, 6].map(runs => (
                            <Button
                              key={runs}
                              variant={runs === 4 || runs === 6 ? 'primary' : 'outline-primary'}
                              size="lg"
                              className="runs-btn"
                              onClick={() => recordBall(runs)}
                            >
                              {runs}
                            </Button>
                          ))}
                        </ButtonGroup>
                      </div>

                      <div className="actions-section">
                        <Row>
                          <Col md={4}>
                            <Button
                              variant="danger"
                              size="lg"
                              className="w-100 action-btn"
                              onClick={handleWicket}
                            >
                              <FaFutbol className="me-2" /> Wicket
                            </Button>
                          </Col>
                          <Col md={4}>
                            <Button
                              variant="warning"
                              size="lg"
                              className="w-100 action-btn"
                              onClick={handleExtra}
                            >
                              <FaFutbol className="me-2" /> Extra
                            </Button>
                          </Col>
                          <Col md={4}>
                            <Button
                              variant="secondary"
                              size="lg"
                              className="w-100 action-btn"
                              onClick={handleUndo}
                              disabled={ballHistory.length === 0}
                            >
                              <FaUndo className="me-2" /> Undo
                            </Button>
                          </Col>
                        </Row>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Card className="ball-history-card">
                  <Card.Header className="ball-history-header">
                    <h4 className="mb-0">Ball History</h4>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {ballHistory.length === 0 ? (
                      <div className="text-center p-4 text-muted">
                        No balls recorded yet
                      </div>
                    ) : (
                      <Table striped bordered hover responsive className="ball-history-table mb-0">
                        <thead>
                          <tr>
                            <th>Over</th>
                            <th>Batsman (Strike)</th>
                            <th>Bowler</th>
                            <th>Runs</th>
                            <th>Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ballHistory.slice(-20).reverse().map((ball, index) => (
                            <tr key={index}>
                              <td>{ball.over}</td>
                              <td>{ball.batsmanStrike || ball.batsman}</td>
                              <td>{ball.bowler}</td>
                              <td>
                                {ball.isWicket ? (
                                  <Badge bg="danger">W</Badge>
                                ) : (
                                  <strong>{ball.runs}</strong>
                                )}
                              </td>
                              <td>
                                {ball.isWicket ? (
                                  <Badge bg="danger">{ball.wicketType}</Badge>
                                ) : ball.isExtra ? (
                                  <Badge bg="warning">{ball.extraType}</Badge>
                                ) : (
                                  <Badge bg="info">Normal</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}

        {match.status !== 'live' && match.status !== 'completed' && (
          <Card className="match-not-started-card">
            <Card.Body className="text-center p-5">
              <FaPlay size={64} className="mb-3 text-muted" />
              <h3 className="mb-3">Match Not Started</h3>
              <p className="text-muted mb-4">
                {match.tossWinner ? 'Click "Start Match" to begin scoring.' : 'Click "Toss & Start" to begin.'}
              </p>
            </Card.Body>
          </Card>
        )}

        {match.status === 'completed' && (
          <Card className="match-completed-card">
            <Card.Body className="text-center p-5">
              <FaTrophy size={64} className="mb-3 text-success" />
              <h3 className="mb-3">Match Completed</h3>
              <p className="text-muted mb-4">
                This match has been completed.
              </p>
            </Card.Body>
          </Card>
        )}
      </Container>

      {/* Confirmation Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered className="confirm-modal">
        <Modal.Header closeButton className="confirm-modal-header">
          <Modal.Title>
            <FaExclamationTriangle className="me-2" />
            {confirmData?.title || 'Confirm Action'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{confirmData?.message || 'Are you sure you want to proceed?'}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            <FaTimes className="me-2" /> Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            <FaCheck className="me-2" /> Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toss Modal */}
      <Modal show={showTossModal} onHide={() => setShowTossModal(false)} centered size="lg">
        <Modal.Header closeButton className="toss-modal-header">
          <Modal.Title>
            <FaTrophy className="me-2" /> Toss
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-4">
              <Form.Label className="form-label-large">Who won the toss?</Form.Label>
              <div className="toss-winner-buttons">
                <Button
                  variant={tossData.winner === 1 ? 'primary' : 'outline-primary'}
                  className="toss-team-btn"
                  onClick={() => setTossData({ ...tossData, winner: 1 })}
                >
                  {team1?.name}
                </Button>
                <Button
                  variant={tossData.winner === 2 ? 'primary' : 'outline-primary'}
                  className="toss-team-btn"
                  onClick={() => setTossData({ ...tossData, winner: 2 })}
                >
                  {team2?.name}
                </Button>
              </div>
            </Form.Group>
            {tossData.winner && (
              <Form.Group className="mb-3">
                <Form.Label className="form-label-large">What did they choose?</Form.Label>
                <div className="toss-decision-buttons">
                  <Button
                    variant={tossData.decision === 'bat' ? 'success' : 'outline-success'}
                    className="toss-decision-btn"
                    onClick={() => setTossData({ ...tossData, decision: 'bat' })}
                  >
                    Bat
                  </Button>
                  <Button
                    variant={tossData.decision === 'bowl' ? 'danger' : 'outline-danger'}
                    className="toss-decision-btn"
                    onClick={() => setTossData({ ...tossData, decision: 'bowl' })}
                  >
                    Bowl
                  </Button>
                </div>
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTossModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleTossSubmit}>Submit</Button>
        </Modal.Footer>
      </Modal>

      {/* Player Selection Modal */}
      <Modal show={showPlayerSelectionModal} onHide={() => setShowPlayerSelectionModal(false)} centered size="lg">
        <Modal.Header closeButton className="player-selection-header">
          <Modal.Title>
            <FaUsers className="me-2" />
            {playerSelectionType === 'initial' ? 'Select Opening Players' : 'Select New Batsman'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {playerSelectionType === 'initial' ? (
            <>
              <Form.Group className="mb-4">
                <Form.Label className="form-label-large">Strike Batsman</Form.Label>
                <Form.Select
                  value={currentBatsmanStrike?.id || ''}
                  onChange={(e) => {
                    const selected = battingTeam.players.find(p => p.id === e.target.value);
                    setCurrentBatsmanStrike(selected);
                  }}
                >
                  <option value="">Select Strike Batsman</option>
                  {battingTeam.players.map(player => (
                    <option key={player.id} value={player.id}>{player.name} (#{player.jerseyNumber})</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Label className="form-label-large">Non-Strike Batsman</Form.Label>
                <Form.Select
                  value={currentBatsmanNonStrike?.id || ''}
                  onChange={(e) => {
                    const selected = battingTeam.players.find(p => p.id === e.target.value);
                    setCurrentBatsmanNonStrike(selected);
                  }}
                >
                  <option value="">Select Non-Strike Batsman</option>
                  {battingTeam.players.filter(p => p.id !== currentBatsmanStrike?.id).map(player => (
                    <option key={player.id} value={player.id}>{player.name} (#{player.jerseyNumber})</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-large">Bowler</Form.Label>
                <Form.Select
                  value={currentBowler?.id || ''}
                  onChange={(e) => {
                    const selected = bowlingTeam.players.find(p => p.id === e.target.value);
                    setCurrentBowler(selected);
                  }}
                >
                  <option value="">Select Bowler</option>
                  {bowlingTeam.players.map(player => (
                    <option key={player.id} value={player.id}>{player.name} (#{player.jerseyNumber})</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </>
          ) : (
            <div className="new-batsman-selection">
              <p className="mb-3">Select the new batsman to come in:</p>
              {wicketData.newBatsmanOptions?.map(player => (
                <Button
                  key={player.id}
                  variant="outline-primary"
                  className="w-100 mb-2 player-select-btn"
                  onClick={() => handleNewBatsmanSelection(player)}
                >
                  {player.name} (#{player.jerseyNumber})
                </Button>
              ))}
            </div>
          )}
        </Modal.Body>
        {playerSelectionType === 'initial' && (
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPlayerSelectionModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleInitialPlayerSelection}>Confirm</Button>
          </Modal.Footer>
        )}
      </Modal>

      {/* Wicket Modal */}
      <Modal show={showWicketModal} onHide={() => setShowWicketModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Record Wicket</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Wicket Type</Form.Label>
              <Form.Select
                value={wicketData.type}
                onChange={(e) => setWicketData({ ...wicketData, type: e.target.value })}
              >
                <option value="bowled">Bowled</option>
                <option value="caught">Caught</option>
                <option value="lbw">LBW</option>
                <option value="stumped">Stumped</option>
                <option value="runout">Run Out</option>
                <option value="hitwicket">Hit Wicket</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Batsman</Form.Label>
              <Form.Select
                value={wicketData.batsman?.id || ''}
                onChange={(e) => {
                  const selected = battingTeam.players.find(p => p.id === e.target.value);
                  setWicketData({ ...wicketData, batsman: selected });
                }}
              >
                <option value="">Select Batsman</option>
                {battingTeam.players.map(player => (
                  <option key={player.id} value={player.id}>{player.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowWicketModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={recordWicket} disabled={!wicketData.batsman}>
            Record Wicket
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Extra Modal */}
      <Modal show={showExtraModal} onHide={() => setShowExtraModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Record Extra</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Extra Type</Form.Label>
              <Form.Select
                value={extraData.type}
                onChange={(e) => setExtraData({ ...extraData, type: e.target.value })}
              >
                <option value="wide">Wide</option>
                <option value="noball">No Ball</option>
                <option value="bye">Bye</option>
                <option value="legbye">Leg Bye</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Runs</Form.Label>
              <Form.Control
                type="number"
                min="1"
                max="6"
                value={extraData.runs}
                onChange={(e) => setExtraData({ ...extraData, runs: parseInt(e.target.value) || 1 })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExtraModal(false)}>Cancel</Button>
          <Button variant="warning" onClick={recordExtra}>Record Extra</Button>
        </Modal.Footer>
      </Modal>

      {/* Bowler Selection Modal */}
      <Modal show={showBowlerSelectionModal} onHide={() => setShowBowlerSelectionModal(false)} centered size="lg">
        <Modal.Header closeButton className="bowler-selection-header">
          <Modal.Title>
            <FaFutbol className="me-2" /> Select Bowler for Next Over
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-4">
            <strong>Over Complete!</strong> Please select a bowler for the next over. Each bowler can bowl a maximum of 2 overs.
          </Alert>
          <div className="current-bowler-info mb-4 p-3 bg-light rounded">
            <strong>Current Bowler:</strong> {currentBowler?.name} 
            <Badge bg="warning" className="ms-2">
              {getBowlerOversBowled(currentBowler?.id) || 0} / 2 overs
            </Badge>
          </div>
          <div className="available-bowlers-list">
            <h6 className="mb-3">Available Bowlers:</h6>
            {getAvailableBowlers().length === 0 ? (
              <Alert variant="warning">
                No available bowlers. All bowlers have completed their quota of 2 overs.
              </Alert>
            ) : (
              getAvailableBowlers().map(player => (
                <Button
                  key={player.id}
                  variant="outline-primary"
                  className="w-100 mb-3 player-select-btn-bowler"
                  onClick={() => handleBowlerChange(player)}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{player.name}</strong> (#{player.jerseyNumber})
                    </div>
                    <div>
                      <Badge bg={player.oversRemaining === 2 ? 'success' : player.oversRemaining === 1 ? 'warning' : 'danger'} className="ms-2">
                        {player.oversBowled} / 2 overs ({player.oversRemaining} remaining)
                      </Badge>
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBowlerSelectionModal(false)}>
            <FaTimes className="me-2" /> Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ScorerMatchScore;
