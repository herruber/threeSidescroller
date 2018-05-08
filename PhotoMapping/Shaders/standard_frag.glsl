	precision highp float;

	uniform float time;
	uniform sampler2D normalMap;
	uniform sampler2D colorMap[1]; //0 dirt
	uniform sampler2D fadeMap[4];
	varying float fVisible;
	varying vec3 vPosition;
	varying vec4 vColor;
	varying vec3 vNormal;
	varying float vType;
	uniform int pass;


	vec4 renderNormalDepth(vec2 vUv){
		float depth = 0.0; //sqrt(pow((cameraPosition.z - vPosition.z), 2.0));
		vec3 mNormal = texture2D(normalMap, vUv).xyz;
		vec3 sumNormal = normalize(mNormal + vNormal);

		return vec4(sumNormal, clamp(depth, 0.0, 1.0));
    
	}

	void main() {

	vec4 color = vec4(vec3(0.0), 1.0);
	vec2 vUv = fract(vPosition.xy);

//Render depth
    if(pass == int(0)){
        color = renderNormalDepth(vUv);
    }
//Render scene
    else if(pass == int(1)){
    color.xyz = vColor.xyz + texture2D(colorMap[int(0)], vUv).xyz;
    }

    if(fVisible == 0.0){
    discard;
    }
    else{
    //gl_FragColor = color;

		


    gl_FragColor = color;
    }



}