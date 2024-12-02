import {
  type ConsoleMessage,
  _electron as electron,
  expect,
  test,
} from "@playwright/test";
import { OpenDialogReturnValue } from "electron";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

type NestingResult = {
  area: number;
  fitness: number;
  index: number;
  mergedLength: number;
  selected: boolean;
  placements: {
    sheet: number;
    sheetid: number;
    sheetplacements: {
      filename: string;
      id: number;
      rotation: number;
      source: number;
      x: number;
      y: number;
    }[];
  }[];
};

// test.use({ launchOptions: { slowMo: !process.env.CI ? 500 : 0 } });

// test.setTimeout(5 * 60_000);
// !process.env.CI && test.use({ launchOptions: { slowMo: 2000 } });

const sheet = { width: 3000, height: 1000 };

test("Nest", async ({}, testInfo) => {
  const electronApp = await electron.launch({
    args: ["main.js"],
    recordVideo: { dir: testInfo.outputDir },
  });

  const window = await electronApp.firstWindow();

  // Direct Electron console to Node terminal.
  const logMessage = async (message: ConsoleMessage) => {
    const { url, lineNumber, columnNumber } = message.location();
    let file = url;
    try {
      file = path.relative(process.cwd(), fileURLToPath(url));
    } catch (error) {}
    console.log({
      location: `${file}:${lineNumber}:${columnNumber}`,
      args: await Promise.all(message.args().map((x) => x.jsonValue())),
      type: message.type(),
    });
  };
  // window.on("console", logMessage);
  // electronApp.on("window", (win) => win.on("console", logMessage));

  await test.step("upload and start", async () => {
    // electronApp.evaluate(
    //   (q, { upload, download }) => {
    //     console.log(q);
    //     q.contextBridge.exposeInMainWorld("electron", {
    //       showOpenDialog: async (): Promise<OpenDialogReturnValue> => ({
    //         filePaths: upload,
    //         canceled: false,
    //       }),
    //       showSaveDialogSync: () => download,
    //     });
    //   },
    //   {
    //     upload: [
    //       path.resolve(process.cwd(), "input", "letters.svg"),
    //       path.resolve(process.cwd(), "input", "letters2.svg"),
    //     ],
    //     download: downloadPath,
    //   }
    // );

    const inputDir = path.resolve(process.cwd(), "input");
    const files = (await readdir(inputDir))
      .filter((file) => path.extname(file) === ".svg")
      .map((file) => path.resolve(inputDir, file));

    await electronApp.evaluate(({ dialog }, paths) => {
      dialog.showOpenDialog = async (): Promise<OpenDialogReturnValue> => ({
        filePaths: paths,
        canceled: false,
      });
    }, files);
    await window.click("id=import");

    await window.click("id=addsheet");
    await window.fill("id=sheetwidth", sheet.width.toString());
    await window.fill("id=sheetheight", sheet.height.toString());
    await window.click("id=confirmsheet");

    const spacingMM = 10;
    const scale = 72;
    const config = {
      units: "mm",
      scale, // stored value will be in units/inch
      spacing: (spacingMM / 25.4) * scale, // stored value will be in units/inch
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
      dxfImportScale: "1",
      dxfExportScale: "72",
      endpointTolerance: 0.36,
      conversionServer: "http://convert.deepnest.io",
    };

    await window.evaluate((config) => {
      window.config.setSync(config);
      window.DeepNest.config(config);
    }, config);

    // await expect(window).toHaveScreenshot("loaded.png", {
    //   clip: { x: 100, y: 100, width: 2000, height: 1000 },
    // });

    await window.click("id=startnest");
  });

  const stopNesting = () => window.click("id=stopnest");

  const downloadSvg = async () => {
    const file = testInfo.outputPath("output.svg");
    electronApp.evaluate(({ dialog }, path) => {
      dialog.showSaveDialogSync = () => path;
    }, file);
    await window.click("id=export");
    await expect(window.locator("id=exportsvg")).toBeVisible();
    await window.click("id=exportsvg");
    return (await readFile(file)).toString();
  };

  // await electronApp.evaluate(({ ipcRenderer }) => {
  //   ipcRenderer.on("setPlacements", (event, payload) =>
  //     console.log("INCOMING", payload)
  //   );
  // });

  // const waitForIteration = (n: number) =>
  //   expect(() =>
  //     expect(
  //       window
  //         .locator("id=nestlist")
  //         .locator("span")
  //         .nth(n - 1)
  //     ).toBeVisible()
  //   ).toPass();

  // await window.pause();

  // await expect(window.locator("id=progressbar")).toBeVisible();
  const n = 1;
  await expect(() =>
    expect(
      window
        .locator("id=nestlist")
        .locator("span")
        .nth(n - 1)
    ).toBeVisible()
  ).toPass();
  await expect(window.locator("id=nestinfo").locator("h1").nth(0)).toHaveText(
    "1"
  );
  // await expect(window.locator("id=nestinfo").locator("h1").nth(1)).toHaveText(
  //   "54/54"
  // );

  const svg = await downloadSvg();

  const data = (): Promise<NestingResult> =>
    window.evaluate(() => window.DeepNest.nests);

  testInfo.attach("nesting.svg", { body: svg, contentType: "image/svg+xml" });

  testInfo.attach("nesting.json", {
    body: JSON.stringify(await data(), null, 2),
    contentType: "application/json",
  });

  await stopNesting();

  await electronApp.close();
});

test.afterAll(async ({}, testInfo) => {
  const { outputDir } = testInfo;
  await Promise.all(
    (
      await readdir(outputDir)
    ).map((file) => {
      return testInfo.attach(file, {
        path: path.resolve(outputDir, file),
      });
    })
  );
});
