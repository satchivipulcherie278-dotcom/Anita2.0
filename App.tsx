import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, AppMode, Task } from './types';
import { sendMessageStream, generateImage, resetChatSession, transcribeAudio, generateMeetingReport } from './services/geminiService';
import { extractTextFromDocument } from './services/documentParser';
import ChatMessageItem from './components/ChatMessageItem';
import TypingIndicator from './components/TypingIndicator';
import TaskSidebar from './components/TaskSidebar';
import LoginPage from './components/LoginPage';
import { GenerateContentResponse } from '@google/genai';
import { jsPDF } from "jspdf";

const HISTORY_KEY = 'anita_chat_history';
const TASKS_KEY = 'anita_tasks';
// Changement vers sessionStorage pour que le login soit demandé à chaque nouvelle session navigateur
const USER_KEY = 'anita_username_session'; 

const App: React.FC = () => {
  // --- USER AUTH STATE ---
  const [userName, setUserName] = useState<string | null>(() => {
    return sessionStorage.getItem(USER_KEY);
  });

  // --- STATE INITIALIZATION ---
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Erreur lecture historique:", e);
      return [];
    }
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(TASKS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Erreur lecture tâches:", e);
      return [];
    }
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  
  // File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'document' | null>(null);

  // UI State
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);

  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // Message de bienvenue PERSONNALISÉ si l'historique est vide
  useEffect(() => {
    if (messages.length === 0 && userName) {
      setMessages([
        {
          id: 'init-1',
          role: 'model',
          text: `Bonjour ${userName}. Je suis Anita, votre assistante personnelle. Je suis connectée au web pour vos recherches et je peux analyser vos documents. On commence par quoi aujourd'hui ?`,
        }
      ]);
    }
  }, [userName]); // Déclenché quand le userName est défini

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleLogin = (name: string) => {
    sessionStorage.setItem(USER_KEY, name);
    setUserName(name);
  };

  const handleLogout = () => {
    // Déconnexion immédiate
    sessionStorage.removeItem(USER_KEY);
    setUserName(null);
  };

  // --- EXISTING HANDLERS ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setFileType('image');
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setFileType('document');
        setPreviewUrl(null);
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    if (window.confirm("Voulez-vous effacer tout l'historique de conversation avec Anita et recommencer ?")) {
      resetChatSession();
      localStorage.removeItem(HISTORY_KEY);
      // On réinitialise avec le nom de l'utilisateur
      setMessages([
        {
          id: Date.now().toString(),
          role: 'model',
          text: `Historique effacé. Re-bonjour ${userName || 'Boss'}, on repart sur de nouvelles bases !`,
        }
      ]);
    }
  };

  const handleGenerateReport = async () => {
    if (messages.length < 2) return;
    setIsGeneratingReport(true);
    try {
      const reportText = await generateMeetingReport(messages);
      const doc = new jsPDF();
      doc.setFont("helvetica");
      doc.setFontSize(11);
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const maxLineWidth = pageWidth - (margin * 2);
      
      doc.setFontSize(16);
      doc.setTextColor(59, 130, 246);
      doc.text("Anita - Compte-Rendu de Session", margin, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const splitText = doc.splitTextToSize(reportText, maxLineWidth);
      doc.text(splitText, margin, 35);
      
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("Généré par Anita, votre Assistante Personnelle IA", margin, doc.internal.pageSize.getHeight() - 10);
      
      const fileName = `Rapport_Anita_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(fileName);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "J'ai rédigé et téléchargé votre rapport de séance au format PDF."
      }]);
    } catch (e) {
      console.error("Erreur génération rapport:", e);
      alert("Erreur génération PDF.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleMicToggle = async () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        if (audioBlob.size > 0) await handleAudioTranscription(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
      alert("Erreur microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioTranscription = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.readAsDataURL(audioBlob);
      });
      const text = await transcribeAudio(base64Audio, audioBlob.type);
      if (text) {
        setInput(prev => {
           const trimmed = prev.trim();
           return trimmed ? `${trimmed} ${text}` : text;
        });
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;
    setIsLoading(true);
    const userMsgId = Date.now().toString();
    const currentInput = input;
    const currentFile = selectedFile;
    const currentFileType = fileType;
    const currentHistory = [...messages]; 
    setInput('');
    clearFile();

    let base64Image: string | undefined;
    let mimeType = 'image/jpeg';
    let persistenceImageUrl: string | undefined;
    let extractedTextContext = "";
    let displayText = currentInput;

    if (currentFile) {
      if (currentFileType === 'image') {
        try {
          base64Image = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => { resolve((reader.result as string).split(',')[1]); };
            reader.readAsDataURL(currentFile);
          });
          mimeType = currentFile.type;
          persistenceImageUrl = `data:${mimeType};base64,${base64Image}`;
        } catch (err) { console.error(err); }
      } else if (currentFileType === 'document') {
        try {
          setMessages(prev => [...prev, { id: "parsing_loader", role: 'model', text: `Analyse de ${currentFile.name}...` }]);
          const textContent = await extractTextFromDocument(currentFile);
          extractedTextContext = `\n\n[CONTEXTE DOCUMENT: ${currentFile.name}]\n${textContent}\n[FIN DU DOCUMENT]\n\n`;
          displayText = `📁 [Fichier joint: ${currentFile.name}]\n${currentInput}`;
          setMessages(prev => prev.filter(m => m.id !== "parsing_loader"));
        } catch (error: any) {
          setMessages(prev => prev.filter(m => m.id !== "parsing_loader"));
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `Erreur fichier: ${error.message}`, isError: true }]);
          setIsLoading(false);
          return;
        }
      }
    }

    const newMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: displayText,
      imageUrl: persistenceImageUrl
    };
    setMessages(prev => [...prev, newMessage]);

    try {
      if (mode === AppMode.IMAGE_GEN) {
        const generatedImageBase64 = await generateImage(currentInput);
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: `Voici l'image générée, ${userName || 'Boss'}.`,
          imageUrl: generatedImageBase64
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        const finalPrompt = currentInput + extractedTextContext;
        const streamResponse = await sendMessageStream(finalPrompt, base64Image, mimeType, currentHistory);
        let fullText = '';
        let collectedSources: Array<{title: string, uri: string}> = [];
        const botMsgId = (Date.now() + 1).toString();
        
        setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '' }]);

        for await (const chunk of streamResponse) {
          const c = chunk as GenerateContentResponse;
          if (c.text) fullText += c.text;
          if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            const chunks = c.candidates[0].groundingMetadata.groundingChunks;
            chunks.forEach((chunk: any) => {
              if (chunk.web) {
                if (!collectedSources.some(s => s.uri === chunk.web.uri)) {
                   collectedSources.push({ title: chunk.web.title || "Source Web", uri: chunk.web.uri });
                }
              }
            });
          }
          setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, text: fullText, sourceLinks: collectedSources.length > 0 ? collectedSources : undefined } : msg));
        }
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Erreur technique, veuillez réessayer.", isError: true }]);
    } finally { setIsLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- RENDER LOGIN OR APP ---
  if (!userName) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden text-[#E3E3E3]">
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 z-10 glass sticky top-0">
        <div className="flex items-center gap-3">
           <button 
             className="p-2 hover:bg-white/10 rounded-full text-gray-300 transition-colors"
             onClick={handleReset}
             title="Nouvelle conversation"
           >
             <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/></svg>
           </button>
           <h1 className="text-lg font-medium text-white cursor-pointer flex items-center gap-1 drop-shadow-md hidden xs:flex" onClick={handleReset}>
             Anita <span className="text-xs text-gray-900 bg-gradient-to-r from-purple-200 to-white px-2 py-0.5 rounded-full ml-2 font-bold shadow-sm">Pro</span>
           </h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
            {/* Toggle Mode */}
            <div className="flex bg-black/40 rounded-lg p-1 text-xs font-medium border border-white/5">
                <button onClick={() => setMode(AppMode.CHAT)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${mode === AppMode.CHAT ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm' : 'text-gray-400 hover:text-gray-200'}`}>
                  <span className="hidden sm:inline">Chat</span>
                </button>
                <button onClick={() => setMode(AppMode.IMAGE_GEN)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${mode === AppMode.IMAGE_GEN ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm backdrop-blur-sm' : 'text-gray-400 hover:text-gray-200'}`}>
                  <span className="hidden sm:inline">Studio</span>
                </button>
            </div>

            <button onClick={handleGenerateReport} disabled={isGeneratingReport || messages.length < 2} className={`p-2 rounded-full transition-all border border-white/5 ${isGeneratingReport ? 'text-blue-400 bg-blue-400/10 animate-pulse' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>
               <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T760-160H240Zm0-80h520v-400H520v-200H240v600Zm0-600v200-200 600-600Z"/></svg>
            </button>

            <button onClick={() => setIsTaskPanelOpen(true)} className="relative p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0 0v-560 560Zm280-80h320v-80H480v80Zm-160 0h80v-80h-80v80Zm160-160h320v-80H480v80Zm-160 0h80v-80h-80v80Zm160-160h320v-80H480v80Zm-160 0h80v-80h-80v80Z"/></svg>
               {tasks.filter(t => !t.completed).length > 0 && <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-blue-500 rounded-full ring-2 ring-[#0b0f19]"></span>}
            </button>

            {/* Logout Button */}
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors" title="Se déconnecter">
              <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"/></svg>
            </button>
        </div>
      </header>

      {/* Task Sidebar */}
      <TaskSidebar isOpen={isTaskPanelOpen} onClose={() => setIsTaskPanelOpen(false)} tasks={tasks} setTasks={setTasks} />

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 w-full max-w-3xl mx-auto pt-4 relative">
        {messages.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-center opacity-0"></div> : (
          <>
            {messages.map((msg) => <ChatMessageItem key={msg.id} message={msg} />)}
            {isLoading && (
              <div className="flex justify-start mb-6">
                 <div className="flex items-center mb-1 ml-1 space-x-2">
                     <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">A</div>
                 </div>
                 <div className="ml-2"><TypingIndicator /></div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </>
        )}
      </main>

      {/* Input Area */}
      <div className="w-full px-4 pb-6 pt-2 z-10">
        <div className="max-w-3xl mx-auto">
          {(selectedFile) && (
            <div className="relative inline-block mb-3 ml-2 group animate-fade-in">
              {fileType === 'image' && previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-white/20 shadow-lg" />
              ) : (
                <div className="h-20 w-20 bg-gray-800 rounded-xl border border-white/20 shadow-lg flex flex-col items-center justify-center p-2 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="#9ca3af" className="mb-1"><path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T760-160H240Zm0-80h520v-400H520v-200H240v600Zm0-600v200-200 600-600Z"/></svg>
                  <span className="text-[9px] text-gray-300 leading-tight break-all line-clamp-2">{selectedFile.name}</span>
                </div>
              )}
              <button onClick={clearFile} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-lg hover:bg-gray-700 border border-gray-600 transition-transform hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
              </button>
            </div>
          )}

          <div className={`relative glass-input rounded-[28px] p-2 flex items-end shadow-2xl transition-all focus-within:bg-black/40 ${mode === AppMode.IMAGE_GEN ? 'ring-1 ring-purple-500/50 bg-purple-900/10' : ''}`}>
            <button className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors flex-shrink-0 transform rotate-45" onClick={() => fileInputRef.current?.click()}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M720-330q0 104-73 177T470-80q-104 0-177-73t-73-177v-370q0-75 52.5-127.5T400-880q75 0 127.5 52.5T580-700v350q0 46-32 78t-78 32q-46 0-78-32t-32-78v-370h80v370q0 13 8.5 21.5T470-320q13 0 21.5-8.5T500-350v-350q0-42-29-71t-71-29q-42 0-71 29t-29 71v370q0 71 49.5 120.5T470-160q71 0 120.5-49.5T640-330v-390h80v390Z"/></svg>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json" />
            <button onClick={handleMicToggle} className={`p-3 rounded-full transition-all flex-shrink-0 mx-1 ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
               <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M480-400q-53 0-90.5-37.5T352-528v-240q0-53 37.5-90.5T480-896q53 0 90.5 37.5T608-768v240q0 53-37.5 90.5T480-400Zm0 234q-113 0-198-72t-108-188h75q22 83 91 136.5T480-236q86 0 155-53.5T726-426h75q-23 116-108 188t-198 72Z"/></svg>
            </button>
            <textarea ref={textAreaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={mode === AppMode.IMAGE_GEN ? "Décrivez l'image..." : (isRecording ? "Je vous écoute..." : "Écrivez à Anita...")} className="w-full bg-transparent text-gray-100 placeholder-gray-500 text-[16px] leading-[24px] px-2 py-3 mx-1 resize-none focus:outline-none max-h-[120px]" rows={1} />
            {input.trim() || selectedFile ? (
                <button onClick={handleSend} className="p-3 bg-white text-black rounded-full hover:bg-gray-200 transition-all flex-shrink-0 mb-[2px] shadow-lg hover:shadow-xl hover:scale-105">
                  <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Z"/></svg>
                </button>
            ) : (
                <div className="p-3 text-gray-600 flex-shrink-0 mb-[2px] opacity-50 cursor-not-allowed">
                   <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Z"/></svg>
                </div>
            )}
          </div>
          <div className="text-center mt-2">
             <p className="text-[10px] text-gray-500/80">Anita Pro - Gestion de Projets Intelligente</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;