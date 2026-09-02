import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Alumnos from './pages/Alumnos';
import Pagos from './pages/Pagos';
import Asistencia from './pages/Asistencia';
import ProtectedRoute from './components/ProtectedRoute';
import Horarios from './pages/Horarios';
import Cinturones from './pages/Cinturones';
import Profesores from './pages/Profesores';

import DashboardLayout from './components/DashboardLayout';
import TabletLayout from './components/TabletLayout';
import TabletHorarios from './pages/tablet/TabletHorarios';
import TabletAsistencia from './pages/tablet/TabletAsistencia';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route 
        path="/dashboard/*" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <Routes>
                <Route path="" element={<Dashboard />} />
                <Route path="alumnos" element={<Alumnos />} />
                <Route path="pagos" element={<Pagos />} />
                <Route path="asistencia" element={<Asistencia />} />
                <Route path="horarios" element={<Horarios />} />
                <Route path="cinturones" element={<Cinturones />} />
                <Route path="profesores" element={<Profesores />} />
                <Route path="*" element={<Dashboard />} /> {/* Fallback temporary */}
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/tablet/*" 
        element={
          <ProtectedRoute allowedRoles={['tablet']}>
            <TabletLayout>
              <Routes>
                <Route path="horarios" element={<TabletHorarios />} />
                <Route path="asistencia/:horarioId" element={<TabletAsistencia />} />
                <Route path="*" element={<Navigate to="horarios" replace />} />
              </Routes>
            </TabletLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
