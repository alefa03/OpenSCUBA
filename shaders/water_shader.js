export class WaterShader {
    constructor() {
        this.VertexShader = `
            uniform float uTime;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vModelPosition;
            varying float vElevation;

            #include <fog_pars_vertex>

            vec3 addGerstnerWave(
                vec3 position, 
                vec2 direction, 
                float steepness, 
                float wavelength, 
                float time
            ) {
                vec2 d = normalize(direction);
                float k = 2.0 * 3.14159 / wavelength;
                float c = sqrt(9.8 / k); 
                float f = k * (dot(d, position.xz) - c * time);
                float a = steepness / k; 

                return vec3(
                    d.x * (a * cos(f)), 
                    a * sin(f),         
                    d.y * (a * cos(f))  
                );
            }

            vec3 getDisplacedPosition(vec3 pos, float time) {
                vec3 displacedPos = pos;
                displacedPos += addGerstnerWave(pos, vec2(1.0, 0.3),  0.15, 30.0, time);
                displacedPos += addGerstnerWave(pos, vec2(0.3, 1.0),  0.10, 15.0, time);
                displacedPos += addGerstnerWave(pos, vec2(-0.7, 0.5), 0.05, 5.0,  time);
                displacedPos += addGerstnerWave(pos, vec2(0.2, -0.8), 0.02, 1.5,  time);
                return displacedPos;
            }

            void main() {
                vUv = uv;
                
                vec3 targetPosition = getDisplacedPosition(position, uTime);
                vElevation = targetPosition.y - position.y; 

                vec4 modelPosition = modelMatrix * vec4(targetPosition, 1.0);
                vModelPosition = modelPosition.xyz;

                float e = 0.01; 
                vec3 pX = getDisplacedPosition(position + vec3(e, 0.0, 0.0), uTime);
                vec3 pZ = getDisplacedPosition(position + vec3(0.0, 0.0, e), uTime);

                vec3 tangentX = pX - targetPosition;
                vec3 tangentZ = pZ - targetPosition;

                vec3 calculatedNormal = normalize(cross(tangentZ, tangentX)); 
                vNormal = normalize(mat3(modelMatrix) * calculatedNormal);

                vec4 mvPosition = viewMatrix * modelPosition;
                gl_Position = projectionMatrix * mvPosition;

                #include <fog_vertex>
            }
        `;

        this.FragmentShader = `
            varying vec3 vNormal;
            varying vec3 vModelPosition;
            varying float vElevation;

            #include <fog_pars_fragment>

            void main() {
                vec3 normal = normalize(vNormal);
                vec3 viewDir = normalize(cameraPosition - vModelPosition);

                // Fresnel effect for sky reflections
                float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0);
                fresnel = clamp(fresnel, 0.0, 0.5);

                vec3 deepColor = vec3(0.0, 0.1, 0.3);
                vec3 shallowColor = vec3(0.1, 0.5, 0.7);
                vec3 waterColor = mix(deepColor, shallowColor, (vElevation + 0.5));

                vec3 skyColor = vec3(0.2, 0.5, 0.7);
                waterColor = mix(waterColor, skyColor, fresnel);

                vec3 lightDir = normalize(vec3(0.0, 10.0, 5.0)); // Matches your sun position
                vec3 halfDir = normalize(lightDir + viewDir);
                float specular = pow(max(dot(normal, halfDir), 0.0), 64.0);
                waterColor += vec3(1.0, 0.95, 0.8) * specular * 0.6;

                gl_FragColor = vec4(waterColor, 0.9);

                #include <fog_fragment>
            }
        `;
    }
}