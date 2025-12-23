import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
    x: number;
    y: number;
    options: { label: string; action: () => void }[];
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="absolute bg-[#333] border border-[#555] shadow-lg rounded py-1 z-50 min-w-[120px]"
            style={{ top: y, left: x }}
        >
            {options.map((opt, i) => (
                <button
                    key={i}
                    onClick={() => {
                        opt.action();
                        onClose();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#444] transition-colors"
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
};
