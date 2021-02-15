/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/ban-ts-comment */
import OC from "../../static_node_modules/opencascade.js/dist/oc";

/** The list that stores all of the OpenCascade shapes for rendering.
 * Add to this when using imported files or doing custom oc. operations.
 * @example```sceneShapes.push(externalShapes['myStep.step']);``` */
export let sceneShapes: OC.TopoDS_Shape[] = [];
export const resetSceneShapes = () => (sceneShapes = []);

/** This function returns a version of the `inputArray` without the `objectToRemove`. */
/** Remove this object from this array.  Useful for preventing objects being added to `sceneShapes` (in cached functions).
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let box = CacheOp(arguments, () => { let box = Box(x,y,z); sceneShapes = Remove(sceneShapes, box); return box; });``` */
export function RemoveFromSceneShapes(objectToRemove: any): any[] {
  sceneShapes = sceneShapes.filter(
    // @ts-ignore
    el => el.hash !== objectToRemove.hash || el.ptr !== objectToRemove.ptr
  );
  return sceneShapes;
}
