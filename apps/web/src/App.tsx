import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { ProjectList } from './pages/ProjectList';
import { ProjectDetail } from './pages/ProjectDetail';
import { ExecutionDetail } from './pages/ExecutionDetail';
import BuildApp from './pages/BuildApp';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<ProjectList />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/projects/:projectId/build-app" element={<BuildApp />} />
            <Route
              path="/projects/:projectId/executions/:executionId"
              element={<ExecutionDetail />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
