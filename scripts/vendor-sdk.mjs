import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { patchFaceAgeBundle, patchMediaPipeWasm } from "./patch-faceage.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const faceAgeDist = path.join(root, "node_modules/face-age/dist");
const outFace = path.join(root, "public/vendor/faceage");
const outChart = path.join(root, "public/vendor/chart");
const outSwiper = path.join(root, "public/vendor/swiper");
const outMesh = path.join(root, "public/vendor/mediapipe");
const meshPackage = path.join(root, "node_modules/@mediapipe/face_mesh");

await mkdir(outFace, { recursive: true });
await mkdir(outChart, { recursive: true });
await mkdir(outSwiper, { recursive: true });
await mkdir(outMesh, { recursive: true });

const bundle = await readFile(path.join(faceAgeDist, "faceage.js"), "utf8");
await writeFile(path.join(outFace, "faceage.js"), patchFaceAgeBundle(bundle));

const chunks = (await readdir(faceAgeDist)).filter((name) => /^\d+\.faceage\.js$/.test(name));
if (chunks.length === 0) {
  throw new Error("face-age dist has no webpack chunks to copy.");
}
for (const name of chunks) {
  await copyFile(path.join(faceAgeDist, name), path.join(outFace, name));
}

await copyFile(
  path.join(root, "node_modules/chart.js/dist/chart.umd.js"),
  path.join(outChart, "chart.umd.js"),
);

const swiperRoot = path.join(root, "node_modules/swiper");
await copyFile(
  path.join(swiperRoot, "swiper-bundle.min.js"),
  path.join(outSwiper, "swiper-bundle.min.js"),
);
await copyFile(
  path.join(swiperRoot, "swiper-bundle.min.css"),
  path.join(outSwiper, "swiper-bundle.min.css"),
);

const meshFiles = [
  "face_mesh.binarypb",
  "face_mesh_solution_packed_assets.data",
  "face_mesh_solution_packed_assets_loader.js",
  "face_mesh_solution_simd_wasm_bin.data",
  "face_mesh_solution_simd_wasm_bin.js",
  "face_mesh_solution_simd_wasm_bin.wasm",
  "face_mesh_solution_wasm_bin.js",
  "face_mesh_solution_wasm_bin.wasm",
];
for (const name of meshFiles) {
  const sourcePath = path.join(meshPackage, name);
  const targetPath = path.join(outMesh, name);
  if (name.endsWith("_wasm_bin.js")) {
    const source = await readFile(sourcePath, "utf8");
    await writeFile(targetPath, patchMediaPipeWasm(source));
  } else {
    await copyFile(sourcePath, targetPath);
  }
}

console.log(`Vendored face-age bundle, ${chunks.length} chunks, and MediaPipe into public/vendor.`);
