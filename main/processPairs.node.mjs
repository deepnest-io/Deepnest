import { parentPort, workerData } from "worker_threads";
import { processPair } from "./processPair.mjs";

parentPort.postMessage(workerData.pairs.map(processPair));
