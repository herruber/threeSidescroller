    precision highp float;

    varying vec4 vPosition;
    uniform sampler2D depthMap;
    uniform sampler2D colorMap;
	uniform sampler2D worldMap;
	uniform sampler2D ditherMap;
	uniform sampler2D fogMap;
    uniform vec2 resolution;
    uniform vec4 worldRect; //xy min, xy max
    uniform vec2 mousePos;
	//uniform vec3 cameraPosition;
	uniform float time;

    struct Light {
    vec3 position;
    vec4 color;
    vec3 direction;
    int type;
    };

    uniform Light lights[32];

    vec2 getWorldXY(vec2 screenUv){
        
		vec2 oldMin = vec2(0.0);
		vec2 newMin = worldRect.xy;
		vec2 oldValue = screenUv;
        vec2 oldRange = vec2(1.0, 1.0);
		vec2 newRange = worldRect.zw - worldRect.xy;

		vec2 final = mix(worldRect.xy, worldRect.zw, screenUv);
		

        return final;

    }

    vec2 getScreenXY(vec2 worldPos){
    
		//get position in 0-1 range
        vec2 bajs = (worldPos - worldRect.xy) / (worldRect.zw - worldRect.xy);
		return bajs;
    }

	struct Distances{
		float sD;
		float wD;
	};

	Distances getDistances(vec2 sA, vec2 sB){

		vec2 d = sB - sA;
		vec2 wdist = mix(vec2(0.0), worldRect.zw - worldRect.xy, d);
		float worldDist = length(wdist);
		float screenDist = length(d);



		Distances dist = Distances(screenDist, worldDist);
		

		return dist;
	}

	bool nearly(float a, float b){
		
		if(abs(a - b) < 0.01) return true;

		return false;
	}

	float getAngle(vec3 a, vec3 b){

		return acos(dot(a, b) / (length(a) * length(b)));
	}

	float detail = 0.001;
vec2 speed = vec2(1.0, -0.5);

	vec3 getLight(vec2 uv, Light cLight){
			
			vec2 pixelpos = getWorldXY(uv);
			vec2 lightpos = cLight.position.xy;
			if(texture2D(depthMap, getScreenXY(lightpos)).a < 0.1)return vec3(0.0);
			vec4 depth = texture2D(depthMap, uv);
			depth.xyz = normalize(depth.xyz) * 2.0 - 1.0;

			float ndotl = clamp(dot(depth.xyz, -normalize(vec3(pixelpos, 0.0) - vec3(lightpos, 5.0))), 0.0, 1.0);

			if(depth.a > 0.1) ndotl = 1.0;

			vec2 dir = normalize(lightpos - pixelpos);
			vec2 pos = pixelpos;
			
			float currentDist = 0.0;
			float maxDist = sqrt(255.0 * cLight.color.w);
			float dist = distance(lightpos, pixelpos);
			float power = 1.0;
			if(distance(lightpos, pixelpos) > maxDist) return vec3(0.0);

			for(int i = 0; i < 80; i++){
				
				vec4 depth = texture2D(depthMap, getScreenXY(pos));
				//depth.xyz = normalize(depth.xyz) * 2.0 - 1.0;
				
				if(distance(lightpos, pos) < 1.0) break;

				else if(depth.a < 0.1)
				{
				 power = power - 0.1;
				 if(power <= 0.05)return vec3(0.0);
				 }
				
				pos += dir * 0.25;
				currentDist++;
				
			}

			return vec3(1.0 / (dist * dist)) * cLight.color.xyz * cLight.color.w * power * 4.0 * ndotl;
			}

    void main() {
    
        vec2 sUv = (gl_FragCoord.xy) / (resolution);
		
        vec2 texel = 1.0 / resolution;
		vec4 diffuse = texture2D(colorMap, sUv);
		
		vec3 light = getLight(sUv, lights[0]);

		//vec3 bajs = mix(diffuse.xyz, light, length(normalize(light));

		//vec4 color = vec4(bajs, 1.0);
		//float ditherFactor = (texture2D(ditherMap, sUv).r / 63.0) * 2.0 - 1.0;
		//ditherFactor *= 0.5 / pow(2.0, 8.0);
		
		//color.xyz += ditherFactor;
		//gl_FragColor = vec4(dir, 1.0);

				
				

		vec3 ambient = normalize(vec3(0.2, 0.2, 0.31)) * 0.1;
		gl_FragColor = vec4((light +ambient) * diffuse.xyz, 1.0); //color; //diffuse * lightcolor + lightcolor;
		//gl_FragColor = vec4(diffuse.xyz, 1.0);
		//gl_FragColor = vec4(vec3(arne), 1.0);


		//gl_FragColor = vec4((cpos.x - worldRect.z), 0.0, 0.0, 1.0);


		//gl_FragColor = vec4(getScreenXY(cLight.position.xy + 5.0).y, 0.0, 0.0, 1.0);
    }