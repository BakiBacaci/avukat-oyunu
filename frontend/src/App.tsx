import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';
import './styles/globals.css';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/lobby/:code" element={<PrivateRoute><Lobby /></PrivateRoute>} />
        <Route path="/game/:matchId" element={<PrivateRoute><GameRoom /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
