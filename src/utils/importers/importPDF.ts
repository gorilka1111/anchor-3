
import * as pdfjsLib from 'pdfjs-dist';

// Use local worker via Vite
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const importPDF = async (file: File): Promise<{ src: string, width: number, height: number }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better quality
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) throw new Error('Failed to create canvas context');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: context,
        viewport: viewport
    } as any).promise;

    return {
        src: canvas.toDataURL('image/png'),
        width: viewport.width,
        height: viewport.height
    };
};
