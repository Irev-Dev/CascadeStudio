export const workerGlobals = {
  usedHashes: {},
  fonts: {},
  // ---
  // I can't see anywhere, where the following globals are used, variables with these names exist, but they are scoped.
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

export let currentShape;
export let opNumber = 0; // This keeps track of the progress of the evaluation
export let currentLineNumber = 0;
export let argCache = {};
export let currentOp = "";
export const setCurrentShape = val => (currentShape = val);
export const setOpNumber = val => (opNumber = val);
export const setCurrentLineNumber = val => (currentLineNumber = val);
export const setArgCache = val => (argCache = val);
export const setCurrentOp = val => (currentOp = val);

