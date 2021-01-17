export const workerGlobals = {
  messageHandlers: {},
  opNumber: 0, // This keeps track of the progress of the evaluation
  currentLineNumber: 0,
  argCache: {},
  currentOp: "",
  usedHashes: {},
  oc: null,
  externalShapes: {},
  sceneShapes: [],
  GUIState: undefined,
  currentShape: undefined,
  // ---
  fullShapeEdgeHashes: {},
  fullShapeFaceHashes: {},
};
