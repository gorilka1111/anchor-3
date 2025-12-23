import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
    x: number;
    y: number;
    options: { label?: string; action?: () => void; type?: 'separator' }[];
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
            className="absolute bg-[#333] border border-[#555] shadow-lg rounded py-1 z-50 min-w-fit w-max"
            style={{ top: y, left: x }}
        >
            {options.map((opt, i) => {
                if (opt.type === 'separator') {
                    return <div key={i} className="h-px bg-[#555] my-1 mx-2" />;
                }
                return (
                    <button
                        key={i}
                        onClick={() => {
                            if (opt.action) opt.action();
                            onClose();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#444] transition-colors"
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
};
