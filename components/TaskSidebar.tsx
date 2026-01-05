import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const TaskSidebar: React.FC<Props> = ({ isOpen, onClose, tasks, setTasks }) => {
  const [newTaskText, setNewTaskText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleAddTask = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    setTasks(prev => [newTask, ...prev]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const activeTasks = tasks.filter(t => !t.completed).length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <>
      {/* Overlay backdrop for mobile */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className={`fixed top-0 right-0 h-full w-full md:w-96 bg-[#0b0f19]/90 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-wide flex items-center gap-2">
              <span className="text-blue-400">❖</span> Projets
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {activeTasks} à faire - {completedTasks} terminé(s)
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-gray-800">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500" 
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Add Task Form */}
        <div className="p-5">
          <form onSubmit={handleAddTask} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Ajouter une nouvelle tâche..."
              className="w-full bg-[#1c1f26] border border-white/10 text-white rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-gray-500"
            />
            <button 
              type="submit"
              disabled={!newTaskText.trim()}
              className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
            </button>
          </form>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              <div className="mb-3 opacity-30">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <p>Aucune tâche pour le moment.</p>
              <p className="text-xs mt-1">Demandez à Anita de découper votre projet !</p>
            </div>
          ) : (
            tasks.map(task => (
              <div 
                key={task.id} 
                className={`group flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${
                  task.completed 
                    ? 'bg-[#13161c]/50 border-white/5 opacity-60' 
                    : 'bg-[#1e2330]/80 border-white/10 hover:border-blue-500/30'
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                    task.completed
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-500 hover:border-blue-400'
                  }`}
                >
                  {task.completed && (
                    <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                  )}
                </button>
                
                <span className={`flex-1 text-sm leading-relaxed break-words ${task.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                  {task.text}
                </span>

                <button 
                  onClick={() => deleteTask(task.id)}
                  className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  title="Supprimer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default TaskSidebar;