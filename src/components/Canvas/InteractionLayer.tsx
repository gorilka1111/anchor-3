import React, { useEffect, useState, useRef } from 'react';
import Konva from 'konva';
import { Line, Circle, Rect } from 'react-konva';
import { useProjectStore } from '../../store/useProjectStore';
import { applyOrthogonal, getSnapPoint } from '../../utils/geometry';
import type { Point } from '../../utils/geometry';

interface InteractionLayerProps {
    stage: Konva.Stage | null;
    onOpenMenu?: (x: number, y: number, options: { label?: string; action?: () => void; type?: 'separator' }[]) => void;
    onOpenScaleModal?: (pixelDistance: number) => void;
}

const getWallParams = (preset: string, standard: number, thick: number, wide: number) => {
    switch (preset) {
        case 'thick': return { thickness: thick, attenuation: 20 };
        case 'wide': return { thickness: wide, attenuation: 25 };
        default: return { thickness: standard, attenuation: 15 };
    }
};

// Helper: Improved Point in Polygon / Near Segment check
const isPointNearWall = (p: Point, w: any, tolerance: number) => {
    // Simple distance to segment check
    const x1 = w.points[0], y1 = w.points[1], x2 = w.points[2], y2 = w.points[3];
    const A = p.x - x1;
    const B = p.y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
        xx = x1; yy = y1;
    } else if (param > 1) {
        xx = x2; yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = p.x - xx;
    const dy = p.y - yy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check if within thickness or Hit Tolerance
    // Effective radius is half-thickness OR tolerance, whichever is larger.
    const effectiveRadius = Math.max(w.thickness / 2, tolerance);

    return dist <= effectiveRadius;
};

const isPointNearLine = (p: Point, x1: number, y1: number, x2: number, y2: number, tolerance: number) => {
    const A = p.x - x1;
    const B = p.y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
        xx = x1; yy = y1;
    } else if (param > 1) {
        xx = x2; yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = p.x - xx;
    const dy = p.y - yy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    return dist <= tolerance;
};

export const InteractionLayer: React.FC<InteractionLayerProps> = ({ stage, onOpenMenu, onOpenScaleModal }) => {
    const { activeTool, addWall, addAnchor, setTool, walls, anchors, setSelection, wallPreset, standardWallThickness, thickWallThickness, wideWallThickness, selectedIds, setAnchorMode, removeWall, removeAnchor, removeDimension, updateDimension, dimensions, anchorRadius } = useProjectStore();
    const [points, setPoints] = useState<Point[]>([]);
    const [chainStart, setChainStart] = useState<Point | null>(null);
    const [currentMousePos, setCurrentMousePos] = useState<Point | null>(null);
    const [isShiftDown, setIsShiftDown] = useState(false);

    // Rectangle Wall State
    // const [rectStart, setRectStart] = useState<Point | null>(null); // keeping previous state var
    const [rectStart, setRectStart] = useState<Point | null>(null);

    // Selection State
    const [selectionStart, setSelectionStart] = useState<Point | null>(null);
    const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

    // Panning State
    const [isPanning, setIsPanning] = useState(false);
    const lastPanPos = useRef<Point | null>(null);
    const panStartTime = useRef<number>(0);
    const lastDragPos = useRef<Point | null>(null);
    const isMouseDown = useRef(false);

    // Text Drag State (Ref)
    const dragTextId = useRef<string | null>(null);
    // Anchor Drag State (Ref)
    const dragAnchorId = useRef<string | null>(null);
    // Dimension Line Drag State (Ref)
    const dragDimLineId = useRef<string | null>(null);



    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if User is typing in an Input or Textarea
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea') return;
            if (e.key === 'Shift') setIsShiftDown(true);

            // Shortcuts
            if (e.key === 'Escape') {
                setPoints([]);
                setChainStart(null);
                setRectStart(null);
                setTool('select'); // Escape goes to select
                setSelectionStart(null);
                setSelectionRect(null);
                setSelection([]);
                dragTextId.current = null;
                dragAnchorId.current = null;
            }

            // Delete / Backspace
            if ((e.key === 'Delete' || e.key === 'Backspace')) {
                // Fix: Access fresh state directly
                const currentSelectedIds = useProjectStore.getState().selectedIds;
                if (currentSelectedIds.length > 0) {
                    currentSelectedIds.forEach(id => {
                        removeWall(id);
                        removeAnchor(id);
                        removeDimension(id);
                    });
                    setSelection([]);
                }
            }

            // Tool Shortcuts
            if (activeTool !== 'scale') { // Don't interrupt scale calib if typing? (though no typing there)
                const key = e.key.toLowerCase();

                // Undo / Redo
                if ((e.ctrlKey || e.metaKey) && key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        useProjectStore.temporal.getState().redo();
                    } else {
                        useProjectStore.temporal.getState().undo();
                    }
                    return;
                }
                if ((e.ctrlKey || e.metaKey) && key === 'y') {
                    e.preventDefault();
                    useProjectStore.temporal.getState().redo();
                    return;
                }

                // Group / Ungroup Anchors
                if ((e.ctrlKey || e.metaKey) && key === 'g') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        // Ungroup
                        const selectedIds = useProjectStore.getState().selectedIds;
                        useProjectStore.getState().ungroupAnchors(selectedIds);
                    } else {
                        // Group
                        const selectedIds = useProjectStore.getState().selectedIds;
                        useProjectStore.getState().groupAnchors(selectedIds);
                    }
                    return;
                }

                if (key === 'v') setTool('select');
                if (key === 'w') setTool('wall');
                if (key === 'r') setTool('wall_rect');
                if (key === 'd') setTool('dimension');
                if (key === 's') setTool('scale');

                if (key === 'a') {
                    if (e.shiftKey) {
                        setTool('anchor_auto');
                        setAnchorMode('auto');
                    } else {
                        setTool('anchor');
                        setAnchorMode('manual');
                    }
                }
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') setIsShiftDown(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [setTool, setSelection, setAnchorMode, activeTool]); // Reduced deps for key handler

    useEffect(() => {
        if (!stage) return;

        const getStagePoint = (): Point | null => {
            const pos = stage.getPointerPosition();
            if (!pos) return null;
            const scale = stage.scaleX();
            return {
                x: (pos.x - stage.x()) / scale,
                y: (pos.y - stage.y()) / scale,
            };
        };

        const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
            const stagePos = stage.getPointerPosition();
            if (!stagePos) return;
            const pos = getStagePoint();
            if (!pos) return;

            isMouseDown.current = true;

            // Anchor Drag Check
            if (e.target.name() === 'anchor') {
                const anchorId = e.target.id();
                // Select it if not selected (unless Shift is down, handled in Click)

                const isSelected = useProjectStore.getState().selectedIds.includes(anchorId);

                if (!e.evt.shiftKey) {
                    // Logic: If NOT selected, Select ONLY this one (and its group).
                    // If ALREADY selected, Keep the group selection (so we can drag the whole group).
                    if (!isSelected) {
                        const anchor = useProjectStore.getState().anchors.find(a => a.id === anchorId);
                        if (anchor && anchor.groupId) {
                            const groupIds = useProjectStore.getState().anchors
                                .filter(a => a.groupId === anchor.groupId)
                                .map(a => a.id);
                            setSelection(groupIds);
                        } else {
                            setSelection([anchorId]);
                        }
                    }
                } else {
                    // Logic: Toggle selection or Add to selection
                    if (!isSelected) {
                        const anchor = useProjectStore.getState().anchors.find(a => a.id === anchorId);
                        const current = useProjectStore.getState().selectedIds;
                        if (anchor && anchor.groupId) {
                            const groupIds = useProjectStore.getState().anchors
                                .filter(a => a.groupId === anchor.groupId)
                                .map(a => a.id);
                            setSelection([...new Set([...current, ...groupIds])]);
                        } else {
                            setSelection([...current, anchorId]);
                        }
                    }
                }

                dragAnchorId.current = anchorId;
                lastDragPos.current = pos;
                return;
            }

            // Text Drag Check
            // Allow dragging via Handle (always) OR Text (if already selected)
            const name = e.target.name();
            // Dimension Line Drag Check
            if (name === 'dimension-line') {
                const targetId = e.target.id();
                // If dragging line, we must ensure it is selected? Maybe auto-select?
                // For now, let's auto-select if needed or just allow drag.
                // Usually CAD allows drag even if not previously selected, or selects on down.
                const isSelected = useProjectStore.getState().selectedIds.includes(targetId);
                if (!isSelected && !e.evt.shiftKey) {
                    setSelection([targetId]);
                }

                dragDimLineId.current = targetId;
                lastDragPos.current = pos;
                return;
            }

            if (name === 'dim-text-handle' || name === 'dim-text') {
                const targetId = e.target.id();
                // Handle ID is just 'id', Text ID is 'dim-text-id'
                const realId = name === 'dim-text-handle' ? targetId : targetId.replace('dim-text-', '');

                const isSelected = useProjectStore.getState().selectedIds.includes(realId);

                // If Handle (implies selected) OR (Text AND Selected), start drag
                if (name === 'dim-text-handle' || (name === 'dim-text' && isSelected)) {
                    dragTextId.current = realId;
                    return; // Consume event (no selection box)
                }

                // If Text AND Not Selected, we let it fall through to Selection Logic below
            }



            // RMB Pan Start
            if (e.evt.button === 2) {
                // If hitting anchor, don't pan, let context menu handle it
                if (e.target.name() === 'anchor') {
                    return;
                }

                e.evt.preventDefault();
                setIsPanning(true);
                lastPanPos.current = { x: stagePos.x, y: stagePos.y };
                panStartTime.current = Date.now();
                return;
            }

            // Scale Tool
            if (activeTool === 'scale') {
                if (!points.length) {
                    setPoints([pos]);
                } else {
                    const start = points[0];
                    const distPixels = Math.hypot(pos.x - start.x, pos.y - start.y);
                    if (distPixels > 0 && onOpenScaleModal) {
                        onOpenScaleModal(distPixels);
                    }
                    setPoints([]);
                    setTool('select'); // Scale tool DOES reset to select usually
                }
                // Dimension Tool
            } else if (activeTool === 'dimension') {
                if (!points.length) {
                    // Smart Dim Logic
                    const clickPos = pos;
                    const tol = 10 / stage.scaleX();
                    let hitWall = null;
                    for (const w of walls) {
                        if (isPointNearWall(clickPos, w, tol)) {
                            hitWall = w;
                            break;
                        }
                    }

                    if (hitWall) {
                        // Create Wall Dimension
                        const x1 = hitWall.points[0];
                        const y1 = hitWall.points[1];
                        const x2 = hitWall.points[2];
                        const y2 = hitWall.points[3];
                        const dx = x2 - x1;
                        const dy = y2 - y1;
                        const len = Math.hypot(dx, dy);
                        const nx = -dy / len;
                        const ny = dx / len;
                        const offset = 30 / (stage.scaleX() || 1);

                        const cx = clickPos.x - x1;
                        const cy = clickPos.y - y1;
                        const dot = cx * nx + cy * ny;
                        const dir = dot > 0 ? 1 : -1;

                        const offX = nx * offset * dir;
                        const offY = ny * offset * dir;

                        const dimX1 = x1 + offX;
                        const dimY1 = y1 + offY;
                        const dimX2 = x2 + offX;
                        const dimY2 = y2 + offY;

                        // Recalculate dist for label
                        const scaleRatio = useProjectStore.getState().scaleRatio;
                        const distMeters = len / scaleRatio;

                        useProjectStore.getState().addDimension({
                            points: [dimX1, dimY1, dimX2, dimY2],
                            type: 'wall',
                            label: `${distMeters.toFixed(2)}m`
                        });

                        // Continuous Drawing: Stay in 'dimension' tool
                        setTool('dimension');
                    } else {
                        // Start Free Dim
                        setPoints([pos]);
                    }
                } else {
                    // End Free Dim
                    const start = points[0];
                    const end = pos;
                    const distPx = Math.hypot(end.x - start.x, end.y - start.y);
                    const scaleRatio = useProjectStore.getState().scaleRatio;
                    const validDist = distPx / scaleRatio;

                    if (validDist > 0) {
                        useProjectStore.getState().addDimension({
                            points: [start.x, start.y, end.x, end.y],
                            type: 'free',
                            label: `${validDist.toFixed(2)}m`
                        });
                    }
                    setPoints([]);
                    // Continuous Drawing
                }

                // Wall Tool
            } else if (activeTool === 'wall') {
                if (e.evt.button === 0) {
                    let finalPos = pos;
                    const snap = getSnapPoint(pos, walls, 20 / (stage.scaleX()));
                    if (snap) finalPos = snap;

                    if (isShiftDown && points.length > 0) {
                        if (!snap) {
                            finalPos = applyOrthogonal(points[points.length - 1], pos);
                        }
                    }

                    if (points.length === 0) {
                        setPoints([finalPos]);
                        setChainStart(finalPos);
                    } else {
                        const start = points[0];
                        const end = finalPos;
                        if (start.x !== end.x || start.y !== end.y) {
                            addWall({
                                points: [start.x, start.y, end.x, end.y],
                                material: 'concrete',
                                ...getWallParams(wallPreset, standardWallThickness, thickWallThickness, wideWallThickness)
                            });
                        }
                        // Continue chain
                        setPoints([end]);
                    }
                }

                // Rect Tool
            } else if (activeTool === 'wall_rect') {
                if (e.evt.button === 0) {
                    if (!rectStart) {
                        setRectStart(pos);
                        setCurrentMousePos(pos);
                    } else {
                        const x1 = rectStart.x;
                        const y1 = rectStart.y;
                        const x2 = pos.x;
                        const y2 = pos.y;

                        if (Math.abs(x1 - x2) > 0.1 && Math.abs(y1 - y2) > 0.1) {
                            const params = getWallParams(wallPreset, standardWallThickness, thickWallThickness, wideWallThickness);
                            const material = 'concrete';

                            addWall({ points: [x1, y1, x2, y1], material, ...params });
                            addWall({ points: [x2, y1, x2, y2], material, ...params });
                            addWall({ points: [x2, y2, x1, y2], material, ...params });
                            addWall({ points: [x1, y2, x1, y1], material, ...params });
                        }
                        setRectStart(null);
                        setCurrentMousePos(null);
                        // Continuous Drawing
                    }
                }

                // Anchor Tool (Manual)
            } else if (activeTool === 'anchor') {
                if (e.evt.button === 0) {
                    addAnchor({
                        x: pos.x,
                        y: pos.y,
                        power: 0,
                        range: anchorRadius || 5 // Use global radius or default
                    });
                }

                // Select Tool
            } else if (activeTool === 'select') {
                if (e.evt.button === 0) {
                    setSelectionStart(pos);
                }
            }
        };

        const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
            const pos = getStagePoint();
            if (!pos) return;

            // Panning
            if (isPanning && lastPanPos.current) {
                e.evt.preventDefault();
                const stagePos = stage.getPointerPosition();
                if (stagePos) {
                    const dx = stagePos.x - lastPanPos.current.x;
                    const dy = stagePos.y - lastPanPos.current.y;
                    stage.position({ x: stage.x() + dx, y: stage.y() + dy });
                    lastPanPos.current = { x: stagePos.x, y: stagePos.y };
                    stage.batchDraw();
                }
                return;
            }

            // Drag Dimension Text
            if (dragTextId.current) {
                const dim = useProjectStore.getState().dimensions.find(d => d.id === dragTextId.current);
                if (dim) {
                    const [x1, y1, x2, y2] = dim.points;
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    // Calculate relative offset
                    const offsetX = pos.x - midX;
                    const offsetY = pos.y - midY;

                    useProjectStore.getState().updateDimension(dragTextId.current, { textOffset: { x: offsetX, y: offsetY } });
                }
                return;
            }

            // Drag Dimension Line (Perpendicular)
            if (dragDimLineId.current && lastDragPos.current) {
                const dim = useProjectStore.getState().dimensions.find(d => d.id === dragDimLineId.current);
                if (dim) {
                    const dx = pos.x - lastDragPos.current.x;
                    const dy = pos.y - lastDragPos.current.y;

                    const [x1, y1, x2, y2] = dim.points;
                    // Calculate Normal
                    const dist = Math.hypot(x2 - x1, y2 - y1);
                    if (dist > 0.001) {
                        const nx = -(y2 - y1) / dist;
                        const ny = (x2 - x1) / dist;

                        // Project delta onto normal
                        const dot = dx * nx + dy * ny;
                        const moveX = dot * nx;
                        const moveY = dot * ny;

                        useProjectStore.getState().updateDimension(dim.id, {
                            points: [x1 + moveX, y1 + moveY, x2 + moveX, y2 + moveY]
                        });
                    }
                }
                lastDragPos.current = pos;
                return;
            }

            // Drag Anchor (Delta based)
            if (dragAnchorId.current && lastDragPos.current) {
                const dx = pos.x - lastDragPos.current.x;
                const dy = pos.y - lastDragPos.current.y;
                const state = useProjectStore.getState();

                const isDragSelected = state.selectedIds.includes(dragAnchorId.current);

                if (isDragSelected) {
                    // Update all selected anchors
                    state.anchors.forEach(a => {
                        if (state.selectedIds.includes(a.id)) {
                            state.updateAnchor(a.id, { x: a.x + dx, y: a.y + dy });
                        }
                    });
                } else {
                    // Just update dragged anchor if for some reason it's not in selection (though logic ensures it is)
                    const a = state.anchors.find(x => x.id === dragAnchorId.current);
                    if (a) state.updateAnchor(a.id, { x: a.x + dx, y: a.y + dy });
                }
                lastDragPos.current = pos;
                return;
            }

            // Tool Mouse Move checks...
            if (activeTool === 'wall') {
                const snap = getSnapPoint(pos, walls, 20 / (stage.scaleX()));
                setCurrentMousePos(snap || pos);
            } else if (activeTool === 'scale' && points.length > 0) {
                setCurrentMousePos(pos);
            } else if (activeTool === 'dimension' && points.length > 0) {
                setCurrentMousePos(pos);
            } else if (activeTool === 'wall_rect') {
                if (rectStart) setCurrentMousePos(pos);
            } else if (activeTool === 'select') {
                if (selectionStart && isMouseDown.current) {
                    setSelectionRect({
                        x: Math.min(selectionStart.x, pos.x),
                        y: Math.min(selectionStart.y, pos.y),
                        width: Math.abs(pos.x - selectionStart.x),
                        height: Math.abs(pos.y - selectionStart.y)
                    });
                    setCurrentMousePos(pos);
                }
            }
        };

        const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
            isMouseDown.current = false;
            dragTextId.current = null;
            dragAnchorId.current = null;
            dragDimLineId.current = null;
            lastDragPos.current = null;

            if (e.evt.button === 2) {
                if (isPanning) {
                    setIsPanning(false);
                    // Check if it was a CLICK (short distance pan)
                    checkRMBClick(e);
                    lastPanPos.current = null;
                }
            }

            if (e.evt.button === 0 && activeTool === 'select') {
                const hasDragRect = selectionRect && (selectionRect.width > 0.5 || selectionRect.height > 0.5);

                const getIdsInRect = (rect: { minX: number, maxX: number, minY: number, maxY: number }, isCrossing: boolean): string[] => {
                    const foundIds: string[] = [];

                    // Check Walls
                    walls.forEach(w => {
                        const wx1 = w.points[0]; const wy1 = w.points[1];
                        const wx2 = w.points[2]; const wy2 = w.points[3];
                        const wMinX = Math.min(wx1, wx2); const wMaxX = Math.max(wx1, wx2);
                        const wMinY = Math.min(wy1, wy2); const wMaxY = Math.max(wy1, wy2);

                        const isEnclosed = wMinX >= rect.minX && wMaxX <= rect.maxX &&
                            wMinY >= rect.minY && wMaxY <= rect.maxY;

                        if (!isCrossing) {
                            if (isEnclosed) foundIds.push(w.id);
                        } else {
                            if (wMaxX < rect.minX || wMinX > rect.maxX || wMaxY < rect.minY || wMinY > rect.maxY) return;
                            foundIds.push(w.id);
                        }
                    });

                    // Check Dimensions
                    dimensions.forEach(d => {
                        const dx1 = d.points[0]; const dy1 = d.points[1];
                        const dx2 = d.points[2]; const dy2 = d.points[3];
                        const dMinX = Math.min(dx1, dx2); const dMaxX = Math.max(dx1, dx2);
                        const dMinY = Math.min(dy1, dy2); const dMaxY = Math.max(dy1, dy2);

                        const isEnclosed = dMinX >= rect.minX && dMaxX <= rect.maxX &&
                            dMinY >= rect.minY && dMaxY <= rect.maxY;

                        if (!isCrossing) {
                            if (isEnclosed) foundIds.push(d.id);
                        } else {
                            if (dMaxX < rect.minX || dMinX > rect.maxX || dMaxY < rect.minY || dMinY > rect.maxY) return;
                            foundIds.push(d.id);
                        }
                    });

                    // Check Anchors (Point check)
                    anchors.forEach(a => {
                        const ax = a.x;
                        const ay = a.y;
                        // Treat anchor as small point/box
                        const isEnclosed = ax >= rect.minX && ax <= rect.maxX &&
                            ay >= rect.minY && ay <= rect.maxY;

                        if (isEnclosed) {
                            foundIds.push(a.id);
                        }
                    });

                    return foundIds;
                };

                if (hasDragRect && selectionStart && currentMousePos && selectionRect) {
                    // Box Select
                    const isCrossing = currentMousePos.x < selectionStart.x;
                    const rect = {
                        minX: Math.min(selectionStart.x, currentMousePos.x),
                        maxX: Math.max(selectionStart.x, currentMousePos.x),
                        minY: Math.min(selectionStart.y, currentMousePos.y),
                        maxY: Math.max(selectionStart.y, currentMousePos.y)
                    };

                    const foundIds = getIdsInRect(rect, isCrossing);
                    setSelection(foundIds);

                } else if (selectionStart && !hasDragRect) {
                    // Single Click Logic
                    const clickPos = getStagePoint();
                    if (clickPos) {
                        let foundId: string | null = null;
                        const tol = 10 / (stage.scaleX() || 1);

                        // Check Direct Click on Text
                        if (e.target.name() === 'dim-text') {
                            const rawId = e.target.id();
                            foundId = rawId.replace('dim-text-', '');
                        }

                        // Check Dimensions Line if text not hit
                        if (!foundId) {
                            for (const d of dimensions) {
                                if (isPointNearLine(clickPos, d.points[0], d.points[1], d.points[2], d.points[3], tol)) {
                                    foundId = d.id;
                                    break;
                                }
                            }
                        }

                        // If no dim, check walls
                        if (!foundId) {
                            for (const w of walls) {
                                if (isPointNearWall(clickPos, w, tol)) {
                                    foundId = w.id;
                                    break;
                                }
                            }
                        }

                        if (foundId) {
                            if (isShiftDown) {
                                const current = useProjectStore.getState().selectedIds;
                                if (current.includes(foundId)) {
                                    setSelection(current.filter(id => id !== foundId));
                                } else {
                                    setSelection([...current, foundId]);
                                }
                            } else {
                                setSelection([foundId]);
                            }
                        } else {
                            if (!isShiftDown) setSelection([]);
                        }
                    }
                }
                setSelectionStart(null);
                setSelectionRect(null);
                setCurrentMousePos(null);
            }
        };


        const handleDblClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
            if (e.evt.button === 1) { // MMB
                if (walls.length === 0) return;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                walls.forEach(w => {
                    minX = Math.min(minX, w.points[0], w.points[2]);
                    maxX = Math.max(maxX, w.points[0], w.points[2]);
                    minY = Math.min(minY, w.points[1], w.points[3]);
                    maxY = Math.max(maxY, w.points[1], w.points[3]);
                });
                const padding = 1.2;
                const w = (maxX - minX) * padding || 10;
                const h = (maxY - minY) * padding || 10;
                if (w === 0 || h === 0) return;

                const stageW = stage.width();
                const stageH = stage.height();
                const scale = Math.min(stageW / w, stageH / h);

                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;

                stage.position({
                    x: stageW / 2 - centerX * scale,
                    y: stageH / 2 - centerY * scale
                });
                stage.scale({ x: scale, y: scale });
                stage.batchDraw();
            }
        };


        const openAnchorMenu = (pointer: { x: number, y: number }, targetIds: string[]) => {
            if (onOpenMenu) {
                const state = useProjectStore.getState();
                onOpenMenu(pointer.x, pointer.y, [
                    {
                        label: 'Set Radius (m)...',
                        action: () => {
                            const r = prompt("Enter Radius in meters:", "5");
                            if (r !== null) {
                                const val = parseFloat(r);
                                if (!isNaN(val) && val > 0) {
                                    targetIds.forEach(id => state.updateAnchor(id, { radius: val }));
                                }
                            }
                        }
                    },
                    {
                        label: 'Shape: Circle',
                        action: () => targetIds.forEach(id => state.updateAnchor(id, { shape: 'circle' }))
                    },
                    {
                        label: 'Shape: Square',
                        action: () => targetIds.forEach(id => state.updateAnchor(id, { shape: 'square' }))
                    },
                    {
                        label: 'Reset to System Default',
                        action: () => targetIds.forEach(id => state.updateAnchor(id, { radius: undefined, shape: undefined }))
                    },
                    { type: 'separator' },
                    {
                        label: 'Group Anchors (Ctrl+G)',
                        action: () => state.groupAnchors(targetIds)
                    },
                    {
                        label: 'Ungroup Anchors (Ctrl+Shift+G)',
                        action: () => state.ungroupAnchors(targetIds)
                    }
                ]);
            }
        };

        const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
            e.evt.preventDefault();
            // We rely on MouseUp for the actual trigger to distinguish click vs drag
        };

        // Helper to check if we should show menu
        const checkRMBClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
            const pointer = stage.getPointerPosition();
            if (!pointer || !lastPanPos.current) return;

            // Calc distance
            const dx = pointer.x - lastPanPos.current.x;
            const dy = pointer.y - lastPanPos.current.y;
            const dist = Math.hypot(dx, dy);

            const duration = Date.now() - panStartTime.current;

            if (dist < 5 && duration < 500) {
                // It's a CLICK
                const state = useProjectStore.getState();
                const currentSelection = state.selectedIds;

                // If we clicked an anchor directly
                if (e.target.name() === 'anchor') {
                    const anchorId = e.target.id();
                    // If clicked anchor is not selected, select it (exclusive)
                    let targetIds = currentSelection;
                    if (!currentSelection.includes(anchorId)) {
                        state.setSelection([anchorId]);
                        targetIds = [anchorId];
                    }
                    openAnchorMenu(pointer, targetIds);
                } else {
                    // Clicked background or other
                    // If we have selected anchors, show menu for them
                    const selectedAnchors = state.anchors.filter(a => currentSelection.includes(a.id));
                    if (selectedAnchors.length > 0) {
                        openAnchorMenu(pointer, currentSelection);
                    } else {
                        // Default Logic (Wall Loop, etc or just nothing)
                        if (activeTool === 'wall' && points.length > 0) {
                            // Wall Menu
                            if (onOpenMenu) {
                                onOpenMenu(pointer.x, pointer.y, [
                                    {
                                        label: 'Close Loop',
                                        action: () => {
                                            if (chainStart && points.length > 0) {
                                                const start = points[0];
                                                const end = chainStart;
                                                if (start.x !== end.x || start.y !== end.y) {
                                                    addWall({
                                                        points: [start.x, start.y, end.x, end.y],
                                                        material: 'concrete',
                                                        ...getWallParams(wallPreset, standardWallThickness, thickWallThickness, wideWallThickness)
                                                    });
                                                }
                                            }
                                            setPoints([]);
                                            setChainStart(null);
                                        }
                                    },
                                    {
                                        label: 'Stop Drawing',
                                        action: () => {
                                            setPoints([]);
                                            setChainStart(null);
                                        }
                                    }
                                ]);
                            }
                        } else {
                            setTool('select');
                        }
                    }
                }
            }
        };

        stage.on('mousedown', handleMouseDown);
        stage.on('mousemove', handleMouseMove);
        stage.on('mouseup', handleMouseUp);
        stage.on('dblclick', handleDblClick);
        stage.on('contextmenu', handleContextMenu);

        // Global key handler is attached to window in useEffect

        return () => {
            stage.off('mousedown', handleMouseDown);
            stage.off('mousemove', handleMouseMove);
            stage.off('mouseup', handleMouseUp);
            stage.off('dblclick', handleDblClick);
            stage.off('contextmenu', handleContextMenu);
        };
    }, [stage, activeTool, points, addWall, addAnchor, isShiftDown, setTool, walls, onOpenMenu, chainStart, selectionStart, selectionRect, isPanning, setSelection, rectStart, wallPreset, selectedIds, setAnchorMode, onOpenScaleModal, anchorRadius]);

    return (
        <React.Fragment>
            {(activeTool === 'wall' || activeTool === 'scale' || activeTool === 'dimension') && points.length > 0 && currentMousePos && (
                <React.Fragment>
                    <Line
                        points={[points[0].x, points[0].y, currentMousePos.x, currentMousePos.y]}
                        stroke={activeTool === 'scale' ? "#ffaa00" : activeTool === 'dimension' ? "#00ff00" : "#00aaff"}
                        strokeWidth={2 / (stage?.scaleX() || 1)}
                        dash={[10, 5]}
                    />
                    <Circle
                        x={currentMousePos.x}
                        y={currentMousePos.y}
                        radius={5 / (stage?.scaleX() || 1)}
                        fill={activeTool === 'scale' ? "#ffaa00" : activeTool === 'dimension' ? "#00ff00" : "#00aaff"}
                    />
                </React.Fragment>
            )}

            {activeTool === 'wall_rect' && rectStart && currentMousePos && (
                <Rect
                    x={Math.min(rectStart.x, currentMousePos.x)}
                    y={Math.min(rectStart.y, currentMousePos.y)}
                    width={Math.abs(currentMousePos.x - rectStart.x)}
                    height={Math.abs(currentMousePos.y - rectStart.y)}
                    stroke="#00aaff"
                    strokeWidth={2 / (stage?.scaleX() || 1)}
                    dash={[10, 5]}
                />
            )}

            {activeTool === 'select' && selectionRect && selectionStart && currentMousePos && (
                <Rect
                    x={selectionRect.x}
                    y={selectionRect.y}
                    width={selectionRect.width}
                    height={selectionRect.height}
                    fill={currentMousePos.x < selectionStart.x ? "rgba(0, 255, 0, 0.2)" : "rgba(0, 100, 255, 0.2)"}
                    stroke={currentMousePos.x < selectionStart.x ? "green" : "blue"}
                    strokeWidth={1 / (stage?.scaleX() || 1)}
                    dash={currentMousePos.x < selectionStart.x ? [5, 5] : undefined}
                    listening={false}
                />
            )}
        </React.Fragment>
    );
};
export default InteractionLayer;
