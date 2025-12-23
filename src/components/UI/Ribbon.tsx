import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { ToolbarButton } from './ToolbarButton';
import {
    MousePointer2,
    Square,
    Ruler,
    Scaling,
    Wifi,
    Download,
    Upload,
    Info,
    PenTool,
    Activity,
    Undo2,
    Redo2
} from 'lucide-react';

export const Ribbon: React.FC = () => {
    const {
        activeTool,
        setTool,
        wallPreset,
        setWallPreset,
        setStandardWallThickness,
        anchorMode,
        setAnchorMode
    } = useProjectStore();

    const [isConfigOpen, setIsConfigOpen] = React.useState<boolean | string>(false);

    // Normalize check
    const shouldShowConfig = isConfigOpen;


    return (
        <div className="h-16 bg-[#2b2b2b] border-b border-[#1f1f1f] flex items-center px-4 shadow-xl z-20 relative select-none">
            {/* ... (Existing Logo etc) ... */}

            {/* Config Modal Overlay */}
            {isConfigOpen === true && (
                <div className="absolute top-16 left-0 w-64 bg-[#333] border border-[#555] p-3 shadow-2xl rounded-b-lg z-50 text-white animate-in slide-in-from-top-2">
                    <h3 className="text-xs font-bold mb-2 uppercase text-gray-400">Wall Settings</h3>
                    <div className="flex flex-col space-y-2 mb-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-300">Standard (m):</span>
                            <input
                                type="number"
                                step="0.05"
                                value={useProjectStore.getState().standardWallThickness}
                                onChange={(e) => setStandardWallThickness(parseFloat(e.target.value) || 0.1)}
                                className="bg-[#222] border border-[#444] rounded px-2 py-1 text-xs w-16 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-300">Thick (m):</span>
                            <input
                                type="number"
                                step="0.05"
                                value={useProjectStore.getState().thickWallThickness}
                                onChange={(e) => useProjectStore.getState().setThickWallThickness(parseFloat(e.target.value) || 0.2)}
                                className="bg-[#222] border border-[#444] rounded px-2 py-1 text-xs w-16 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-300">Wide (m):</span>
                            <input
                                type="number"
                                step="0.05"
                                value={useProjectStore.getState().wideWallThickness}
                                onChange={(e) => useProjectStore.getState().setWideWallThickness(parseFloat(e.target.value) || 0.3)}
                                className="bg-[#222] border border-[#444] rounded px-2 py-1 text-xs w-16 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button
                            onClick={() => setIsConfigOpen(false)}
                            className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500"
                        >Done</button>
                    </div>
                </div>
            )}

            {/* Title / Logo */}
            <div className="mr-6 flex flex-col justify-center">
                <h1 className="text-white font-bold text-lg leading-none tracking-tight">ANCHOR<span className="text-[#0078d4]">CAD</span></h1>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Planner 3.0</span>
            </div>

            {/* Separator */}
            <div className="h-10 w-px bg-[#444] mx-2"></div>

            {/* Edit Group (Moved to Left) */}
            <div className="flex flex-col items-center px-2">
                <span className="text-[10px] text-gray-500 mb-1 uppercase">Edit</span>
                <div className="flex space-x-1">
                    <ToolbarButton
                        icon={MousePointer2}
                        label="Select"
                        active={activeTool === 'select'}
                        onClick={() => setTool('select')}
                        tooltip="Select (V / Esc)"
                    />
                    <div className="w-px h-6 bg-[#444] mx-1"></div>
                    <ToolbarButton
                        icon={Undo2}
                        label="Undo"
                        onClick={() => useProjectStore.temporal.getState().undo()}
                        tooltip="Undo (Ctrl+Z)"
                    />
                    <ToolbarButton
                        icon={Redo2}
                        label="Redo"
                        onClick={() => useProjectStore.temporal.getState().redo()}
                        tooltip="Redo (Ctrl+Shift+Z)"
                    />
                </div>
            </div>

            <div className="h-10 w-px bg-[#444] mx-2"></div>

            {/* Drawing Group */}
            <div className="flex items-center space-x-1 px-2">
                <div className="flex flex-col items-center mr-2">
                    <span className="text-[10px] text-gray-500 mb-1 uppercase">Draw</span>
                    <div className="flex space-x-1">
                        <ToolbarButton
                            icon={PenTool}
                            label="Wall"
                            active={activeTool === 'wall'}
                            onClick={() => setTool('wall')}
                            tooltip="Draw Linear Wall (W)"
                        />
                        <ToolbarButton
                            icon={Square}
                            label="Rect"
                            active={activeTool === 'wall_rect'}
                            onClick={() => setTool('wall_rect')}
                            tooltip="Draw Rectangular Wall (R)"
                        />
                    </div>
                </div>

                {/* Wall Presets (Small vertical stack or side by side) */}
                <div className="flex flex-col space-y-1 justify-center ml-2 border-l border-[#444] pl-2">
                    <button
                        onClick={() => {
                            // Open Config Modal
                            setIsConfigOpen(!isConfigOpen);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded ${wallPreset === 'default' ? 'bg-[#0078d4] text-white' : 'bg-[#333] text-gray-400'}`}
                    >
                        Standard
                    </button>
                    <div className="flex space-x-1">
                        <button
                            onClick={() => setWallPreset('thick')}
                            className={`text-[10px] px-1 py-0.5 rounded w-12 ${wallPreset === 'thick' ? 'bg-[#0078d4] text-white' : 'bg-[#333] text-gray-400'}`}
                        >
                            Thick (0.1m)
                        </button>
                        <button
                            onClick={() => setWallPreset('wide')}
                            className={`text-[10px] px-1 py-0.5 rounded w-12 ${wallPreset === 'wide' ? 'bg-[#0078d4] text-white' : 'bg-[#333] text-gray-400'}`}
                        >
                            Wide (0.2m)
                        </button>
                    </div>
                </div>
            </div>

            <div className="h-10 w-px bg-[#444] mx-2"></div>

            {/* Dimension Group */}
            <div className="flex flex-col items-center px-2">
                <span className="text-[10px] text-gray-500 mb-1 uppercase">Measure</span>
                <div className="flex space-x-1">
                    <ToolbarButton
                        icon={Ruler}
                        label="Dim"
                        active={activeTool === 'dimension'}
                        onClick={() => setTool('dimension')}
                        tooltip="Dimension (D)"
                    />
                    <ToolbarButton
                        icon={Scaling}
                        label="Scale"
                        active={activeTool === 'scale'}
                        onClick={() => setTool('scale')}
                        tooltip="Set Scale (S)"
                    />
                </div>
            </div>

            <div className="h-10 w-px bg-[#444] mx-2"></div>

            {/* Anchor Group */}
            <div className="flex flex-col items-center px-2">
                <span className="text-[10px] text-gray-500 mb-1 uppercase">Network</span>
                <div className="flex space-x-1 relative">
                    <ToolbarButton
                        icon={Wifi}
                        label="Manual"
                        active={activeTool === 'anchor' && anchorMode === 'manual'}
                        onClick={() => { setTool('anchor'); setAnchorMode('manual'); }}
                        tooltip="Manual Anchor (A)"
                    />
                    <ToolbarButton
                        icon={Activity}
                        label="Auto"
                        active={activeTool === 'anchor_auto' || (activeTool === 'anchor' && anchorMode === 'auto')}
                        onClick={() => { setTool('anchor_auto'); setAnchorMode('auto'); }}
                        tooltip="Auto Anchor (Shift+A)"
                    />

                    {/* Anchor Settings Button (Small Gear/Config) */}
                    <button
                        onClick={() => setIsConfigOpen(isConfigOpen === 'anchors' ? false : 'anchors' as any)}
                        className={`p-1.5 rounded hover:bg-[#444] text-gray-400 ${useProjectStore.getState().showAnchorRadius ? 'text-blue-400' : ''}`}
                        title="Anchor Settings"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    </button>

                    {/* Anchor Config Modal Overlay */}
                    {shouldShowConfig === 'anchors' && (
                        <div className="absolute top-12 left-0 w-56 bg-[#333] border border-[#555] p-3 shadow-2xl rounded z-50 text-white animate-in slide-in-from-top-2">
                            <h3 className="text-xs font-bold mb-2 uppercase text-gray-400">Anchor Settings</h3>
                            <div className="flex flex-col space-y-3">
                                {/* Radius */}
                                <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-300">Radius (m)</span>
                                    <input
                                        type="number"
                                        value={useProjectStore.getState().anchorRadius}
                                        onChange={(e) => useProjectStore.getState().setAnchorRadius(parseFloat(e.target.value) || 0)}
                                        className="bg-[#222] border border-[#444] rounded px-2 py-1 text-xs w-full"
                                    />
                                </div>
                                {/* Shape */}
                                <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-300">Coverage Shape</span>
                                    <div className="flex space-x-1">
                                        <button
                                            onClick={() => useProjectStore.getState().setAnchorShape('circle')}
                                            className={`flex-1 py-1 rounded text-[10px] ${useProjectStore.getState().anchorShape === 'circle' ? 'bg-blue-600' : 'bg-[#444]'}`}
                                        >Circle</button>
                                        <button
                                            onClick={() => useProjectStore.getState().setAnchorShape('square')}
                                            className={`flex-1 py-1 rounded text-[10px] ${useProjectStore.getState().anchorShape === 'square' ? 'bg-blue-600' : 'bg-[#444]'}`}
                                        >Square</button>
                                    </div>
                                </div>
                                {/* Visibility */}
                                <div className="flex items-center justify-between pt-2 border-t border-[#444]">
                                    <span className="text-xs text-gray-300">Show Radius</span>
                                    <button
                                        onClick={() => useProjectStore.getState().setShowAnchorRadius(!useProjectStore.getState().showAnchorRadius)}
                                        className={`w-8 h-4 rounded-full relative transition-colors ${useProjectStore.getState().showAnchorRadius ? 'bg-green-500' : 'bg-[#555]'}`}
                                    >
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${useProjectStore.getState().showAnchorRadius ? 'left-4.5' : 'left-0.5'}`} style={{ left: useProjectStore.getState().showAnchorRadius ? '18px' : '2px' }}></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-grow"></div>

            {/* File & Info */}
            <div className="flex items-center space-x-1 px-4 border-l border-[#444]">
                <ToolbarButton
                    icon={Upload}
                    label="Import"
                    onClick={() => console.log('Import')}
                    tooltip="Import Project"
                    className="opacity-80 hover:opacity-100"
                />
                <ToolbarButton
                    icon={Download}
                    label="Export"
                    onClick={() => console.log('Export')}
                    tooltip="Export Project"
                    className="opacity-80 hover:opacity-100"
                />
                <div className="w-px h-6 bg-[#444] mx-2"></div>
                <ToolbarButton
                    icon={Info}
                    label="Info"
                    onClick={() => console.log('Info')}
                    tooltip="About Anchor Planner"
                    className="text-blue-400 hover:text-blue-300"
                />
            </div>

        </div>
    );
};
