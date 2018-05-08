

var PhotoMapping = (function () {

   

    var scene = new THREE.Scene();
    var photonScene = new THREE.Scene();

    var photonObjects = [];
    
    var Random = function (min, max) {

        var ret = new THREE.Vector3();

        var minx = min.x;
        var miny = min.y;
        var minz = min.z;

        var maxx = max.x;
        var maxy = max.y;
        var maxz = max.z;

        ret.x = Math.random() * (max.x - min.x) + min.x;
        ret.y = Math.random() * (max.y - min.y) + min.y;
        ret.z = Math.random() * (max.z - min.z) + min.z;

        return ret;

    }

    var photonTarget = new THREE.WebGLRenderTarget(256, 256);
    photonTarget.format = THREE.RGBFormat;
    
    Array.prototype.last = function () {
        return this[this.length - 1];
    }
    
    function materialCustom() {

        return new THREE.ShaderMaterial({

            uniforms: {
            
                color: { type: "v3", value: new THREE.Vector3(Math.random(), Math.random(), Math.random()) }, // single Color
                test : { type: "t", value: photonTarget.texture}
            },

            vertexShader: document.getElementById('vertex').textContent,

            fragmentShader: document.getElementById('frag').textContent

        });

    }

    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, 700);
    var buffer = new ArrayBuffer(window.innerWidth * 700);
    var data = new Float32Array(window.innerWidth * 700)


    var finalSize = new THREE.Vector2(window.innerWidth, 700);
    var photonSize = new THREE.Vector2(64, 64);
    $("#display-scene").append(renderer.domElement);
  

    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    
    var geometry = new THREE.BoxBufferGeometry(1, 1, 1)
    var material = new materialCustom();
   
    var cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, -1, -2)


    var sphere = new THREE.Mesh(new THREE.SphereBufferGeometry(2, 32, 32), new materialCustom());
    sphere.position.set(2, 3, 1)

    photonObjects.push(cube)
    scene.add(cube);
    photonObjects.push(sphere)
    scene.add(sphere)

    var sphere = new THREE.Mesh(new THREE.SphereBufferGeometry(0.5, 32, 32), new materialCustom());
    sphere.position.set(-0.5, 1, -3)
    photonObjects.push(sphere)
    scene.add(sphere)
    camera.position.z = 5;
    
    //photonTarget.depthBuffer = false;
    //photonTarget.stencilBuffer = false;


    //Create a room thing
    var mat = new THREE.MeshBasicMaterial();
    var floor = new THREE.BoxBufferGeometry(10, 0.5, 10);
    var roof = new THREE.BoxBufferGeometry(10, 0.5, 10);
    var wallleft = new THREE.BoxBufferGeometry(0.5, 8, 10);
    var wallright = new THREE.BoxBufferGeometry(0.5, 8, 10);

    var mesh1 = new THREE.Mesh(floor, new materialCustom());
    var mesh2 = new THREE.Mesh(roof, new materialCustom());
    mesh2.position.y = 8;
    var mesh3 = new THREE.Mesh(wallleft, new materialCustom());
    mesh3.position.set(-5, 4, 0)
    var mesh4 = new THREE.Mesh(wallright, new materialCustom());
    mesh4.position.set(5, 4, 0)

    scene.add(mesh1, mesh2, mesh3, mesh4)
    photonObjects.push(mesh1, mesh2, mesh3, mesh4);

    var photonRenderer = new THREE.WebGLRenderer();
    photonRenderer.setSize(256, 256);
    $("#display-scene").append(photonRenderer.domElement);

    var myworker = new Worker("../scripts/RayWorker.js");
   

    var dirlight = {
        dir: new THREE.Vector3(0.1, -0.5, -1).normalize(),
        cam: new THREE.OrthographicCamera(-10, 10, 10, -10, 0, 500)
    }

    var p = new THREE.Vector3().sub(dirlight.dir).multiplyScalar(40);
    dirlight.cam.position.set(p.x, p.y, p.z);
    dirlight.cam.lookAt(dirlight.cam.position.clone().add(dirlight.dir));

    var camhelper = new THREE.CameraHelper(dirlight.cam);
    scene.add(dirlight.cam)
    dirlight.cam.updateProjectionMatrix();
    scene.add(camhelper);


    var chunksize = 10;
    var chunk = 0;
    var done = false;
    var caster = new THREE.Raycaster();
    caster.near = 0.5;
    caster.far = 400;
    caster.linePrecision = 0;
    var mat = new THREE.MeshBasicMaterial();
    
    var hits = [];

    
    var totalPhotons = {
        direct: 50000,
        bounces: 4
    };

    var currentPhotons = {
        direct: 0,
        reflected: 0,
        shadow: 0,
        bounce: 0
    }


    var done = false;
   
    var geom = new THREE.Geometry();
    var colors = [];

    var directRays = function (start, dir) {
        caster.set(start, dir);

        var intersects = caster.intersectObjects(photonObjects);

        if (intersects.length > 0) {
            currentPhotons.direct++;
            geom.vertices.push(intersects[0].point);
            colors.push(new THREE.Color(1.0, 1.0, 1.0));

            return intersects[0];
        }
        
        return false;
    }

    var shadowRays = function (hit) {
        currentPhotons.shadow++;
        geom.vertices.push(hit.point);
        colors.push(new THREE.Color(0.0, 0.0, 0.05));
    }

    var reflectionRays = function (hit) {

        var n = hit.face.normal.normalize();
        var d = dirlight.dir;
        var hitcolor = hit.object.material.uniforms.color.value;
        var ddotn = n.clone().dot(d);
        ddotn = n.clone().multiplyScalar(2 * ddotn);
        ddotn = d.clone().sub(ddotn);
        var start = hit.point.clone();

        caster.set(start, ddotn);

        var intersects = caster.intersectObjects(photonObjects, true);

        //Reflection light bounce 1
        for (var i = 0; i < intersects.length; i++) {

            if (intersects[i].point.distanceTo(start) > 0.01) {
                currentPhotons.perStage
                geom.vertices.push(intersects[i].point);
                colors.push(new THREE.Color(hitcolor.x, hitcolor.y, hitcolor.z));
                return intersects[i];
            }
        }
    }

    var trace = function (debug) {


        

        var photons = 50;
        var volume = new THREE.Vector3();

        for (var i = 0; i < photonObjects.length; i++) {
            var size = new THREE.Box3().setFromObject(photonObjects[i]).getSize();
            volume.add(size.clone());
        }

        for (var c = 0; c < photonObjects.length; c++) {
            var cchild = photonObjects[c];
            var box = new THREE.Box3().setFromObject(cchild);
            var size = box.getSize();
            //var boxhelper = new THREE.Box3Helper(box, 0x0000ff);
            //photonScene.add(boxhelper)
            var counter = 0;
            var invlight = new THREE.Vector3().sub(dirlight.dir)
            var limit = size.clone().divide(volume).multiplyScalar(totalPhotons.direct);

            while (counter < Math.cbrt(limit.x) * Math.cbrt(limit.y) * Math.cbrt(limit.z)) {

                var targetpos = Random(box.min.clone(), box.max.clone());

            var start = targetpos.clone().add(invlight.clone().multiplyScalar(40))

            var hits = directRays(start, dirlight.dir);
            

             //Direct light should be white or lightcolor
            if (hits && currentPhotons.direct < totalPhotons.direct) {

                //Shadow color should be black or close to
                if (hits[1]) {
                    shadowRays(intersects[1]);
                }


                    var hits = reflectionRays(hits);

                    for (var i = 0; i < totalPhotons.bounces - 1; i++) {
                        
                        if (hits) {
                            hits = reflectionRays(hits);
                        }
                    }
             
            }
            else {
                done = true;
            }

            counter++;
            }
        }

        createIrradianceMap();

    }

    function Photon() {

        var position = new THREE.Vector3();
        var color = new THREE.Color(1, 1, 1);
        
        return{
            position: position,
            color: color
        }
    }

    var size = 64;
    var voxelSize = 2;
    var dim = Math.pow(size / voxelSize, 3)
    var voxels = new Array(size * size * size);

    var getDistances = function(pos, id, points) {


        var distance = 0;
        console.log(pos)
        for (var p = 0; p < points.vertices.length; p++) {
            var point = points.vertices[p];

            distance += point.distanceTo(pos);
            
        }

        return distance / points.vertices.length;

        //for (var d = 0; d < distances.length; d++) {

        //}
    }

    var expand = function (voxPos, foundPoints, mult, wpos) {

        var vecs = [voxPos.clone().add(new THREE.Vector3(mult, 0, 0)),
        voxPos.clone().add(new THREE.Vector3(-mult, 0, 0)),
        voxPos.clone().add(new THREE.Vector3(mult, mult, 0)),
        voxPos.clone().add(new THREE.Vector3(-mult, -mult, 0)),
        voxPos.clone().add(new THREE.Vector3(mult, -mult, 0)),
        voxPos.clone().add(new THREE.Vector3(-mult, mult, 0)),

        voxPos.clone().add(new THREE.Vector3(mult, 0, mult)),
        voxPos.clone().add(new THREE.Vector3(-mult, 0, -mult)),
        voxPos.clone().add(new THREE.Vector3(mult, mult, mult)),
        voxPos.clone().add(new THREE.Vector3(-mult, -mult, -mult)),
        voxPos.clone().add(new THREE.Vector3(mult, -mult, mult)),
        voxPos.clone().add(new THREE.Vector3(-mult, mult, -mult))]

        debugger;
        for (var v = 0; v < vecs.length; v++) {
            addPoints(vecs[v], foundPoints);
        }

        if (foundPoints.length > 10) {
            debugger;
            return sortPoints(foundPoints, wpos);
        }
        else {
            expand(voxPos, foundPoints, mult + 1, wpos);
        }
    }

    var sortPoints = function (foundPoints, wpos) {

        foundPoints.sort(function (a, b) {
            return wpos.distanceTo(a.pos) - wpos.distanceTo(b.pos);
        });

        return foundPoints;
    }

    var addPoints = function (voxPos, foundPoints, wpos) {
        var id = getId(voxPos);
        for (var p = 0; p < voxels[id].length; p++) {

            foundPoints.push(voxels[id][p]);
        }

        return foundPoints;

    }

    var gatherPoints = function (worldpos, voxPos, foundPoints) {

        foundPoints = addPoints(voxPos, foundPoints);
        
        if (foundPoints.length > 10) {
            debugger;
            return sortPoints(foundPoints, worldpos);
        }
        else {
            foundPoints = expand(voxPos, foundPoints, 1, worldpos)
        }
        
        return foundPoints;
    }

    var getVoxPos = function (pos) {
        var ret = pos.clone();
        ret.addScalar(32)

        return ret;
    }

    var getId = function(pos){
        var id = Math.floor(pos.x + size * (pos.y + size * pos.z));

        return id;
    }

    //Gather all photons
    var createVoxelTree = function (points) {
       
        var geom = points.geometry;
        
        for (var oi = 0; oi < voxels.length; oi++) {
            voxels[oi] = [];
        }
       
        for (var u = 0; u < points.geometry.vertices.length; u++) {
            var wpos = points.geometry.vertices[u];
            var pos = getVoxPos(wpos);
            var id = getId(pos);
            
            
            voxels[id].push({ pos: wpos, col: points.geometry.colors[u] })
        }


        for (var p = 0; p < photonObjects.length; p++) {
            var obj = photonObjects[p];
            debugger;
            if (obj.geometry.isBufferGeometry) {
                var balle = new Float32Array(obj.geometry.attributes.position.count * 3).fill(0)
                obj.geometry.addAttribute("photons", new THREE.Float32BufferAttribute(balle, 3));

                obj.geometry.attributes.photons.needsUpdate = true;
                
                for (var q = 0; q < obj.geometry.attributes.position.count; q++) {

                    var array = obj.geometry.attributes.position.array;
                    var wpos = new THREE.Vector3(array[q], array[q + 1], array[q + 2]);
                    var pos = getVoxPos(wpos);
                    var id = getId(pos);

                    var color = gatherPoints(wpos, pos, []);

                    if (!color) {
                        color = [{pos: wpos, col: new THREE.Color(0, 0, 0)}]
                    }
                    debugger;
                    console.log(color)
                    
                    var final = new THREE.Color(0, 0, 0);

                    for (var ji = 0; ji < color.length; ji++) {
                        debugger;
                        var kol = color[ji].col.clone();
                       
                        final.add(kol);
                    }
                    
                    
                    obj.geometry.attributes.photons.array[q * 3] = final.r * (22-color.length);
                    obj.geometry.attributes.photons.array[q * 3 + 1] = final.g * (22 - color.length);
                    obj.geometry.attributes.photons.array[q * 3 + 2] = final.b * (22 - color.length);
                }
            }
        }
    }

    var createIrradianceMap = function () {
        //scene.add(new THREE.PointCloud(geom, new THREE.PointCloudMaterial()));
        var mat = new THREE.PointsMaterial()
        mat.size = 0.01;
        mat.vertexColors = THREE.VertexColors;
        geom.colors = colors;
        geom.colorsNeedUpdate = true;
        var points = new THREE.Points(geom, mat)

        //geom is the points cloud
        createVoxelTree(points);
    }

    var photonCounter = $("#numberphotons")
    var mscounter = $("#ms")
    var mapcounter = $("#genMap")
    

    $(document).keydown(function (e) {

        if (done) {
            totalPhotons = 0;
            
        }

        if (e.key == "e") {
            //createIrradianceMap();
            
        }
    })

    var frameCounter = 0;

    var startmap = performance.now();

    trace();
    var animate = function () {

        var starttime = performance.now();

        requestAnimationFrame(animate);
        photonRenderer.render(photonScene, camera);
        renderer.render(photonScene, camera, photonTarget);
        frameCounter++;

        //photonRenderer.render(scene, dirlight.cam);
       
        renderer.render(scene, camera);
        var endtime = performance.now();

        $(mscounter).text(endtime - starttime + " ms");
    };

    animate();



    return {

    }


}())