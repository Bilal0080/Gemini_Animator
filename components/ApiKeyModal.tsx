
import React from 'react';

interface ApiKeyModalProps {
  onKeySelected: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onKeySelected }) => {
  const handleOpenSelect = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      onKeySelected();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel max-w-md w-full p-8 rounded-2xl shadow-2xl border border-white/10">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">API Key Required</h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            Generating high-quality video with Gemini Veo requires a selected API key from a paid Google Cloud Project. 
            Please visit the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-blue-400 hover:underline">billing documentation</a> for details.
          </p>
          <button
            onClick={handleOpenSelect}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/20"
          >
            Select API Key
          </button>
        </div>
      </div>
    </div>
  );
};
