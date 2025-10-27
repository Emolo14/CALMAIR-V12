<!doctype html>
<html lang="da">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>CalmAir – fejlsikret</title>

  <!-- ✅ Stopper favicon 404 helt -->
  <link rel="icon" href="data:,">

  <style>
    html, body { margin:0; height:100%; background:#F6D466; overflow:hidden; }
    canvas { display:block; width:100vw !important; height:100vh !important; }
    /* Fejl-overlay */
    #err {
      position:fixed; inset:0; display:none; z-index:9999;
      background:rgba(0,0,0,.7); color:#fff; font:14px/1.4 system-ui, Arial;
      padding:16px; white-space:pre-wrap; overflow:auto;
    }
    #err b { color:#ff6; }
  </style>

  <!-- p5 + p5.sound -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.3/p5.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.3/addons/p5.sound.min.js"></script>
</head>
<body>
<div id="err"></div>
<script>
/* ========= Global fejlopsamler: viser fejl på skærmen ========= */
(function(){
  const box = document.getElementById('err');
  function show(msg){
    box.style.display = 'block';
    box.innerText = '⚠️ FEJL OPSTÅET:\n\n' + msg;
  }
  window.addEventListener('error', e => show((e.message||'Ukendt fejl') + '\n' + (e.filename||'') + ':' + (e.lineno||'') ));
  window.addEventListener('unhandledrejection', e => show('Promise-fejl: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason))));
})();

/* ========= CalmAir (kompakt, men fuld funktion) ========= */
let mic, aktiv = false, vol = 0, volSmooth = 0;
let micStatus = 'idle'; // idle | running | blocked | error
let co2 = 600, co2StartMillis = 0, co2DriftTarget = 1300;
const CO2_START = 600, CO2_TARGET = 1300, CO2_RISE_SECONDS = 165;
let alarmOsc = null, muteLyd = false, muteCO2 = false;
let muteBtnLeft = null, muteBtnRight = null;

function setup(){
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  textFont('Arial'); textAlign(CENTER, CENTER);
  try { mic = new p5.AudioIn(); } catch(e){ micStatus='error'; }
  co2StartMillis = millis();
}

function windowResized(){ resizeCanvas(windowWidth, windowHeight); }

function draw(){
  background('#F6D466');

  // Statustekst (hjælper fejlfinding)
  push(); textAlign(LEFT,TOP); textSize(13); fill(0,140);
  text(`Mic: ${micStatus}`, 8, 8); pop();

  if (height > width){
    fill(30); textSize(min(width,height)*0.05);
    text('Vend til landscape', width/2, height/2); return;
  }

  const topH = height*0.7, bottomH = height - topH;

  // Separatorer
  noStroke(); fill(0,200); rect(width/2 - 3, 0, 6, height);
  fill(0,160); rect(0, topH - 3, width, 6);

  // Lyd (fallback bevægelse hvis ikke aktiv)
  if (aktiv && mic){
    try { vol = mic.getLevel(); micStatus = 'running'; }
    catch(e){ micStatus='blocked'; vol = 0.01 + 0.005*(sin(frameCount*0.05)*0.5+0.5); }
  } else {
    vol = 0.01 + 0.005*(sin(frameCount*0.05)*0.5+0.5);
    if (micStatus==='running') micStatus='idle';
  }
  volSmooth = lerp(volSmooth, vol, 0.15);
  const dbfs = 20 * Math.log10(Math.max(volSmooth, 1e-6));
  let dB = map(dbfs, -60, 0, 30, 100, true);

  // CO2: stigning → drift
  const elapsed = (millis() - co2StartMillis)/1000;
  if (elapsed <= CO2_RISE_SECONDS){
    const t = constrain(elapsed/CO2_RISE_SECONDS, 0, 1);
    co2 = CO2_START + (CO2_TARGET - CO2_START) * t;
  } else {
    if (frameCount % 240 === 0) co2DriftTarget = constrain(CO2_TARGET + random(-150,150), 1100, 1400);
    co2 = lerp(co2, co2DriftTarget, 0.01);
  }

  // Venstre: dB gauge
  const R = min(width/2, topH) * 0.52;
  const leftCX = width*0.25, leftCY = R + topH*0.10;
  drawGauge(leftCX, leftCY, R, dB);
  fill(255); textStyle(BOLD);
  textSize(R*0.17); text('dB', leftCX, leftCY + R*0.22);
  textSize(R*0.18); text(int(dB) + ' dB', leftCX, leftCY + R*0.40);

  // Højre: CO2-ansigt
  const rightCX = width*0.75, rightCY = topH*0.50;
  const dia = min(width/2, topH) * 0.78;
  drawCO2Face(rightCX, rightCY, dia, co2);

  // Bund: Start/Stop + ppm
  drawBottomBar(topH, bottomH);

  // Alarmer (separat pr. side)
  const isLydRed = aktiv && dB > 85;
  const isCO2Red = co2 >= 1200;
  const toneOn = (isLydRed && !muteLyd) || (isCO2Red && !muteCO2);
  handleAlarmSound(toneOn);
  drawLeftAlarmBanner(isLydRed, topH);
  drawRightAlarmBanner(isCO2Red, topH);
}

/* ---- Tegn dB gauge ---- */
function drawGauge(cx, cy, R, dB){
  push(); translate(cx,cy);
  const segs = ['#2EBF6B','#6CD06A','#B7DB5E','#F4D046','#F79A3A','#F04A3A'];
  const arcW = R*0.16, d = R*2 - arcW;

  strokeWeight(arcW); noFill(); strokeCap(SQUARE);
  let a0 = -180;
  for (let i=0;i<segs.length;i++){
    const a1 = lerp(-180, 0, (i+1)/segs.length);
    stroke(segs[i]); arc(0,0, d,d, a0,a1);
    a0 = a1;
  }
  const theta = map(dB, 30, 100, -180, 0, true);
  stroke(0); strokeCap(ROUND); strokeWeight(arcW*0.35);
  const L = R - arcW*0.9;
  line(0,0, L*cos(theta), L*sin(theta));
  noStroke(); fill(0); circle(0,0, arcW*0.8);
  pop();
}

/* ---- Tegn CO2-ansigt ---- */
function drawCO2Face(cx, cy, dia, ppm){
  let faceCol = '#22A95B';           // grøn
  if (ppm >= 800 && ppm < 1200) faceCol = '#F7D84D';  // gul
  if (ppm >= 1200)             faceCol = '#F46B5E';  // rød

  const eyeR = dia*0.10, eyeOffX = dia*0.22, eyeOffY = dia*0.18;

  push(); translate(cx,cy);
  stroke(0); strokeWeight(dia*0.06); fill(faceCol);
  circle(0,0,dia);

  // øjne
  noStroke(); fill(0);
  circle(-eyeOffX, -eyeOffY, eyeR);
  circle( +eyeOffX, -eyeOffY, eyeR);

  // mund/bryn
  if (ppm < 800){
    // smil (opad bue)
    noFill(); stroke(0); strokeWeight(dia*0.06);
    arc(0, dia*0.05, dia*0.45, dia*0.28, 20, 160);
  } else if (ppm < 1200){
    // flad mund (streg)
    stroke(0); strokeWeight(dia*0.06);
    const mw = dia*0.38, my = dia*0.12;
    line(-mw/2, my, mw/2, my);
  } else {
    // trist/sur (nedad bue) + skrå bryn
    noFill(); stroke(0); strokeWeight(dia*0.06);
    arc(0, dia*0.22, dia*0.45, dia*0.28, 200, 340);
    const browLen = dia*0.28, by = -eyeOffY - eyeR*0.9;
    stroke(0); strokeWeight(dia*0.045);
    line(-eyeOffX - browLen*0.5, by - browLen*0.10, -eyeOffX + browLen*0.2, by + browLen*0.10);
    line( eyeOffX + browLen*0.5,  by - browLen*0.10,  eyeOffX - browLen*0.2,  by + browLen*0.10);
  }
  pop();
}

/* ---- Bundbar ---- */
function drawBottomBar(topH, h){
  // venstre (Start/Stop, pulserer når aktiv)
  if (aktiv){
    const pulse = 0.75 + 0.25 * (sin(frameCount * 0.4) * 0.5 + 0.5);
    fill(244,67,54); rect(0, topH, width/2, h);
    fill(255, 255*(pulse-0.75)); rect(0, topH, width/2, h*0.18);
  } else {
    fill('#22A95B'); rect(0, topH, width/2, h);
  }
  // højre (ppm)
  fill('#22A95B'); rect(width/2, topH, width/2, h);

  fill(255); textStyle(BOLD); textSize(h*0.58);
  text(aktiv ? 'Stop' : 'Start', width*0.25, topH + h/2);
  text(int(co2)+' ppm',         width*0.75, topH + h/2);
}

/* ---- Alarm bannere ---- */
function drawLeftAlarmBanner(active, topH){
  muteBtnLeft = null; if (!active) return;
  const x=0, w=width/2, y=topH*0.02, bh=topH*0.16;
  const pulse = 0.65 + 0.35 * (sin(frameCount*0.6)*0.5 + 0.5);
  noStroke(); fill(244,67,54, 255*pulse); rect(x,y,w,bh);
  noFill(); stroke(255,235,59); strokeWeight(4); rect(x+2,y+2,w-4,bh-4);
  noStroke(); fill(255); textStyle(BOLD); textSize(bh*0.45);
  text('ALARM – LYD for høj', x+w/2, y+bh/2);

  // venstre mute-knap
  const btnW=w*0.44, btnH=bh*0.55, btnX=x+w*0.04, btnY=y+bh+topH*0.02;
  noStroke(); fill(255); rect(btnX,btnY,btnW,btnH,12);
  fill(244,67,54); textSize(btnH*0.55);
  text(muteLyd ? 'Tænd lyd' : 'Stop lyd', btnX+btnW/2, btnY+btnH/2);
  muteBtnLeft = {x:btnX, y:btnY, w:btnW, h:btnH};
}

function drawRightAlarmBanner(active, topH){
  muteBtnRight = null; if (!active) return;
  const w=width/2, x=width/2, y=topH*0.02, bh=topH*0.16;
  const pulse = 0.65 + 0.35 * (sin(frameCount*0.6)*0.5 + 0.5);
  noStroke(); fill(244,67,54, 255*pulse); rect(x,y,w,bh);
  noFill(); stroke(255,235,59); strokeWeight(4); rect(x+2,y+2,w-4,bh-4);
  noStroke(); fill(255); textStyle(BOLD); textSize(bh*0.45);
  text('ALARM – CO₂ for høj', x+w/2, y+bh/2);

  // højre mute-knap
  const btnW=w*0.44, btnH=bh*0.55, btnX=x+w*0.52, btnY=y+bh+topH*0.02;
  noStroke(); fill(255); rect(btnX,btnY,btnW,btnH,12);
  fill(244,67,54); textSize(btnH*0.55);
  text(muteCO2 ? 'Tænd lyd' : 'Stop lyd', btnX+btnW/2, btnY+btnH/2);
  muteBtnRight = {x:btnX, y:btnY, w:btnW, h:btnH};
}

/* ---- Alarm-lyd ---- */
function handleAlarmSound(play){
  try{
    if (play){
      if (!alarmOsc){
        alarmOsc = new p5.Oscillator('sine');
        alarmOsc.freq(880); alarmOsc.amp(0); alarmOsc.start();
      }
      alarmOsc.amp(0.18, 0.05);
    } else if (alarmOsc){
      alarmOsc.amp(0, 0.1);
    }
  }catch(e){
    // Hvis lyden fejler, ignorer (UI virker stadig)
  }
}

/* ---- Input samlet (klik + touch) ---- */
function isInRect(x,y,r){ return r && x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h; }

function handlePress(x,y){
  const topH = height*0.7;

  // Venstre/højre mute-knapper
  if (isInRect(x,y,muteBtnLeft)){ muteLyd = !muteLyd; return; }
  if (isInRect(x,y,muteBtnRight)){ muteCO2 = !muteCO2; return; }

  // Bund venstre: Start/Stop
  if (y >= topH && x < width/2){
    try {
      getAudioContext().resume();
      if (!aktiv && mic){
        mic.start(); aktiv = true; micStatus = 'running';
      } else {
        if (mic) mic.stop(); aktiv = false; micStatus = 'idle';
      }
    } catch(e){
      micStatus = 'error';
    }
  }
}

function mousePressed(){ handlePress(mouseX, mouseY); }
function touchStarted(){
  getAudioContext().resume();
  if (touches && touches.length) handlePress(touches[0].x, touches[0].y);
  else handlePress(mouseX, mouseY);
  return false;
}
</script>
</body>
</html>
