import { map, switchMap, takeUntil, pairwise, filter, sampleTime } from 'rxjs/operators';
import { tap } from 'rxjs/operators';
import { BehaviorSubject, fromEvent, merge } from "rxjs";
import { hide } from './render';

export const canvas: HTMLCanvasElement = document.getElementById('board')! as HTMLCanvasElement;
const drawMouseUp$ = fromEvent<MouseEvent>(canvas, 'mouseup');
const drawMouseDown$ = fromEvent<MouseEvent>(canvas, 'mousedown');
const drawMouseMove$ = fromEvent<MouseEvent>(canvas, 'mousemove');
const drawMouseLeave$ = fromEvent<MouseEvent>(canvas, 'mouseleave');

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
hide(clearCanvasBtn);

export const canvasClear$ = fromEvent(clearCanvasBtn, 'click');

export function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function loadImageToCanvas(base64ImageData: string) {
    const image = new Image();
    image.src = base64ImageData;

    image.onload = () => {
        ctx.drawImage(image, 0, 0);
    };
}

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

export function getCanvasChangeStream(isDrawing$: BehaviorSubject<boolean>) {
    const canvasDrawing$ = isDrawing$.pipe(
        switchMap(isDrawing =>
            drawMouseDown$
                .pipe(
                    filter(() => isDrawing),
                    switchMap((e) => {
                        return drawMouseMove$
                            .pipe(
                                takeUntil(drawMouseUp$),
                                takeUntil(drawMouseLeave$),
                                pairwise(),
                            )
                    }),
                    map(([prevMouseEvent, currMouseEvent]) => {
                        const rect = canvas.getBoundingClientRect();

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
                    tap(({ prevPos, currentPos }) => drawOnCanvas(prevPos, currentPos))
                )
        )
    );

    return isDrawing$.pipe(
        switchMap(isDrawing =>
            merge(
                canvasDrawing$,
                canvasClear$
            ).pipe(
                sampleTime(100),
                filter(() => isDrawing),
                map(() => canvas.toDataURL("image/png"))
            )
        )
    );

}