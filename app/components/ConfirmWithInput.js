'use client';

import { useState } from 'react';

export default function ConfirmWithInput({ onConfirm, onCancel }) {
  const [input, setInput] = useState('');
  const [showError, setShowError] = useState(false);

  const validateMsg = (input) => {
    setInput(input);
    if (input.trim() != '') {
      setShowError(false);
      return true;
    }
    setShowError(true);
    return false
  }

  const checkForSave = (e) => {
    e.preventDefault();
    if (!showError && validateMsg(input)) {
      onConfirm(input);
    }
  }

  return (
    <div className="fixed inset-0 bg-[#00000030] flex items-center justify-center z-50">
      <form onSubmit={checkForSave}>
        <div className="bg-white p-3 rounded-xl shadow-md text-black">
          <p className="mb-3 text-sm">{'Are you sure you want to save the changes?'}</p>
          <input
            type="text"
            className="rounded-sm border-[#7B7B7B] border-1 text-black placeholder-[#7B7B7B] w-full p-2 mb-2"
            value={input}
            onChange={(e) => validateMsg(e.target.value)}
            placeholder="Message"
          />
          {showError && <p className="mb-4 text-xs text-red-600">Enter a valid message to log</p>}
          <p className="mt-8 mb-4 text-xs font-bold">Warning: This action cannot be undone</p>
          <div className="flex justify-center gap-2">
            <button
              className="w-full bg-gray-300 py-2 rounded text-sm"
              onClick={() => onCancel()}
            >
              Cancel
            </button>
            <button
              type='submit'
              className="w-full bg-[#1E2E33] text-white py-2 rounded text-sm"
            >
              Confirm
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
