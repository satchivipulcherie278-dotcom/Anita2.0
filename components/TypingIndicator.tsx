import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex space-x-1 p-2 bg-[#282a2c] rounded-2xl w-fit">
      <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
    </div>
  );
};

export default TypingIndicator;