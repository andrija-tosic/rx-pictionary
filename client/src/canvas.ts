import { thisPlayerDrawing } from './index';
import { map, switchMap, takeUntil, pairwise } from 'rxjs/operators';
import { tap } from 'rxjs/operators';
import { fromEvent, merge } from "rxjs";

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

export const clearCanvasBtn = document.getElementById('clear-canvas-btn')!;
clearCanvasBtn.style.display = 'none';

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

const canvasDrawing$ = drawMouseDown$
    .pipe(
        switchMap((e) => {
            return drawMouseMove$
                .pipe(
                    takeUntil(drawMouseUp$),
                    takeUntil(drawMouseLeave$),
                    pairwise(),
                )
        }),
        map((res) => {
            const rect = canvas.getBoundingClientRect();
            const prevMouseEvent = res[0] as MouseEvent;
            const currMouseEvent = res[1] as MouseEvent;

            const prevPos = {
                x: prevMouseEvent.clientX - rect.left,
                y: prevMouseEvent.clientY - rect.top
            };

            const currentPos = {
                x: currMouseEvent.clientX - rect.left,
                y: currMouseEvent.clientY - rect.top
            };

            return { prevPos, currentPos };
        }),
        tap(({ prevPos, currentPos }) => {
            if (thisPlayerDrawing)
                drawOnCanvas(prevPos, currentPos);

        })
    );

export const canvasChange$ = merge(
    canvasDrawing$,
    canvasClear$
);
