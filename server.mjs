import busboy from "busboy";
import express from "express";
import { readFile, writeFile } from "fs/promises";
import { buffer } from "node:stream/consumers";
import { parse } from "opentype.js";
import { fileURLToPath } from "url";
import { nest } from "./index.node.mjs";

const app = express();
const PORT = 8080;

function parseForm(req, res, next) {
  const bb = busboy(req);
  const files = [];
  const fields = {};
  bb.on("file", async (name, file, info) => {
    info.mimeType === "image/svg+xml" &&
      files.push({ name, buffer: await buffer(file) });
  });
  bb.on("field", (name, value) => {
    fields[name] = value;
  });
  bb.on("close", () => {
    req.files = files;
    req.fields = fields;
    next();
  });
  req.pipe(bb);
}

/**
 *
 * @param {{ nest: { data: (string | { file: string; svg: string })[], config: any }}} req
 * @param {*} res
 */
async function nestSSE(req, res) {
  try {
    const abort = await nest(
      req.nest.data,
      async ({ svg, result, status }) => {
        res.write("event: response\n");
        res.write(
          `data: ${JSON.stringify({
            svg: svg(),
            data: result,
            status,
          })}\n\n`
        );
      },
      {
        bin: { width: 3000, height: 1000 },
        // optimize material usage
        timeRatio: 0,
        units: "mm",
        spacing: 4,
        progressCallback: ({ progress, phase }) => {
          res.write("event: progress\n");
          res.write(
            `data: ${JSON.stringify({
              progress: Math.round(progress * 100),
              phase,
            })}\n\n`
          );
        },
        ...req.nest.config,
      }
    );

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write("event: connection\n\n");
    res.once("close", abort);
    res.once("end", abort);
  } catch (error) {
    res.status(500).end(error.toString());
  }
}

// https://github.com/mpetazzoni/sse.js
function subscribeToSeverEvents(endPoint, data) {
  const evtSource = new EventSource(endPoint, {
    withCredentials: true,
    headers: {
      // Do not set content-type, leaving it for the browser to fill in the `multipart/form-data; boundary=....`
    },
    payload: data,
  });
  const progressbar = document.getElementById("nesting-progress");
  const progressLabel = document.querySelector("label[for='nesting-progress']");
  const stopButton = document.getElementById("stop");
  const stats = document.getElementById("stats");
  const container = document.getElementById("container");
  const json = document.getElementById("json");
  stopButton.addEventListener("click", () => evtSource.close());
  evtSource.addEventListener("open", () => {
    stats.innerHTML = "";
    container.innerHTML = "";
    json.innerHTML = "";
    progressbar.setAttribute("value", 50);
    progressLabel.innerHTML = "Connecting";
  });
  evtSource.addEventListener("connection", () => {
    progressbar.setAttribute("value", 100);
  });
  evtSource.addEventListener("progress", (ev) => {
    const { progress, phase } = JSON.parse(ev.data);
    progressbar.setAttribute("value", progress);
    progressLabel.innerHTML = phase;
  });
  evtSource.addEventListener("response", (ev) => {
    const { svg, data, status } = JSON.parse(ev.data);
    if (!status.better) {
      return;
    }
    stats.innerHTML = `${status.placed}/${status.total}`;
    container.innerHTML = svg;
    json.innerHTML = JSON.stringify(data, null, 2);
  });
  evtSource.addEventListener("error", () => {
    progressLabel.innerHTML = "ERROR";
  });
  return () => evtSource.close();
}

async function getFont({
  font,
  subset = "latin",
  weight = 400,
  style = "normal",
}) {
  /**
   * @type FontResponse
   */
  const fontData = await (
    await fetch(`https://api.fontsource.org/v1/fonts/${font}`, {
      cache: "force-cache",
    })
  ).json();
  const fontWeight = fontData.weights.includes(weight)
    ? weight
    : fontData.weights[0];
  const fontStyle = fontData.styles.includes(style)
    ? style
    : fontData.styles[0];
  const fontSubset = fontData.subsets.includes(subset)
    ? subset
    : fontData.defSubset;
  const data = fontData.variants[fontWeight][fontStyle][fontSubset].url;
  // opentype.js doesn't support woff2, use fontToStream if in need
  const url = data.ttf;

  if (!url) {
    throw new Error("NOT FOUND");
  }

  const response = await fetch(url);
  return parse(await response.arrayBuffer());
}

app.get("/", (req, res) => {
  res.contentType("text/html");
  res.send(`
    <h1>Nesting App</h1>
    <div><a href="/text">Nest Text</a></div>
    <div><a href="/upload">Nest SVG Files</a> (supports only polys and paths)</div>
    `);
});

app.get("/upload", async (req, res) => {
  function subscribeToFileInput() {
    const config = { units: "mm", spacing: 4 };
    let disposer;
    document.getElementById("upload").addEventListener("change", async (e) => {
      const formData = new FormData();
      formData.append("config", JSON.stringify(config));
      const files = e.target.files;
      for (let i = 0; i < files.length; i++) {
        formData.append(files[i].name, files[i]);
      }
      disposer?.();
      disposer = files.length
        ? subscribeToSeverEvents("/nest", formData)
        : undefined;
    });
  }

  res.contentType("text/html");
  res.end(`
    <script type="module">${(
      await readFile(fileURLToPath(import.meta.resolve("sse.js")))
    ).toString()}
    EventSource = SSE;
    ${subscribeToSeverEvents.toString()}
    ${subscribeToFileInput.toString()}
    subscribeToFileInput();
    </script>
    <input id="upload" type="file" accept="image/svg+xml" multiple />
    <button id="stop">stop</button>
    <label for="nesting-progress"></label>
    <progress id="nesting-progress" value="0" max="100"></progress>
    <div id="stats"></div>
    <div id="container"></div>
    <pre id="json"></pre>
    `);
});

app.post(
  "/nest",
  parseForm,
  (req, res, next) => {
    const data = req.files.map((file) => ({
      svg: file.buffer.toString(),
      file: file.name,
    }));
    req.nest = {
      data,
      config: req.fields.config ? JSON.parse(req.fields.config) : {},
    };
    next();
  },
  nestSSE
);

app.get("/text", async (req, res) => {
  /**
   * @type FontBasicResponse[]
   */
  const fonts = JSON.parse((await readFile("./fonts")).toString());

  function subscribeToFormSubmission() {
    const config = { units: "mm", spacing: 4 };
    let disposer;
    document.getElementById("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      formData.append("config", JSON.stringify(config));
      disposer?.();
      disposer = subscribeToSeverEvents("/nest/text", formData);
    });
  }
  res.contentType("text/html");
  res.end(`
    <script type="module">${(
      await readFile(fileURLToPath(import.meta.resolve("sse.js")))
    ).toString()}
    EventSource = SSE;
    ${subscribeToSeverEvents.toString()}
    ${subscribeToFormSubmission.toString()}
    subscribeToFormSubmission();
    </script>
    <div>
      <form id="form" style="display: inline">
        <input name="text" type="text" value="abcdefghijlmnopqrstuvwxyz" placeholder="Text to nest" />
        <select name="font">${fonts.map(
          (font) => `<option value="${font.id}">${font.family}</option>`
        )}</select>
        <input type="submit" />
      </form>
      <button id="stop">stop</button>
    </div>
    <div>
    <label for="nesting-progress"></label>
    <progress id="nesting-progress" value="0" max="100"></progress>
    </div>
    <div id="stats"></div>
    <div id="container"></div>
    <pre id="json"></pre>
    `);
});

app.post(
  "/nest/text",
  parseForm,
  async (req, res, next) => {
    const { text, font, subset, weight, style, size, config } = req.fields;
    const path = (await getFont({ font, subset, weight, style })).getPath(
      text,
      0,
      0,
      size
    );
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.appendChild(path.toDOMElement());
    req.nest = {
      data: [new XMLSerializer().serializeToString(svg)],
      config: config ? JSON.parse(config) : {},
    };
    next();
  },
  nestSSE
);

async function start() {
  /**
   * @type FontBasicResponse[]
   */
  const fonts = await (
    await fetch("https://api.fontsource.org/v1/fonts", { cache: "force-cache" })
  ).json();
  await writeFile("./fonts", JSON.stringify(fonts, null, 2));

  const server = app.listen(PORT, () => {
    console.log("Server listening on", `http://localhost:${PORT}`);
  });

  process.once("SIGINT", () => {
    server.close();
    process.exit();
  });
}

start();
