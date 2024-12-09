// const { flipFuses, FuseVersion, FuseV1Options } = require("@electron/fuses");
const { app, dialog } = require("electron");
const path = require("path");
const { readFile, writeFile, readdir } = require("fs/promises");
const { ensureDirSync } = require("fs-extra");
const { readFileSync } = require("fs");

// Known issues: https://playwright.dev/docs/api/class-electron
// flipFuses(electron, {
//   version: FuseVersion.V1,
//   [FuseV1Options.EnableNodeCliInspectArguments]: undefined,
//   [FuseV1Options.RunAsNode]: undefined,
// });

const robotFile = path.resolve(__dirname, "robot.js");

console.log("paths:", {
  main: app.getAppPath(),
  downloads: app.getPath("downloads"),
});

const configPath = path.resolve(app.getAppPath(), "config.json");
const config = JSON.parse(readFileSync(configPath).toString());
console.log("robot config:", config);

/**
 *
 * @param {string[]} inputFiles
 * @returns {Promise<{ data: unknown, svg: string }>}
 */
const waitForNesting = async (inputFiles, config) => {
  return new Promise((resolve, reject) => {
    const t = setTimeout(reject, config.timeout);

    dialog.showOpenDialog = async () => {
      return {
        filePaths: inputFiles,
        canceled: false,
      };
    };

    const outputFile = path.resolve(app.getPath("temp"), "result.svg");
    dialog.showSaveDialogSync = () => outputFile;

    const scale = config.scale || 72;
    const deepnestConfig = {
      scale, // stored value will be in units/inch
      spacing:
        config.units === "mm"
          ? (config.spacing / 25.4) * scale
          : config.spacing, // stored value will be in units/inch
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
    };

    app.on("main-window", async ({ mainWindow }) => {
      // configure the app
      await mainWindow.webContents.executeJavaScript(
        `const config = ${JSON.stringify(deepnestConfig)};
        window.config.setSync(config);
        window.DeepNest.config(config);`,
        true
      );

      const data = await mainWindow.webContents.executeJavaScript(
        (await readFile(robotFile))
          .toString()
          .replace("$width", config.sheet.width)
          .replace("$height", config.sheet.height),
        true
      );

      clearTimeout(t);

      resolve({
        data,
        svg: (await readFile(outputFile)).toString(),
      });
    });
  });
};

const exec = async () => {
  const files = (
    await Promise.all(
      (Array.isArray(config.input) ? config.input : [config.input])
        .map((dir) => path.resolve(path.dirname(configPath), dir))
        .map(async (dir) =>
          (await readdir(dir))
            .filter((file) => path.extname(file) === ".svg")
            .map((file) => path.resolve(dir, file))
        )
    )
  ).flat();
  const { data, svg } = await waitForNesting(files, config);
  const now = new Date();
  const outputDir =
    config.output ||
    path.resolve(
      app.getPath("downloads"),
      `nesting-${now.getDate()}-${
        now.getMonth() + 1
      }-${now.getHours()}-${now.getMinutes()}`
    );
  ensureDirSync(outputDir);
  const out = {
    svg: path.resolve(outputDir, "result.svg"),
    json: path.resolve(outputDir, "data.json"),
  };
  await writeFile(out.svg, svg);
  await writeFile(out.json, JSON.stringify(data, null, 2));
  console.log("Successfully written files:", out);

  app.quit();
};

exec();
require("./main");
