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
			
			vec4 depth = texture2D(depthMap, uv);
			depth.xyz = normalize(depth.xyz);
			depth.y = depth.y;
			depth.xyz = depth.xyz * 2.0 - 1.0;
			
			vec3 ret0 = vec3(0.0);
			vec3 retL = vec3(0.0);
			
			vec2 wpos = getWorldXY(uv);
			float d = distance(cLight.position.xy, wpos);
			vec2 dir = normalize(cLight.position.xy - wpos);
			if(texture2D(depthMap, getScreenXY(cLight.position.xy)).a > 0.1)return vec3(0.0);

			float df = dot(depth.xyz, normalize(vec3(dir, 0.0)));
			
			if(depth.z > 0.8){
				df = 0.0;
			}

			//Calc normal light
			//if(depth.a > 0.1 && df == 0.0)return vec3(0.0, 0.0, 0.0);
			//Trace over
			if (depth.a > 0.1 && d < cLight.color.w * 14.0){
				//float checkR = texture2D(depthMap, getScreenXY(wpos + vec2(1.0, 0.0))).a;
				//float checkL = texture2D(depthMap, getScreenXY(wpos + vec2(-1.0, 0.0))).a;
				//float checkT = texture2D(depthMap, getScreenXY(wpos + vec2(0.0, 1.0))).a;
				float start = texture2D(depthMap, uv).a;

				vec3 ndir = normalize(vec3(cLight.position.xy, 5.0) - vec3(wpos, 0.0));
				for(int r = 0; r < 40; r++){
					
					wpos += dir;

					if(float(r) > cLight.color.w * 5.0)break;

					float end = texture2D(depthMap, getScreenXY(wpos)).a;

					if(end > 0.1)return vec3(0.0);

				}

				return cLight.color.xyz * max(dot(ndir, depth.xyz), 0.0);// * cLight.color.xyz * cLight.color.w;
			}
			
			if(d > cLight.color.w * 15.0)return vec3(0.0);
			if(d < 1.0) return vec3(1.0);

			float fog = 0.0;

			for(int i = 0; i < 40; i++){
				
				depth = texture2D(depthMap, getScreenXY(wpos));
				depth.xyz *= 2.0 - 1.0;
				depth.xyz = normalize(depth.xyz);
				
				if(depth.z > 0.8){
				df = 0.0;
				}

				if(depth.a > 0.1 && df <= 0.0)return vec3(0.0, 0.0, 0.0);
				vec2 offset = mod(speed * time / 1000.0, 100.0) * 0.5;
				float fogsample = texture2D(fogMap, (wpos.xy + offset) / 100.0).g;
				float fogsample2 = texture2D(fogMap, (wpos.xy + offset * vec2(0.54, -0.01)) / 50.0).g;

				fog += 1.0 / (fogsample * fogsample2 * 2.0 );
				

				if(float(i) >= d)return vec3(1.0 / pow(d, 2.0)) * cLight.color.xyz * cLight.color.w * fog;
				if(depth.a > 0.1)return vec3(0.0, 0.0, 0.0);
				wpos += dir;


			}

			//retL = vec3(d);

			return vec3(1.0 / pow(d, 2.0)) * cLight.color.xyz * cLight.color.w;
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
		gl_FragColor = vec4(light, 1.0); //color; //diffuse * lightcolor + lightcolor;
		//gl_FragColor = vec4((cpos.x - worldRect.z), 0.0, 0.0, 1.0);


		//gl_FragColor = vec4(getScreenXY(cLight.position.xy + 5.0).y, 0.0, 0.0, 1.0);
    }