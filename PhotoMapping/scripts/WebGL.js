window.onload = init;
var counter;
var canvas;
var gl;
var start;
var frames = 0;


function init() {

    counter = document.getElementById("ms")

    canvas = document.getElementById("render-view");
    gl = canvas.getContext('experimental-webgl');

    canvas.width = 640;
    canvas.height = 480;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    render();

    start = performance.now();
}

function render() {

    window.requestAnimationFrame(render, canvas);

    gl.clearColor(1.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);



    var end = performance.now();
    var ms = end-start + " ms";
    counter.innerText = ms;
    start = performance.now();

}
