// CalmAir – venstre: lyd-alarm, højre: CO2-alarm, emoji 😐/😡, pulserende STOP
let mic, aktiv = false, vol = 0, volSmooth = 0;
let co2 = 600, co2StartMillis = 0, co2DriftTarget = 1300;
const CO2_START = 600, CO2_TARGET = 1300, CO2_RISE_SECONDS = 165; // ~2.75 min
let alarmOsc = null, alarmMuted = false;

let muteBtnLeft = null;  // hitbox venstre "Stop lyd"
let muteBtnRight = null; // hitbox højre "Stop lyd"

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

  if (height > width) {
    fill(30); textSize(min(width,height)*0.05);
    text('Vend til landscape', width/2, height/2);
    return;
  }

  const topH = height * 0.7;
  const bottomH = height - topH;

  // ===== Separatorer (fuld højde) =====
  noStroke();
  fill(0, 200); rect(width/2 - 3, 0, 6, height); // vertikal hele vejen ned
  fill(0, 160); rect(0, topH - 3, width, 6);     // horisontal

  // ===== Lyd (smooth + log) =====
  if (aktiv) vol = mic.getLevel();
  volSmooth = lerp(volSmooth, vol, 0.15);
  const dbfs = 20 * Math.log10(Math.max(volSmooth, 1e-6));
  let dB = map(dbfs, -60, 0, 30, 100, true);

  // ===== CO2: stigning → drift =====
  const elapsed = (millis() - co2StartMillis) / 1000;
  if (elapsed <= CO2_RISE_SECONDS) {
    const t = constrain(elapsed / CO2_RISE_SECONDS, 0, 1);
    co2 = CO2_START + (CO2_TARGET - CO2_START) * t;
  } else {
    if (frameCount % 240 === 0) co2DriftTarget = constrain(CO2_TARGET + random(-150, 150), 1100, 1400);
    co2 = lerp(co2, co2DriftTarget, 0.01);
  }

  // ===== Venstre: dB gauge =====
  const R = min(width/2, topH) * 0.52;
  const leftCX = width * 0.25;
  const leftCY = R + topH * 0.10; // rykket ned så buen er i boksen
  drawGauge(leftCX, leftCY, R, dB);

  fill(255); textStyle(BOLD);
  textSize(R * 0.17); text('dB', leftCX, leftCY + R * 0.22);
  textSize(R * 0.18); text(int(dB) + ' dB', leftCX, leftCY + R * 0.40);

  // ===== Højre: Smiley med emoji (🙂 / 😐 / 😡) =====
  const rightCX = width * 0.75, rightCY = topH * 0.50;
  const dia = min(width/2, topH) * 0.78;
  drawEmojiFace(rightCX, rightCY, dia);

  // ===== Bund: venstre Start/Stop + højre ppm =====
  drawBottomBar(topH, bottomH);

  // ===== Alarmer =====
  const lydRød = aktiv && dB > 85;  // venstre alarm
  const co2Rød = co2 >= 1200;       // højre alarm

  // Kontinuerlig alarmtone når en af dem er rød (med mute)
  handleAlarmSound((lydRød || co2Rød) && !alarmMuted);

  // Banner kun på den relevante side
  drawLeftAlarmBanner(lydRød, topH);
  drawRightAlarmBanner(co2Rød, topH);
}

/* ---------------- Gauge (venstre) ---------------- */
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

/* ---------------- Emoji-face (højre) ---------------- */
function drawEmojiFace(cx, cy, dia) {
  // farve efter CO2
  let faceCol = '#22A95B'; // grøn
  let emoji = '🙂';
  if (co2 >= 800 && co2 < 1200) { faceCol = '#F7D84D'; emoji = '😐'; }
  if (co2 >= 1200) { faceCol = '#F46B5E'; emoji = '😡'; }

  push(); translate(cx, cy);
  stroke(0); strokeWeight(dia * 0.06); fill(faceCol);
  circle(0, 0, dia);

  // emoji-tegn i midten
  noStroke(); fill(0);
  textAlign(CENTER, CENTER);
  // stor tekststørrelse, men hold lidt margin
  textSize(dia * 0.45);
  text(emoji, 0, dia * 0.02); // en anelse ned for optisk centrering
  pop();
}

/* ---------------- Bundbar ---------------- */
function drawBottomBar(topH, h) {
  // venstre (Start/Stop)
  if (aktiv) {
    const pulse = 0.75 + 0.25 * (sin(frameCount * 4) * 0.5 + 0.5);
    fill(244, 67, 54); rect(0, topH, width/2, h);        // rød
    fill(255, 255 * (pulse - 0.75)); rect(0, topH, width/2, h * 0.18); // lys puls
  } else {
    fill('#22A95B'); rect(0, topH, width/2, h);          // grøn
  }
  // højre (ppm)
  fill('#22A95B'); rect(width/2, topH, width/2, h);

  fill(255); textStyle(BOLD); textSize(h * 0.58);
  text(aktiv ? 'Stop' : 'Start', width * 0.25, topH + h/2);
  text(int(co2) + ' ppm',        width * 0.75, topH + h/2);
}

/* ---------------- Venstre alarm (LYD) ---------------- */
function drawLeftAlarmBanner(active, topH) {
  muteBtnLeft = null;
  if (!active) return;

  const x = 0, w = width/2;
  const y = topH * 0.02, bh = topH * 0.16;
  const pulse = 0.65 + 0.35 * (sin(frameCount * 6) * 0.5 + 0.5);

  noStroke(); fill(244, 67, 54, 255 * pulse); rect(x, y, w, bh);
  noFill(); stroke(255, 235, 59); strokeWeight(4); rect(x+2, y+2, w-4, bh-4);

  noStroke(); fill(255); textStyle(BOLD); textSize(bh * 0.45);
  text('ALARM – LYD for høj', x + w/2, y + bh/2);

  // Stop lyd-knap
  const btnW = w * 0.44, btnH = bh * 0.55;
  const btnX = x + w * 0.04, btnY = y + bh + topH * 0.02;
  noStroke(); fill(255); rect(btnX, btnY, btnW, btnH, 12);
  fill(244, 67, 54); textSize(btnH * 0.55); text('Stop lyd', btnX + btnW/2, btnY + btnH/2);
  muteBtnLeft = {x: btnX, y: btnY, w: btnW, h: btnH};
}

/* ---------------- Højre alarm (CO2) ---------------- */
function drawRightAlarmBanner(active, topH) {
  muteBtnRight = null;
  if (!active) return;

  const w = width/2, x = width/2;
  const y = topH * 0.02, bh = topH * 0.16;
  const pulse = 0.65 + 0.35 * (sin(frameCount * 6) * 0.5 + 0.5);

  noStroke(); fill(244, 67, 54, 255 * pulse); rect(x, y, w, bh);
  noFill(); stroke(255, 235, 59); strokeWeight(4); rect(x+2, y+2, w-4, bh-4);

  noStroke(); fill(255); textStyle(BOLD); textSize(bh * 0.45);
  text('ALARM – CO₂ for høj', x + w/2, y + bh/2);

  // Stop lyd-knap (på højre side også)
  const btnW = w * 0.44, btnH = bh * 0.55;
  const btnX = x + w * 0.52, btnY = y + bh + topH * 0.02;
  noStroke(); fill(255); rect(btnX, btnY, btnW, btnH, 12);
  fill(244, 67, 54); textSize(btnH * 0.55); text('Stop lyd', btnX + btnW/2, btnY + btnH/2);
  muteBtnRight = {x: btnX, y: btnY, w: btnW, h: btnH};
}

/* ---------------- Alarm-lyd (kontinuerlig) ---------------- */
function handleAlarmSound(active) {
  if (active) {
    if (!alarmOsc) {
      alarmOsc = new p5.Oscillator('sine');
      alarmOsc.freq(880); alarmOsc.amp(0); alarmOsc.start();
    }
    alarmOsc.amp(0.18, 0.05);  // ramp op
  } else if (alarmOsc) {
    alarmOsc.amp(0, 0.1);      // ramp ned
  }
}

/* ---------------- Interaktion ---------------- */
function mousePressed() {
  const topH = height * 0.7;

  // Klik på "Stop lyd" venstre?
  if (muteBtnLeft &&
      mouseX >= muteBtnLeft.x && mouseX <= muteBtnLeft.x + muteBtnLeft.w &&
      mouseY >= muteBtnLeft.y && mouseY <= muteBtnLeft.y + muteBtnLeft.h) {
    alarmMuted = true;
    return;
  }
  // Klik på "Stop lyd" højre?
  if (muteBtnRight &&
      mouseX >= muteBtnRight.x && mouseX <= muteBtnRight.x + muteBtnRight.w &&
      mouseY >= muteBtnRight.y && mouseY <= muteBtnRight.y + muteBtnRight.h) {
    alarmMuted = true;
    return;
  }

  // Bund venstre: Start/Stop måling (rød/grøn knap)
  if (mouseY >= topH && mouseX < width/2) {
    getAudioContext().resume();
    alarmMuted = false; // unmute ved ny toggling
    if (!aktiv) { mic.start(); aktiv = true; }
    else { mic.stop(); aktiv = false; }
  }
}
function touchStarted(){ getAudioContext().resume(); }
