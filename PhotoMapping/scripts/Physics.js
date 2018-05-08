

initPhysics = function(scene, worldInfo) {

    var G = -0.2;
    console.log(worldInfo)

    var getRegion = function (x, y) {
        var regions = worldInfo.size / worldInfo.region.size;

        var regionX = Math.floor(x / worldInfo.region.size);
        var regionY = Math.floor(y / worldInfo.region.size);

        if (regionX < 0 || regionY < 0) return false;
        return new THREE.Vector2(regionX, regionY);
    }

    var getVoxel = function (regionXY, x, y) {

        var x = Math.floor(x) - (regionXY.x * worldInfo.region.size);
        var y = Math.floor(y) - (regionXY.y * worldInfo.region.size);

        return new THREE.Vector2(x, y);
    }

    
    collisionCheck = function (obj, dir) { //Dir should be the distance moved over timeframe

        var objBox = new THREE.Box3().setFromObject(obj);
        var size = objBox.getSize().divideScalar(2);

        //For each voxel along the dir check if its solid
        for (var r = 0; r < Math.floor(dir.length()) + 1; r++) {
            var p = obj.position.clone().add(dir.clone().multiplyScalar(r));
            objBox = new THREE.Box2(new THREE.Vector2(obj.position.x - size.x, obj.position.y - size.y),  new THREE.Vector2(obj.position.x + size.x, obj.position.y + size.y));
            var region = getRegion(p.x, p.y);
            var voxel = getVoxel(region, p.x, p.y);

           
            //If the voxel and region exist
            if (region && voxel) {

                
                var hit = worldInfo.regions[region.x + region.y * 4][voxel.y][voxel.x];

                //If the hit is solid, create a hit
                if (hit.visible) {
                    scene.add(new THREE.Box3Helper(new THREE.Box3(hit.bounds.min, hit.bounds.max)), 0xff0000);
                    debugger;
                    var mtv = new THREE.Vector2();
                    var vox = worldInfo.regions[region.x + region.y * 4][voxel.y][voxel.x];
                    var voxBounds = vox.bounds;

                    mtv.x = vox.bounds.min.x - objBox.min.x;
                    mtv.y = vox.bounds.min.y - objBox.max.y;

                    if (Math.abs(mtv.x) < Math.abs(mtv.y)) mtv.y = 0;
                    else if (Math.abs(mtv.y) < Math.abs(mtv.x)) mtv.x = 0;

                    return mtv.add(new THREE.Vector2(p.x, p.y));
                }
            }
        }
        return false;
        
    }

    updatePhysics = setInterval(function () {
        var ps = 50 / 1000;
        console.log("updating physics")

        for (var i = 0; i < scene.channels.simulate.length; i++) {
            var obj = scene.channels.simulate[i];
            var c = obj.controller;
           
            

            if (c.keyState["ArrowRight"] && c.keyState["ArrowRight"].key) c.velocity.x += 1 / 20.0;
            else if (c.keyState["ArrowLeft"] && c.keyState["ArrowLeft"].key) c.velocity.x -= 1 / 20.0;
            else c.velocity.x = 0;

            c.velocity.y += G / 20;

            var p = collisionCheck(obj, c.velocity);

            if (p) {
                obj.position.set(p.x, p.y, 0);
                console.log(p)
            }
        }

    }, 50);

}