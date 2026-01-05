import React, { useState, useEffect } from 'react';
import { ChatMessage } from '../types';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from "jspdf";

interface Props {
  message: ChatMessage;
}

const ChatMessageItem: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  useEffect(() => {
    // Nettoyage : si le composant est démonté, on arrête de parler
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Arrêter toute lecture en cours avant de commencer une nouvelle
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message.text);
    utterance.lang = 'fr-FR'; // Force la langue française
    utterance.pitch = 1;
    utterance.rate = 1;

    // Tenter de trouver une voix française plus naturelle si disponible
    const voices = window.speechSynthesis.getVoices();
    const frenchVoice = voices.find(v => v.lang.includes('fr') && v.name.includes('Google')) || voices.find(v => v.lang.includes('fr'));
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie', err);
    }
  };

  const handleDownloadPDF = () => {
    setIsPdfGenerating(true);
    try {
      const doc = new jsPDF();
      
      // Configuration de la police
      doc.setFont("helvetica"); // Police standard propre
      doc.setFontSize(11);
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxLineWidth = pageWidth - (margin * 2);
      
      // Nettoyage basique du Markdown pour le PDF (enlever les * et #)
      // C'est une méthode simple, pour un rendu parfait il faudrait un parser plus complexe
      const cleanText = message.text
        .replace(/\*\*/g, "") // Enlève le gras markdown
        .replace(/#/g, "")    // Enlève les headers markdown
        .trim();

      // En-tête discret
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Document généré le ${new Date().toLocaleDateString()}`, margin, 10);

      // Corps du texte
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      // Gestion du saut de ligne automatique
      const splitText = doc.splitTextToSize(cleanText, maxLineWidth);
      
      // Ajout du texte avec gestion multi-pages si nécessaire (basique ici)
      doc.text(splitText, margin, 30);
      
      // Pied de page
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.text("Anita Pro Assistant", margin, pageHeight - 10);

      doc.save(`Anita_Doc_${Date.now()}.pdf`);
    } catch (e) {
      console.error("Erreur PDF", e);
      alert("Erreur lors de la création du PDF. (Erreur Technique)");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Author Label */}
        {!isUser && (
          <div className="flex items-center mb-1 ml-1 space-x-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white">
              A
            </div>
            <span className="text-xs text-gray-400 font-medium">Anita</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed overflow-hidden shadow-sm ${
            isUser
              ? 'bg-[#282a2c] text-[#e3e3e3] rounded-br-none'
              : 'bg-transparent text-[#e3e3e3] px-0 py-0' 
          }`}
        >
          {message.imageUrl && (
            <div className="mb-3 rounded-lg overflow-hidden border border-gray-700">
               <img src={message.imageUrl} alt="Contenu généré ou uploadé" className="max-w-full h-auto" />
            </div>
          )}
          
          <div className="prose prose-invert prose-p:my-1 prose-headings:text-gray-200 prose-a:text-blue-400 max-w-none">
             {isUser ? (
               <p>{message.text}</p>
             ) : (
               <ReactMarkdown>{message.text}</ReactMarkdown>
             )}
          </div>

          {/* Affichage des Sources Web (Grounding) */}
          {!isUser && message.sourceLinks && message.sourceLinks.length > 0 && (
             <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                     <svg xmlns="http://www.w3.org/2000/svg" height="10" viewBox="0 -960 960 960" width="10" fill="currentColor" className="text-blue-400"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-49.5l-106-187h-180l-106 187q42 32 92 49.5T480-160Zm-161-86 101-178-95-166H137q9 67 43 124t89 94Zm322 0q55-37 89-94t43-124H535l-95 166 101 178ZM338-660h284l-54-94q-34-12-68.5-19T480-780q-36 0-70.5 7T338-660Z"/></svg>
                   </div>
                   <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sources Web</span>
                </div>
                <div className="flex flex-wrap gap-2">
                   {message.sourceLinks.map((link, idx) => (
                      <a 
                        key={idx} 
                        href={link.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2 py-1 bg-[#1c1f26] rounded-md text-[11px] text-blue-300 hover:text-white hover:bg-blue-600 transition-colors border border-white/5 truncate max-w-full"
                      >
                         <span className="truncate max-w-[150px]">{link.title || "Lien Source"}</span>
                         <svg xmlns="http://www.w3.org/2000/svg" height="10" viewBox="0 -960 960 960" width="10" fill="currentColor" className="opacity-50"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z"/></svg>
                      </a>
                   ))}
                </div>
             </div>
          )}
        </div>

        {/* Actions Row - Only for Anita (Model) */}
        {!isUser && !message.isError && (
          <div className="mt-2 ml-1 flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            {/* Speaker Button */}
            <button 
              onClick={handleSpeak}
              className={`p-1.5 rounded-full transition-colors ${isSpeaking ? 'bg-white text-black' : 'text-gray-500 hover:text-gray-300 hover:bg-[#282a2c]'}`}
              title={isSpeaking ? "Arrêter la lecture" : "Écouter le message"}
            >
              {isSpeaking ? (
                // Stop icon
                <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M360-320h240v-320H360v320ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0 0v-560 560Z"/></svg>
              ) : (
                // Speaker icon
                <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320Z"/></svg>
              )}
            </button>
            
            {/* PDF Export Button (New) */}
            <button 
              onClick={handleDownloadPDF}
              className={`p-1.5 rounded-full transition-all ${isPdfGenerating ? 'text-blue-400 animate-pulse' : 'text-gray-500 hover:text-blue-400 hover:bg-[#282a2c]'}`}
              title="Télécharger ce message en PDF"
            >
               <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T760-160H240Zm0-80h520v-400H520v-200H240v600Zm160-200v-80h240v-80H400v-80h280v240H400ZM240-760v200-200 600-600Z"/></svg>
            </button>

            {/* Copy Button */}
            <button 
              onClick={handleCopy}
              className={`p-1.5 rounded-full transition-all ${isCopied ? 'text-green-400 bg-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-[#282a2c]'}`}
              title="Copier le texte"
            >
              {isCopied ? (
                <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
              )}
            </button>
          </div>
        )}

        {/* Actions Row - Only for User - Visible on Hover */}
        {isUser && !message.isError && (
           <div className="mt-1 mr-1 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
             <button 
                onClick={handleCopy}
                className={`p-1.5 rounded-full transition-all ${isCopied ? 'text-green-400 bg-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-[#282a2c]'}`}
                title="Copier le texte"
              >
                {isCopied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                )}
              </button>
           </div>
        )}

      </div>
    </div>
  );
};

export default ChatMessageItem;