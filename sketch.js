let mic, aktiv = false, vol = 0, volSmooth = 0;
let co2 = 600, co2Trend = 1, co2Speed = 0.5;
let alarmTimer = 0, alarmSpillet = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  textFont('Arial');
  textAlign(CENTER, CENTER);
  mic = new p5.AudioIn();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

function draw() {
  background('#F6D466');

  // Kræv landscape
  if (height > width) {
    fill(30);
    textSize(min(width, height) * 0.05);
    text('Vend til landscape', width / 2, height / 2);
    return;
  }

  const topH = height * 0.7;
  const bottomH = height - topH;

  // Delestreger
  stroke(0, 60); strokeWeight(3);
  line(width / 2, 0, width / 2, topH);
  line(0, topH, width, topH);
  noStroke();

  // Lyddata (glat + log-mapping)
  if (aktiv) vol = mic.getLevel();
  volSmooth = lerp(volSmooth, vol, 0.15);
  const dbfs = 20 * Math.log10(Math.max(volSmooth, 1e-6));
  let dB = map(dbfs, -60, 0, 30, 100, true);

  // CO2 drift
  co2 += random(-co2Speed, co2Speed) * co2Trend;
  if (frameCount % 200 === 0) { co2Trend = random([-1, 1]); co2Speed = random(0.3, 1.2); }
  co2 = constrain(co2, 300, 2000);

  // --- dB gauge (rykket ned + lidt mindre) ---
  const R = min(width / 2, topH) * 0.52;
  const leftCX = width * 0.25;
  const leftCY = R + topH * 0.10;
  drawGauge(leftCX, leftCY, R, dB);

  // Tekst under viseren
  fill(255); textStyle(BOLD);
  textSize(R * 0.17);
  text('dB', leftCX, leftCY + R * 0.22);
  textSize(R * 0.18);
  text(int(dB) + ' dB', leftCX, leftCY + R * 0.40);

  // --- Smiley ---
  const rightCX = width * 0.75;
  const rightCY = topH * 0.50;
  const dia = min(width / 2, topH) * 0.78;
  drawSmiley(rightCX, rightCY, dia);

  // --- Bundbar ---
  noStroke(); fill('#22A95B');
  rect(0, topH, width / 2, bottomH);
  rect(width / 2, topH, width / 2, bottomH);

  fill(255); textStyle(BOLD);
  textSize(bottomH * 0.58);
  text(aktiv ? 'Stop' : 'Start', width * 0.25, topH + bottomH / 2);
  text(int(co2) + ' ppm',       width * 0.75, topH + bottomH / 2);

  // --- Alarm ---
  if (dB > 85 && aktiv && !alarmSpillet) {
    alarmLyd(); alarmSpillet = true; alarmTimer = millis();
  } else if (dB <= 85) {
    alarmSpillet = false;
  }

  if (millis() - alarmTimer < 1500) {
    fill(0, 0, 0, 160);
    textSize(height * 0.055);
    text('Lyden er for høj!', width / 2, topH * 0.12);
  }
}

// ---------- Tegn gauge ----------
function drawGauge(cx, cy, R, dB) {
  push();
  translate(cx, cy);

  const segs = ['#2EBF6B', '#6CD06A', '#B7DB5E', '#F4D046', '#F79A3A', '#F04A3A'];
  const arcW = R * 0.16;
  const d = R * 2 - arcW;

  strokeWeight(arcW);
  noFill();
  strokeCap(SQUARE);

  let a0 = -180;
  for (let i = 0; i < segs.length; i++) {
    const a1 = lerp(-180, 0, (i + 1) / segs.length);
    stroke(segs[i]);
    arc(0, 0, d, d, a0, a1);
    a0 = a1;
  }

  // Viser
  const theta = map(dB, 30, 100, -180, 0, true);
  stroke(0);
  strokeCap(ROUND);
  strokeWeight(arcW * 0.35);
  const L = R - arcW * 0.9;
  line(0, 0, L * cos(theta), L * sin(theta));
  noStroke();
  fill(0);
  circle(0, 0, arcW * 0.8);
  pop();
}

// ---------- Smiley ----------
function drawSmiley(cx, cy, dia) {
  let face = '#22A95B';
  if (co2 >= 800 && co2 < 1200) face = '#F7D84D';
  if (co2 >= 1200) face = '#F46B5E';

  push();
  translate(cx, cy);
  stroke(0);
  strokeWeight(dia * 0.06);
  fill(face);
  circle(0, 0, dia);

  noStroke();
  fill(0);
  const eye = dia * 0.10;
  const off = dia * 0.22;
  circle(-off, -off * 0.6, eye);
  circle( off, -off * 0.6, eye);

  noFill();
  stroke(0);
  strokeWeight(dia * 0.06);
  arc(0, dia * 0.02, dia * 0.42, dia * 0.30, 20, 160);
  pop();
}

// ---------- Interaktion ----------
function mousePressed() {
  const topH = height * 0.7;
  if (mouseY >= topH && mouseX < width / 2) {
    getAudioContext().resume();
    if (!aktiv) { mic.start(); aktiv = true; }
    else { mic.stop(); aktiv = false; }
  }
}
function touchStarted() { getAudioContext().resume(); }

// ---------- Alarm ----------
function alarmLyd() {
  let osc = new p5.Oscillator('sine');
  osc.freq(880);
  osc.amp(0.18);
  osc.start();
  setTimeout(() => osc.stop(), 180);
}
