// import "babel-core/register";
import "babel-polyfill";
import { workerGlobals } from "./workerGlobals";
let sceneShapes = workerGlobals.sceneShapes;
console.error(sceneShapes)
// Define the persistent global variables
// var oc = null, externalShapes = {}, sceneShapes = [],
//   GUIState, fullShapeEdgeHashes = {}, fullShapeFaceHashes = {},
//   currentShape;

// Capture Logs and Errors and forward them to the main thread
let realConsoleLog   = console.log;
let realConsoleError = console.error;
console.log = function (message) {
  //postMessage({ type: "log", payload: message });
  setTimeout(() => { postMessage({ type: "log", payload: message }); }, 0);
  realConsoleLog.apply(console, arguments);
};
console.error = function (err, url, line, colno, errorObj) {
  postMessage({ type: "resetWorking" });
  setTimeout(() => {
    err.message = "INTERNAL OPENCASCADE ERROR DURING GENERATE: " + err.message;
    throw err; 
  }, 0);
  
  realConsoleError.apply(console, arguments);
}; // This is actually accessed via worker.onerror in the main thread

// Import the set of scripts we'll need to perform all the CAD operations
// importScripts(
//   '../../static_node_modules/three/build/three.min.js',
//   './CascadeStudioStandardLibrary.js',
//   './CascadeStudioShapeToMesh.js',
//   '../../static_node_modules/opencascade.js/dist/opencascade.wasm.js',
//   '../../static_node_modules/opentype.js/dist/opentype.min.js');

import "../../static_node_modules/three/build/three.min.js";
// import { Sphere, Cylinder, Rotate, Translate, Difference, Text3D } from "./CascadeStudioStandardLibrary.js";
// require("./CascadeStudioStandardLibrary.js");
import standardLibraryModule from "./CascadeStudioStandardLibrary.js";
// console.error(hi);
// console.error(Object.entries(hi));
// importScripts('./CascadeStudioStandardLibrary.js')
// importScripts("workerLibrary.bundle.js");
// let hi = ''
// fetch('workerLibrary.bundle.js').then(a => a.text().then(b => {
//   hi = b
//   console.log(b)
// }))
import "./CascadeStudioShapeToMesh.js";
// import "opencascade.js/dist/opencascade.wasm.js"
import { initOpenCascade } from "opencascade.js";
// import "../../static_node_modules/opencascade.js/dist/opencascade.wasm.js";
import opentype from "opentype.js";
// import "../../static_node_modules/opentype.js/dist/opentype.min.js";

// Preload the Various Fonts that are available via Text3D
var preloadedFonts = ['../../fonts/Roboto.ttf',
  '../../fonts/Papyrus.ttf', '../../fonts/Consolas.ttf'];
var fonts = {};
preloadedFonts.forEach((fontURL) => {
  opentype.load(fontURL, function (err, font) {
    if (err) { console.log(err); }
    let fontName = fontURL.split("./fonts/")[1].split(".ttf")[0];
    fonts[fontName] = font;
  });
});

// Load the full Open Cascade Web Assembly Module
// var messageHandlers = {};
// new opencascade({
//   locateFile(path) {
//     if (path.endsWith('.wasm')) {
//       return "../../static_node_modules/opencascade.js/dist/opencascade.wasm.wasm";
//     }
//     return path;
//   }
// }).then((openCascade) => {
initOpenCascade().then(openCascade => {
  // Register the "OpenCascade" WebAssembly Module under the shorthand "oc"
  workerGlobals.oc = openCascade;

  // Ping Pong Messages Back and Forth based on their registration in messageHandlers
  onmessage = function (e) {
    let response = workerGlobals.messageHandlers[e.data.type](e.data.payload);
    if (response) { postMessage({ "type": e.data.type, payload: response }); };
  }

  // Initial Evaluation after everything has been loaded...
  postMessage({ type: "startupCallback" });
});
function esm(templateStrings, ...substitutions) {
  let js = templateStrings.raw[0];
  for (let i = 0; i < substitutions.length; i++) {
    js += substitutions[i] + templateStrings.raw[i + 1];
  }
  return "data:text/javascript;base64," + btoa(js);
}
const m1 = esm`export function f() { return 'Hello!' }`;
const m2 = esm`import {f} from '${m1}'; export default f()+f();`;
// const m2 = esm`import {Slider, Sphere} from '${standardLibraryModule}'; `;

// import(m2)
//   .then(ns => assert.equal(ns.default, 'Hello!Hello!'));

/** This function evaluates `payload.code` (the contents of the Editor Window)
 *  and sets the GUI State. */
function Evaluate(payload) {
  workerGlobals.opNumber = 0;
  workerGlobals.GUIState = payload.GUIState;
  // const m2 = esm`import {Slider, Sphere} from '${standardLibraryModule}'; ${payload.code}`;
  // const m2 = esm`import {Slider, Sphere} from 'workerLibrary.bundle.js'; ${payload.code}`;
  // const m2 = esm`import {Slider, Sphere} from 'http://localhost:8080/workerLibrary.bundle.js'; ${payload.code}`;
  // const js = `import {Slider, Sphere} from 'http://localhost:8080/workerLibrary.bundle.js'; ${payload.code}`;
  // const js = `import {Slider, Sphere} from '/workerLibrary.bundle.js'; ${payload.code}`;
  const js = `${payload.code}`;
  // const uri = 'data:text/javascript;charset=utf-8,'
  // + encodeURIComponent(js);
  const uri = 'data:text/javascript;base64,' + btoa(js);
  const m1 = esm`export function f() { return 'Hello!' }`;
  const m2 = esm`import {f} from '${m1}'; export default f()+f();`;
  // import(m2)
  //   .then(ns => assert.equal(ns.default, 'Hello!Hello!'));
  try {
    // import(uri)
    import(m2)
      .then(ns => {
        console.log('hi')
        console.log(ns, 'ns')
      });
    // eval(`${Slider.toString()} ${Sphere.toString()} ${payload.code}`);
    // eval(`importScripts('./CascadeStudioStandardLibrary.js'); ${payload.code}`);
    // eval(`importScripts("workerLibrary.bundle.js"); ${payload.code}`);
    // eval(`${payload.code}`);
    // eval(payload.code);
    // eval(hi + " " + payload.code);
    // message
    // new Function('throw new Error(JSON.stringify({ hey: "hii", Sphere }));');
    // new Function(
    //   "console.log('hey'); console.log('hey again', Sphere);" + payload.code
    // );
    // new Function(payload.code);
  } catch (e) {
    setTimeout(() => {
      e.message = "Line " + workerGlobals.currentLineNumber + ": "  + workerGlobals.currentOp + "() encountered  " + e.message;
      throw e;
    }, 0);
  } finally {
    postMessage({ type: "resetWorking" });
    // Clean Cache; remove unused Objects
    for (let hash in workerGlobals.argCache) {
      if (!workerGlobals.usedHashes.hasOwnProperty(hash)) { delete workerGlobals.argCache[hash]; } }
      workerGlobals.usedHashes = {};
  }
}
workerGlobals.messageHandlers["Evaluate"] = Evaluate;

/**This function accumulates all the shapes in `sceneShapes` into the `TopoDS_Compound` `currentShape`
 * and converts it to a mesh (and a set of edges) with `ShapeToMesh()`, and sends it off to be rendered. */
function combineAndRenderShapes(payload) {
  // Initialize currentShape as an empty Compound Solid
  workerGlobals.currentShape     = new workerGlobals.oc.TopoDS_Compound();
  let sceneBuilder = new workerGlobals.oc.BRep_Builder();
  sceneBuilder.MakeCompound(workerGlobals.currentShape);
  let fullShapeEdgeHashes = {}; let fullShapeFaceHashes = {};
  postMessage({ "type": "Progress", "payload": { "opNumber": workerGlobals.opNumber++, "opType": "Combining Shapes" } });

  // If there are sceneShapes, iterate through them and add them to currentShape
  if (sceneShapes.length > 0) {
    for (let shapeInd = 0; shapeInd < sceneShapes.length; shapeInd++) {
      if (!sceneShapes[shapeInd] || !sceneShapes[shapeInd].IsNull || sceneShapes[shapeInd].IsNull()) {
        console.error("Null Shape detected in sceneShapes; skipping: " + JSON.stringify(sceneShapes[shapeInd]));
        continue;
      }
      if (!sceneShapes[shapeInd].ShapeType) {
        console.error("Non-Shape detected in sceneShapes; " +
          "are you sure it is a TopoDS_Shape and not something else that needs to be converted to one?");
        console.error(JSON.stringify(sceneShapes[shapeInd]));
        continue;
      }

      // Scan the edges and faces and add to the edge list
      Object.assign(fullShapeEdgeHashes, ForEachEdge(sceneShapes[shapeInd], (index, edge) => { }));
      ForEachFace(sceneShapes[shapeInd], (index, face) => {
        fullShapeFaceHashes[face.HashCode(100000000)] = index;
      });

      sceneBuilder.Add(workerGlobals.currentShape, sceneShapes[shapeInd]);
    }

    // Use ShapeToMesh to output a set of triangulated faces and discretized edges to the 3D Viewport
    postMessage({ "type": "Progress", "payload": { "opNumber": workerGlobals.opNumber++, "opType": "Triangulating Faces" } });
    let facesAndEdges = ShapeToMesh(workerGlobals.currentShape,
      payload.maxDeviation||0.1, fullShapeEdgeHashes, fullShapeFaceHashes);
    sceneShapes = [];
    postMessage({ "type": "Progress", "payload": { "opNumber": workerGlobals.opNumber, "opType": "" } }); // Finish the progress
    return facesAndEdges;
  } else {
    console.error("There were no scene shapes returned!");
  }
  postMessage({ "type": "Progress", "payload": { "opNumber": workerGlobals.opNumber, "opType": "" } });
}
workerGlobals.messageHandlers["combineAndRenderShapes"] = combineAndRenderShapes;

// Import the File IO Utilities
import "./CascadeStudioFileUtils.js";
// importScripts('./CascadeStudioFileUtils.js');
