import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Alumnos from './pages/Alumnos';
import Pagos from './pages/Pagos';
import Asistencia from './pages/Asistencia';
import ProtectedRoute from './components/ProtectedRoute';
import Horarios from './pages/Horarios';
import Cinturones from './pages/Cinturones';

import DashboardLayout from './components/DashboardLayout';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route 
        path="/dashboard/*" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Routes>
                <Route path="" element={<Dashboard />} />
                <Route path="alumnos" element={<Alumnos />} />
                <Route path="pagos" element={<Pagos />} />
                <Route path="asistencia" element={<Asistencia />} />
                <Route path="horarios" element={<Horarios />} />
                <Route path="cinturones" element={<Cinturones />} />
                <Route path="*" element={<Dashboard />} /> {/* Fallback temporary */}
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;
