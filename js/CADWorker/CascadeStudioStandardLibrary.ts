/* eslint-disable prefer-const, no-var, prettier/prettier, no-prototype-builtins, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */

// Cascade Studio Standard Library
// Adding new standard library features and functions:
// 1. Research the OpenCascade API: https://www.opencascade.com/doc/occt-7.4.0/refman/html/annotated.html
// 2. Write your new function inside of Cascade Studio, using "oc." to refer to the raw OpenCascade API.
// 3. Add your new convenience function to this file
// 4. Add typescript annotations to index.ts in this same directory
// 5. Submit a PR to the main repository! https://github.com/zalo/CascadeStudio/pulls
// -
// (Optional) If base functions appear to be missing, fork opencascade.js and add them to this file:
//  - https://github.com/donalffons/opencascade.js/blob/master/opencascade.idl
//  - Upon push, Github Actions will build a new version of the library and commit it back to the repo
//  - From there, you can graft those into CascadeStudio/static_node_modules/opencascade.js/dist (following its existing conventions)

/** Import Misc. Utilities that aren't part of the Exposed Library */
import OC from "../../static_node_modules/opencascade.js/dist/oc";
import {
  CacheOp,
  ComputeHash,
  stringToHash,
  convertToPnt,
  getCallingLocation,
  isArrayLike
} from "./CascadeStudioStandardUtils";
import { oc, GUIState, setArgCache } from "./CascadeStudioWorkerState";
import {
  sceneShapes,
  RemoveFromSceneShapes
} from "./CascadeStudioSceneShapesService";
import { fonts } from "./CascadeStudioFontLoader";

type integer = number

/** Creates a solid box with dimensions x, y, and, z and adds it to `sceneShapes` for rendering.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let myBox = Box(10, 20, 30);```*/
export function Box(
  x: number,
  y: number,
  z: number,
  centered = false
): OC.TopoDS_Shape {
  let curBox = CacheOp(Box, { x, y, z, centered }, () => {
    // Construct a Box Primitive
    let box = new oc.BRepPrimAPI_MakeBox(x, y, z).Shape();
    if (centered) {
      return Translate([-x / 2, -y / 2, -z / 2], box);
    } else {
      return box;
    }
  });

  sceneShapes.push(curBox);
  return curBox;
}

/** Creates a solid sphere of specified radius and adds it to `sceneShapes` for rendering.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let mySphere = Sphere(40);```*/
export function Sphere(radius: number): OC.TopoDS_Shape {
  let curSphere = CacheOp(Sphere, { radius }, () => {
    // Construct a Sphere Primitive
    let spherePlane = new oc.gp_Ax2(new oc.gp_Pnt(0, 0, 0), oc.gp.prototype.DZ());
    return new oc.BRepPrimAPI_MakeSphere(spherePlane, radius).Shape();
  });

  sceneShapes.push(curSphere);
  return curSphere;
}

/** Creates a solid cylinder of specified radius and height and adds it to `sceneShapes` for rendering.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let myCylinder = Cylinder(30, 50);```*/
export function Cylinder(
  radius: number,
  height: number,
  centered?: boolean
): OC.TopoDS_Shape {
  let curCylinder = CacheOp(Cylinder, { radius, height, centered }, () => {
    let cylinderPlane = new oc.gp_Ax2(new oc.gp_Pnt(0, 0, centered ? -height / 2 : 0), new oc.gp_Dir(0, 0, 1));
    return new oc.BRepPrimAPI_MakeCylinder(cylinderPlane, radius, height).Shape();
  });
  sceneShapes.push(curCylinder);
  return curCylinder;
}

/** Creates a solid cone of specified bottom radius, top radius, and height and adds it to `sceneShapes` for rendering.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let myCone = Cone(30, 50);```*/
export function Cone(
  radius1: number,
  radius2: number,
  height: number
): OC.TopoDS_Shape {
  let curCone = CacheOp(Cone, { radius1, radius2, height }, () => {
    return new oc.BRepPrimAPI_MakeCone(radius1, radius2, height).Shape();
  });
  sceneShapes.push(curCone);
  return curCone;
}

/** Creates a polygon from a list of 3-component lists (points) and adds it to `sceneShapes` for rendering.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let triangle = Polygon([[0, 0, 0], [50, 0, 0], [25, 50, 0]]);```*/
export function Polygon(points: number[][], wire?: boolean): OC.TopoDS_Shape {
  let curPolygon = CacheOp(Polygon, { points, wire }, () => {
    let gpPoints = [];
    for (let ind = 0; ind < points.length; ind++) {
      gpPoints.push(convertToPnt(points[ind]));
    }

    let polygonWire = new oc.BRepBuilderAPI_MakeWire();
    for (let ind = 0; ind < points.length - 1; ind++) {
      let seg = new oc.GC_MakeSegment(gpPoints[ind], gpPoints[ind + 1]).Value();
      let edge = new oc.BRepBuilderAPI_MakeEdge(seg).Edge();
      let innerWire = new oc.BRepBuilderAPI_MakeWire(edge).Wire();
      polygonWire.Add(innerWire);
    }
    let seg2 = new oc.GC_MakeSegment(gpPoints[points.length - 1], gpPoints[0]).Value();
    let edge2 = new oc.BRepBuilderAPI_MakeEdge(seg2).Edge();
    let innerWire2 = new oc.BRepBuilderAPI_MakeWire(edge2).Wire();
    polygonWire.Add(innerWire2);
    let finalWire = polygonWire.Wire();

    if (wire) {
      return finalWire;
    } else {
      return new oc.BRepBuilderAPI_MakeFace(finalWire).Face();
    }
  });
  sceneShapes.push(curPolygon);
  return curPolygon;
}

/** Creates a circle from a radius and adds it to `sceneShapes` for rendering.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let circle = Circle(50);```*/
export function Circle(radius: number, wire?: boolean): OC.TopoDS_Shape {
  let curCircle = CacheOp(Circle, { radius, wire }, () => {
    let circle = new oc.GC_MakeCircle(new oc.gp_Ax2(new oc.gp_Pnt(0, 0, 0),
      new oc.gp_Dir(0, 0, 1)), radius).Value();
    let edge = new oc.BRepBuilderAPI_MakeEdge(circle).Edge();
    let circleWire = new oc.BRepBuilderAPI_MakeWire(edge).Wire();
    if (wire) {
      return circleWire;
    }
    return new oc.BRepBuilderAPI_MakeFace(circleWire).Face();
  });
  sceneShapes.push(curCircle);
  return curCircle;
}

/** Creates a bspline from a list of 3-component lists (points).
 * This can be converted into a face via the respective oc.BRepBuilderAPI functions.
 * Or used directly with BRepPrimAPI_MakeRevolution()
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let bspline = BSpline([[0,0,0], [40, 0, 50], [50, 0, 50]], true);```*/
export function BSpline(
  inPoints: [number, number, number][],
  closed?: boolean
): OC.TopoDS_Shape {
  let curSpline = CacheOp(BSpline, { inPoints, closed }, () => {
    let ptList = new oc.TColgp_Array1OfPnt(1, inPoints.length + (closed ? 1 : 0));
    for (let pIndex = 1; pIndex <= inPoints.length; pIndex++) {
      ptList.SetValue(pIndex, convertToPnt(inPoints[pIndex - 1]));
    }
    if (closed) { ptList.SetValue(inPoints.length + 1, ptList.Value(1)); }

    let geomCurveHandle = new oc.GeomAPI_PointsToBSpline(ptList).Curve();
    let edge = new oc.BRepBuilderAPI_MakeEdge(geomCurveHandle).Edge();
    return     new oc.BRepBuilderAPI_MakeWire(edge).Wire();
  });
  sceneShapes.push(curSpline);
  return curSpline;
}

/** Creates set of glyph solids from a string and a font-file and adds it to sceneShapes.
 * Note that all the characters share a singular face.
 *
 * Defaults: size:36, height:0.15, fontName: 'Consolas'
 *
 * Try 'Roboto' or 'Papyrus' for an alternative typeface.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let myText = Text3D("Hello!");```*/
export function Text3D(
  text = "Hi!",
  size = 36,
  height = 0.15,
  fontName = "Consolas"
): OC.TopoDS_Shape {
  let textArgs = JSON.stringify({ text, size, height, fontName });
  let curText = CacheOp(Text3D, { text, size, height, fontName }, () => {
    if (fonts[fontName] === undefined) { setArgCache({}); console.log("Font not loaded or found yet!  Try again..."); return; }
    let textFaces = [];
    let commands = fonts[fontName].getPath(text, 0, 0, size).commands;
    for (let idx = 0; idx < commands.length; idx++) {
      if (commands[idx].type === "M") {
        // Start a new Glyph
        var firstPoint = new oc.gp_Pnt(commands[idx].x, commands[idx].y, 0);
        var lastPoint = firstPoint;
        var currentWire = new oc.BRepBuilderAPI_MakeWire();
      } else if (commands[idx].type === "Z") {
        // End the current Glyph and Finish the Path

        let faceBuilder = null;
        if (textFaces.length > 0) {
          faceBuilder = new oc.BRepBuilderAPI_MakeFace(
            textFaces[textFaces.length - 1], currentWire.Wire());
        } else {
          faceBuilder = new oc.BRepBuilderAPI_MakeFace(currentWire.Wire());
        }

        textFaces.push(faceBuilder.Face());
      } else if (commands[idx].type === "L") {
        let nextPoint = new oc.gp_Pnt(commands[idx].x, commands[idx].y, 0);
        if (lastPoint.X() === nextPoint.X() && lastPoint.Y() === nextPoint.Y()) { continue; }
        let lineSegment = new oc.GC_MakeSegment(lastPoint, nextPoint).Value();
        let lineEdge = new oc.BRepBuilderAPI_MakeEdge(lineSegment).Edge();
        currentWire.Add(new oc.BRepBuilderAPI_MakeWire(lineEdge).Wire());
        lastPoint = nextPoint;
      } else if (commands[idx].type === "Q") {
        let controlPoint = new oc.gp_Pnt(commands[idx].x1, commands[idx].y1, 0);
        let nextPoint = new oc.gp_Pnt(commands[idx].x, commands[idx].y, 0);

        let ptList = new oc.TColgp_Array1OfPnt(1, 3);
        ptList.SetValue(1, lastPoint);
        ptList.SetValue(2, controlPoint);
        ptList.SetValue(3, nextPoint);
        let quadraticCurve = new oc.Geom_BezierCurve(ptList);
        let lineEdge = new oc.BRepBuilderAPI_MakeEdge(new oc.Handle_Geom_BezierCurve(quadraticCurve)).Edge();
        currentWire.Add(new oc.BRepBuilderAPI_MakeWire(lineEdge).Wire());

        lastPoint = nextPoint;
      } else if (commands[idx].type === "C") {
        let controlPoint1 = new oc.gp_Pnt(commands[idx].x1, commands[idx].y1, 0);
        let controlPoint2 = new oc.gp_Pnt(commands[idx].x2, commands[idx].y2, 0);
        let nextPoint = new oc.gp_Pnt(commands[idx].x, commands[idx].y, 0);

        let ptList = new oc.TColgp_Array1OfPnt(1, 4);
        ptList.SetValue(1, lastPoint);
        ptList.SetValue(2, controlPoint1);
        ptList.SetValue(3, controlPoint2);
        ptList.SetValue(4, nextPoint);
        let cubicCurve = new oc.Geom_BezierCurve(ptList);
        let lineEdge = new oc.BRepBuilderAPI_MakeEdge(new oc.Handle_Geom_BezierCurve(cubicCurve)).Edge();
        currentWire.Add(new oc.BRepBuilderAPI_MakeWire(lineEdge).Wire());
          
        lastPoint = nextPoint;
      }
    }

    if (height === 0) {
      return textFaces[textFaces.length - 1];
    } else {
      textFaces[textFaces.length - 1].hash = stringToHash(textArgs);
      let textSolid = Rotate([1, 0, 0], -90, Extrude(textFaces[textFaces.length - 1], [0, 0, height * size]));
      RemoveFromSceneShapes(textSolid);
      return textSolid;
    }
  });

  sceneShapes.push(curText);
  return curText;
}

// These foreach functions are not cache friendly right now!
/** Iterate over all the solids in this shape, calling `callback` on each one. */
export function ForEachSolid(
  shape: OC.TopoDS_Shape,
  callback: (index: number, shell: OC.TopoDS_Solid) => void
): void {
  let solid_index = 0;
  let anExplorer = new oc.TopExp_Explorer(shape, oc.TopAbs_SOLID);
  for (anExplorer.Init(shape, oc.TopAbs_SOLID); anExplorer.More(); anExplorer.Next()) {
    callback(solid_index++, oc.TopoDS.prototype.Solid(anExplorer.Current()));
  }
}
export function GetNumSolidsInCompound(shape) {
  if (!shape || shape.ShapeType() > 1 || shape.IsNull()) { console.error("Not a compound shape!"); return shape; }
  let solidsFound = 0;
  ForEachSolid(shape, (i, s) => { solidsFound++; });
  return solidsFound;
}

/** Gets the indexth solid from this compound shape. */
export function GetSolidFromCompound(
  shape: OC.TopoDS_Shape,
  index?: number,
  keepOriginal?: boolean
): OC.TopoDS_Solid {
  if (!shape || Number(shape.ShapeType()) > 1 || shape.IsNull()) { console.error("Not a compound shape!"); return shape; }
  if (!index) { index = 0;}

  let sol = CacheOp(
    GetSolidFromCompound,
    { shape, index, keepOriginal },
    // @ts-ignore
    () => {
    let innerSolid = {}; let solidsFound = 0;
    ForEachSolid(shape, (i, s) => {
      if (i === index) { innerSolid = new oc.TopoDS_Solid(s); } solidsFound++;
    });
    if (solidsFound === 0) { console.error("NO SOLIDS FOUND IN SHAPE!"); innerSolid = shape; }
    // @ts-ignore
    innerSolid.hash = shape.hash + 1;
    return innerSolid;
  });

  if (!keepOriginal) { RemoveFromSceneShapes(shape); }
  sceneShapes.push(sol);

  return sol;
}

/** Iterate over all the shells in this shape, calling `callback` on each one. */
export function ForEachShell(
  shape: OC.TopoDS_Shape,
  callback: (index: number, shell: OC.TopoDS_Shell) => void
): void {
  let shell_index = 0;
  let anExplorer = new oc.TopExp_Explorer(shape, oc.TopAbs_SHELL);
  for (anExplorer.Init(shape, oc.TopAbs_SHELL); anExplorer.More(); anExplorer.Next()) {
    callback(shell_index++, oc.TopoDS.prototype.Shell(anExplorer.Current()));
  }
}

/** Iterate over all the faces in this shape, calling `callback` on each one. */
export function ForEachFace(
  shape: OC.TopoDS_Shape,
  callback: (index: number, face: OC.TopoDS_Face) => void
): void {
  let face_index = 0;
  let anExplorer = new oc.TopExp_Explorer(shape, oc.TopAbs_FACE);
  for (anExplorer.Init(shape, oc.TopAbs_FACE); anExplorer.More(); anExplorer.Next()) {
    callback(face_index++, oc.TopoDS.prototype.Face(anExplorer.Current()));
  }
}

/** Iterate over all the wires in this shape, calling `callback` on each one. */
export function ForEachWire(
  shape: OC.TopoDS_Shape,
  callback: (wire: OC.TopoDS_Wire) => void
): void {
  let wire_index = 0;
  let anExplorer = new oc.TopExp_Explorer(shape, oc.TopAbs_WIRE);
  for (anExplorer.Init(shape, oc.TopAbs_WIRE); anExplorer.More(); anExplorer.Next()) {
    // @ts-ignore
    callback(wire_index++, oc.TopoDS.prototype.Wire(anExplorer.Current()));
  }
}

/** Gets the indexth wire from this face (or above) shape. */
export function GetWire(
  shape: OC.TopoDS_Face,
  index?: number,
  keepOriginal?: boolean
): OC.TopoDS_Wire {
  // @ts-ignore
  if (!shape || shape.ShapeType() > 4 || shape.IsNull()) { console.error("Not a wire shape!"); return shape; }
  if (!index) { index = 0;}

  // @ts-ignore
  let wire = CacheOp(GetWire, { shape, index, keepOriginal }, () => {
    let innerWire = {}; let wiresFound = 0;
    // @ts-ignore
    ForEachWire(shape, (i, s) => {
      if (i === index) { innerWire = new oc.TopoDS_Wire(s); } wiresFound++;
    });
    if (wiresFound === 0) { console.error("NO WIRES FOUND IN SHAPE!"); innerWire = shape; }
    // @ts-ignore
    innerWire.hash = shape.hash + 1;
    return innerWire;
  });

  if (!keepOriginal) { RemoveFromSceneShapes(shape); }
  sceneShapes.push(wire);

  return wire;
}

/** Iterate over all the UNIQUE indices and edges in this shape, calling `callback` on each one. */
export function ForEachEdge(
  shape: OC.TopoDS_Shape,
  callback: (index: number, edge: OC.TopoDS_Edge) => void
): { [edgeHash: number]: number } {
  let edgeHashes = {};
  let edgeIndex = 0;
  let anExplorer = new oc.TopExp_Explorer(shape, oc.TopAbs_EDGE);
  for (anExplorer.Init(shape, oc.TopAbs_EDGE); anExplorer.More(); anExplorer.Next()) {
    let edge = oc.TopoDS.prototype.Edge(anExplorer.Current());
    let edgeHash = edge.HashCode(100000000);
    if(!edgeHashes.hasOwnProperty(edgeHash)){
      edgeHashes[edgeHash] = edgeIndex;
      callback(edgeIndex++, edge);
    }
  }
  return edgeHashes;
}

/** Iterate over all the vertices in this shape, calling `callback` on each one. */
export function ForEachVertex(
  shape: OC.TopoDS_Shape,
  callback: (vertex: OC.TopoDS_Vertex) => void
): void {
  let anExplorer = new oc.TopExp_Explorer(shape, oc.TopAbs_VERTEX);
  for (anExplorer.Init(shape, oc.TopAbs_VERTEX); anExplorer.More(); anExplorer.Next()) {
    callback(oc.TopoDS.prototype.Vertex(anExplorer.Current()));
  }
}

/** Attempt to Fillet all selected edge indices in "edgeList" with a radius. 
 * Hover over the edges you'd like to select and use those indices as in the example.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```FilletEdges(shape, 1, [0,1,2,7]);``` */
export function FilletEdges(
  shape: OC.TopoDS_Shape,
  radius: number,
  edgeList: number[],
  keepOriginal?: boolean
): OC.TopoDS_Shape {
  let curFillet = CacheOp(
    FilletEdges,
    { shape, radius, edgeList, keepOriginal },
    () => {
    let mkFillet = new oc.BRepFilletAPI_MakeFillet(shape);
    let foundEdges = 0;
    ForEachEdge(shape, (index, edge) => {
      if (edgeList.includes(index)) { mkFillet.Add(radius, edge); foundEdges++; }
    });
    if (foundEdges == 0) {
      console.error("Fillet Edges Not Found!  Make sure you are looking at the object _before_ the Fillet is applied!");
      return new oc.TopoDS_Solid(shape);
    }
    return new oc.TopoDS_Solid(mkFillet.Shape());
  });
  sceneShapes.push(curFillet);
  if (!keepOriginal) { RemoveFromSceneShapes(shape); }
  return curFillet;
}

/** Attempt to Chamfer all selected edge indices in "edgeList" symmetrically by distance. 
 * Hover over the edges you'd like to select and use those indices in the edgeList array.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```ChamferEdges(shape, 1, [0,1,2,7]);``` */
export function ChamferEdges(
  shape: OC.TopoDS_Shape,
  distance: number,
  edgeList: number[],
  keepOriginal?: boolean
): OC.TopoDS_Shape {
  let curChamfer = CacheOp(
    ChamferEdges,
    { shape, distance, edgeList, keepOriginal },
    () => {
    let mkChamfer = new oc.BRepFilletAPI_MakeChamfer(shape);
    let foundEdges = 0;
    ForEachEdge(shape, (index, edge) => {
      if (edgeList.includes(index)) { mkChamfer.Add(distance, edge); foundEdges++; }
    });
    if (foundEdges == 0) {
      console.error("Chamfer Edges Not Found!  Make sure you are looking at the object _before_ the Chamfer is applied!");
      return new oc.TopoDS_Solid(shape);
    }
    return new oc.TopoDS_Solid(mkChamfer.Shape());
  });
  sceneShapes.push(curChamfer);
  if (!keepOriginal) { RemoveFromSceneShapes(shape); }
  return curChamfer;
}

/** BETA: Transform a shape using an in-view transformation gizmo.
 * 
 * Shortcuts: `T` - Translate, `R` - Rotate, `S` - Scale, `W`/`L` - Toggle World/Local
 * 
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let transformedSphere = Transform(Sphere(50));```*/
export function Transform(
  translation: number[],
  rotation: (number | number[])[],
  scale: number,
  shapes: OC.TopoDS_Shape
): OC.TopoDS_Shape {
  // @ts-ignore
  return CacheOp(Transform, { translation, rotation, scale, shapes }, () => {
    if (typeof shapes !== "undefined") {
      // Create the transform gizmo and add it to the scene
      // @ts-ignore
      postMessage({ "type": "createTransformHandle", payload: { translation: translation, rotation: rotation, scale: scale, lineAndColumn: getCallingLocation() } });
      // Transform the Object(s)
      // @ts-ignore
      return Translate(translation, Rotate(rotation[0], rotation[1], Scale(scale, shapes)));
    } else {
      // Create the transform gizmo and add it to the scene
      // @ts-ignore
      postMessage({ "type": "createTransformHandle", payload: { translation: [0, 0, 0], rotation: [[0, 1, 0], 1], scale: 1, lineAndColumn: getCallingLocation() } });
      return translation; // The first element will be the shapes
    }
  });
}

/** Translate a shape along the x, y, and z axes (using an array of 3 numbers).
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let upwardSphere = Translate([0, 0, 50], Sphere(50));```*/
export function Translate(
  offset: number[],
  shape: OC.TopoDS_Shape,
  keepOriginal?: boolean
): OC.TopoDS_Shape {
  let translated = CacheOp(Translate, { offset, shape, keepOriginal }, () => {
    let transformation = new oc.gp_Trsf();
    transformation.SetTranslation(new oc.gp_Vec(offset[0], offset[1], offset[2]));
    let translation = new oc.TopLoc_Location(transformation);
    if (!isArrayLike(shape)) {
      return new oc.TopoDS_Shape(shape.Moved(translation));
    // @ts-ignore
    } else if (shape.length >= 1) {      // Do the normal translation
      let newTrans = [];
      // @ts-ignore
      for (let shapeIndex = 0; shapeIndex < shape.length; shapeIndex++) {
        newTrans.push(new oc.TopoDS_Shape(shape[shapeIndex].Moved(translation)));
      }
      return newTrans;
    }
  });

  if (!keepOriginal) { RemoveFromSceneShapes(shape); }
  sceneShapes.push(translated);

  return translated;
}

/** Rotate a shape degrees about a 3-coordinate axis.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let leaningCylinder = Rotate([0, 1, 0], 45, Cylinder(25, 50));```*/
export function Rotate(
  axis: [number, number, number],
  degrees: number,
  shape: OC.TopoDS_Shape,
  keepOriginal?: boolean
): OC.TopoDS_Shape {
  let rotated = null;
  if (degrees === 0) {
    rotated = new oc.TopoDS_Shape(shape);
  } else {
    rotated = CacheOp(Rotate, { axis, degrees, shape, keepOriginal }, () => {
      let newRot;
      let transformation = new oc.gp_Trsf();
      transformation.SetRotation(
        new oc.gp_Ax1(
          new oc.gp_Pnt(0, 0, 0),
          new oc.gp_Dir(new oc.gp_Vec(axis[0], axis[1], axis[2]))
        ),
        degrees * 0.0174533
      );
      let rotation = new oc.TopLoc_Location(transformation);
      if (!isArrayLike(shape)) {
        newRot = new oc.TopoDS_Shape(shape.Moved(rotation));
      // @ts-ignore
      } else if (shape.length >= 1) {      // Do the normal rotation
        // @ts-ignore
        for (let shapeIndex = 0; shapeIndex < shape.length; shapeIndex++) {
          shape[shapeIndex].Move(rotation);
        }
      }
      return newRot;
    });
  }
  if (!keepOriginal) { RemoveFromSceneShapes(shape); }
  sceneShapes.push(rotated);
  return rotated;
}

/** Scale a shape to be `scale` times its current size.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let scaledCylinder = Scale(50, Cylinder(0.5, 1));```*/
export function Scale(
  scale: number,
  shape: OC.TopoDS_Shape,
  keepOriginal?: boolean
): OC.TopoDS_Shape {
  let scaled = CacheOp(Scale, { scale, shapes: shape, keepOriginal }, () => {
    let transformation = new oc.gp_Trsf();
    transformation.SetScaleFactor(scale);
    let scaling = new oc.TopLoc_Location(transformation);
    if (!isArrayLike(shape)) {
      return new oc.TopoDS_Shape(shape.Moved(scaling));
    // @ts-ignore
    } else if (shape.length >= 1) {      // Do the normal rotation
      let newScale = [];
      // @ts-ignore
      for (let shapeIndex = 0; shapeIndex < shape.length; shapeIndex++) {
        newScale.push(new oc.TopoDS_Shape(shape[shapeIndex].Moved(scaling)));
      }
      return newScale;
    }
  });

  if (!keepOriginal) { RemoveFromSceneShapes(shape); }
  sceneShapes.push(scaled);

  return scaled;
}

// TODO: These ops can be more cache optimized since they're multiple sequential ops
/** Joins a list of shapes into a single solid.
 * The original shapes are removed unless `keepObjects` is true.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let sharpSphere = Union([Sphere(38), Box(50, 50, 50, true)]);```*/
export function Union(
  objectsToJoin: OC.TopoDS_Shape[],
  keepObjects?: boolean,
  fuzzValue = 0.1,
  keepEdges?: boolean
): OC.TopoDS_Shape {
// export function Union(objectsToJoin, keepObjects, fuzzValue, keepEdges) {
  let curUnion = CacheOp(
    Union,
    { objectsToJoin, keepObjects, fuzzValue, keepEdges },
    () => {
    let combined = new oc.TopoDS_Shape(objectsToJoin[0]);
    if (objectsToJoin.length > 1) {
      for (let i = 0; i < objectsToJoin.length; i++) {
        if (i > 0) {
          let combinedFuse = new oc.BRepAlgoAPI_Fuse(combined, objectsToJoin[i]);
          combinedFuse.SetFuzzyValue(fuzzValue);
          combinedFuse.Build();
          combined = combinedFuse.Shape();
        }
      }
    }

    if (!keepEdges) {
      let fusor = new oc.ShapeUpgrade_UnifySameDomain(combined); fusor.Build();
      combined = fusor.Shape();
    }

    return combined;
  });

  for (let i = 0; i < objectsToJoin.length; i++) {
    if (!keepObjects) { RemoveFromSceneShapes(objectsToJoin[i]); }
  }
  sceneShapes.push(curUnion);
  return curUnion;
}

/** Subtracts a list of shapes from mainBody.
 * The original shapes are removed unless `keepObjects` is true.  Returns a Compound Shape unless onlyFirstSolid is true.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let floatingCorners = Difference(Box(50, 50, 50, true), [Sphere(38)]);```*/
export function Difference(
  mainBody: OC.TopoDS_Shape,
  objectsToSubtract: OC.TopoDS_Shape[],
  keepObjects?: boolean,
  fuzzValue?: number,
  keepEdges?: boolean
): OC.TopoDS_Shape {
  const args = {
    mainBody,
    objectsToSubtract,
    keepObjects,
    fuzzValue,
    keepEdges,
  };
  let curDifference = CacheOp(Difference, args, () => {
    if (!mainBody || mainBody.IsNull()) { console.error("Main Shape in Difference is null!"); }
    
    let difference = new oc.TopoDS_Shape(mainBody);
    if (objectsToSubtract.length >= 1) {
      for (let i = 0; i < objectsToSubtract.length; i++) {
        if (!objectsToSubtract[i] || objectsToSubtract[i].IsNull()) { console.error("Tool in Difference is null!"); }
        let differenceCut = new oc.BRepAlgoAPI_Cut(difference, objectsToSubtract[i]);
        differenceCut.SetFuzzyValue(fuzzValue);
        differenceCut.Build();
        difference = differenceCut.Shape();
      }
    }
    
    if (!keepEdges) {
      let fusor = new oc.ShapeUpgrade_UnifySameDomain(difference); fusor.Build();
      difference = fusor.Shape();
    }
    // @ts-ignore
    difference.hash = ComputeHash(Difference, args);
    if (GetNumSolidsInCompound(difference) === 1) {
      difference = GetSolidFromCompound(difference, 0);
    }

    return difference;
  });

  if (!keepObjects) { RemoveFromSceneShapes(mainBody); }
  for (let i = 0; i < objectsToSubtract.length; i++) {
    if (!keepObjects) { RemoveFromSceneShapes(objectsToSubtract[i]); }
  }
  sceneShapes.push(curDifference);
  return curDifference;
}

/** Takes only the intersection of a list of shapes.
 * The original shapes are removed unless `keepObjects` is true.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let roundedBox = Intersection([Box(50, 50, 50, true), Sphere(38)]);```*/
export function Intersection(
  objectsToIntersect: OC.TopoDS_Shape[],
  keepObjects?: boolean,
  fuzzValue = 0.1,
  keepEdges?: boolean
): OC.TopoDS_Shape {
  let curIntersection = CacheOp(
    Intersection,
    { objectsToIntersect, keepObjects, fuzzValue, keepEdges },
    () => {
    let intersected = new oc.TopoDS_Shape(objectsToIntersect[0]);
    if (objectsToIntersect.length > 1) {
      for (let i = 0; i < objectsToIntersect.length; i++) {
        if (i > 0) {
          let intersectedCommon = new oc.BRepAlgoAPI_Common(intersected, objectsToIntersect[i]);
          intersectedCommon.SetFuzzyValue(fuzzValue);
          intersectedCommon.Build();
          intersected = intersectedCommon.Shape();
        }
      }
    }

    if (!keepEdges) {
      let fusor = new oc.ShapeUpgrade_UnifySameDomain(intersected); fusor.Build();
      intersected = fusor.Shape();
    }

    return intersected;
  });

  for (let i = 0; i < objectsToIntersect.length; i++) {
    if (!keepObjects) { RemoveFromSceneShapes(objectsToIntersect[i]); }
  }
  sceneShapes.push(curIntersection);
  return curIntersection;
}

/** Extrudes a shape along direction, a 3-component vector. Edges form faces, Wires form shells, Faces form solids, etc.
 * The original face is removed unless `keepFace` is true.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let tallTriangle = Extrude(Polygon([[0, 0, 0], [50, 0, 0], [25, 50, 0]]), [0, 0, 50]);```*/
export function Extrude(
  face: OC.TopoDS_Shape,
  direction: number[],
  keepFace?: boolean
): OC.TopoDS_Shape {
  let curExtrusion = CacheOp(Extrude, { face, direction, keepFace }, () => {
    return new oc.BRepPrimAPI_MakePrism(face,
      new oc.gp_Vec(direction[0], direction[1], direction[2])).Shape();
  });
  
  if (!keepFace) { RemoveFromSceneShapes(face); }
  sceneShapes.push(curExtrusion);
  return curExtrusion;
}

/** Removes internal, unused edges from the insides of faces on this shape.  Keeps the model clean.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let cleanPart = RemoveInternalEdges(part);```*/
export function RemoveInternalEdges(
  shape: OC.TopoDS_Shape,
  keepShape?: boolean
): OC.TopoDS_Shape {
  let cleanShape = CacheOp(RemoveInternalEdges, { shape, keepShape }, () => {
    let fusor = new oc.ShapeUpgrade_UnifySameDomain(shape);
    fusor.Build();
    return fusor.Shape();
  });
  
  if (!keepShape) { RemoveFromSceneShapes(shape); }
  sceneShapes.push(cleanShape);
  return cleanShape;
}

/** Offsets the faces of a shape by offsetDistance
 * The original shape is removed unless `keepShape` is true.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let roundedCube = Offset(Box(10,10,10), 10);```*/
export function Offset(
  shape: OC.TopoDS_Shape,
  offsetDistance: number,
  tolerance = 0.1,
  keepShape?: boolean
): OC.TopoDS_Shape {
  if (!shape || shape.IsNull()) { console.error("Offset received Null Shape!"); }
  if (offsetDistance === 0.0) { return shape; }
  let curOffset = CacheOp(
    Offset,
    { shape, offsetDistance, tolerance, keepShape },
    () => {
    let offset = null;
    // @ts-ignore
    if (shape.ShapeType() === 5) {
      offset = new oc.BRepOffsetAPI_MakeOffset();
      offset.AddWire(shape);
      offset.Perform(offsetDistance);
    } else {
      offset = new oc.BRepOffsetAPI_MakeOffsetShape();
      offset.PerformByJoin(shape, offsetDistance, tolerance);
    }
    let offsetShape = new oc.TopoDS_Shape(offset.Shape());

    // Convert Shell to Solid as is expected
    if (offsetShape.ShapeType() == 3) {
      let solidOffset = new oc.BRepBuilderAPI_MakeSolid();
      solidOffset.Add(offsetShape);
      offsetShape = new oc.TopoDS_Solid(solidOffset.Solid());
    }
    
    return offsetShape;
  });
  
  if (!keepShape) { RemoveFromSceneShapes(shape); }
  sceneShapes.push(curOffset);
  return curOffset;
}

/** Revolves this shape "degrees" about "axis" (a 3-component array).  Edges form faces, Wires form shells, Faces form solids, etc.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js) 
 * @example```let cone = Revolve(Polygon([[0, 0, 0], [0, 0, 50], [50, 0, 0]]));```*/
export function Revolve(
  shape: OC.TopoDS_Shape,
  degrees = 360.0,
  axis: [number, number, number] = [0, 0, 1],
  keepShape?: boolean,
  copy?: boolean
): OC.TopoDS_Shape {
  let curRevolution = CacheOp(
    Revolve,
    { shape, degrees, axis, keepShape, copy },
    () => {
    if (degrees >= 360.0) {
      return new oc.BRepPrimAPI_MakeRevol(shape,
        new oc.gp_Ax1(new oc.gp_Pnt(0, 0, 0),
          new oc.gp_Dir(axis[0], axis[1], axis[2])),
        copy).Shape();
    } else {
      return new oc.BRepPrimAPI_MakeRevol(shape,
        new oc.gp_Ax1(new oc.gp_Pnt(0, 0, 0),
          new oc.gp_Dir(axis[0], axis[1], axis[2])),
        degrees * 0.0174533, copy).Shape();
    }
  });
  
  if (!keepShape) { RemoveFromSceneShapes(shape); }
  sceneShapes.push(curRevolution);
  return curRevolution;
}

/** Extrudes and twists a flat *wire* upwards along the z-axis (see the optional argument for Polygon).
 * The original wire is removed unless `keepWire` is true.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let twistyTriangle = RotatedExtrude(Polygon([[-25, -15, 0], [25, -15, 0], [0, 35, 0]], true), 50, 90);```*/
export function RotatedExtrude(
  wire: OC.TopoDS_Shape,
  height: number,
  rotation: number,
  keepWire?: boolean
): OC.TopoDS_Shape {
  if (!wire || wire.IsNull()) { console.error("RotatedExtrude received Null Wire!"); }
  let curExtrusion = CacheOp(
    RotatedExtrude,
    { wire, height, rotation, keepWire },
    () => {
    let upperPolygon = Rotate([0, 0, 1], rotation, Translate([0, 0, height], wire, true));
    RemoveFromSceneShapes(upperPolygon);

    // Define the straight spine going up the middle of the sweep
    let spineWire = BSpline([
      [0, 0, 0],
      [0, 0, height]], false);
    RemoveFromSceneShapes(spineWire); // Don't render these

    // Define the guiding helical auxiliary spine (which controls the rotation)
    let steps = 30;
    let aspinePoints = [];
    for (let i = 0; i <= steps; i++) {
      let alpha = i / steps;
      aspinePoints.push([
        20 * Math.sin(alpha * rotation * 0.0174533),
        20 * Math.cos(alpha * rotation * 0.0174533),
        height * alpha]);
    }

    let aspineWire = BSpline(aspinePoints, false);
    RemoveFromSceneShapes(aspineWire); // Don't render these

    // Sweep the face wires along the spine to create the extrusion
    let pipe = new oc.BRepOffsetAPI_MakePipeShell(spineWire);
    pipe.SetMode(aspineWire, true);
    pipe.Add(wire);
    pipe.Add(upperPolygon);
    pipe.Build();
    pipe.MakeSolid();
    return new oc.TopoDS_Shape(pipe.Shape());
  });
  if (!keepWire) { RemoveFromSceneShapes(wire); }
  sceneShapes.push(curExtrusion);
  return curExtrusion;
}

/** Lofts a solid through the sections defined by an array of 2 or more closed wires.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js) */
export function Loft(wireSections: OC.TopoDS_Shape[], keepWires?: boolean): OC.TopoDS_Shape {
  let curLoft = CacheOp(Loft, { wireSections, keepWires }, () => {
    let pipe = new oc.BRepOffsetAPI_ThruSections(true);

    // Construct a Loft that passes through the wires
    wireSections.forEach((wire) => { pipe.AddWire(wire); });

    pipe.Build();
    return new oc.TopoDS_Shape(pipe.Shape());
  });

  wireSections.forEach((wire) => {
    if (!keepWires) { RemoveFromSceneShapes(wire); }
  });
  sceneShapes.push(curLoft);
  return curLoft;
}

/** Sweeps this shape along a path wire.
 * The original shapes are removed unless `keepObjects` is true.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js) 
 * @example```let pipe = Pipe(Circle(20), BSpline([[0,0,0],[0,0,50],[20,0,100]], false, true));```*/
export function Pipe(shape: OC.TopoDS_Shape, wirePath: OC.TopoDS_Shape, keepInputs?: boolean): OC.TopoDS_Shape {
  let curPipe = CacheOp(Pipe, { shape, wirePath, keepInputs }, () => {
    let pipe = new oc.BRepOffsetAPI_MakePipe(wirePath, shape);
    pipe.Build();
    return new oc.TopoDS_Shape(pipe.Shape());
  });
  
  if (!keepInputs) {
    RemoveFromSceneShapes(shape);
    RemoveFromSceneShapes(wirePath);
  }
  sceneShapes.push(curPipe);
  return curPipe;
}

// This is a utility class for drawing wires/shapes with lines, arcs, and splines
// This is unique, it needs to be called with the "new" keyword prepended
export class Sketch {
  faces: OC.TopoDS_Face[];
  wires: OC.TopoDS_Wire[];
  firstPoint: OC.gp_Pnt;
  lastPoint: OC.gp_Pnt;
  wireBuilder: OC.BRepBuilderAPI_MakeWire;
  currentIndex: number;
  fillets: any[];
  argsString: string | number;
  constructor(startingPoint: number[]) {
    this.currentIndex = 0;
    this.faces = [];
    this.wires = [];
    this.firstPoint = new oc.gp_Pnt(startingPoint[0], startingPoint[1], 0);
    this.lastPoint = this.firstPoint;
    this.wireBuilder = new oc.BRepBuilderAPI_MakeWire();
    this.fillets = [];
    this.argsString = ComputeHash(Sketch, { startingPoint }, true);
  }

  // Functions are: BSplineTo, Fillet, Wire, and Face
  Start(startingPoint: number[]): Sketch {
    this.firstPoint  = new oc.gp_Pnt(startingPoint[0], startingPoint[1], 0);
    this.lastPoint   = this.firstPoint;
    this.wireBuilder = new oc.BRepBuilderAPI_MakeWire();
    // @ts-ignore
    this.argsString += ComputeHash(this.Start, { startingPoint }, true);
    return this;
  }

  End(closed?: boolean, reversed?: boolean): Sketch {
    // @ts-ignore
    this.argsString += ComputeHash(this.End, { closed, reversed }, true);

    if (closed &&
       (this.firstPoint.X() !== this.lastPoint.X() ||
        this.firstPoint.Y() !== this.lastPoint.Y())) {
      // @ts-ignore
      this.LineTo(this.firstPoint);
    }

    let wire = this.wireBuilder.Wire();
    if (reversed) { wire = wire.Reversed(); }
    // @ts-ignore
    wire.hash = stringToHash(this.argsString);
    this.wires.push(wire);

    let faceBuilder = null;
    if (this.faces.length > 0) {
      faceBuilder = new oc.BRepBuilderAPI_MakeFace(this.wires[0]);
      for (let w = 1; w < this.wires.length; w++){
        faceBuilder.Add(this.wires[w]);
      }
    } else {
      faceBuilder = new oc.BRepBuilderAPI_MakeFace(wire);
    }

    let face = faceBuilder.Face();
    // @ts-ignore
    face.hash = stringToHash(this.argsString);
    this.faces.push(face);
    return this;
  }

  Wire(reversed?: boolean): OC.TopoDS_Wire {
    // @ts-ignore
    this.argsString += ComputeHash(this.Wire, { reversed }, true);
    //let wire = this.wires[this.wires.length - 1];
    this.applyFillets();
    // @ts-ignore
    this.faces[this.faces.length - 1].hash = stringToHash(this.argsString);
    let wire = GetWire(this.faces[this.faces.length - 1]);
    if (reversed) { wire = wire.Reversed(); }
    sceneShapes.push(wire);
    return wire;
  }
  Face(reversed?: boolean): OC.TopoDS_Face {
    // @ts-ignore
    this.argsString += ComputeHash(this.Face, { reversed }, true);
    this.applyFillets();
    let face = this.faces[this.faces.length - 1];
    if (reversed) { face = face.Reversed(); }
    // @ts-ignore
    face.hash = stringToHash(this.argsString);
    sceneShapes.push(face);
    return face;
  }

  applyFillets() {
    // Add Fillets if Necessary
    if (this.fillets.length > 0) {
      let successes = 0; let swapFillets = [];
      for (let f = 0; f < this.fillets.length; f++) { this.fillets[f].disabled = false; }

      // Create Fillet Maker 2D
      let makeFillet = new oc.BRepFilletAPI_MakeFillet2d(this.faces[this.faces.length - 1]);
      // TopExp over the vertices
      ForEachVertex(this.faces[this.faces.length - 1], (vertex) => {
        // Check if the X and Y coords of any vertices match our chosen fillet vertex
        let pnt = oc.BRep_Tool.prototype.Pnt(vertex);
        for (let f = 0; f < this.fillets.length; f++) {
          if (!this.fillets[f].disabled &&
              pnt.X() === this.fillets[f].x &&
              pnt.Y() === this.fillets[f].y ) {
            // If so: Add a Radius there!
            makeFillet.AddFillet(vertex, this.fillets[f].radius);
            this.fillets[f].disabled = true; successes++;
            break;
          }
        }
      });
      if (successes > 0) { this.faces[this.faces.length - 1] = makeFillet.Shape(); }
        else { console.log("Couldn't find any of the vertices to fillet!!"); }
      this.fillets.concat(swapFillets);
    }
  }

  AddWire(wire: OC.TopoDS_Wire): Sketch {
    // @ts-ignore
    this.argsString += ComputeHash(this.AddWire, { wire }, true);
    // This adds another wire (or edge??) to the currently constructing shape...
    this.wireBuilder.Add(wire);
    // @ts-ignore
    if (endPoint) { this.lastPoint = endPoint; } // Yike what to do here...?
    return this;
  }

  LineTo(nextPoint: number[]): Sketch {
    // @ts-ignore
    this.argsString += ComputeHash(this.LineTo, { nextPoint }, true);
    let endPoint = null;
    // @ts-ignore
    if (nextPoint.X) {
      // @ts-ignore
      if (this.lastPoint.X() === nextPoint.X() &&
          // @ts-ignore
          this.lastPoint.Y() === nextPoint.Y()) { return this; }
      endPoint = nextPoint;
    } else {
      if (this.lastPoint.X() === nextPoint[0] &&
          this.lastPoint.Y() === nextPoint[1]) { return this; }
      endPoint = new oc.gp_Pnt(nextPoint[0], nextPoint[1], 0);
    }
    let lineSegment    = new oc.GC_MakeSegment(this.lastPoint, endPoint).Value();
    let lineEdge       = new oc.BRepBuilderAPI_MakeEdge(lineSegment    ).Edge ();
    this.wireBuilder.Add(new oc.BRepBuilderAPI_MakeWire(lineEdge       ).Wire ());
    this.lastPoint     = endPoint;
    this.currentIndex++;
    return this;
  }

  ArcTo(pointOnArc: number[], arcEnd: number[]): Sketch {
    // @ts-ignore
    this.argsString += ComputeHash(this.ArcTo, { pointOnArc, arcEnd }, true);
    let onArc          = new oc.gp_Pnt(pointOnArc[0], pointOnArc[1], 0);
    let nextPoint      = new oc.gp_Pnt(    arcEnd[0],     arcEnd[1], 0);
    let arcCurve       = new oc.GC_MakeArcOfCircle(this.lastPoint, onArc, nextPoint).Value();
    let arcEdge        = new oc.BRepBuilderAPI_MakeEdge(arcCurve    ).Edge() ;
    this.wireBuilder.Add(new oc.BRepBuilderAPI_MakeWire(arcEdge).Wire());
    this.lastPoint     = nextPoint;
    this.currentIndex++;
    return this;
  }

  // Constructs an order-N Bezier Curve where the first N-1 points are control points
  // and the last point is the endpoint of the curve
  BezierTo(bezierControlPoints: number[][]): Sketch {
    // @ts-ignore
    this.argsString += ComputeHash(
      this.BezierTo,
      { bezierControlPoints },
      true
    );
    let ptList = new oc.TColgp_Array1OfPnt(1, bezierControlPoints.length+1);
    ptList.SetValue(1, this.lastPoint);
    for (let bInd = 0; bInd < bezierControlPoints.length; bInd++){
      let ctrlPoint = convertToPnt(bezierControlPoints[bInd]);
      ptList.SetValue(bInd + 2, ctrlPoint);
      this.lastPoint = ctrlPoint;
    }
    let cubicCurve     = new oc.Geom_BezierCurve(ptList);
    let handle         = new oc.Handle_Geom_BezierCurve(cubicCurve);
    let lineEdge       = new oc.BRepBuilderAPI_MakeEdge(handle    ).Edge() ;
    this.wireBuilder.Add(new oc.BRepBuilderAPI_MakeWire(lineEdge  ).Wire());
    this.currentIndex++;
    return this;
  }

  /* Constructs a BSpline from the previous point through this set of points */
  BSplineTo(bsplinePoints: number[][]): Sketch {
    // @ts-ignore
    this.argsString += ComputeHash(this.BSplineTo, { bsplinePoints }, true);
    let ptList = new oc.TColgp_Array1OfPnt(1, bsplinePoints.length+1);
    ptList.SetValue(1, this.lastPoint);
    for (let bInd = 0; bInd < bsplinePoints.length; bInd++){
      let ctrlPoint = convertToPnt(bsplinePoints[bInd]);
      ptList.SetValue(bInd + 2, ctrlPoint);
      this.lastPoint = ctrlPoint;
    }
    let handle         = new oc.GeomAPI_PointsToBSpline(ptList  ).Curve();
    let lineEdge       = new oc.BRepBuilderAPI_MakeEdge(handle  ).Edge() ;
    this.wireBuilder.Add(new oc.BRepBuilderAPI_MakeWire(lineEdge).Wire());
    this.currentIndex++;
    return this;
  }

  Fillet(radius: number): Sketch {
    // @ts-ignore
    this.argsString += ComputeHash(this.Fillet, { radius }, true);
    this.fillets.push({ x: this.lastPoint.X(), y: this.lastPoint.Y(), radius: radius });
    return this;
  }

  Circle(center = [0, 0], radius: number, reversed?: boolean): Sketch {
    // @ts-ignore
    this.argsString += ComputeHash(
      this.Circle,
      { center, radius, reversed },
      true
    );
    let circle = new oc.GC_MakeCircle(new oc.gp_Ax2(convertToPnt(center),
    new oc.gp_Dir(0, 0, 1)), radius).Value();
    let edge = new oc.BRepBuilderAPI_MakeEdge(circle).Edge();
    let wire = new oc.BRepBuilderAPI_MakeWire(edge).Wire();
    if (reversed) { wire = wire.Reversed(); }
    // @ts-ignore
    wire.hash = stringToHash(this.argsString);
    this.wires.push(wire);

    let faceBuilder = null;
    if (this.faces.length > 0) {
      faceBuilder = new oc.BRepBuilderAPI_MakeFace(this.wires[0]);
      for (let w = 1; w < this.wires.length; w++){
        faceBuilder.Add(this.wires[w]);
      }
    } else {
      faceBuilder = new oc.BRepBuilderAPI_MakeFace(wire);
    }
    let face = faceBuilder.Face();
    // @ts-ignore
    face.hash = stringToHash(this.argsString);
    this.faces.push(face);
    return this;
  }
}

/** Download this file URL through the browser.  Use this to export information from the CAD engine.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```SaveFile("myInfo.txt", URL.createObjectURL( new Blob(["Hello, Harddrive!"], { type: 'text/plain' }) ));``` */
export function SaveFile(filename: string, fileURL: string): void {
  // @ts-ignore
  postMessage({
    "type": "saveFile",
    payload: { filename: filename, fileURL: fileURL }
  });
}

/** Creates a labeled slider with specified defaults, mins, and max ranges.
 * @example```let currentSliderValue = Slider("Radius", 30 , 20 , 40);```
 * `name` needs to be unique!
 * 
 * `callback` triggers whenever the mouse is let go, and `realTime` will cause the slider to update every frame that there is movement (but it's buggy!)
 * 
 * @param step controls the amount that the keyboard arrow keys will increment or decrement a value. Defaults to 1/100 (0.01).
 * @param precision controls how many decimal places the slider can have (i.e. "0" is integers, "1" includes tenths, etc.). Defaults to 2 decimal places (0.00).
 * 
 * @example```let currentSliderValue = Slider("Radius", 30 , 20 , 40, false);```
 * @example```let currentSliderValue = Slider("Radius", 30 , 20 , 40, false, 0.01);```
 * @example```let currentSliderValue = Slider("Radius", 30 , 20 , 40, false, 0.01, 2);```
 */
export function Slider(name = "Val", defaultValue = 0.5, min = 0.0, max = 1.0, realTime=false, step?: number, precision?: integer): number {
  if (!(name in GUIState)) { GUIState[name] = defaultValue; }
  if (!step) { step = 0.01; }
  if (typeof precision === "undefined") {
    precision = 2;
  } else if (precision % 1) { console.error("Slider precision must be an integer"); }
  
  GUIState[name + "Range"] = [min, max];
  // @ts-ignore
  postMessage({ "type": "addSlider", payload: { name: name, default: defaultValue, min: min, max: max, realTime: realTime, step: step, dp: precision } });
  return GUIState[name];
}

/** Creates a button that will trigger `callback` when clicked.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```Button("Yell", ()=>{ console.log("Help!  I've been clicked!"); });```*/
export function Button(name = "Action"): void {
  // @ts-ignore
  postMessage({ "type": "addButton", payload: { name: name } });
}

/** Creates a checkbox that returns true or false.
 * [Source](https://github.com/zalo/CascadeStudio/blob/master/js/CADWorker/CascadeStudioStandardLibrary.js)
 * @example```let currentCheckboxValue = Checkbox("Check?", true);```
 * 
 * `callback` triggers when the button is clicked.*/
export function Checkbox(name = "Toggle", defaultValue = false): boolean {
  if (!(name in GUIState)) { GUIState[name] = defaultValue; }
  // @ts-ignore
  postMessage({ "type": "addCheckbox", payload: { name: name, default: defaultValue } });
  return GUIState[name];
}
