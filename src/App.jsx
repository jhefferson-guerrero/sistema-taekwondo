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
import IngresosExtra from './pages/IngresosExtra';

import DashboardLayout from './components/DashboardLayout';
import ProfesorLayout from './components/ProfesorLayout';
import ProfesorHorarios from './pages/profesor/ProfesorHorarios';
import ProfesorAsistencia from './pages/profesor/ProfesorAsistencia';

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
                <Route path="ingresos-extra" element={<IngresosExtra />} />
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
        path="/profesor/*" 
        element={
          <ProtectedRoute allowedRoles={['profesor']}>
            <ProfesorLayout>
              <Routes>
                <Route path="horarios" element={<ProfesorHorarios />} />
                <Route path="asistencia/:horarioId" element={<ProfesorAsistencia />} />
                <Route path="*" element={<Navigate to="horarios" replace />} />
              </Routes>
            </ProfesorLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
