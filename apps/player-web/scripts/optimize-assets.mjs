import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsRoot = path.resolve(__dirname, "..", "public", "assets");
const bytesPerKb = 1024;

const categoryConfigs = {
  symbols: {
    budgetBytes: 60 * bytesPerKb,
    dimensions: [512, 448, 384],
    webpQualities: [80, 76, 72, 68],
    pngQualities: [82, 76, 70, 64],
    pngColors: [192, 160, 128, 96]
  },
  backgrounds: {
    budgetBytes: 250 * bytesPerKb,
    dimensions: [1280, 1152, 1024, 960],
    webpQualities: [80, 76, 72, 68],
    pngQualities: [82, 76, 70, 64],
    pngColors: [224, 192, 160, 128]
  },
  ui: {
    budgetBytes: 150 * bytesPerKb,
    dimensions: [1024, 896, 768, 640, 512],
    webpQualities: [80, 76, 72, 68],
    pngQualities: [82, 76, 70, 64],
    pngColors: [224, 192, 160, 128, 96]
  }
};

const uiDimensionOverrides = [
  [/meter-eye-core|ouroboros-ring/i, [512, 448, 384]],
  [/glow-plate|logo-eye/i, [768, 640, 512]],
  [/frame-board-main/i, [1024, 896, 768]]
];

const formatKb = (bytes) => `${(bytes / bytesPerKb).toFixed(1)} KB`;
const formatMb = (bytes) => `${(bytes / bytesPerKb / bytesPerKb).toFixed(2)} MB`;

const walkPngAssets = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "lite") {
        continue;
      }

      files.push(...await walkPngAssets(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      files.push(fullPath);
    }
  }

  return files;
};

const classifyAsset = (relativePath) => {
  const group = relativePath.split(path.sep)[0];

  if (group === "symbols" || group === "backgrounds" || group === "ui") {
    return group;
  }

  throw new Error(`Unsupported asset group for ${relativePath}`);
};

const configForAsset = (relativePath) => {
  const category = classifyAsset(relativePath);
  const baseConfig = categoryConfigs[category];

  if (category !== "ui") {
    return baseConfig;
  }

  const normalized = relativePath.replaceAll(path.sep, "/");
  const override = uiDimensionOverrides.find(([pattern]) => pattern.test(normalized));

  return override
    ? { ...baseConfig, dimensions: override[1] }
    : baseConfig;
};

const pipelineFor = (input, dimension) =>
  sharp(input, { limitInputPixels: false })
    .rotate()
    .resize({
      width: dimension,
      height: dimension,
      fit: "inside",
      withoutEnlargement: true
    });

const chooseSmallest = (entries) =>
  entries.reduce((best, entry) => entry.buffer.length < best.buffer.length ? entry : best);

const encodeWebp = async (input, config) => {
  const attempts = [];

  for (const dimension of config.dimensions) {
    for (const quality of config.webpQualities) {
      const buffer = await pipelineFor(input, dimension)
        .webp({
          alphaQuality: Math.max(72, quality),
          effort: 6,
          quality,
          smartSubsample: true
        })
        .toBuffer();
      const attempt = { buffer, dimension, quality };

      if (buffer.length <= config.budgetBytes) {
        return attempt;
      }

      attempts.push(attempt);
    }
  }

  return chooseSmallest(attempts);
};

const encodePng = async (input, config) => {
  const attempts = [];

  for (const dimension of config.dimensions) {
    for (const quality of config.pngQualities) {
      for (const colors of config.pngColors) {
        const buffer = await pipelineFor(input, dimension)
          .png({
            adaptiveFiltering: true,
            colors,
            compressionLevel: 9,
            dither: 0.82,
            effort: 10,
            palette: true,
            quality
          })
          .toBuffer();
        const attempt = { buffer, dimension, quality, colors };

        if (buffer.length <= config.budgetBytes) {
          return attempt;
        }

        attempts.push(attempt);
      }
    }
  }

  return chooseSmallest(attempts);
};

const sumFileSizes = async (files) => {
  let total = 0;

  for (const file of files) {
    total += (await fs.stat(file)).size;
  }

  return total;
};

const main = async () => {
  const pngFiles = (await walkPngAssets(assetsRoot)).sort();
  const beforeTotal = await sumFileSizes(pngFiles);
  const rows = [];

  for (const pngFile of pngFiles) {
    const input = await fs.readFile(pngFile);
    const relativePath = path.relative(assetsRoot, pngFile);
    const config = configForAsset(relativePath);
    const webpFile = pngFile.replace(/\.png$/i, ".webp");
    const webp = await encodeWebp(input, config);
    const png = await encodePng(input, config);

    await fs.writeFile(webpFile, webp.buffer);
    await fs.writeFile(pngFile, png.buffer);

    rows.push({
      asset: relativePath.replaceAll(path.sep, "/"),
      budget: config.budgetBytes,
      original: input.length,
      png: png.buffer.length,
      pngDimension: png.dimension,
      webp: webp.buffer.length,
      webpDimension: webp.dimension
    });
  }

  const afterPngTotal = await sumFileSizes(pngFiles);
  const webpFiles = pngFiles.map((file) => file.replace(/\.png$/i, ".webp"));
  const webpTotal = await sumFileSizes(webpFiles);
  const misses = rows.flatMap((row) => {
    const entries = [];

    if (row.webp > row.budget) {
      entries.push(`${row.asset}.webp ${formatKb(row.webp)} > ${formatKb(row.budget)}`);
    }

    if (row.png > row.budget) {
      entries.push(`${row.asset} ${formatKb(row.png)} > ${formatKb(row.budget)}`);
    }

    return entries;
  });

  console.table(rows.map((row) => ({
    asset: row.asset,
    original: formatKb(row.original),
    webp: formatKb(row.webp),
    "webp max": row.webpDimension,
    png: formatKb(row.png),
    "png max": row.pngDimension,
    budget: formatKb(row.budget)
  })));

  console.log(`PNG fallback total: ${formatMb(beforeTotal)} -> ${formatMb(afterPngTotal)}`);
  console.log(`WebP primary total: ${formatMb(webpTotal)}`);
  console.log(`Combined emitted total: ${formatMb(afterPngTotal + webpTotal)}`);

  if (misses.length > 0) {
    console.warn("Budget misses:");
    for (const miss of misses) {
      console.warn(`- ${miss}`);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
