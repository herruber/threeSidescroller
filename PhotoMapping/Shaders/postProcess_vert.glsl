varying vec4 vPosition;

    void main() {

    vPosition =  projectionMatrix * modelViewMatrix * vec4( position.xy, 0.0, 1.0 );

        gl_Position = vec4( position.xy, 0.0, 1.0 );


        
    }     