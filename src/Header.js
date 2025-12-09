import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { FaSignInAlt, FaUserPlus, FaSignOutAlt, FaUserCircle, FaHome, FaTrophy } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loggedInUser = sessionStorage.getItem('authUser');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
    }
  }, []);

  const logoutHandler = () => {
    sessionStorage.removeItem('authUser');
    setUser(null);
    navigate('/login');
  };

  return (
    <header>
      <Navbar 
        className="navbar-custom navbar-white" 
        expand="lg" 
        collapseOnSelect
        fixed="top"
      >
        <Container>
          <LinkContainer to="/">
            <Navbar.Brand className="navbar-brand-custom">
              <FaTrophy className="brand-icon" />
              <span className="brand-text">CricketAI</span>
            </Navbar.Brand>
          </LinkContainer>
          <Navbar.Toggle aria-controls="basic-navbar-nav" className="navbar-toggler-custom" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              {!user && (
                <>
                  <LinkContainer to="/">
                    <Nav.Link className="nav-link-custom">
                      <FaHome className="me-1" /> Home
                    </Nav.Link>
                  </LinkContainer>
                </>
              )}
              {user ? ( 
                <>
                  <LinkContainer to="/dashboard">
                    <Nav.Link className="nav-link-custom">
                      <FaTrophy className="me-1" /> Dashboard
                    </Nav.Link>
                  </LinkContainer>
                  <NavDropdown 
                    title={
                      <span className="user-dropdown">
                        <div className="user-avatar">
                          <FaUserCircle />
                        </div>
                        <span className="user-name">{user.fullName || user.userType || 'User'}</span>
                        <span className="user-role-badge">{user.userType}</span>
                      </span>
                    } 
                    id="username"
                    className="user-dropdown-menu"
                  >
                    <LinkContainer to="/dashboard">
                      <NavDropdown.Item className="dropdown-item-custom">
                        <FaTrophy className="me-2" /> Dashboard
                      </NavDropdown.Item>
                    </LinkContainer>
                    <NavDropdown.Item onClick={logoutHandler} className="dropdown-item-custom">
                      <FaSignOutAlt className="me-2" /> Logout
                    </NavDropdown.Item>
                  </NavDropdown>
                </>
              ) : (
                <>
                  <LinkContainer to="/login">
                    <Nav.Link className="nav-link-custom">
                      <FaSignInAlt className="me-1" /> Login
                    </Nav.Link>
                  </LinkContainer>
                  <LinkContainer to="/register">
                    <Nav.Link className="nav-link-custom nav-link-register">
                      <FaUserPlus className="me-1" /> Register
                    </Nav.Link>
                  </LinkContainer>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
};

export default Header;
