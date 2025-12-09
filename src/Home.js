import React from 'react';
import { Container, Button, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaSignInAlt, FaUserPlus, FaTrophy, FaChartLine, FaUsers, FaFutbol, FaAward, FaFire } from 'react-icons/fa';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="hero-background">
        <div className="gradient-overlay"></div>
        <div className="animated-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
        </div>
      </div>
      
      <Container className="hero-content">
        <div className="hero-text">
          <div className="hero-badge">
            <FaFutbol className="me-2" />
            <span>Professional Cricket Management</span>
          </div>
          <h1 className="hero-title">
            Welcome to <span className="gradient-text">CricketAI</span>
            <br />
            <span className="hero-subtitle">Innings Insight</span>
          </h1>
          <p className="hero-description">
            The ultimate platform for modern cricket management. Organize tournaments, 
            manage teams, track live scores, and analyze player performance with AI-powered insights.
          </p>
          
          <div className="hero-buttons">
            <Link to="/login">
              <Button className="btn-primary-hero">
                <FaSignInAlt className="me-2" />
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button className="btn-secondary-hero">
                <FaUserPlus className="me-2" />
                Get Started
              </Button>
            </Link>
          </div>
        </div>

        <div className="features-section">
          <Row className="g-4">
            <Col md={4} sm={6}>
              <div className="feature-card">
                <div className="feature-icon">
                  <FaTrophy />
                </div>
                <h4>Tournament Management</h4>
                <p>Organize leagues, set up auctions, and manage teams with ease. Complete tournament lifecycle management.</p>
              </div>
            </Col>
            <Col md={4} sm={6}>
              <div className="feature-card">
                <div className="feature-icon">
                  <FaChartLine />
                </div>
                <h4>Live Scoring</h4>
                <p>Capture every ball with our detailed live scoring system. Real-time updates and comprehensive statistics.</p>
              </div>
            </Col>
            <Col md={4} sm={6}>
              <div className="feature-card">
                <div className="feature-icon">
                  <FaUsers />
                </div>
                <h4>Player Analytics</h4>
                <p>Track player stats and gain AI-powered performance insights. Make data-driven decisions.</p>
              </div>
            </Col>
            <Col md={4} sm={6}>
              <div className="feature-card">
                <div className="feature-icon">
                  <FaAward />
                </div>
                <h4>Auction System</h4>
                <p>Conduct player auctions with real-time bidding. Manage credits and build your dream team.</p>
              </div>
            </Col>
            <Col md={4} sm={6}>
              <div className="feature-card">
                <div className="feature-icon">
                  <FaFire />
                </div>
                <h4>Real-time Updates</h4>
                <p>Get instant notifications and updates. Stay connected with your team and matches.</p>
              </div>
            </Col>
            <Col md={4} sm={6}>
              <div className="feature-card">
                <div className="feature-icon">
                  <FaFutbol />
                </div>
                <h4>Team Management</h4>
                <p>Manage squad, assign roles, track performance. Complete team administration tools.</p>
              </div>
            </Col>
          </Row>
        </div>
      </Container>
    </div>
  );
};

export default Home;
