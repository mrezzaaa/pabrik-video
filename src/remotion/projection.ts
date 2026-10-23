import * as THREE from "three";

/**
 * Exact orthographic isometric projection from Three.js 3D world space coordinates [x, y, z]
 * to 2D canvas pixel coordinates { x, y } on a screen (e.g. 1080x1920).
 * Decoupled from React to remain completely safe for Node.js worker/server environments.
 */
export function project3DTo2D(
  point3D: [number, number, number],
  cameraPos: [number, number, number] = [8, 6.5, 8],
  target: [number, number, number] = [0, 0, 0],
  zoom = 170,
  screenWidth = 1080,
  screenHeight = 1920
): { x: number; y: number } {
  const camera = new THREE.OrthographicCamera(
    -screenWidth / 2,
    screenWidth / 2,
    screenHeight / 2,
    -screenHeight / 2,
    -100,
    200
  );
  camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);
  camera.zoom = zoom;
  camera.lookAt(new THREE.Vector3(target[0], target[1], target[2]));
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  const vec = new THREE.Vector3(point3D[0], point3D[1], point3D[2]);
  vec.project(camera);

  const x = (vec.x + 1) * (screenWidth / 2);
  const y = (-vec.y + 1) * (screenHeight / 2);

  return { x, y };
}
