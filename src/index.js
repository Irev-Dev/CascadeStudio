import "./styles.css";
import { initialize } from "../js/MainPage/CascadeMain";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").then(
    function(registration) {
      registration.update(); // Always update the registration for the latest assets
    },
    function() {
      console.log("Could not register Cascade Studio for offline use!");
    }
  );
} else {
  console.log("Browser does not support offline access!");
}

// Begins loading the CAD Kernel Web Worker
if (window.Worker) {
  cascadeStudioWorker = new Worker("../js/CADWorker/CascadeStudioMainWorker.js")
    // Ping Pong Messages Back and Forth based on their registration in messageHandlers
  cascadeStudioWorker.onmessage = function (e) {
    if (e.data.type in messageHandlers) {
      let response = messageHandlers[e.data.type](e.data.payload);
      if (response) { cascadeStudioWorker.postMessage({ "type": e.data.type, payload: response }) };
    }
  }
}

new initialize();
