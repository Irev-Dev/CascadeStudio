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
import { pathParse } from 'svg-path-parse'
import {
  CacheOp,
  ComputeHash,
  stringToHash,
  convertToPnt,
  getCallingLocation,
  isArrayLike
} from "./CascadeStudioStandardUtils.js";
import { oc, GUIState, setArgCache } from "./CascadeStudioWorkerState";
import {
  sceneShapes,
  RemoveFromSceneShapes
} from "./CascadeStudioSceneShapesService";
import { fonts } from "./CascadeStudioFontLoader";

export function Box(x, y, z, centered) {
  if (!centered) { centered = false;}
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

export function Sphere(radius) {
  let curSphere = CacheOp(Sphere, { radius }, () => {
    // Construct a Sphere Primitive
    let spherePlane = new oc.gp_Ax2(new oc.gp_Pnt(0, 0, 0), oc.gp.prototype.DZ());
    return new oc.BRepPrimAPI_MakeSphere(spherePlane, radius).Shape();
  });

  sceneShapes.push(curSphere);
  return curSphere;
}

export function Cylinder(radius, height, centered) {
  let curCylinder = CacheOp(Cylinder, { radius, height, centered }, () => {
    let cylinderPlane = new oc.gp_Ax2(new oc.gp_Pnt(0, 0, centered ? -height / 2 : 0), new oc.gp_Dir(0, 0, 1));
    return new oc.BRepPrimAPI_MakeCylinder(cylinderPlane, radius, height).Shape();
  });
  sceneShapes.push(curCylinder);
  return curCylinder;
}

export function Cone(radius1, radius2, height) {
  let curCone = CacheOp(Cone, { radius1, radius2, height }, () => {
    return new oc.BRepPrimAPI_MakeCone(radius1, radius2, height).Shape();
  });
  sceneShapes.push(curCone);
  return curCone;
}

export function Polygon(points, wire) {
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

export function Circle(radius, wire) {
  let curCircle = CacheOp(Circle, { radius, wire }, () => {
    let circle = new oc.GC_MakeCircle(new oc.gp_Ax2(new oc.gp_Pnt(0, 0, 0),
      new oc.gp_Dir(0, 0, 1)), radius).Value();
    let edge = new oc.BRepBuilderAPI_MakeEdge(circle).Edge();
    let circleWire = new oc.BRepBuilderAPI_MakeWire(edge).Wire();
    if (wire) { return circleWire; }
    return new oc.BRepBuilderAPI_MakeFace(circleWire).Face();
  });
  sceneShapes.push(curCircle);
  return curCircle;
}

export function BSpline(inPoints, closed) {
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

function shapeFromCommands(commands, height, hash) {
  let textFaces = [];
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
    textFaces[textFaces.length - 1].hash = stringToHash(hash);
    let textSolid = Rotate([1, 0, 0], -90, Extrude(textFaces[textFaces.length - 1], [0, 0, height]));
    RemoveFromSceneShapes(textSolid);
    return textSolid;
  }
}

export function Text3D(text, size = 36, height = 0.15, fontName = "Consolas") {

  let textArgs = JSON.stringify({ text, size, height, fontName });
  let curText = CacheOp(Text3D, { text, size, height, fontName }, () => {
    if (fonts[fontName] === undefined) { setArgCache({}); console.log("Font not loaded or found yet!  Try again..."); return; }
    let commands = fonts[fontName].getPath(text, 0, 0, size).commands;
    return shapeFromCommands(commands, height*size, textArgs);
  });

  sceneShapes.push(curText);
  return curText;
}

export function ExtrudeSVGPath(svgPath, height) {
  let hash = JSON.stringify({ svgPath, height });
  let svgShape = CacheOp(ExtrudeSVGPath, { svgPath, height }, () => {
    const path = pathParse(svgPath);
    path.absNormalize();
    let commands = [];
    path.result.forEach(({ type, args }) => {
      if (type === "Z") {
        commands.push({ type: "Z" });
        return;
      } else if (["M", "L"].includes(type)) {
        const [x, y] = args;
        commands.push({ type, x, y });
        return;
      } else if (type === "C") {
        const [x1, y1, x2, y2, x, y] = args;
        commands.push({ type, x, x1, x2, y, y1, y2 });
        return;
      }
    });
    return shapeFromCommands(commands, height, hash);
  });
  sceneShapes.push(svgShape);
  return svgShape;
}

// These foreach functions are not cache friendly right now!
export function ForEachSolid(shape, callback) {
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
export function GetSolidFromCompound(shape, index, keepOriginal) {
  if (!shape || shape.ShapeType() > 1 || shape.IsNull()) { console.error("Not a compound shape!"); return shape; }
  if (!index) { index = 0;}

  let sol = CacheOp(
    GetSolidFromCompound,
    { shape, index, keepOriginal },
    () => {
    let innerSolid = {}; let solidsFound = 0;
    ForEachSolid(shape, (i, s) => {
      if (i === index) { innerSolid = new oc.TopoDS_Solid(s); } solidsFound++;
    });
    if (solidsFound === 0) { console.error("NO SOLIDS FOUND IN SHAPE!"); innerSolid = shape; }
    innerSolid.hash = shape.hash + 1;
    return innerSolid;
  });

  if (!keepOriginal) { RemoveFromSceneShapes(shape); }
  sceneShapes.push(sol);

  return sol;
}

export function ForEachShell(shape, callback) {
  let shell_index = 0;
  let anExplorer = new oc.TopExp_Explorer(shape, oc.TopAbs_SHELL);
  for (anExplorer.Init(shape, oc.TopAbs_SHELL); anExplorer.More(); anExplorer.Next()) {
    callback(shell_index++, oc.TopoDS.prototype.Shell(anExplorer.Current()));
  }
}

export function ForEachFace(shape, callback) {
  let face_index = 0;
  let anExplorer = new oc.TopExp_Explorer(shape, oc.TopAbs_FACE);
  for (anExplorer.Init(shape, oc.TopAbs_FACE); anExplorer.More(); anExplorer.Next()) {
    callback(face_index++, oc.TopoDS.prototype.Face(anExplorer.Current()));
  }
}

export function ForEachWire(shape, callback) {
  let wire_index = 0;
  let anExplorer = new oc.TopExp_Explorer(shape, oc.TopAbs_WIRE);
  for (anExplorer.Init(shape, oc.TopAbs_WIRE); anExplorer.More(); anExplorer.Next()) {
    callback(wire_index++, oc.TopoDS.prototype.Wire(anExplorer.Current()));
  }
}
export function GetWire(shape, index, keepOriginal) {
  if (!shape || shape.ShapeType() > 4 || shape.IsNull()) { console.error("Not a wire shape!"); return shape; }
  if (!index) { index = 0;}

  let wire = CacheOp(GetWire, { shape, index, keepOriginal }, () => {
    let innerWire = {}; let wiresFound = 0;
    ForEachWire(shape, (i, s) => {
      if (i === index) { innerWire = new oc.TopoDS_Wire(s); } wiresFound++;
    });
    if (wiresFound === 0) { console.error("NO WIRES FOUND IN SHAPE!"); innerWire = shape; }
    innerWire.hash = shape.hash + 1;
    return innerWire;
  });

  if (!keepOriginal) { RemoveFromSceneShapes(shape); }
  sceneShapes.push(wire);

  return wire;
}

export function ForEachEdge(shape, callback) {
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

export function ForEachVertex(shape, callback) {
  let anExplorer = new oc.TopExp_Explorer(shape, oc.TopAbs_VERTEX);
  for (anExplorer.Init(shape, oc.TopAbs_VERTEX); anExplorer.More(); anExplorer.Next()) {
    callback(oc.TopoDS.prototype.Vertex(anExplorer.Current()));
  }
}

export function FilletEdges(shape, radius, edgeList, keepOriginal) { 
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

export function ChamferEdges(shape, distance, edgeList, keepOriginal) { 
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

export function Transform(translation, rotation, scale, shapes) {
  return CacheOp(Transform, { translation, rotation, scale, shapes }, () => {
    if (typeof shapes !== "undefined") {
      // Create the transform gizmo and add it to the scene
      postMessage({ "type": "createTransformHandle", payload: { translation: translation, rotation: rotation, scale: scale, lineAndColumn: getCallingLocation() } });
      // Transform the Object(s)
      return Translate(translation, Rotate(rotation[0], rotation[1], Scale(scale, shapes)));
    } else {
      // Create the transform gizmo and add it to the scene
      postMessage({ "type": "createTransformHandle", payload: { translation: [0, 0, 0], rotation: [[0, 1, 0], 1], scale: 1, lineAndColumn: getCallingLocation() } });
      return translation; // The first element will be the shapes
    }
  });
}

export function Translate(offset, shapes, keepOriginal) {
  let translated = CacheOp(Translate, { offset, shapes, keepOriginal }, () => {
    let transformation = new oc.gp_Trsf();
    transformation.SetTranslation(new oc.gp_Vec(offset[0], offset[1], offset[2]));
    let translation = new oc.TopLoc_Location(transformation);
    if (!isArrayLike(shapes)) {
      return new oc.TopoDS_Shape(shapes.Moved(translation));
    } else if (shapes.length >= 1) {      // Do the normal translation
      let newTrans = [];
      for (let shapeIndex = 0; shapeIndex < shapes.length; shapeIndex++) {
        newTrans.push(new oc.TopoDS_Shape(shapes[shapeIndex].Moved(translation)));
      }
      return newTrans;
    }
  });

  if (!keepOriginal) { RemoveFromSceneShapes(shapes); }
  sceneShapes.push(translated);

  return translated;
}

export function Rotate(axis, degrees, shapes, keepOriginal) {
  let rotated = null;
  if (degrees === 0) {
    rotated = new oc.TopoDS_Shape(shapes);
  } else {
    rotated = CacheOp(Rotate, { axis, degrees, shapes, keepOriginal }, () => {
      let newRot;
      let transformation = new oc.gp_Trsf();
      transformation.SetRotation(
        new oc.gp_Ax1(new oc.gp_Pnt(0, 0, 0), new oc.gp_Dir(
          new oc.gp_Vec(axis[0], axis[1], axis[2]))), degrees * 0.0174533);
      let rotation = new oc.TopLoc_Location(transformation);
      if (!isArrayLike(shapes)) {
        newRot = new oc.TopoDS_Shape(shapes.Moved(rotation));
      } else if (shapes.length >= 1) {      // Do the normal rotation
        for (let shapeIndex = 0; shapeIndex < shapes.length; shapeIndex++) {
          shapes[shapeIndex].Move(rotation);
        }
      }
      return newRot;
    });
  }
  if (!keepOriginal) { RemoveFromSceneShapes(shapes); }
  sceneShapes.push(rotated);
  return rotated;
}

export function Scale(scale, shapes, keepOriginal) {
  let scaled = CacheOp(Scale, { scale, shapes, keepOriginal }, () => {
    let transformation = new oc.gp_Trsf();
    transformation.SetScaleFactor(scale);
    let scaling = new oc.TopLoc_Location(transformation);
    if (!isArrayLike(shapes)) {
      return new oc.TopoDS_Shape(shapes.Moved(scaling));
    } else if (shapes.length >= 1) {      // Do the normal rotation
      let newScale = [];
      for (let shapeIndex = 0; shapeIndex < shapes.length; shapeIndex++) {
        newScale.push(new oc.TopoDS_Shape(shapes[shapeIndex].Moved(scaling)));
      }
      return newScale;
    }
  });

  if (!keepOriginal) { RemoveFromSceneShapes(shapes); }
  sceneShapes.push(scaled);

  return scaled;
}

// TODO: These ops can be more cache optimized since they're multiple sequential ops
export function Union(objectsToJoin, keepObjects, fuzzValue, keepEdges) {
  if (!fuzzValue) { fuzzValue = 0.1; }
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

export function Difference(mainBody, objectsToSubtract, keepObjects, fuzzValue = 0.1, keepEdges) {
  const args = {
    mainBody,
    objectsToSubtract,
    keepObjects,
    fuzzValue,
    keepEdges,
  };
  let curDifference = CacheOp(
    Difference,
    args,
    () => {
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

export function Intersection(objectsToIntersect, keepObjects, fuzzValue, keepEdges) {
  if (!fuzzValue) { fuzzValue = 0.1; }
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

export function Extrude(face, direction, keepFace) {
  let curExtrusion = CacheOp(Extrude, { face, direction, keepFace }, () => {
    return new oc.BRepPrimAPI_MakePrism(face,
      new oc.gp_Vec(direction[0], direction[1], direction[2])).Shape();
  });
  
  if (!keepFace) { RemoveFromSceneShapes(face); }
  sceneShapes.push(curExtrusion);
  return curExtrusion;
}

export function RemoveInternalEdges(shape, keepShape) {
  let cleanShape = CacheOp(RemoveInternalEdges, { shape, keepShape }, () => {
    let fusor = new oc.ShapeUpgrade_UnifySameDomain(shape);
    fusor.Build();
    return fusor.Shape();
  });
  
  if (!keepShape) { RemoveFromSceneShapes(shape); }
  sceneShapes.push(cleanShape);
  return cleanShape;
}

export function Offset(shape, offsetDistance, tolerance, keepShape) {
  if (!shape || shape.IsNull()) { console.error("Offset received Null Shape!"); }
  if (!tolerance) { tolerance = 0.1; }
  if (offsetDistance === 0.0) { return shape; }
  let curOffset = CacheOp(
    Offset,
    { shape, offsetDistance, tolerance, keepShape },
    () => {
    let offset = null;
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

export function Revolve(shape, degrees, direction, keepShape, copy) {
  if (!degrees  ) { degrees   = 360.0; }
  if (!direction) { direction = [0, 0, 1]; }
  let curRevolution = CacheOp(
    Revolve,
    { shape, degrees, direction, keepShape, copy },
    () => {
    if (degrees >= 360.0) {
      return new oc.BRepPrimAPI_MakeRevol(shape,
        new oc.gp_Ax1(new oc.gp_Pnt(0, 0, 0),
          new oc.gp_Dir(direction[0], direction[1], direction[2])),
        copy).Shape();
    } else {
      return new oc.BRepPrimAPI_MakeRevol(shape,
        new oc.gp_Ax1(new oc.gp_Pnt(0, 0, 0),
          new oc.gp_Dir(direction[0], direction[1], direction[2])),
        degrees * 0.0174533, copy).Shape();
    }
  });
  
  if (!keepShape) { RemoveFromSceneShapes(shape); }
  sceneShapes.push(curRevolution);
  return curRevolution;
}

export function RotatedExtrude(wire, height, rotation, keepWire) {
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

export function Loft(wires, keepWires) {
  let curLoft = CacheOp(Loft, { wires, keepWires }, () => {
    let pipe = new oc.BRepOffsetAPI_ThruSections(true);

    // Construct a Loft that passes through the wires
    wires.forEach((wire) => { pipe.AddWire(wire); });

    pipe.Build();
    return new oc.TopoDS_Shape(pipe.Shape());
  });

  wires.forEach((wire) => {
    if (!keepWires) { RemoveFromSceneShapes(wire); }
  });
  sceneShapes.push(curLoft);
  return curLoft;
}

export function Pipe(shape, wirePath, keepInputs) {
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
export function Sketch(startingPoint) {
  this.currentIndex = 0;
  this.faces        = [];
  this.wires        = [];
  this.firstPoint   = new oc.gp_Pnt(startingPoint[0], startingPoint[1], 0);
  this.lastPoint    = this.firstPoint;
  this.wireBuilder  = new oc.BRepBuilderAPI_MakeWire();
  this.fillets      = [];
  this.argsString = ComputeHash(Sketch, { startingPoint }, true);

  // Functions are: BSplineTo, Fillet, Wire, and Face
  this.Start = function (startingPoint) {
    this.firstPoint  = new oc.gp_Pnt(startingPoint[0], startingPoint[1], 0);
    this.lastPoint   = this.firstPoint;
    this.wireBuilder = new oc.BRepBuilderAPI_MakeWire();
    this.argsString += ComputeHash(this.Start, { startingPoint }, true);
    return this;
  }

  this.End = function (closed, reversed) {
    this.argsString += ComputeHash(this.End, { closed, reversed }, true);

    if (closed &&
       (this.firstPoint.X() !== this.lastPoint.X() ||
        this.firstPoint.Y() !== this.lastPoint.Y())) {
      this.LineTo(this.firstPoint);
    }

    let wire = this.wireBuilder.Wire();
    if (reversed) { wire = wire.Reversed(); }
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
    face.hash = stringToHash(this.argsString);
    this.faces.push(face);
    return this;
  }

  this.Wire = function (reversed) {
    this.argsString += ComputeHash(this.Wire, { reversed }, true);
    //let wire = this.wires[this.wires.length - 1];
    this.applyFillets();
    this.faces[this.faces.length - 1].hash = stringToHash(this.argsString);
    let wire = GetWire(this.faces[this.faces.length - 1]);
    if (reversed) { wire = wire.Reversed(); }
    sceneShapes.push(wire);
    return wire;
  }
  this.Face = function (reversed) {
    this.argsString += ComputeHash(this.Face, { reversed }, true);
    this.applyFillets();
    let face = this.faces[this.faces.length - 1];
    if (reversed) { face = face.Reversed(); }
    face.hash = stringToHash(this.argsString);
    sceneShapes.push(face);
    return face;
  }

  this.applyFillets = function () {
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

  this.AddWire = function (wire) {
    this.argsString += ComputeHash(this.AddWire, { wire }, true);
    // This adds another wire (or edge??) to the currently constructing shape...
    this.wireBuilder.Add(wire);
    if (endPoint) { this.lastPoint = endPoint; } // Yike what to do here...?
    return this;
  }

  this.LineTo = function (nextPoint) {
    this.argsString += ComputeHash(this.LineTo, { nextPoint }, true);
    let endPoint = null;
    if (nextPoint.X) {
      if (this.lastPoint.X() === nextPoint.X() &&
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

  this.ArcTo = function (pointOnArc, arcEnd) {
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
  this.BezierTo = function (bezierControlPoints) {
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
  this.BSplineTo = function (bsplinePoints) {
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

  this.Fillet = function (radius) {
    this.argsString += ComputeHash(this.Fillet, { radius }, true);
    this.fillets.push({ x: this.lastPoint.X(), y: this.lastPoint.Y(), radius: radius });
    return this;
  }

  this.Circle = function (center, radius, reversed) {
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
    face.hash = stringToHash(this.argsString);
    this.faces.push(face);
    return this;
  }
}

function SaveFile(filename, fileURL) {
  postMessage({
    "type": "saveFile",
    payload: { filename: filename, fileURL: fileURL }
  });
}

export function Slider(name = "Val", defaultValue = 0.5, min = 0.0, max = 1.0, realTime=false, step, precision) {
  if (!(name in GUIState)) { GUIState[name] = defaultValue; }
  if (!step) { step = 0.01; }
  if (typeof precision === "undefined") {
    precision = 2;
  } else if (precision % 1) { console.error("Slider precision must be an integer"); }
  
  GUIState[name + "Range"] = [min, max];
  postMessage({ "type": "addSlider", payload: { name: name, default: defaultValue, min: min, max: max, realTime: realTime, step: step, dp: precision } });
  return GUIState[name];
}

export function Button(name = "Action") {
  postMessage({ "type": "addButton", payload: { name: name } });
}

export function Checkbox(name = "Toggle", defaultValue = false) {
  if (!(name in GUIState)) { GUIState[name] = defaultValue; }
  postMessage({ "type": "addCheckbox", payload: { name: name, default: defaultValue } });
  return GUIState[name];
}
