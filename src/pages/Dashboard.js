import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from '../components/Admin/AdminDashboard';
import MasterAdminDashboard from '../components/MasterAdmin/MasterAdminDashboard';
import ScorerDashboard from '../components/Scorer/ScorerDashboard';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUser = sessionStorage.getItem('authUser');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  if (!user) {
    return null;
  }

  // Route to appropriate dashboard based on user type
  if (user.userType === 'Master Admin') {
    return <MasterAdminDashboard user={user} />;
  } else if (user.userType === 'Admin') {
    return <AdminDashboard user={user} />;
  } else if (user.userType === 'Scorer') {
    return <ScorerDashboard user={user} />;
  }

  return null;
};

export default Dashboard;

