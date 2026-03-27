import {
  closestCorners,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core";

/** Prioriza columna bajo el puntero; si no, intersección; último recurso esquinas (estilo Trello / dnd-kit). */
export const kanbanCollisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length > 0) {
    return pointer;
  }
  const rect = rectIntersection(args);
  if (rect.length > 0) {
    return rect;
  }
  return closestCorners(args);
};
