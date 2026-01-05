import React, { useState } from 'react';

interface Props {
  onLogin: (name: string) => void;
}

const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Animation de sortie avant de changer d'état
    setIsAnimating(true);
    setTimeout(() => {
      onLogin(name);
    }, 800);
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen px-4 relative z-10 transition-opacity duration-700 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      
      {/* Container Principal Glassmorphism */}
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 bg-[#13161c]/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
        
        {/* Effet de brillance décoratif */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-[80px]"></div>
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-blue-500/20 rounded-full blur-[80px]"></div>

        {/* Colonne Gauche : Présentation */}
        <div className="flex flex-col justify-center space-y-6 relative z-10">
          <div>
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-200 text-xs font-semibold mb-4 tracking-wider uppercase">
               Système IA Personnel
             </div>
             <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 mb-2">
               Anita Pro.
             </h1>
             <p className="text-lg text-gray-400 font-light">
               Votre seconde paire de cerveau.
             </p>
          </div>

          <div className="space-y-4">
            <FeatureItem 
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
              title="Gestion de Projets"
              desc="Planification stratégique et découpage de tâches."
            />
            <FeatureItem 
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
              title="Recherche Web (Grounding)"
              desc="Données factuelles en temps réel via Google Search."
            />
            <FeatureItem 
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              title="Analyse Documentaire"
              desc="Lecture de PDF, Word et Excel complexes."
            />
          </div>
        </div>

        {/* Colonne Droite : Formulaire d'accès */}
        <div className="relative flex flex-col justify-center bg-black/20 rounded-2xl p-6 border border-white/5">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Protocole d'accès
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-widest">Identifiant</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre Prénom / Nom"
                className="w-full bg-[#0b0f19] border border-gray-700 focus:border-purple-500 text-white rounded-lg px-4 py-3 outline-none transition-colors placeholder-gray-600"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-widest">Clé de sécurité</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0b0f19] border border-gray-700 focus:border-purple-500 text-white rounded-lg px-4 py-3 outline-none transition-colors placeholder-gray-600"
              />
              <p className="text-[10px] text-gray-500 mt-1 text-right">* Accès strictement confidentiel</p>
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-3 rounded-lg shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
            >
              Initialiser la connexion
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-gray-500">
              Sécurisé par Gemini 2.0 Flash • Chiffrement End-to-End
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 text-center">
        <p className="text-[10px] text-gray-600 font-mono">ANITA SYSTEM OS • PRIVATE EDITION</p>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-default">
    <div className="p-2 rounded-lg bg-gray-800 text-gray-300 group-hover:text-purple-400 group-hover:bg-gray-700 transition-colors">
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-medium text-gray-200">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default LoginPage;