import { useState, useRef, useEffect } from 'react';
import { FiMoreVertical, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function CommentActionsMenu({ onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close when clicking outside the menu
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu((prev) => !prev)}
        className="w-6 h-6 flex items-center justify-center text-sp-muted hover:text-sp-text hover:bg-sp-hover rounded-full transition-colors"
        aria-label="Comment actions"
      >
        <FiMoreVertical size={14} />
      </button>
      {showMenu && (
        <div className="dropdown w-44 right-0 top-9 animate-scale-in bg-sp-card border border-sp-border rounded-xl shadow-dropdown z-10">
          <div className="p-2 flex flex-col">
            <button
              onClick={() => { onEdit(); setShowMenu(false); }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-sp-text hover:bg-sp-hover rounded"
            >
              <FiEdit2 size={14} /> Edit
            </button>
            <button
              onClick={() => { onDelete(); setShowMenu(false); }}
              className="flex items-center gap-2 px-3 py-2 mt-1 text-sm text-sp-red hover:bg-sp-red/10 rounded"
            >
              <FiTrash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
