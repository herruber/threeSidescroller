precision highp float;

attribute vec3 offset;
attribute vec4 color;
attribute vec4 orientationStart;
attribute vec4 orientationEnd;
attribute float type;

varying vec3 vPosition;
varying vec3 worldPosition;
varying vec4 vColor;
varying vec3 vNormal;
varying float vType;

void main(){

    vPosition = position;
    vColor = color;
    vNormal = normal;
	vType = type;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( vPosition, 1.0 );

}