import { tap } from 'rxjs/operators';
import { fromEvent } from "rxjs";

export const canvas: HTMLCanvasElement = document.getElementById('board')! as HTMLCanvasElement;
export const drawMouseUp$ = fromEvent<MouseEvent>(canvas, 'mouseup');
export const drawMouseDown$ = fromEvent<MouseEvent>(canvas, 'mousedown');
export const drawMouseMove$ = fromEvent<MouseEvent>(canvas, 'mousemove');
export const drawMouseLeave$ = fromEvent<MouseEvent>(canvas, 'mouseleave');

export const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!;

ctx.lineWidth = 3;
ctx.lineCap = 'round';

const colorPickerInput = document.getElementById('color-picker')! as HTMLInputElement;

fromEvent(colorPickerInput, 'change')
    .pipe(
        tap((ev) => {
            ctx.strokeStyle = (ev.target as HTMLInputElement).value;
        }))
    .subscribe();

const cRect = canvas.getBoundingClientRect()

const clearCanvasBtn = document.getElementById('clear-canvas-btn')!;

export const canvasClear$ = fromEvent(clearCanvasBtn, 'click')
    .pipe(
        tap(() => ctx.clearRect(0, 0, canvas.width, canvas.height))
    );

canvasClear$.subscribe();

export function drawOnCanvas(
    prevPos: { x: number, y: number },
    currentPos: { x: number, y: number }
) {
    if (!ctx) { return; }

    ctx.beginPath();

    if (prevPos) {
        ctx.moveTo(prevPos.x, prevPos.y);

        ctx.lineTo(currentPos.x, currentPos.y);

        ctx.stroke();
    }
}