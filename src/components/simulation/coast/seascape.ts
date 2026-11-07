import * as T from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { clamp, coastHeight } from "./terrain";

export type LightPreset = "morning" | "day" | "evening";
type Light = { direction: T.Vector3; upper: T.Color; lower: T.Color; cloud: T.Color; sun: T.Color; ambient: number; energy: number };
const lightPresets: Record<LightPreset, Light> = {
  morning: {
    direction: new T.Vector3(-.66, .27, .68).normalize(), upper: new T.Color(0x7faad3),
    lower: new T.Color(0xd3d4c7), cloud: new T.Color(0xffdfbd), sun: new T.Color(0xffdeb2),
    ambient: 1.52, energy: 3.1,
  },
  day: {
    direction: new T.Vector3(-.57, .75, -.31).normalize(), upper: new T.Color(0x5999d0),
    lower: new T.Color(0xc8e2e7), cloud: new T.Color(0xf2f4ee), sun: new T.Color(0xfff3dd),
    ambient: 2.13, energy: 3.25,
  },
  evening: {
    direction: new T.Vector3(-.70, .177, -.69).normalize(), upper: new T.Color(0x678fba),
    lower: new T.Color(0xd6c8b3), cloud: new T.Color(0xffdec1), sun: new T.Color(0xffd3a0),
    ambient: 2.04, energy: 2.94,
  },
};

const skyGlsl = `
  uniform vec3 coastSun,coastUpper,coastLower,coastCloud,coastSunTint;
  uniform float coastTime;
  float skyHash(vec2 p) {
    vec3 q=fract(vec3(p.xyx)*.1031);
    q+=dot(q,q.yzx+33.33);
    return fract((q.x+q.y)*q.z);
  }
  float fieldNoise(vec2 p){
    vec2 i=floor(p),f=fract(p);
    f=f*f*(3.-2.*f);
    return mix(mix(skyHash(i),skyHash(i+vec2(1.,0.)),f.x),
      mix(skyHash(i+vec2(0.,1.)),skyHash(i+vec2(1.,1.)),f.x),f.y);
  }
  vec3 coastalSky(vec3 direction,float clouds){
    float height=max(0.,direction.y);
    float sunAngle=clamp(dot(direction,coastSun),0.,1.);
    vec3 sky=mix(coastLower,coastUpper,pow(height,.48));
    sky+=coastSunTint*(.11*pow(sunAngle,9.)+.20*pow(sunAngle,68.));
    if(clouds>.5&&direction.y>.019){
      vec2 p=direction.xz/(.31+direction.y);
      p=p*vec2(2.4,3.0)+vec2(6.23+coastTime*.004,4.85);
      vec2 stretch=vec2(p.x*.74,p.y*1.6);
      float field=fieldNoise(stretch)*.55+fieldNoise(p*2.14+1.25)*.28+fieldNoise(p*4.18-2.2)*.12+fieldNoise(p*9.)*.05;
      float cover=smoothstep(.49,.70,field)*smoothstep(.015,.10,height);
      float shadow=smoothstep(.45,.76,fieldNoise(stretch+coastSun.xz*.2)*.62+fieldNoise(p*2.14+1.25)*.38);
      vec3 cloud=mix(coastCloud*vec3(.67,.73,.81),coastCloud*1.13,shadow);
      sky=mix(sky,cloud,cover*.76);
      float wisps=fieldNoise(vec2(p.x*.62+p.y*.33,p.y*7.5)+21.);
      sky=mix(sky,coastCloud*.96,smoothstep(.63,.87,wisps)*smoothstep(.14,.39,height)*.14);
    }
    float disc=smoothstep(.999940,.999979,sunAngle);
    return sky+coastSunTint*(disc*8.0+.27*pow(sunAngle,510.));
  }
`;

const wavesGlsl = `
  uniform float coastWind,coastTime,coastTide;
  uniform sampler2D coastBed;
  float bedHeight(vec2 p){
    vec2 q=(p+vec2(79.,193.))/vec2(187.,386.);
    if(any(lessThan(q,vec2(0.)))||any(greaterThan(q,vec2(1.)))) return -12.;
    vec2 code=texture2D(coastBed,q).rg;
    return dot(code,vec2(65280.,255.))*(52./65535.)-14.;
  }
  // For each deep-water component, angular frequency is sqrt(g*k).
  // Shoaling is approximated by damping amplitude at the shoreline.
  vec3 swellComponent(vec2 p,vec2 d,float length,float amp,float phaseOffset){
    float k=6.28318531/length;
    float phase=k*dot(d,p)-sqrt(9.80665*k)*coastTime+phaseOffset;
    float slopeWeight=1.;
    #ifdef COAST_FRAGMENT
      slopeWeight=1.-smoothstep(.80,2.7,fwidth(phase));
    #endif
    return vec3(cos(phase)*amp*k*d*slopeWeight,sin(phase)*amp);
  }
  vec3 waveField(vec2 p,float damping){
    float a=.026+pow(coastWind/12.,1.32)*.19;
    vec3 wave=swellComponent(p,vec2(.963,.269),7.1,a,.82)
      +swellComponent(p,vec2(.804,-.594),4.27,a*.43,4.08)
      +swellComponent(p,vec2(.927,-.375),2.92,a*.28,2.31)
      +swellComponent(p,vec2(.733,.68),1.84,a*.19,5.22)
      +swellComponent(p,vec2(.987,-.16),1.18,a*.12,3.41)
      +swellComponent(p,vec2(.489,.873),.72,a*.069,1.13);
    return wave*damping;
  }
`;

function makeBed() {
  const width = 256, height = 512;
  const values = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
    const x = (col + .5) / width * 187 - 79, z = (row + .5) / height * 386 - 193;
    const code = Math.round(clamp((coastHeight(x, z) + 14) / 52, 0, 1) * 65535);
    const i = (row * width + col) * 4;
    values[i] = code >> 8;
    values[i + 1] = code & 255;
    values[i + 3] = 255;
  }
  const texture = new T.DataTexture(values, width, height);
  texture.magFilter = texture.minFilter = T.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function waterGeometry() {
  const xs = [-2900, -1500, -680, -315, -148, -98, -76, -64, -56, -50];
  const zs = [-2900, -1000, -420, -255, -198];
  for (let x = -47.5; x <= 61; x += 2.5) xs.push(x);
  for (let z = -195; z <= 195; z += 2.25) zs.push(z);
  xs.push(72, 100, 260, 1000, 2900);
  zs.push(198, 255, 420, 1000, 2900);
  const vertices: number[] = [], indices: number[] = [];
  for (let row = 0; row < zs.length; row++) for (let col = 0; col < xs.length; col++) {
    vertices.push(xs[col], -zs[row], 0);
    const vertex = row * xs.length + col;
    if (row + 1 < zs.length && col + 1 < xs.length) {
      indices.push(vertex, vertex + xs.length, vertex + 1, vertex + 1, vertex + xs.length, vertex + xs.length + 1);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  return geo;
}

type Controls = { time: T.IUniform<number>; tide: T.IUniform<number>; wind: T.IUniform<number>; detail: T.IUniform<number> };

export function addSeascape(scene: T.Scene, controls: Controls, beach: T.Texture, ripples: T.Vector4[]) {
  const active = {
    direction: new T.Vector3().copy(lightPresets.evening.direction), upper: new T.Color(), lower: new T.Color(),
    cloud: new T.Color(), sun: new T.Color(),
  };
  let target = lightPresets.evening;
  active.upper.copy(target.upper); active.lower.copy(target.lower); active.cloud.copy(target.cloud); active.sun.copy(target.sun);
  const skyUniforms = {
    coastSun: { value: active.direction },
    coastUpper: { value: active.upper },
    coastLower: { value: active.lower },
    coastCloud: { value: active.cloud },
    coastSunTint: { value: active.sun },
    coastTime: controls.time,
  };
  const skyMaterial = new T.ShaderMaterial({
    uniforms: skyUniforms, side: T.BackSide, depthWrite: false, depthTest: false,
    vertexShader: `varying vec3 vSky;
      void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vSky;
      ${skyGlsl}
      void main(){
        gl_FragColor=vec4(coastalSky(normalize(vSky),1.),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new T.Mesh(new T.SphereGeometry(1920, 36, 18), skyMaterial);
  sky.frustumCulled = false;
  sky.renderOrder = -100;
  scene.add(sky);
  const bed = makeBed();
  const mirror = new Reflector(waterGeometry(), {
    textureWidth: 384, textureHeight: 256, clipBias: .003, multisample: 0,
    shader: {
      name: "Adriatic water",
      uniforms: {
        color: { value: new T.Color() }, tDiffuse: { value: null }, textureMatrix: { value: new T.Matrix4() },
        coastBed: { value: null }, coastSediment: { value: null }, coastWind: { value: 4.5 },
        coastTide: { value: 0 }, coastMirror: { value: 0 }, coastDetail: { value: 1 },
        coastRipple: { value: ripples },
        ...skyUniforms,
      },
      vertexShader: `
        uniform mat4 textureMatrix;
        varying vec4 vMirror;
        varying vec3 vSurface;
        ${wavesGlsl}
        void main(){
          vec4 world=modelMatrix*vec4(position,1.);
          float depth=max(0.,coastTide-bedHeight(world.xz));
          float shoal=smoothstep(.035,.63,depth);
          float nearWave=(1.-smoothstep(42.,126.,distance(cameraPosition.xz,world.xz)))*.64;
          world.y+=waveField(world.xz,shoal).z*nearWave;
          vSurface=world.xyz;
          vMirror=textureMatrix*vec4(position,1.);
          gl_Position=projectionMatrix*viewMatrix*world;
        }`,
      fragmentShader: `
        varying vec4 vMirror;
        varying vec3 vSurface;
        uniform sampler2D tDiffuse,coastSediment;
        uniform vec4 coastRipple[5];
        uniform float coastMirror,coastDetail;
        #define COAST_FRAGMENT
        ${wavesGlsl}
          ${skyGlsl.replace("  uniform float coastTime;", "")}
        void main(){
          vec2 p=vSurface.xz;
          vec3 ray=normalize(vSurface-cameraPosition);
          float dist=length(cameraPosition-vSurface);
          float depth=max(0.,coastTide-bedHeight(p));
          float damping=smoothstep(.02,.71,depth);
          vec3 waves=waveField(p,damping);
          float windRatio=clamp(coastWind/12.,0.,1.);
          float fine=(.012+windRatio*.034)*(1.-smoothstep(18.,115.,dist));
          float windField=.40+fieldNoise(p*.24+vec2(-coastTime*.045,3.24))*.94;
          vec2 microPhase=vec2(dot(p,vec2(18.8,8.43))-coastTime*12.5,dot(p,vec2(-6.61,22.37))-coastTime*13.9);
          vec2 offsetPhase=vec2(dot(p,vec2(12.31,-3.61))-coastTime*9.2,dot(p,vec2(6.16,17.3))-coastTime*11.2);
          vec2 microFilter=1.-smoothstep(vec2(.73),vec2(2.5),fwidth(microPhase));
          vec2 offsetFilter=1.-smoothstep(vec2(.73),vec2(2.5),fwidth(offsetPhase));
          vec2 microRipples=(sin(microPhase)*microFilter+.49*cos(offsetPhase)*offsetFilter)*fine*windField;
          vec2 impactSlope=vec2(0.);
          float impactFoam=0.;
          if(dist<72.) for(int j=0;j<5;j++){
            vec4 splash=coastRipple[j];
            if(splash.z>3.7||splash.w<.001)continue;
            vec2 offset=p-splash.xy;
            float radius=length(offset);
            float crest=radius-(splash.z*.96+.049);
            float spread=crest*5.4;
            float envelope=exp(-spread*spread)*splash.w*(1.-smoothstep(.08,3.7,splash.z));
            impactSlope+=offset/max(.025,radius)*sin(crest*27.)*envelope*.135;
            impactFoam+=envelope*(.5+.5*cos(crest*29.))*(1.-smoothstep(.11,1.0,splash.z))*.14;
          }
          vec2 slope=(waves.xy+microRipples)*(1.-.72*smoothstep(105.,470.,dist))+impactSlope;
          vec3 normal=normalize(vec3(-slope.x,1.,-slope.y));
          vec3 reflectedRay=reflect(ray,normal);
          vec3 sky=coastalSky(normalize(vec3(reflectedRay.x,max(.001,reflectedRay.y),reflectedRay.z)),0.);
          vec2 mirrorUV=vMirror.xy/vMirror.w+normal.xz*.019*(1.-smoothstep(100.,370.,dist));
          float useMirror=coastMirror*smoothstep(0.,.08,mirrorUV.y)*(1.-smoothstep(.92,1.,mirrorUV.y))*
            smoothstep(0.,.06,mirrorUV.x)*(1.-smoothstep(.94,1.,mirrorUV.x));
          vec3 reflected=sky;
          if(useMirror>.001) reflected=mix(sky,texture2D(tDiffuse,mirrorUV).rgb,useMirror);
          float angle=clamp(dot(-ray,normal),0.,1.);
          // Schlick form of dielectric Fresnel, using an air–water interface near 1.333 IOR.
          float fresnel=.0204+.9796*pow(1.-angle,5.);
          vec2 sedimentPoint=p+microRipples*.04;
          float travelled=min(depth,18.)/(.57+angle*.47);
          if(depth<4.4&&dist<82.&&coastDetail>.5){
            vec3 refractedRay=refract(ray,normal,1./1.333);
            float descent=max(.19,-refractedRay.y);
            float initial=depth/descent;
            float floor=bedHeight(p+refractedRay.xz*initial);
            travelled=clamp((coastTide-floor)/descent,0.,9.4);
            sedimentPoint=p+refractedRay.xz*travelled;
          }
          vec3 shallow=texture2D(coastSediment,sedimentPoint*.54).rgb*vec3(.67,.83,.78);
          float caustic=pow(max(0.,1.-abs(sin(sedimentPoint.x*3.5+sedimentPoint.y*2.8+coastTime*1.95)
            +sin(sedimentPoint.y*4.15-sedimentPoint.x*.6+coastTime*1.41))*.74),7.);
          shallow*=.86+caustic*.38*(1.-smoothstep(.5,2.05,depth))*coastDetail;
          vec3 opticalPath=exp(-vec3(1.21,.49,.32)*travelled);
          vec3 waterBody=vec3(.013,.074,.111)+vec3(.018,.104,.062)*exp(-depth*.48);
          vec3 water=mix(waterBody,shallow,opticalPath);
          vec3 colour=mix(water,reflected,fresnel*.91);
          float glintAngle=max(0.,dot(reflect(-coastSun,normal),-ray));
          float glint=pow(glintAngle,156.+(1.-windRatio)*130.)*1.26+pow(glintAngle,980.)*3.2;
          colour+=coastSunTint*glint*(1.-.73*smoothstep(90.,360.,dist));
          float apron=1.-smoothstep(.07,.49+windRatio*.16,depth);
          float micro=fieldNoise(p*vec2(8.2,5.9)+vec2(-coastTime*.21,0.));
          float breakers=fieldNoise(p*1.49+vec2(coastTime*.17,5.1));
          float ripple=sin(depth*26.0+waves.z*39.+coastTime*3.35+breakers*4.5);
          float foam=apron*smoothstep(.47,.98,ripple+micro*.48)*(.17+windRatio*.69);
          foam*=smoothstep(.012,.061,depth)*smoothstep(.35,.70,micro)*smoothstep(.14,.60,breakers);
          colour=mix(colour,vec3(.79,.85,.82),foam*.67+impactFoam);
          float haze=1.-exp(-dist*.00145);
          colour=mix(colour,coastalSky(normalize(vec3(ray.x,.001,ray.z)),0.)*.78,haze*.96);
          gl_FragColor=vec4(colour,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  mirror.rotation.x = -Math.PI / 2;
  mirror.frustumCulled = false;
  const seaMaterial = mirror.material as T.ShaderMaterial;
  Object.assign(seaMaterial.uniforms, skyUniforms, {
    coastBed: { value: bed }, coastSediment: { value: beach }, coastWind: controls.wind, coastTide: controls.tide,
    coastDetail: controls.detail, coastRipple: { value: ripples },
  });
  const reflectionPass = mirror.onBeforeRender.bind(mirror);
  mirror.onBeforeRender = (...args) => {
    if (seaMaterial.uniforms.coastMirror.value > .5) reflectionPass(...args);
  };
  scene.add(mirror);
  return {
    changeLight(preset: LightPreset) { target = lightPresets[preset]; },
    applyQuality(enabled: boolean, width: number, height: number) {
      seaMaterial.uniforms.coastMirror.value = enabled ? 1 : 0;
      if (enabled) mirror.getRenderTarget().setSize(width, height);
    },
    update(dt: number, camera: T.PerspectiveCamera, sun: T.DirectionalLight, ambient: T.HemisphereLight) {
      const mix = 1 - Math.exp(-dt * 4.1);
      active.direction.lerp(target.direction, mix).normalize();
      active.upper.lerp(target.upper, mix);
      active.lower.lerp(target.lower, mix);
      active.sun.lerp(target.sun, mix);
      active.cloud.lerp(target.cloud, mix);
      sun.color.copy(active.sun);
      sun.intensity += (target.energy - sun.intensity) * mix;
      ambient.color.copy(active.upper).lerp(active.lower, .37);
      ambient.intensity += (target.ambient - ambient.intensity) * mix;
      sky.position.copy(camera.position);
      mirror.position.y = controls.tide.value;
      return active;
    },
    dispose() { mirror.dispose(); bed.dispose(); },
  };
}
