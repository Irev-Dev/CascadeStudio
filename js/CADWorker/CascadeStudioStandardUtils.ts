/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment, prettier/prettier, prefer-const */

import OC from "opencascade.js/dist/opencascade";
import {
  oc,
  GUIState,
  opNumber,
  setOpNumber,
  setCurrentLineNumber,
  argCache,
  setCurrentOp,
  usedHashes
} from "./CascadeStudioWorkerState";
// Miscellaneous Helper Functions used in the Standard Library

function getCalleeName(fn) {
  let ret = fn.toString();
  ret = ret.substr("function ".length);
  ret = ret.substr(0, ret.indexOf("("));
  return ret;
}

/** Hashes input arguments and checks the cache for that hash.
 * It returns a copy of the cached object if it exists, but will
 * call the `cacheMiss()` callback otherwise. The result will be
 * added to the cache if `GUIState["Cache?"]` is true. */

/** Explicitly Cache the result of this operation so that it can return instantly next time it is called with the same arguments.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let box = CacheOp(arguments, () => { return new oc.BRepPrimAPI_MakeBox(x, y, z).Shape(); });``` */
export function CacheOp(
  callee: (...args: any) => any,
  args: { [key: string]: any },
  cacheMiss: () => OC.TopoDS_Shape
): OC.TopoDS_Shape {
  //toReturn = cacheMiss();
  setCurrentOp(getCalleeName(callee));
  setCurrentLineNumber(getCallingLocation()[0]);
  // @ts-ignore
  postMessage({ "type": "Progress", "payload": { "opNumber": opNumber, "opType": getCalleeName(callee) } }); // Poor Man's Progress Indicator
  setOpNumber(opNumber + 1);
  let toReturn = null;
  // @ts-ignore
  let curHash = ComputeHash(callee, args); usedHashes[curHash] = curHash;
  let check = CheckCache(curHash);
  if (check && GUIState["Cache?"]) {
    //console.log("HIT    "+ ComputeHash(args) +  ", " +ComputeHash(args, true));
    toReturn = new oc.TopoDS_Shape(check);
    toReturn.hash = check.hash;
  } else {
    //console.log("MISSED " + ComputeHash(args) + ", " + ComputeHash(args, true));
    toReturn = cacheMiss();
    toReturn.hash = curHash;
    if (GUIState["Cache?"]) { AddToCache(curHash, toReturn); }
  }
  // @ts-ignore
  postMessage({ "type": "Progress", "payload": { "opNumber": opNumber, "opType": null } }); // Poor Man's Progress Indicator
  return toReturn;
}
/** Returns the cached object if it exists, or null otherwise. */
function CheckCache(hash) { return argCache[hash] || null; }
/** Adds this `shape` to the cache, indexable by `hash`. */
function AddToCache(hash, shape) {
  let cacheShape  = new oc.TopoDS_Shape(shape);
  cacheShape.hash = hash; // This is the cached version of the object
  argCache[hash]  = cacheShape;
  return hash;
}

/** This function computes a 32-bit integer hash given a set of `arguments`.
 * If `raw` is true, the raw set of sanitized arguments will be returned instead. */
export function ComputeHash(
  callee: ((...args: any) => any) | any,
  args: { [key: string]: any },
  raw
): ReturnType<typeof stringToHash> {
  let argsString = JSON.stringify(args);
  argsString = argsString.replace(/(\"ptr\"\:(-?[0-9]*?)\,)/g, '');
  argsString = argsString.replace(/(\"ptr\"\:(-?[0-9]*))/g, '');
  if (argsString.includes("ptr")) { console.error("YOU DONE MESSED UP YOUR REGEX."); }
  let hashString = getCalleeName(callee) + argsString; // + GUIState["MeshRes"];
  // @ts-ignore
  if (raw) { return hashString; }
  return stringToHash(hashString);
}

// Random Javascript Utilities

/** This function recursively traverses x and calls `callback()` on each subelement. */
function recursiveTraverse(x, callback) {
  if (Object.prototype.toString.call(x) === '[object Array]') {
    x.forEach(function (x1) {
      recursiveTraverse(x1, callback)
    });
  } else if ((typeof x === 'object') && (x !== null)) {
    if (x.HashCode) {
      callback(x);
    } else {
      for (let key in x) {
        if (x.hasOwnProperty(key)) {
          recursiveTraverse(x[key], callback)
        }
      }
    }
  } else {
    callback(x);
  }
}


/** This function returns true if item is indexable like an array. */
export function isArrayLike(item) {
  return (
      Array.isArray(item) || 
      (!!item &&
        typeof item === "object" &&
        item.hasOwnProperty("length") && 
        typeof item.length === "number" && 
        item.length > 0 && 
        (item.length - 1) in item
      )
  );
}

/**  Mega Brittle Line Number Finding algorithm for Handle Backpropagation; only works in Chrome and FF.
 * Eventually this should be replaced with Microsoft's Typescript interpreter, but that's a big dependency...*/
export function getCallingLocation() {
  let errorStack = (new Error).stack;
  //console.log(errorStack);
  //console.log(navigator.userAgent);
  let lineAndColumn = [0, 0];

  let matchingString = ", <anonymous>:";
  if (navigator.userAgent.includes("Chrom")) {
    matchingString = ", <anonymous>:";
  }else if (navigator.userAgent.includes("Moz")) {
    matchingString = "eval:";
  } else {
    // @ts-ignore
    lineAndColumn[0] = "-1";
    // @ts-ignore
    lineAndColumn[1] = "-1";
    return lineAndColumn;
  }

  errorStack.split("\n").forEach((line) => {
    if (line.includes(matchingString)) {
      // @ts-ignore
      lineAndColumn = line.split(matchingString)[1].split(':');
    }
  });
  // @ts-ignore
  lineAndColumn[0] = parseFloat(lineAndColumn[0]);
  // @ts-ignore
  lineAndColumn[1] = parseFloat(lineAndColumn[1]);

  return lineAndColumn;
}

/** This function converts either single dimensional 
 * array or a gp_Pnt to a gp_Pnt.  Does not accept 
 * `TopoDS_Vertex`'s yet! */
export function convertToPnt(pnt) {
  let point = pnt; // Accept raw gp_Points if we got 'em
  if (point.length) {
    point = new oc.gp_Pnt(point[0], point[1], (point[2])?point[2]:0);
  }
  return point;
}

/** This function converts a string to a 32bit integer. */
export function stringToHash(string: string) { 
  let hash = 0;
  if (string.length == 0) return hash; 
  for (let i = 0; i < string.length; i++) { 
    let char = string.charCodeAt(i); 
    hash = ((hash << 5) - hash) + char; 
    hash = hash & hash; 
  } 
  return hash; 
}

function CantorPairing(x, y) {
  return ((x + y) * (x + y + 1)) / 2 + y;
}
