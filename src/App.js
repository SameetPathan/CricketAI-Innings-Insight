import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from './Header';
import Home from './Home';
import Login from './Login';
import Register from './Register';
import Dashboard from './pages/Dashboard';
import AddMatch from './AddMatch';
import AddTournament from './AddTournament';
import LiveScore from './LiveScore';
import Scorecard from './Scorecard';
import ScorerMatchScore from './components/Scorer/ScorerMatchScore';
import './App.css';

function App() {
  return (
    <Router>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add-match" element={<AddMatch />} />
          <Route path="/add-tournament" element={<AddTournament />} />
          <Route path="/match/:matchId/score" element={<LiveScore />} />
          <Route path="/match/:matchId/scorecard" element={<Scorecard />} />
          <Route path="/scorer/tournament/:tournamentId/match/:matchId/score" element={<ScorerMatchScore />} />
          <Route path="/scorer/tournament/:tournamentId/match/:matchId/details" element={<ScorerMatchScore />} />
        </Routes>
      </main>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
}

export default App;
