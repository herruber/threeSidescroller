//<script id="fq-vertex" type="shader">

    varying vec4 vPosition;

    void main() {

    vPosition =  projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    //vPosition.xy /= vPosition.w;
    //vPosition = modelMatrix * vPosition;
    
        gl_Position = vec4( position, 1.0 );


        
    }     

    //<script id="fq-fragment" type="shader">
   



//<script id="vertex" type="shader">




   // <script id="frag" type="shader">
