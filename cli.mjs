#!/usr/bin/env node

import { InvalidArgumentError, program } from "commander";
import { existsSync, readFileSync } from "fs";
import { ensureDir } from "fs-extra";
import { lstat, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { nest } from "./index.node.mjs";
import ora from "ora";

async function main(files, { bin, output, timeout = 60_000, config = {} }) {
  const spinner = ora();
  spinner.start("Nesting");
  let i = 0;
  const abort = await nest(
    await Promise.all(
      files.map(async (file) => ({
        file,
        svg: (await readFile(file)).toString(),
      }))
    ),
    async ({ status, result, svg }) => {
      if (!status.better) {
        return;
      }
      const dir = path.resolve(output, `nesting-${i}`);
      i++;
      await ensureDir(dir);
      await writeFile(path.resolve(dir, "result.svg"), svg());
      await writeFile(
        path.resolve(dir, "data.json"),
        JSON.stringify(result, null, 2)
      );
      spinner.succeed(
        `Successfully nested ${status.placed}/${
          status.total
        } elements => ${path.relative(process.cwd(), dir)}`
      );
      spinner.start("Nesting");
    },
    {
      timeout,
      progressCallback: ({ index, progress, phase, threads }) => {
        spinner.text = `${phase} ${Math.round(
          progress * 100
        )}% with ${threads} threads`;
      },
      bin,
      ...config,
    }
  );

  process.once("SIGINT", async () => {
    await abort();
    process.exit();
  });
}

program
  .requiredOption(
    "-b, --bin <bin>",
    "The bin to pack into, an SVG string or `width, height`",
    (input) => {
      if (existsSync(input)) {
        return readFileSync(input).toString();
      } else if (input.includes(",")) {
        const [width, height] = input.split(",").map((x) => Number(x));
        if (isNaN(width) || isNaN(height)) {
          throw new InvalidArgumentError("Bad bin input");
        }
        return { width, height };
      } else {
        throw new InvalidArgumentError("Bad bin input");
      }
    }
  )
  .requiredOption("-o, --output <output>", "Output dir")
  .option("-t, --timeout [timeout]", (t) => parseInt(t))
  .option("-c, --config [config]", "Path to DeepNest config file")
  .argument("<paths...>")
  .action(async (paths, { bin, timeout = 60_000, config, output }) => {
    const files = (
      await Promise.all(
        paths.map(async (p) => {
          const resolvedPath = path.resolve(process.cwd(), p);
          return (await lstat(resolvedPath)).isDirectory()
            ? (await readdir(resolvedPath)).map((file) =>
                path.resolve(resolvedPath, file)
              )
            : [resolvedPath];
        })
      )
    )
      .flat()
      .filter((file) => path.extname(file) === ".svg");

    return main(files, {
      bin,
      timeout,
      config: existsSync(config)
        ? JSON.parse((await readFile(config)).toString())
        : {},
      output: path.resolve(process.cwd(), output),
    });
  });

program.parse();
