import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import ExercisePage from './pages/ExercisePage';
import ExercisesPage from './pages/ExercisesPage';
import HomePage from './pages/HomePage';
import PricingPage from './pages/PricingPage';
import DaxFunctionsPage from './pages/DaxFunctionsPage';
import DaxFunctionPage from './pages/DaxFunctionPage';
import AuthPage from './pages/AuthPage';
import Pl300Page from './pages/Pl300Page';
import ProjectsPage from './pages/ProjectsPage';
import ProjectPage from './pages/ProjectPage';
import Pl300TestPage from './pages/Pl300TestPage';
import LegalPage from './pages/LegalPage';

// Hosts that serve a single page (e.g. a claude.ai preview) need hash-based routing.
const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/exercises" element={<ExercisesPage />} />
        <Route path="/exercise/:id" element={<ExercisePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/dax-functions" element={<DaxFunctionsPage />} />
        <Route path="/dax-functions/:name" element={<DaxFunctionPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/pl300" element={<Pl300Page />} />
        <Route path="/pl300/:testId" element={<Pl300TestPage />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/terms" element={<LegalPage kind="terms" />} />
        <Route path="/privacy" element={<LegalPage kind="privacy" />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>
  );
}
