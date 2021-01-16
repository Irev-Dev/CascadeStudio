// these variables were previously global variables that needed to be declared in a script tage
// in index.html, making them slighly less global in that they need to be imported from here
// though they are still being mutated by whatever imports them.

export const messageHandlers = {};
export const globalVars = {
  workerWorking: false,
  threejsViewport: {}
};
