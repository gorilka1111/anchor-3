
import React from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { useProjectStore } from '../../../store/useProjectStore';

export const FloorplanImageLayer: React.FC = () => {
    const { importedObjects, layers } = useProjectStore();

    if (!layers.floorplan) return null;

    return (
        <React.Fragment>
            {importedObjects.map(obj => {
                if (obj.type !== 'image' || !obj.visible) return null;
                return <SingleImage key={obj.id} obj={obj} />;
            })}
        </React.Fragment>
    );
};

const SingleImage: React.FC<{ obj: any }> = ({ obj }) => {
    const [image] = useImage(obj.src || '', 'anonymous');
    if (!image) return null;
    return (
        <KonvaImage
            image={image}
            x={obj.x}
            y={obj.y}
            width={obj.width * obj.scale}
            height={obj.height * obj.scale}
            opacity={obj.opacity}
            rotation={obj.rotation}
            listening={false}
        />
    );
};
