export const MIN_ELEVATION = -15;
export const MAX_ELEVATION = 75;
export function clampElevation(value) {
 return Math.max(MIN_ELEVATION,Math.min(MAX_ELEVATION,Number.isFinite(value)?value:8));
}
export function shotAngle(elevation,direction=1) {
 const radians=clampElevation(elevation)*Math.PI/180;
 return direction>=0?-radians:-Math.PI+radians;
}
export function elevationFromPoint(origin,target,direction=1) {
 const forward=(target.x-origin.x)*(direction>=0?1:-1);
 if(!Number.isFinite(forward)||!Number.isFinite(target.y)||forward<5)return null;
 return clampElevation(-Math.atan2(target.y-origin.y,forward)*180/Math.PI);
}
