
import DxfParser from 'dxf-parser';

export const importDXF = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (!content) return reject('Failed to read file');

            try {
                const parser = new DxfParser();
                const dxf = parser.parseSync(content);
                resolve(dxf);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
};
