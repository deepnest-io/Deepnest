import path from "path";
import { Worker } from "worker_threads";
import { DeepNest } from "./main/deepnest.js";
import { nestingToSVG } from "./main/nestingToSVG.mjs";

const eventEmitter = new EventTarget();

/**
 *
 * @param {*} svgInput
 * @param {*} callback
 * @param {import(".").NestingOptions} param2
 * @returns
 */
export async function nest(
  svgInput,
  callback,
  {
    bin,
    timeout = 0,
    progressCallback,
    units = "inch",
    scale = 72,
    spacing = 0,
    ...config
  }
) {
  // scale is stored in units/inch
  const ratio = units === "mm" ? 1 / 25.4 : 1;
  /**
   * @type {import(".").DeepNestConfig}
   */
  const deepNestConfig = {
    curveTolerance: 0.72, // store distances in native units
    clipperScale: 10000000,
    rotations: 4,
    threads: 4,
    populationSize: 10,
    mutationRate: 10,
    placementType: "gravity", // how to place each part (possible values gravity, box, convexhull)
    mergeLines: true, // whether to merge lines
    timeRatio: 0.5, // ratio of material reduction to laser time. 0 = optimize material only, 1 = optimize laser time only
    simplify: false,
    dxfImportScale: 1,
    dxfExportScale: 72,
    endpointTolerance: 0.36,
    conversionServer: "http://convert.deepnest.io",
    ...config,
    units,
    scale,
    spacing: spacing * ratio * scale, // stored value will be in units/inch
  };
  const deepNest = new DeepNest(eventEmitter, deepNestConfig);
  const worker = new Worker(path.resolve("./main/background.js"));
  eventEmitter.addEventListener("background-start", ({ detail: data }) =>
    worker.postMessage(data)
  );
  worker.on("message", ({ type, data }) =>
    eventEmitter.dispatchEvent(new CustomEvent(type, { detail: data }))
  );
  const [sheetSVG] = deepNest.importsvg(
    null,
    null,
    typeof bin === "object"
      ? `<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${
          bin.width * ratio * scale
        }" height="${bin.height * ratio * scale}" class="sheet"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg">${bin}</svg>`
  );
  sheetSVG.sheet = true;
  const elements = svgInput
    .map((input) =>
      typeof input === "object"
        ? deepNest.importsvg(
            path.basename(input.file),
            path.dirname(input.file),
            input.svg
          )
        : deepNest.importsvg(null, null, input)
    )
    .flat();
  if (elements.length === 0) {
    throw new Error("Nothing to nest");
  }

  eventEmitter.addEventListener("background-progress", ({ detail }) => {
    detail.progress >= 0 && progressCallback?.(detail);
  });

  let t = 0;
  const abort = async () => {
    clearTimeout(t);
    deepNest.stop();
    await worker.terminate();
  };
  t = timeout && setTimeout(abort, timeout);
  process.on("SIGINT", abort);

  eventEmitter.addEventListener("placement", ({ detail: { data, better } }) => {
    const result = data.placements.flatMap(({ sheetplacements }) =>
      sheetplacements.slice().sort((a, b) => a.id - b.id)
    );
    return callback({
      result,
      data,
      elements,
      status: {
        better,
        complete: result.length === elements.length,
        placed: result.length,
        total: elements.length,
      },
      svg: () =>
        nestingToSVG(deepNest, data, `${result.length}/${elements.length}`),
      abort,
    });
  });

  deepNest.start();

  return abort;
}
