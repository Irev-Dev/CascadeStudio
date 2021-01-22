export const workerGlobals = {
  opNumber: 0, // This keeps track of the progress of the evaluation
  currentLineNumber: 0,
  argCache: {},
  currentOp: "",
  usedHashes: {},
  currentShape: undefined,
  fonts: {},
  // ---
  fullShapeEdgeHashes: {},
  fullShapeFaceHashes: {},
};

export let oc = null;
export const setOc = ocInit => (oc = ocInit);

export const messageHandlers = {};

export let externalShapes = {};
export const resetExternalShapes = () => (externalShapes = {});

export let GUIState = {};
export const setGUIState = val => (GUIState = val);
