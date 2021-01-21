import { initOpenCascade } from "opencascade.js";

export const workerGlobals = {
  messageHandlers: {},
  opNumber: 0, // This keeps track of the progress of the evaluation
  currentLineNumber: 0,
  argCache: {},
  currentOp: "",
  usedHashes: {},
  externalShapes: {},
  GUIState: {},
  currentShape: undefined,
  fonts: {},
  // ---
  fullShapeEdgeHashes: {},
  fullShapeFaceHashes: {},
};

export let oc = null;
export const setOc = ocInit => (oc = ocInit);
