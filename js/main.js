// ========================================================================
// DragonBlood · Main loop & boot
// Per-minute tick, per-frame update/render, and game start. Loads last.
// ========================================================================
'use strict';
// Slow tick (once a minute): Holy Water, HUD, season check.
setInterval(()=>{if(started){holyTick();updateHUD();if(!modalOpen&&cur&&cur.kind==='hub')checkSeason();}},60000);
// Per-frame update and render.
let last=performance.now(),T=0;
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;T+=dt;
  if(cur){const active=started&&!modalOpen&&!missionOver;
    if(active){if(cur.move)cur.move(dt);else updatePlayer(dt);}
    cur.update(dt,T,active);
    if(active){sqUpdate(dt);dpUpdate(dt);spUpdate(dt);arrowsUpdate(dt);}if(started){sqTick();dpHUD();if(dpAcc%6===0)spHUD();}
    updateStaminaHUD();
    if(started){if(cur.placeCam)cur.placeCam();else placeCamera();}else{const a=T*.06;camera.position.set(Math.sin(a)*27,9,Math.cos(a)*27);camera.lookAt(0,3,-6);}
    updateViewmodel(dt);renderer.render(cur.scene,camera);}
  hudTick(dt);requestAnimationFrame(frame);}
// --- boot
setScene(buildHub());showTitle();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(cur&&cur.kind==='hub'&&!modalOpen){const px=P.x,pz=P.z;setScene(buildHub());P.x=px;P.z=pz;}});
requestAnimationFrame(frame);
