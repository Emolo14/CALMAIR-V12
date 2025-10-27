// CalmAir – premium minimalistisk m/ realistisk CO2 og konstant alarm i rød
let mic, aktiv = false, vol = 0, volSmooth = 0;
let co2 = 600;
let co2StartMillis = 0;
const CO2_START = 600;
const CO2_TARGET = 1300;
const CO2_RISE_SECONDS = 165; // ~2.75 min til 1300
let co2DriftTarget = CO2_TARGET;
let alarmOsc = null; // kontinuerlig alarm

let alarmTimer = 0, alarmSpillet = false;

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

  // --- Separatorer (tydelige) ---
  // Kraftig vertikal separator for at "separere hinanden"
  noStroke(); fill(0, 200);
  rect(width/2 - 3, 0, 6, topH);
  // Horisontal separator
  fill(0, 160); rect(0, topH-3, width, 6);

  // --- Lyd (smooth + log) ---
  if (aktiv) vol = mic.getLevel();
  volSmooth = lerp(volSmooth, vol, 0.15);
  const dbfs = 20 * Math.log10(Math.max(volSmooth, 1e-6));
  let dB = map(dbfs, -60, 0, 30, 100, true);

  // --- CO2: stiger til ~1300 over 2–3 min, derefter drift ---
  const elapsed = (millis() - co2StartMillis) / 1000;
  if (elapsed <= CO2_RISE_SECONDS) {
    const t = constrain(elapsed / CO2_RISE_SECONDS, 0, 1);
    co2 = CO2_START + (CO2_TARGET - CO2_START) * t; // lineær stigning
  } else {
    // rolig drift omkring 1200–1400 ppm
    if (frameCount % 240 === 0) {
      co2DriftTarget = constrain(CO2_TARGET + random(-150, 150), 1100, 1400);
    }
    co2 = lerp(co2, co2DriftTarget, 0.01);
  }

  // -------- Venstre: dB gauge --------
  const R = min(width/2, topH) * 0.52;
  const leftCX = width * 0.25;
  const leftCY = R + topH * 0.10; // rykket ned så den holder sig i boksen
  drawGauge(leftCX, leftCY, R, dB);

  // Tekster under viseren
  fill(255); textStyle(BOLD);
  textSize(R * 0.17); text('dB', leftCX, leftCY + R * 0.22);
  textSize(R * 0.18); text(int(dB) + ' dB', leftCX, leftCY + R * 0.40);

  // -------- Højre: Smiley --------
  const rightCX = width * 0.75;
  const rightCY = topH * 0.50;
  const dia = min(width/2, topH) * 0.78;
  drawSmiley(rightCX, rightCY, dia);

  // -------- Nederst: grøn bar --------
  noStroke(); fill('#22A95B');
  rect(0, topH, width/2, bottomH);
  rect(width/2, topH, width/2, bottomH);

  fill(255); textStyle(BOLD); textSize(bottomH * 0.58);
  text(aktiv ? 'Stop' : 'Start', width * 0.25, topH + bottomH/2);
  text(int(co2) + ' ppm',       width * 0.75, topH + bottomH/2);

  // -------- Alarm (breaking news + konstant lyd) --------
  const lydRød = aktiv && dB > 85;
  const co2Rød = co2 >= 1200;
  const alarmActive = lydRød || co2Rød;

  handleAlarmSound(alarmActive);

  if (alarmActive) {
    const msgParts = [];
    if (lydRød) msgParts.push('LYD for høj');
    if (co2Rød) msgParts.push('CO₂ for høj');
    const msg = 'ALARM – ' + msgParts.join(' & ');

    const pulse = 0.65 + 0.35 * (sin(frameCount * 6) * 0.5 + 0.5); // blid puls
    // Breaking banner øverst i top-boksen
    const bh = topH * 0.16;
    fill(244, 67, 54, 255 * pulse); // rød
    noStroke(); rect(0, topH * 0.02, width, bh);
    // gul kant
    noFill(); stroke(255, 235, 59); strokeWeight(4);
    rect(2, topH * 0.02 + 2, width - 4, bh - 4);

    noStroke(); fill(255);
    textStyle(BOLD); textSize(bh * 0.45);
    text(msg, width/2, topH * 0.02 + bh/2);
  } else {
    // nulstil blinktimer (valgfrit)
  }
}

// ---------- Gauge ----------
function drawGauge(cx, cy, R, dB) {
  push(); translate(cx, cy);
  const segs = ['#2EBF6B','#6CD06A','#B7DB5E','#F4D046','#F79A3A','#F04A3A'];
  const arcW = R * 0.16;
  const d = R * 2 - arcW;

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

// ---------- Kontinuerlig alarmlyd ----------
function handleAlarmSound(active) {
  if (active) {
    if (!alarmOsc) {
      alarmOsc = new p5.Oscillator('sine');
      alarmOsc.freq(880);
      alarmOsc.amp(0);
      alarmOsc.start();
    }
    // ramp op (kontinuerlig)
    alarmOsc.amp(0.18, 0.05);
  } else {
    if (alarmOsc) {
      // ramp ned uden klik
      alarmOsc.amp(0, 0.1);
      // vi lader den køre videre på 0 (ingen klik ved genstart)
    }
  }
}

// ---------- Interaktion ----------
function mousePressed() {
  const topH = height * 0.7;
  if (mouseY >= topH && mouseX < width/2) {
    getAudioContext().resume();
    if (!aktiv) { mic.start(); aktiv = true; }
    else { mic.stop(); aktiv = false; }
  }
}
function touchStarted(){ getAudioContext().resume(); }
