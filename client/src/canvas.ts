import { map, switchMap, takeUntil, pairwise, filter, sampleTime } from 'rxjs/operators';
import { tap } from 'rxjs/operators';
import { BehaviorSubject, fromEvent, merge, Observable } from "rxjs";
import { hide } from './render';

export const canvas: HTMLCanvasElement = document.getElementById('board')! as HTMLCanvasElement;
const drawMouseUp$ = fromEvent<MouseEvent>(canvas, 'mouseup');
const drawMouseDown$ = fromEvent<MouseEvent>(canvas, 'mousedown');
const drawMouseMove$ = fromEvent<MouseEvent>(canvas, 'mousemove');
const drawMouseLeave$ = fromEvent<MouseEvent>(canvas, 'mouseleave');

const lineWidth = 3;

export const canvasRenderingContext: CanvasRenderingContext2D = canvas.getContext('2d')!;

type Point2D = {
    x: number,
    y: number
}

canvasRenderingContext.lineWidth = lineWidth;
canvasRenderingContext.lineCap = 'round';

const colorPickerInput = document.getElementById('color-picker')! as HTMLInputElement;

fromEvent(colorPickerInput, 'change')
    .pipe(
        tap((ev) => {
            canvasRenderingContext.strokeStyle = (ev.target as HTMLInputElement).value;
        }))
    .subscribe();

export const clearCanvasButton = document.getElementById('clear-canvas-btn')!;
hide(clearCanvasButton);

export const canvasClear$ = fromEvent(clearCanvasButton, 'click');

export function clearCanvas(): void {
    canvasRenderingContext.clearRect(0, 0, canvas.width, canvas.height);
}

export function loadImageToCanvas(base64ImageData: string): void {
    const image = new Image();
    image.src = base64ImageData;

    image.onload = () => {
        canvasRenderingContext.drawImage(image, 0, 0);
    };
}

export function drawOnCanvas(prevPos: Point2D, currentPos: Point2D): void {
    if (!canvasRenderingContext) { return; }

    canvasRenderingContext.beginPath();

    if (prevPos) {
        canvasRenderingContext.moveTo(prevPos.x, prevPos.y);

        canvasRenderingContext.lineTo(currentPos.x, currentPos.y);

        canvasRenderingContext.stroke();
    }
}

export function getCanvasChangeStream(isDrawing$: BehaviorSubject<boolean>): Observable<string> {
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

    return merge(
        canvasDrawing$,
        canvasClear$
    ).pipe(
        sampleTime(100),
        map(() => canvas.toDataURL("image/png"))
    );

}