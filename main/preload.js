// Preload (Isolated World)
const { contextBridge, ipcRenderer } = require("electron");
const { calculateNFP } = require("../minkowski/Release/addon");
const { dialog } = require("@electron/remote");
const { rmdirSync, existsSync, writeFileSync } = require("fs");
const { readFile } = require("fs/promises");
const path = require("path");
const { version } = require("../package.json");
require("./util/clipper");

const cache = {};

const resolveCacheKey = (obj) =>
  "A" +
  obj.A +
  "B" +
  obj.B +
  "Arot" +
  parseInt(obj.Arotation) +
  "Brot" +
  parseInt(obj.Brotation);

function clone(nfp) {
  var newnfp = [];
  for (var i = 0; i < nfp.length; i++) {
    newnfp.push({
      x: nfp[i].x,
      y: nfp[i].y,
    });
  }

  if (nfp.children && nfp.children.length > 0) {
    newnfp.children = [];
    for (i = 0; i < nfp.children.length; i++) {
      var child = nfp.children[i];
      var newchild = [];
      for (var j = 0; j < child.length; j++) {
        newchild.push({
          x: child[j].x,
          y: child[j].y,
        });
      }
      newnfp.children.push(newchild);
    }
  }

  return newnfp;
}

function cloneNfp(nfp, inner) {
  if (!inner) {
    return clone(nfp);
  }

  // inner nfp is actually an array of nfps
  var newnfp = [];
  for (var i = 0; i < nfp.length; i++) {
    newnfp.push(clone(nfp[i]));
  }

  return newnfp;
}

contextBridge.exposeInMainWorld("db", {
  has: (obj) => {
    const key = resolveCacheKey(obj);
    if (cache[key]) {
      return true;
    }
    return false;
  },

  find: (obj, inner) => {
    const key = resolveCacheKey(obj);
    if (cache[key]) {
      return cloneNfp(cache[key], inner);
    }
    /*var keypath = './nfpcache/'+key+'.json';
		if(fs.existsSync(keypath)){
			// could be partially written
			obj = null;
			try{
				obj = JSON.parse(fs.readFileSync(keypath).toString());
			}
			catch(e){
				return null;
			}
			var nfp = obj.nfp;
			nfp.children = obj.children;
			
			cache[key] = clone(nfp);
			
			return nfp;
		}*/
    return null;
  },

  insert: (obj, inner) => {
    const key = resolveCacheKey(obj);
    // if (
    //   window.performance.memory.totalJSHeapSize <
    //   0.8 * window.performance.memory.jsHeapSizeLimit
    // ) {
    cache[key] = cloneNfp(obj.nfp, inner);
    //console.log('cached: ',window.cache[key].poly);
    //console.log('using', window.performance.memory.totalJSHeapSize/window.performance.memory.jsHeapSizeLimit);
    // }

    /*obj.children = obj.nfp.children;
		
		var keypath = './nfpcache/'+key+'.json';
		fq.writeFile(keypath, JSON.stringify(obj), function (err) {
			if (err){
				console.log("couldn't write");
			}
		});*/
  },

  clone,
});

contextBridge.exposeInMainWorld("clipper", {
  execute: (clipType, pathSpec, a, b) => {
    const paths = new ClipperLib.Paths();
    const clipper = new ClipperLib.Clipper();
    pathSpec.forEach((...args) => clipper.AddPaths(...args));
    const result = clipper.Execute(clipType, paths, a, b);
    return {
      paths,
      result,
    };
  },

  minkowskiSum: (...args) => ClipperLib.Clipper.MinkowskiSum(...args),

  scaleUpPath: (...args) => ClipperLib.JS.ScaleUpPath(...args),
});

contextBridge.exposeInMainWorld("electron", {
  version,
  on: (...args) => ipcRenderer.on(...args),
  send: (...args) => ipcRenderer.send(...args),
  calculateNFP: (...args) => {
    return calculateNFP(...args);
  },
  showOpenDialog: (...args) => dialog.showOpenDialog(...args),
  showSaveDialogSync: (...args) => dialog.showSaveDialogSync(...args),
  deleteCache: () => {
    try {
      existsSync("./nfpcache") && rmdirSync("./nfpcache");
    } catch (error) {
      console.error("Failed to delete cache", error);
    }
  },
  parsePath: (p) => path.parse(p),
  readFile: async (filepath) => {
    const buf = await readFile(filepath, { encoding: "utf-8" });
    return buf.toString();
  },
  writeFile: (filepath, body) => writeFileSync(filepath, body),
});
