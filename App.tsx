
import React, { useState, useEffect } from 'react';
import { AnimatorDashboard } from './components/AnimatorDashboard';
import { ApiKeyModal } from './components/ApiKeyModal';

const App: React.FC = () => {
  const [apiKeySelected, setApiKeySelected] = useState<boolean | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setApiKeySelected(hasKey);
    } else {
      // For development or environments without aistudio global
      setApiKeySelected(true);
    }
  };

  const handleKeySelected = () => {
    setApiKeySelected(true);
  };

  const handleResetKey = () => {
    setApiKeySelected(false);
  };

  if (apiKeySelected === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-pulse text-slate-400">Initializing...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {!apiKeySelected && <ApiKeyModal onKeySelected={handleKeySelected} />}
      <AnimatorDashboard onResetKey={handleResetKey} />
    </div>
  );
};

export default App;
