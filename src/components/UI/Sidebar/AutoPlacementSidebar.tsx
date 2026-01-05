import React, { useCallback } from 'react';
import { useProjectStore } from '../../../store/useProjectStore';
import { generateAutoAnchors } from '../../../utils/auto-placement';
import { Activity, GitCommit, Sliders, CheckSquare, Wand2 } from 'lucide-react';

// --- Helper Components ---

interface ToggleButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ active, onClick, icon, title }) => (
    <button
        onClick={onClick}
        title={title}
        className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${active
            ? 'bg-blue-900/30 border-blue-500/50 text-blue-400'
            : 'bg-[#252526] border-[#333] text-gray-400 hover:bg-[#2d2d2d]'
            }`}
    >
        {icon}
    </button>
);

interface ActionButtonProps {
    onClick: () => void;
    label: string;
    desc: string;
    color: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, label, desc, color }) => (
    <button
        onClick={onClick}
        className={`flex-1 p-2 rounded text-center transition-all ${color} text-white shadow-lg`}
    >
        <div className="font-medium text-xs">{label}</div>
        <div className="text-[9px] opacity-80">{desc}</div>
    </button>
);

interface ControlSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    unit: string;
    onChange: (val: number) => void;
}

const ControlSlider: React.FC<ControlSliderProps> = ({ label, value, min, max, unit, onChange }) => (
    <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-400">
            <span>{label}</span>
            <span className="font-mono text-gray-300">{value}{unit}</span>
        </div>
        <input
            type="range"
            min={min} max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1.5 bg-[#444] rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
    </div>
);

// --- Main Component ---

export const AutoPlacementSidebar: React.FC = () => {
    const {
        isAutoPlacementOpen, setIsAutoPlacementOpen,
        optimizationSettings, setOptimizationSettings,
        showMedialAxis, setShowMedialAxis,
        skeletonMode, setSkeletonMode,
        showOffsets, setShowOffsets, offsetStep, setOffsetStep,
        centroids, toggleLayer,
        walls, anchors, scaleRatio,
        anchorRadius,
        placementAreaEnabled, setPlacementAreaEnabled,
        placementArea
    } = useProjectStore();


    const handleOptimize = useCallback((scope: 'small' | 'large' | 'all', mode: 'append' | 'replace' = 'replace') => {
        // Prepare options
        const options = {
            ...optimizationSettings,
            targetScope: scope,
            wallThickness: useProjectStore.getState().standardWallThickness,
            scaleRatio,
            anchorRadius: useProjectStore.getState().anchorRadius,
            placementArea: (placementAreaEnabled && placementArea) ? placementArea.points : undefined,
            minOverlap: 1
        };

        // Determine which anchors to preserve based on mode
        let preservedAnchors = anchors;
        if (mode === 'replace') {
            // Replace mode: Keep MANUAL anchors, discard AUTO anchors
            preservedAnchors = anchors.filter(a => !a.isAuto);
        } else {
            // Append mode: Keep ALL existing anchors (Manual + Auto)
            preservedAnchors = anchors;
        }

        const newAnchorsOmitId = generateAutoAnchors(walls, options, preservedAnchors);

        // Update Store
        // logical set: 1. Set preserved. 2. Append new.
        useProjectStore.getState().setAnchors(preservedAnchors);
        useProjectStore.getState().addAnchors(newAnchorsOmitId);

    }, [walls, anchors, scaleRatio, optimizationSettings, anchorRadius, placementArea, placementAreaEnabled]);

    const handleClearAndOptimize = useCallback(() => {
        // Apply Optimization: Always replace *auto* anchors with new generation
        // but PRESERVE manual anchors.
        handleOptimize(optimizationSettings.targetScope, 'replace');
    }, [handleOptimize, optimizationSettings.targetScope]);

    if (!isAutoPlacementOpen) return null;

    return (
        <div className="fixed left-0 top-16 bottom-0 w-80 bg-[#1e1e1e] border-r border-[#333] shadow-xl z-50 flex flex-col font-sans text-gray-200">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-[#333] bg-[#252526]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-100 flex items-center gap-2">
                    <Wand2 size={16} className="text-blue-500" />
                    Anchor Placement
                </h3>
                <button
                    onClick={() => setIsAutoPlacementOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    &times;
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* 1. Debug Layers & Area Tools */}
                <div className="space-y-2 pb-4 border-b border-[#333]">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                        <span>Tools & Debug</span>
                    </h4>
                    <div className="flex items-center h-8 gap-1.5">
                        {/* Debug Group */}
                        <div className="flex gap-1 items-center">
                            <ToggleButton
                                active={centroids}
                                onClick={() => toggleLayer('centroids')}
                                icon={<CheckSquare size={14} />}
                                title="Centroids"
                            />
                            <ToggleButton
                                active={skeletonMode !== 'none'}
                                onClick={() => {
                                    const next = skeletonMode === 'none' ? 'full' : skeletonMode === 'full' ? 'simplified' : 'none';
                                    setSkeletonMode(next);
                                }}
                                icon={
                                    <Activity
                                        size={14}
                                        className={skeletonMode === 'simplified' ? 'text-orange-400' : 'currentColor'}
                                    />
                                }
                                title={`Skeleton: ${skeletonMode.charAt(0).toUpperCase() + skeletonMode.slice(1)}`}
                            />
                            <ToggleButton
                                active={showOffsets}
                                onClick={() => setShowOffsets(!showOffsets)}
                                icon={<Sliders size={14} />}
                                title="Offsets"
                            />
                        </div>

                        {/* Divider */}
                        <div className="w-px h-5 bg-[#444] mx-1"></div>

                        {/* Area Group */}
                        <div className="flex gap-1 items-center">
                            <button
                                onClick={() => useProjectStore.getState().setTool('placement_area')}
                                className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${useProjectStore.getState().activeTool === 'placement_area'
                                    ? 'bg-orange-900/40 border-orange-500 text-orange-400'
                                    : 'bg-[#252526] border-[#333] text-gray-400 hover:bg-[#2d2d2d]'
                                    }`}
                                title="Define Area"
                            >
                                <GitCommit size={14} />
                            </button>
                            <button
                                onClick={() => setPlacementAreaEnabled(!placementAreaEnabled)}
                                className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${placementAreaEnabled
                                    ? 'bg-orange-600 border-orange-500 text-white'
                                    : 'bg-[#252526] border-[#333] text-gray-400 hover:bg-[#2d2d2d]'
                                    }`}
                                title={placementAreaEnabled ? "Area Enabled" : "Area Disabled"}
                            >
                                <CheckSquare size={14} />
                            </button>
                        </div>

                        {/* Offset Step (Compact inline) */}
                        {showOffsets && (
                            <>
                                <div className="w-px h-5 bg-[#444] mx-1"></div>
                                <div className="flex items-center gap-1 bg-[#2d2d2d] px-1.5 py-1 rounded h-full ml-auto">
                                    <span className="text-[9px] text-gray-500">Step</span>
                                    <input
                                        type="number"
                                        value={offsetStep}
                                        onChange={(e) => setOffsetStep(Number(e.target.value))}
                                        className="w-8 bg-[#333] border border-[#444] rounded px-1 text-[10px] text-white text-right h-5 focus:border-blue-500 outline-none"
                                        step={1}
                                        min={1}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* 2. Target Placement Actions */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4">Auto Place Actions</h4>
                    <div className="flex gap-2">
                        <ActionButton
                            onClick={() => handleOptimize('small', 'append')}
                            label="Small Rooms"
                            desc="< 110m²"
                            color="bg-emerald-600 hover:bg-emerald-500"
                        />
                        <ActionButton
                            onClick={() => handleOptimize('large', 'append')}
                            label="Large Rooms"
                            desc="≥ 110m²"
                            color="bg-blue-600 hover:bg-blue-500"
                        />
                    </div>
                </div>

                {/* 3. Optimization Controls */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Sliders size={14} /> Optimization Settings
                    </h4>

                    {/* Scope Selector */}
                    <div className="bg-[#2d2d2d] p-1 rounded-md flex text-xs">
                        {(['small', 'large', 'all'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setOptimizationSettings({ targetScope: s })}
                                className={`flex-1 py-1.5 rounded capitalize transition-all ${optimizationSettings.targetScope === s
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Radius Slider */}
                    <ControlSlider
                        label="Anchor Radius"
                        value={optimizationSettings.radius}
                        min={3} max={30} unit="m"
                        onChange={(v: number) => setOptimizationSettings({ radius: v })}
                    />

                    {/* Coverage Target (Placeholder logic for now) */}
                    <ControlSlider
                        label="Target Coverage"
                        value={optimizationSettings.coverageTarget}
                        min={50} max={100} unit="%"
                        onChange={(v: number) => setOptimizationSettings({ coverageTarget: v })}
                    />

                    {/* Min Signal (Placeholder logic) */}
                    <ControlSlider
                        label="Min Signal"
                        value={optimizationSettings.minSignalStrength}
                        min={-90} max={-40} unit="dBm"
                        onChange={(v: number) => setOptimizationSettings({ minSignalStrength: v })}
                    />

                    <button
                        className="w-full py-2 bg-[#333] hover:bg-[#444] border border-[#555] rounded text-sm font-medium transition-colors"
                        onClick={handleClearAndOptimize}
                    >
                        Apply Optimization
                    </button>
                    <p className="text-[10px] text-gray-500 text-center">
                        (Filters by selected scope)
                    </p>

                </div>
            </div>
        </div>
    );
};
