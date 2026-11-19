// ========================================================================
// DragonBlood · 3D setup
// three.js renderer and camera, mesh/scene helpers, and model builders
// (labels, dragons, eggs, walls, NPCs, critters, portals, first-person weapon).
// ========================================================================
'use strict';
// --- renderer & camera
const view=$('#view');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
renderer.outputEncoding=THREE.sRGBEncoding;
view.appendChild(renderer.domElement);
const cvs=renderer.domElement;
const camera=new THREE.PerspectiveCamera(72,1,.1,500);
camera.rotation.order='YXZ';
function resize(){const w=view.clientWidth||innerWidth,h=view.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();

// --- scene and mesh helpers
const M=(color,o)=>new THREE.MeshStandardMaterial(Object.assign({color,roughness:.85,metalness:0,flatShading:true},o||{}));
function mesh(geo,mat,x,y,z){const m=new THREE.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);return m;}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function baseScene(sky,near,far){const sc=new THREE.Scene();sc.background=new THREE.Color(sky);sc.fog=new THREE.Fog(sky,near,far);
  sc.add(new THREE.HemisphereLight(0xfff1e0,0x2a1e1e,.65));const sun=new THREE.DirectionalLight(0xffe2c0,.85);sun.position.set(20,40,10);sc.add(sun);return sc;}
function disposeScene(sc){sc.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});}

// --- labels, dragons, eggs, walls, NPCs, critters, portals
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}
// Floating name tag (canvas texture sprite).
function makeLabel(title,sub,scale){
  scale=scale||1;const c=document.createElement('canvas');c.width=512;c.height=sub?168:110;const x=c.getContext('2d');
  x.fillStyle='rgba(18,14,16,0.84)';rr(x,6,6,500,c.height-12,14);x.fill();
  x.strokeStyle='rgba(201,163,90,0.75)';x.lineWidth=3;rr(x,6,6,500,c.height-12,14);x.stroke();
  x.textAlign='center';x.fillStyle='#efe5d6';let fs=62;
  do{x.font=`700 ${fs}px "Grenze Gotisch", Georgia, serif`;fs-=4;}while(x.measureText(title).width>460&&fs>24);
  x.fillText(title,256,sub?78:74);
  if(sub){x.fillStyle='#c9a35a';x.font='500 34px "Alegreya Sans", sans-serif';x.fillText(sub,256,136);}
  const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
  sp.scale.set(3.4*scale,3.4*scale*c.height/512,1);return sp;
}
// Low-poly dragon model; wings in userData for flap().
function makeDragon(color,scale){
  const g=new THREE.Group();
  const mat=M(color,{roughness:.55,metalness:.15});
  const dark=M(new THREE.Color(color).multiplyScalar(.42),{roughness:.7,side:THREE.DoubleSide});
  const body=mesh(new THREE.SphereGeometry(1,10,8),mat);body.scale.set(.9,.8,1.8);g.add(body);
  const belly=mesh(new THREE.SphereGeometry(.8,8,6),dark,0,-.25,.2);belly.scale.set(.9,.6,1.6);g.add(belly);
  const neck=mesh(new THREE.CylinderGeometry(.3,.5,1.5,7),mat,0,.75,1.65);neck.rotation.x=.9;g.add(neck);
  const head=mesh(new THREE.ConeGeometry(.42,1.2,6),mat,0,1.2,2.55);head.rotation.x=Math.PI/2;g.add(head);
  for(const s of[-1,1]){const h=mesh(new THREE.ConeGeometry(.09,.6,5),dark,s*.22,1.55,2.2);h.rotation.x=-.8;g.add(h);
    g.add(mesh(new THREE.SphereGeometry(.07,6,6),new THREE.MeshBasicMaterial({color:0xfff2a0}),s*.24,1.33,2.65));}
  const tail=mesh(new THREE.ConeGeometry(.45,3.2,6),mat,0,-.1,-3.1);tail.rotation.x=-Math.PI/2;g.add(tail);
  for(let i=0;i<5;i++){const sp=mesh(new THREE.ConeGeometry(.12,.45,4),dark,0,.85-i*.12,.8-i*.6);g.add(sp);}
  for(const[sx,sz]of[[-.55,.9],[.55,.9],[-.55,-.9],[.55,-.9]]){g.add(mesh(new THREE.CylinderGeometry(.14,.11,.9,6),dark,sx,-.85,sz));}
  const wg=new THREE.BufferGeometry();
  wg.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.6, 3.9,.45,.1, 2.7,0,-1.7, 0,0,.6, 2.7,0,-1.7, .2,0,-1.3],3));wg.computeVertexNormals();
  const wingL=new THREE.Group();wingL.position.set(.6,.55,.3);wingL.add(new THREE.Mesh(wg,dark));g.add(wingL);
  const wingR=new THREE.Group();wingR.position.set(-.6,.55,.3);wingR.scale.x=-1;wingR.add(new THREE.Mesh(wg,dark));g.add(wingR);
  g.userData={wingL,wingR,mats:[mat,dark],flash:0};g.scale.setScalar(scale||1);return g;
}
function flap(d,t,speed,amp){const a=Math.sin(t*speed)*amp;d.userData.wingL.rotation.z=a;d.userData.wingR.rotation.z=-a;}
function tickFlash(o,dt){const u=o.userData;if(!u.mats)return;if(u.flash>0)u.flash-=dt;const on=u.flash>0;for(const m of u.mats)m.emissive.setHex(on?0x8a2a10:0x000000);}
function makeEgg(el){const E=ELEMENTS[el];const m=mesh(new THREE.SphereGeometry(.5,18,14),new THREE.MeshStandardMaterial({color:E.color,emissive:E.color,emissiveIntensity:.45,roughness:.35,metalness:.2}));m.scale.set(1,1.35,1);return m;}
// Ruined stone wall: stacked blocks with a row of colliders. A Legendary scroll blast can shatter it.
function addWall(sc,colliders,x,z,ang,len){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ang;const mt=M(0x5d554d);
  for(let i=0;i<Math.round(len/1.5);i++){const hh=1.6+((i*37)%5)*.35;g.add(mesh(new THREE.BoxGeometry(1.45,hh,1.1),mt,-len/2+.75+i*1.5,hh/2,0));}
  sc.add(g);const c=Math.cos(ang),s=Math.sin(ang);for(let d=-len/2+.6;d<=len/2-.5;d+=1.4)colliders.push({x:x+c*d,z:z-s*d,r:.95,obj:g});}
function makeNPC(color){const g=new THREE.Group();g.add(mesh(new THREE.CylinderGeometry(.32,.45,1.3,8),M(color),0,.65,0));g.add(mesh(new THREE.SphereGeometry(.27,10,8),M(0xd9b48f),0,1.55,0));g.add(mesh(new THREE.ConeGeometry(.3,.4,8),M(0x2d2420),0,1.88,0));return g;}
function makeCritter(color){const g=new THREE.Group();const c=new THREE.Color(color).multiplyScalar(.32);const mt=M(c);
  g.add(mesh(new THREE.BoxGeometry(1,.7,1.4),mt,0,.6,0));g.add(mesh(new THREE.BoxGeometry(.7,.55,.6),mt,0,.8,.9));
  for(const s of[-.18,.18])g.add(mesh(new THREE.SphereGeometry(.08,6,6),new THREE.MeshBasicMaterial({color}),s,.9,1.21));
  for(const[x,z]of[[-.4,.5],[.4,.5],[-.4,-.5],[.4,-.5]])g.add(mesh(new THREE.BoxGeometry(.18,.4,.18),mt,x,.2,z));
  g.userData={mats:[mt],flash:0};return g;}
function makePortal(hex){const g=new THREE.Group();const ring=mesh(new THREE.TorusGeometry(2.4,.25,8,28),M(0xc9a35a,{metalness:.6,roughness:.4}),0,2.8,0);g.add(ring);
  const disc=mesh(new THREE.CircleGeometry(2.25,28),new THREE.MeshBasicMaterial({color:hex,transparent:true,opacity:.55,side:THREE.DoubleSide}),0,2.8,0);g.add(disc);
  const l=new THREE.PointLight(hex,1.6,14);l.position.y=2.8;g.add(l);g.userData.disc=disc;return g;}

// --- first-person viewmodel (weapon and carried egg)
const weaponRig=new THREE.Group();camera.add(weaponRig);
const eggVM=makeEgg('fire');eggVM.scale.multiplyScalar(.55);eggVM.position.set(0,-.5,-.95);eggVM.visible=false;camera.add(eggVM);
function buildWeaponModel(){weaponRig.clear();const w=WEAPONS[S.weapon],t=w.type||'sword';const g=new THREE.Group();
  const metal=M(w.color,{metalness:.85,roughness:.3,flatShading:false}),gold=M(0xc9a35a,{metalness:.7,roughness:.35}),grip=M(0x2b1d16);
  if(t==='bow'){// limbs as a partial torus, string, grip; held upright on the left
    const limb=mesh(new THREE.TorusGeometry(.55,.028,6,20,Math.PI*.8),M(w.color,{roughness:.6}),0,0,0);limb.rotation.z=Math.PI/2+Math.PI*.1;g.add(limb);
    const str=mesh(new THREE.BoxGeometry(.006,.006,1.04),M(0xe8e0d0),0,0,0);str.rotation.x=Math.PI/2;str.position.x=-.17;g.userData.string=str;g.add(str);
    g.add(mesh(new THREE.CylinderGeometry(.035,.035,.18,6),grip,.55,0,0));
    const arrow=new THREE.Group();arrow.add(mesh(new THREE.CylinderGeometry(.01,.01,.75,5),M(0x8a6a48),0,0,0));arrow.add(mesh(new THREE.ConeGeometry(.025,.08,5),M(0xb8b8c0,{metalness:.7}),0,.41,0));
    arrow.rotation.z=-Math.PI/2;arrow.position.set(.2,0,0);g.add(arrow);g.userData.arrow=arrow;
    g.rotation.set(0,Math.PI/2,.12);g.scale.setScalar(.55);g.position.set(.34,-.3,-.95);weaponRig.add(g);weaponRig.userData.blade=g;return;}
  const len=t==='dagger'?.42:S.weapon==='great'||S.weapon==='slayer'?1.05:.9;
  g.add(mesh(new THREE.BoxGeometry(t==='dagger'?.05:.06,len,.02),metal,0,len/2+.05,0));
  g.add(mesh(new THREE.BoxGeometry(t==='dagger'?.16:.28,.05,.07),gold,0,.05,0));
  g.add(mesh(new THREE.CylinderGeometry(.03,.03,t==='dagger'?.16:.24,6),grip,0,-.08,0));
  g.position.set(.42,-.42,-.7);g.rotation.set(-.3,0,-.25);weaponRig.add(g);weaponRig.userData.blade=g;}
buildWeaponModel();
