

var standardFrag;
var standardVert;

var standardCreatureFrag;
var standardCreatureVert;

var ppFrag;
var ppVert;

$.when(

    $.get("../Shaders/standard_frag.glsl", function (data) {
        standardFrag = data;

    }),

    $.get("../Shaders/standard_vert.glsl", function (data) {
        standardVert = data;
    }),

    $.get("../Shaders/standard_creature_frag.glsl", function (data) {
        standardCreatureFrag = data;

    }),

    $.get("../Shaders/standard_creature_vert.glsl", function (data) {
        standardCreatureVert = data;
    }),

    $.get("../Shaders/postProcess_frag.glsl", function (data) {
        ppFrag = data;
    }),

    $.get("../Shaders/postProcess_vert.glsl", function (data) {
        ppVert = data;
    })

    

).then(function () {

    var lockLight = false;
    var currentPass = 0;


    function Light() {
        this.position = new THREE.Vector3();
        this.color = new THREE.Vector4(0.93, 0.93, 0.84, 1); //rgb color, a Strength
        this.direction = new THREE.Vector3();
        this.type = 0 //0 undefined, 1 directional, 2 point, 3 spot

        return this;
    }


    var Lights = [];



    for (var l = 0; l < 32; l++) {
        Lights.push(new Light())
    }

    var lastLightId = 0;
    var updateLight = false;

    function materialCustom() {

        return new THREE.ShaderMaterial({

            uniforms: {
                pass: { value: currentPass },
                colorMap: {value:[
                    new THREE.TextureLoader().load("../Textures/dirt.jpg")
                ]
                },
                fadeMap: {
                    value: [
                        new THREE.TextureLoader().load("../Textures/fadeBottom.jpg"),
                        new THREE.TextureLoader().load("../Textures/fadeTop.jpg"),
                        new THREE.TextureLoader().load("../Textures/fadeLeft.jpg"),
                        new THREE.TextureLoader().load("../Textures/fadeRight.jpg")
                    ]
                },
                normalMap: { value: new THREE.TextureLoader().load("../voxel_normal.jpg") }
            },

            vertexShader: standardVert,

            fragmentShader: standardFrag

        });

    }

    function materialCreaturesCustom() {
        return new THREE.ShaderMaterial({
            
            uniforms: {
                pass: { value: currentPass },
                colorMap: {
                    value: [
                        new THREE.TextureLoader().load("../Textures/dirt.jpg")
                    ]
                },
                fadeMap: {
                    value: [
                        new THREE.TextureLoader().load("../Textures/fadeBottom.jpg"),
                        new THREE.TextureLoader().load("../Textures/fadeTop.jpg"),
                        new THREE.TextureLoader().load("../Textures/fadeLeft.jpg"),
                        new THREE.TextureLoader().load("../Textures/fadeRight.jpg")
                    ]
                },
                normalMap: { value: new THREE.TextureLoader().load("../voxel_normal.jpg") },
                visible: {value: 1.0}
            },

            vertexShader: standardCreatureVert,

            fragmentShader: standardCreatureFrag

        })

    }

    var fsQuad = new THREE.BufferGeometry();

    var positions = [];

    positions.push(
        -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0,
        -1.0, 1.0, 0.0,
        -1.0, 1.0, 0.0,
        1.0, -1.0, 0.0,
        1.0, 1.0, 0.0);



    fsQuad.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    Array.prototype.last = function () {
        return this[this.length - 1];
    }


    THREE.Scene.prototype.channels = {}
    THREE.Object3D.prototype.Physics = {
        velocity: new THREE.Vector2(0, 0),
        mass: 1,
        acceleration: new THREE.Vector2(0, -9.8)
    }

    THREE.Scene.prototype.forEachChannel = function (func) {

        for (prop in scene.channels) {

            var channel = scene.channels[prop];

            for (var m = 0; m < channel.length; m++) {

                func(channel[m]);
            }

        }

    }

    THREE.Scene.prototype.insert = function (object, channel) {

        for (var i = 0; i < channel.length; i++) {
            var cchannel = channel[i]
            
            if (!this.channels[cchannel]) {
                this.channels[cchannel] = [];
            }

            this.channels[cchannel].push(object)
        }

        this.add(object)
    }

    var scene = new THREE.Scene();

    var sun = {
        dir: new THREE.Vector2(-2, -2).normalize(),
        color: new THREE.Vector4(1, 1, 1, 1)
    }

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

    var mscounter = $("#ms")

    //var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
    var camera = new THREE.OrthographicCamera(-10, 10, 5, -5, 0, 1000)


    scene.add(camera)
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(1400, 700);
    //renderer.setClearColor(0x000000)

    var display = $("#display-scene");
    display.append(renderer.domElement);

    
    camera.position.z = 5;
    camera.zoom = 0.5;

    var debugDepth = $("#display-depth")
    var debugLight = $("#display-light")
    var debugDepthRenderer = new THREE.WebGLRenderer();
    var debugLightRenderer = new THREE.WebGLRenderer();
    debugDepthRenderer.setSize(200, 200);
    debugLightRenderer.setSize(200, 200);
    debugDepth.append(debugDepthRenderer.domElement);
    debugLight.append(debugLightRenderer.domElement);


    //new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, type: THREE.FloatType });
    var depthTarget = new THREE.WebGLRenderTarget(display.width(), display.height());
    var lightTarget = new THREE.WebGLRenderTarget(display.width(), display.height());
    var colorTarget = new THREE.WebGLRenderTarget(display.width(), display.height());


    var scene2 = new THREE.Scene();
    scene2.add(camera)


    var ditherData = [
        0, 32,  8, 40,  2, 34, 10, 42, 
        48, 16, 56, 24, 50, 18, 58, 26,
        12, 44,  4, 36, 14, 46,  6, 38,
        60, 28, 52, 20, 62, 30, 54, 22,
        3, 35, 11, 43,  1, 33,  9, 41,
        51, 19, 59, 27, 49, 17, 57, 25,
        15, 47,  7, 39, 13, 45,  5, 37,
        63, 31, 55, 23, 61, 29, 53, 21];

    var clouds = new THREE.TextureLoader().load("../clouds.jpg");
    clouds.wrapS = THREE.RepeatWrapping;
    clouds.wrapT = THREE.RepeatWrapping;

    var postProcessMaterial = new THREE.ShaderMaterial({

        uniforms: {
            depthMap: { value: depthTarget.texture },
            lightMap: { value: lightTarget.texture },
            colorMap: { value: colorTarget.texture },
            ditherMap: { value: new THREE.DataTexture(ditherData, 8, 8) },
            fogMap: {value: clouds},
            lights: { value: Lights },
            time: { value: 0.0},
            resolution: { value: new THREE.Vector2() },
            worldRect: { value: new THREE.Vector4() },
            cameraPosition: {value: camera.position},
            mousePos: { value: new THREE.Vector2() }
        },

        vertexShader: ppVert,

        fragmentShader: ppFrag

    });


    var fsQuadObject = new THREE.Mesh(fsQuad, postProcessMaterial);
    fsQuadObject.frustumCulled = false;
    scene2.add(fsQuadObject)

    var worldInfo = {
        size: 1024,
        region: {
            size: 64,
            
        },
        regions: []
    }
    

    function makeNoise(x, y, seed) {
        var pn = new Perlin(seed);
        var f = 0;

        var noise = pn.noise(x / 10, y / 10, 0);
        var yf = 1 - (y / 255) + 0.2;

        //f = rand * yf;
        f = noise * yf;


        return f;
    }

    function generateWorld() {

        var regions = worldInfo.size / worldInfo.region.size;

        //Setup the regions on the cpu to allow for picking and deleting etc
        for (var r = 0; r < regions; r++) {

            worldInfo.regions[r] = [];

            for (var y = 0; y < worldInfo.region.size; y++) {

                worldInfo.regions[r].push([])

                for (var x = 0; x < worldInfo.region.size; x++) {

                    var voxel = {
                        type: 0,
                        visible: false,
                        position: new THREE.Vector2(x, y),
                        bounds: new THREE.Box2(new THREE.Vector2(x, y), new THREE.Vector2(x + 1, y + 1))
                    }

                    worldInfo.regions[r][y].push(voxel)


                }
            }
        }



        //var reg = worldInfo.regions[0];

        for (var re = 0; re < worldInfo.regions.length; re++) {

            var reg = worldInfo.regions[re];

            var mat = new materialCustom();

            var geom = new THREE.InstancedBufferGeometry();
            var pg = new THREE.PlaneBufferGeometry(1, 1);
            //For each region create the plane
            var positions = [];
            positions.push(1, 0, 0)
            positions.push(1, 1, 0)
            positions.push(0, 1, 0)

            positions.push(0, 1, 0)
            positions.push(0, 0, 0)
            positions.push(1, 0, 0)

            var normals = [];

            normals.push(0, 0, 1);
            normals.push(0, 0, 1);
            normals.push(0, 0, 1);
            normals.push(0, 0, 1);
            normals.push(0, 0, 1);
            normals.push(0, 0, 1);

            //Add positions and normals for each of the 6 verts
            geom.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geom.addAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

            var colors = [];
            var offsets = [];
            var visible = []
            var types = [];
            var instances = 0;

            
            for (var y = 0; y < reg.length; y++) {

                for (var x = 0; x < reg[y].length; x++) {

                    var posx = (re % Math.sqrt(regions)) * worldInfo.region.size + x;
                    var posy = Math.floor(re / Math.sqrt(regions)) * worldInfo.region.size + y
                    var p = new THREE.Vector2(posx, posy);

                    var color;

                    var noise = makeNoise(posx, posy, "12398238");
                    var color = new THREE.Color(noise, noise, noise)

                    colors.push(color.r, color.g, color.b, 1)
                    offsets.push(p.x, p.y, 0)
                    instances++;

                    if (noise > 0.5) {
                        visible.push(true)
                        reg[y][x].visible = true;
                    }
                    else {
                        visible.push(false)
                    }

                    types.push(0);
                }
            }

            geom.addAttribute('offset', new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3));
            geom.addAttribute('visible', new THREE.InstancedBufferAttribute(new Int8Array(visible), 1));
            geom.addAttribute('type', new THREE.InstancedBufferAttribute(new Int8Array(types), 1));
            geom.addAttribute('color', new THREE.InstancedBufferAttribute(new Float32Array(colors), 4));
            geom.maxInstancedCount = instances * 1;
            var m = new THREE.Mesh(geom, mat);
            scene.insert(m, ["voxel"]);
            m.frustumCulled = false;
        }

        var box = new THREE.Box3().setFromObject(m)
        scene.add(new THREE.Box3Helper(box, 0xff0000))

    }

    renderer.setClearColor(0xffffff);

    var frames = 0;
    var display = $("#display-scene");
    var animate = function () {

        var starttime = performance.now();
        requestAnimationFrame(animate);

        if (player) {
            camera.position.x = player.position.x;
            camera.position.y = player.position.y;
        }
     

        var nResolution = new THREE.Vector2(display.width(), display.height()).floor();

        if (nResolution.x != fsQuadObject.material.uniforms.resolution.value.x || nResolution.y != fsQuadObject.material.uniforms.resolution.value.y ) {

            fsQuadObject.material.uniforms.resolution.value = nResolution;
            renderer.setSize(nResolution.x, nResolution.y);
            lightTarget.setSize(nResolution.x, nResolution.y);
            depthTarget.setSize(nResolution.x, nResolution.y);
            colorTarget.setSize(nResolution.x, nResolution.y);
        }
        

       
        postProcessMaterial.uniforms.worldRect.value = getWorldRect();
        postProcessMaterial.uniforms.time.value = performance.now();
        postProcessMaterial.uniforms.cameraPosition.value = camera.position;
        document.getElementById("worldpos").innerText = "x: "
            + postProcessMaterial.uniforms.worldRect.value.x
            + " y: "
            + postProcessMaterial.uniforms.worldRect.value.y
            + " zoom: " + camera.zoom;
        
        switch (frames) {
            case 0:

                frames++;
                currentPass = 0
                scene.forEachChannel(function (object) {

                    object.traverse(function (child) {

                        if (child.type == "Mesh") {
                            child.material.uniforms.pass.value = 0;
                        }
                    })
                    //object.material.uniforms.pass.value = 0
                })
                
                renderer.render(scene, camera, depthTarget);
                debugDepthRenderer.render(scene, camera);
                break;

            case 1:
                currentPass = 1

                scene.forEachChannel(function (object) {

                    object.traverse(function (child) {

                        if (child.type == "Mesh") {
                            child.material.uniforms.pass.value = 1;
                        }
                    })

                })

                renderer.render(scene, camera, colorTarget);
                frames++;
                break;
            case 2:
                currentPass = 2;
                fsQuadObject.material.uniforms.lights.value = Lights;
                
                fsQuadObject.material.needsUpdate = true;
                renderer.render(scene2, camera);
                var endtime = performance.now();
                $(mscounter).text(Math.round((endtime - starttime) * 1000) / 1000 + " ms");
                frames = 0;
                break;
            default:

        }

    };


    function init() {
        generateWorld();
        initPhysics(scene, worldInfo);

        animate();
    }

    var rect = renderer.domElement.getBoundingClientRect()

    window.onresize = function () {
        rect = renderer.domElement.getBoundingClientRect()
        camera.aspect = window.innerWidth / window.innerHeight;
    }

    var worldX = 0;
    var worldY = 0;

    var getRegion = function () {
        var regions = worldInfo.size / worldInfo.region.size;

        var regionX = Math.floor(worldX / worldInfo.region.size);
        var regionY = Math.floor(worldY / worldInfo.region.size);

        if (regionX < 0 || regionY < 0) return false;
        return new THREE.Vector2(regionX, regionY);
    }

    var getVoxel = function (regionXY) {

        var x = Math.floor(worldX) - (regionXY.x * worldInfo.region.size);
        var y = Math.floor(worldY) - (regionXY.y * worldInfo.region.size);

        return new THREE.Vector2(x, y);
    }

    $(renderer.domElement).click(function (event) {

        var region = getRegion();
        var voxel = getVoxel(region);
      
        var mesh = scene.channels.voxel[region.x + region.y * 4];
        //mesh.geometry.attributes.visible[voxel.x + voxel.y * worldInfo.region.size] = 0;
        console.log(mesh)
        console.log(region)
        console.log(voxel)
        console.log(mesh.geometry.attributes.visible.array[voxel.x + voxel.y * worldInfo.region.size])
        mesh.geometry.attributes.visible.array[voxel.x + voxel.y * worldInfo.region.size] = 0;
        mesh.geometry.attributes.visible.needsUpdate = true;


        var pointlight = Lights[0];
        pointlight.color = new THREE.Vector4(Math.random(), Math.random(), Math.random(), Math.random() * (7.0 - 0.5) + 0.5)
        pointlight.type = 2;
       
    })

    var getWorldRect = function () {

        //Get ortho cameras bounding planes and divide them by the zoomfactor
        camera.updateProjectionMatrix();
        var bpos = camera.position.clone();
        var xmin = camera.left / camera.zoom;
        var xmax = camera.right / camera.zoom;
        var ymin = camera.bottom / camera.zoom;
        var ymax = camera.top / camera.zoom;

        //Finally add the camera position for accurate offsets
        var rect = {
            min: new THREE.Vector3(xmin, ymin, 0).add(bpos),
            max: new THREE.Vector3(xmax, ymax, 0).add(bpos)
        }

        return new THREE.Vector4(rect.min.x, rect.min.y, rect.max.x, rect.max.y)
    }

    var setWorldFromScreen = function (xmin, ymin, xmax, ymax) {

        var z = 0.5;
        var retvec = new THREE.Vector4();

        var vector = new THREE.Vector3(xmin, ymin, z);
        vector.unproject(camera);

        var dir = vector.sub(camera.position).normalize();

        var distance = -camera.position.z / dir.z;

        var pos = camera.position.clone().add(dir.multiplyScalar(distance));

        retvec.x = pos.x;
        retvec.y = pos.y;

        var vector = new THREE.Vector3(xmax, ymax, z);
        vector.unproject(camera);

        var dir = vector.sub(camera.position).normalize();

        var distance = -camera.position.z / dir.z;

        var pos = camera.position.clone().add(dir.multiplyScalar(distance));

        retvec.z = pos.x;
        retvec.w = pos.y;


        return retvec;
    }

    $(renderer.domElement).on("touchmove", function (event) {

        var vector = new THREE.Vector3();

        vector.set(
            ((event.touches[0].clientX - rect.left) / rect.width) * 2 - 1,
            -((event.touches[0].clientY - rect.top) / rect.height) * 2 + 1,
            0.5);

        vector.unproject(camera);

        var dir = vector.sub(camera.position).normalize();

        var distance = -camera.position.z / dir.z;

        var pos = camera.position.clone().add(dir.multiplyScalar(distance));
        worldX = pos.x;
        worldY = pos.y;
    })

    var screenToWorld = function (x, y, z) {
        z = 0;
        var dom = renderer.domElement;

        var matrix2 = new THREE.Matrix4();
        var matrix = new THREE.Matrix4();
        var vector = new THREE.Vector3();
        vector.set(
            ((x - dom.offsetLeft) / dom.width) * 2 - 1,
            -((y - dom.offsetTop) / dom.height) * 2 + 1,
            z);
        matrix.multiplyMatrices(camera.matrixWorld, matrix.getInverse(camera.projectionMatrix));

        return new THREE.Vector3(vector.x, vector.y, 0).applyMatrix4(matrix);
    }

    var viewToWorld = function (x, y, z) {
        z = 0;
        camera.updateProjectionMatrix();
        var matrix2 = new THREE.Matrix4();
        var matrix = new THREE.Matrix4();
        var vector = new THREE.Vector3();
        vector.set(x * 2 - 1, -y * 2 + 1, z);
        matrix.multiplyMatrices(camera.matrixWorld, matrix.getInverse(camera.projectionMatrix));
        var balle = new THREE.Vector3(vector.x, vector.y, 0).applyMatrix4(matrix);

        return balle;
    }

    $(renderer.domElement).on("mousemove", function (event) {

        var wpos = screenToWorld(event.clientX, event.clientY);
        var currentMouseWorld = wpos;

        worldX = wpos.x;
        worldY = wpos.y;

        
        if (!lockLight) {
            Lights[0].position.set(worldX, worldY);
            postProcessMaterial.uniforms.mousePos.value = wpos;
            postProcessMaterial.uniforms.lights.value = Lights;
        }
    })

    //$(document).keypress(function (event) {
        
    //    lockLight = !lockLight;
    //    Lights[0].position.set(worldX, worldY);
    //    postProcessMaterial.uniforms.mousePos.value = wpos;
    //    postProcessMaterial.uniforms.lights.value = Lights;
    //})


    //Each object have a bunch of targets, physics engine lerps between them

    var lerp = function (min, max, a) {

        return a * (max - min) + min;
    }

    THREE.Vector3.prototype.cubic = function(){

       return this.x * this.y * this.z;
    }


    ///Object enhancements

   
    init();

    var G = new THREE.Vector2(0, -9.8);
    THREE.Object3D.prototype.controller = undefined;


    //After the init create the player

    function controller(player) {
        this.master = player;

        var self = this;
        

        var size = new THREE.Box3().setFromObject(player).getSize();
        this.boundingCircle = {
            radius: Math.max([size.x / 2, size.y / 2]),
            position: new THREE.Vector2(size.x / 2, size.y / 2)
        }



        this.size = new THREE.Box3().setFromObject(player).getSize();
        this.mass = this.size.x * this.size.y * this.size.z * 985;
        this.force = new THREE.Vector2(0, 0);
        this.pForce = this.force;
        this.acceleration = new THREE.Vector2(0, 0);
        this.aFactor = 1.0;
        this.maxVelocity = 10;
        this.velocity = new THREE.Vector2(0, 0);
        this.maxForce = 200;
        this.airBorne = {inAir: false, start: undefined, end: undefined}

        this.leftN = false;
        this.rightN = false;
        this.topN = false;
        this.bottomN = false;
        
        this.keyState = {};

        $(document).keydown(function (event) {
            
            if (self.keyState[event.key] && self.keyState[event.key].key) {

            }
            else {
                self.keyState[event.key] = { key: true, start: performance.now(), end: undefined }
            }
            

        })

        $(document).keyup(function (event) {

            self.keyState[event.key].end = performance.now();
            self.keyState[event.key].key = false;


            switch (event.key) {
                case "p":
                    player.position.set(worldX, worldY, 0);
                    break;
                default:

            }

        })
    }


    var player = new THREE.Object3D();
    player.name = "player";

    var geom = new THREE.BoxBufferGeometry(0.2, 1.73, 0.4);
    player.add(new THREE.Mesh(geom, new materialCreaturesCustom()))
    player.position.set(0, 0, 0);
    scene.insert(player, ["player", "simulate"]);
    debugger;
    player.controller = new controller(player);

    THREE.Camera.prototype.moveTo = function (vec3) {

        if (vec3.x) {
            this.position.x = vec3.x;
            this.position.y = vec3.y;
            
        }
        else {
            this.position.x = vec3.position.x;
            this.position.y = vec3.position.y;
        }
        this.updateMatrix();
        this.updateMatrixWorld();
        this.updateProjectionMatrix();
    }

    //camera.moveTo(player);
    
});


