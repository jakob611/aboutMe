import * as T from "three";

export type ReflectionObject = { center: T.Vector3; size: T.Vector3; color: T.Color; sphere: boolean };
/** One reflected ray per water fragment. No screen-space history or GPU ray-tracing extension is required. */
export function waterMaterial(objects: ReflectionObject[]) {
  const entries = objects.slice(0, 32);
  while (entries.length < 32) entries.push({ center: new T.Vector3(0, -1000, 0), size: new T.Vector3(.01, .01, .01), color: new T.Color(), sphere: true });
  return new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uLight: { value: 0 }, uReflections: { value: 1 },
      uCenters: { value: entries.map(o => o.center) }, uSizes: { value: entries.map(o => o.size) },
      uColors: { value: entries.map(o => o.color) }, uKinds: { value: entries.map(o => o.sphere ? 1 : 0) },
      uSun: { value: new T.Vector3(-.5, .65, .32).normalize() },
    },
    vertexShader: `varying vec3 vWorld;
      void main(){vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader: `
      varying vec3 vWorld;
      uniform float uTime,uLight,uReflections;
      uniform vec3 uSun,uCenters[32],uSizes[32],uColors[32];
      uniform float uKinds[32];
      vec3 sky(vec3 rd){
        vec3 horizon=mix(vec3(.69,.35,.26),vec3(.24,.16,.29),uLight);
        vec3 zenith=mix(vec3(.31,.32,.57),vec3(.035,.067,.18),uLight);
        vec3 c=mix(horizon,zenith,pow(max(rd.y,0.),.45));
        float sun=pow(max(dot(rd,uSun),0.),320.);
        return c+vec3(1.,.65,.28)*sun*(1.-uLight*.85);
      }
      float intersectSphere(vec3 ro,vec3 rd,vec3 center,float radius){
        vec3 oc=ro-center;float b=dot(oc,rd),c=dot(oc,oc)-radius*radius;
        float h=b*b-c;if(h<0.)return 1e5;float t=-b-sqrt(h);return t>.02?t:1e5;
      }
      vec2 intersectBox(vec3 ro,vec3 rd,vec3 center,vec3 halfSize){
        vec3 safeDir=sign(rd+vec3(.000001))*max(abs(rd),vec3(.00001));
        vec3 m=1./safeDir,n=m*(ro-center),k=abs(m)*halfSize;
        vec3 t1=-n-k,t2=-n+k;float nearT=max(max(t1.x,t1.y),t1.z),farT=min(min(t2.x,t2.y),t2.z);
        return vec2(nearT,farT);
      }
      void main(){
        vec2 p=vWorld.xz;
        float nx=sin(p.x*.65+p.y*.29+uTime*.65)*.018+sin(p.y*1.7-uTime*.8)*.007;
        float nz=cos(p.y*.62-p.x*.32+uTime*.48)*.018+cos(p.x*1.9+uTime*.65)*.006;
        vec3 n=normalize(vec3(nx,1.,nz));
        vec3 viewDir=normalize(cameraPosition-vWorld),ray=reflect(-viewDir,n);
        vec3 reflection=sky(ray);
        if(uReflections>.5){
          float nearest=1e5;int hit=-1;
          for(int i=0;i<32;i++){
            float t=1e5;
            if(uKinds[i]>.5)t=intersectSphere(vWorld+n*.03,ray,uCenters[i],uSizes[i].x);
            else {vec2 bounds=intersectBox(vWorld+n*.03,ray,uCenters[i],uSizes[i]);if(bounds.x>.02&&bounds.x<bounds.y)t=bounds.x;}
            if(t<nearest){nearest=t;hit=i;}
          }
          if(hit>=0){
            vec3 hitPoint=vWorld+ray*nearest;
            float shade=.75+.25*max(0.,dot(normalize(hitPoint-uCenters[hit]),uSun));
            reflection=mix(uColors[hit]*shade*(1.-uLight*.65),sky(ray),1.-exp(-nearest*.013));
          }
        }
        float fresnel=.13+.75*pow(1.-max(dot(viewDir,n),0.),4.);
        vec3 water=mix(vec3(.13,.34,.33),vec3(.025,.09,.14),uLight);
        vec3 c=mix(water,reflection,fresnel*.83);
        float glint=pow(max(dot(reflect(-uSun,n),viewDir),0.),200.);
        c+=vec3(1.,.77,.43)*glint*(1.-uLight*.9);
        c=mix(c,sky(normalize(vec3(ray.x,.01,ray.z))),smoothstep(26.,120.,length(cameraPosition.xz-p)));
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
