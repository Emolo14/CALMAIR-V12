// CalmAir – fuld-højde separator, venstreside-alarm, pulserende STOP, mute-knap
let mic, aktiv = false, vol = 0, volSmooth = 0;
let co2 = 600;
const CO2_START = 600, CO2_TARGET = 1300, CO2_RISE_SECONDS = 165; // ~2.75 min
let co2StartMillis = 0, co2DriftTarget = CO2_TARGET;

let alarmOsc = null;         // kontinuerlig alarmtone
let alarmMuted = false;      // "Stop lyd"-mute, slår kun lyden fra
let leftBtnPulse = 0;        // puls til rød STOP i bund

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  textFont('Arial'); textAlign(CENTER, CENTER);
  mic = new p5.AudioIn();
  co2StartMillis = millis();
}

function windowResized(){ resizeCanvas(windowWidth, windowHeight); }

function draw() {
  background('#F6D466');

  // Kræv landscape
  if (height > width) {
    fill(30); textSize(min(width,height)*0.05);
    text('Vend til landscape', width/2, height/2);
    return;
  }

  const topH = height * 0.7;
  const bottomH = height - topH;

  // --- Separatorer ---
  noStroke();
  fill(0, 200); rect(width/2 - 3, 0, 6, height); // vertikal: hele vejen ned
  fill(0, 160); rect(0, topH-3, width, 6);       // horisontal

  // --- Lyd (smooth + log) ---
  if (aktiv) vol = mic.getLevel();
  volSmooth = lerp(volSmooth, vol, 0.15);
  const dbfs = 20 * Math.log10(Math.max(volSmooth, 1e-6));
  let dB = map(dbfs, -60, 0, 30, 100, true);

  // --- CO2: stigning → drift ---
  const elapsed = (millis() - co2StartMillis) / 1000;
  if (elapsed <= CO2_RISE_SECONDS) {
    const t = constrain(elapsed / CO2_RISE_SECONDS, 0, 1);
    co2 = CO2_START + (CO2_TARGET - CO2_START) * t;
  } else {
    if (frameCount % 240 === 0) {
      co2DriftTarget = constrain(CO2_TARGET + random(-150, 150), 1100, 1400);
    }
    co2 = lerp(co2, co2DriftTarget, 0.01);
  }

  // -------- Venstre: dB gauge --------
  const R = min(width/2, topH) * 0.52;
  const leftCX = width * 0.25;
  const leftCY = R + topH * 0.10;
  drawGauge(leftCX, leftCY, R, dB);

  fill(255); textStyle(BOLD);
  textSize(R * 0.17); text('dB', leftCX, leftCY + R * 0.22);
  textSize(R * 0.18); text(int(dB) + ' dB', leftCX, leftCY + R * 0.40);

  // -------- Højre: Smiley --------
  const rightCX = width * 0.75;
  const rightCY = topH * 0.50;
  const dia = min(width/2, topH) * 0.78;
  drawSmiley(rightCX, rightCY, dia);

  // -------- Nederst: Start/Stop + ppm --------
  drawBottomBar(topH, bottomH);

  // -------- Alarm (kun VENSTRE side) --------
  const lydRød = aktiv && dB > 85;
  const co2Rød = co2 >= 1200;
  const alarmActive = (lydRød || co2Rød);

  handleAlarmSound(alarmActive && !alarmMuted);   // kontinuerlig tone hvis ikke muted
  drawLeftAlarmBanner(alarmActive, topH);         // banner kun i venstre topfelt
}

// ---------- Gauge ----------
function drawGauge(cx, cy, R, dB) {
  push(); translate(cx, cy);
  const segs = ['#2EBF6B','#6CD06A','#B7DB5E','#F4D046','#F79A3A','#F04A3A'];
  const arcW = R * 0.16, d = R * 2 - arcW;

  strokeWeight(arcW); noFill(); strokeCap(SQUARE);
  let a0 = -180;
  for (let i = 0; i < segs.length; i++) {
    const a1 = lerp(-180, 0, (i + 1) / segs.length);
    stroke(segs[i]); arc(0, 0, d, d, a0, a1);
    a0 = a1;
  }

  // viser
  const theta = map(dB, 30, 100, -180, 0, true);
  stroke(0); strokeCap(ROUND); strokeWeight(arcW * 0.35);
  const L = R - arcW * 0.9;
  line(0, 0, L * cos(theta), L * sin(theta));
  noStroke(); fill(0); circle(0, 0, arcW * 0.8);
  pop();
}

// ---------- Smiley ----------
function drawSmiley(cx, cy, dia) {
  let face = '#22A95B';
  if (co2 >= 800 && co2 < 1200) face = '#F7D84D';
  if (co2 >= 1200) face = '#F46B5E';

  push(); translate(cx, cy);
  stroke(0); strokeWeight(dia * 0.06); fill(face);
  circle(0, 0, dia);

  noStroke(); fill(0);
  const eye = dia * 0.10, off = dia * 0.22;
  circle(-off, -off * 0.6, eye);
  circle( off, -off * 0.6, eye);

  noFill(); stroke(0); strokeWeight(dia * 0.06);
  arc(0, dia * 0.02, dia * 0.42, dia * 0.30, 20, 160);
  pop();
}

// ---------- Bundbar (Start/Stop + ppm) ----------
function drawBottomBar(topH, h) {
  // venstre felt
  if (aktiv) {
    // pulserende rød STOP
    leftBtnPulse = 0.7 + 0.3 * (sin(frameCount * 6 * 0.5) * 0.5 + 0.5);
    fill(244, 67, 54); // rød
    rect(0, topH, width/2, h);
    // lys overlay for puls-effekt
    fill(255, 255 * (leftBtnPulse - 0.7));
    rect(0, topH, width/2, h/6);
  } else {
    fill('#22A95B'); rect(0, topH, width/2, h); // grøn
  }
  // højre felt (ppm)
  fill('#22A95B'); rect(width/2, topH, width/2, h);

  // Tekster
  fill(255); textStyle(BOLD);
  textSize(h * 0.58);
  text(aktiv ? 'Stop' : 'Start', width * 0.25, topH + h/2);
  text(int(co2) + ' ppm',        width * 0.75, topH + h/2);
}

// ---------- Alarm banner (kun venstre side) ----------
function drawLeftAlarmBanner(active, topH) {
  if (!active) return;
  // banner-dimensioner
  const x = 0, y = topH * 0.02, w = width / 2, bh = topH * 0.16;
  const pulse = 0.65 + 0.35 * (sin(frameCount * 6) * 0.5 + 0.5);

  // rød baggrund + gul kant
  noStroke(); fill(244, 67, 54, 255 * pulse); rect(x, y, w, bh);
  noFill(); stroke(255, 235, 59); strokeWeight(4); rect(x+2, y+2, w-4, bh-4);

  // tekst
  noStroke(); fill(255); textStyle(BOLD); textSize(bh * 0.45);
  let msg = 'ALARM – ';
  if (co2 >= 1200) msg += 'CO₂ for høj';
  if (co2 >= 1200 && (volSmooth > 0)) msg += ' • ';
  if (20*Math.log10(Math.max(volSmooth,1e-6)) > -10) msg += 'LYD for høj'; // ekstra note
  text(msg, x + w/2, y + bh/2);

  // "Stop lyd" mute-knap (kun venstre side)
  const btnW = w * 0.42, btnH = bh * 0.55;
  const btnX = x + w * 0.05, btnY = y + bh + topH * 0.02;
  fill(255); noStroke(); rect(btnX, btnY, btnW, btnH, 10);
  fill(244, 67, 54); textSize(btnH * 0.55); text('Stop lyd', btnX + btnW/2, btnY + btnH/2);

  // gem hitbox til klik
  lastMuteBtn = {x: btnX, y: btnY, w: btnW, h: btnH};
}
let lastMuteBtn = null;

// ---------- Lydstyring (kontinuerlig tone) ----------
function handleAlarmSound(active) {
  if (active) {
    if (!alarmOsc) {
      alarmOsc = new p5.Oscillator('sine');
      alarmOsc.freq(880);
      alarmOsc.amp(0);
      alarmOsc.start();
    }
    alarmOsc.amp(0.18, 0.05); // ramp op
  } else {
    if (alarmOsc) alarmOsc.amp(0, 0.1); // ramp ned (behold oscillator for at undgå klik)
  }
}

// ---------- Interaktion ----------
function mousePressed() {
  const topH = height * 0.7;

  // Klik på MUTE "Stop lyd"?
  if (lastMuteBtn && mouseX >= lastMuteBtn.x && mouseX <= lastMuteBtn.x + lastMuteBtn.w &&
      mouseY >= lastMuteBtn.y && mouseY <= lastMuteBtn.y + lastMuteBtn.h) {
    alarmMuted = true; // slå kun lyden fra (banner bliver)
    return;
  }

  // Bund venstre: Start/Stop måling
  if (mouseY >= topH && mouseX < width/2) {
    getAudioContext().resume();
    alarmMuted = false; // nulstil mute ved ny start/stop
    if (!aktiv) { mic.start(); aktiv = true; }
    else { mic.stop(); aktiv = false; }
  }
}
function touchStarted(){ getAudioContext().resume(); }
