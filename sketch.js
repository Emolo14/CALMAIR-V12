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
  background('#F6D466'); // gul

  // Kræv landscape
  if (height > width) {
    fill(30); textSize(min(width,height)*0.05);
    text('Vend til landscape', width/2, height/2);
    return;
  }

  const topH = height * 0.7;
  const bottomH = height - topH;

  // Delestreger
  stroke(0,60); strokeWeight(3);
  line(width/2, 0, width/2, topH);
  line(0, topH, width, topH);
  noStroke();

  // Data
  if (aktiv) vol = mic.getLevel();
  volSmooth = lerp(volSmooth, vol, 0.15); // smoothing
  const dbfs = 20 * Math.log10(Math.max(volSmooth, 1e-6));
  let dB = map(dbfs, -60, 0, 30, 100, true);

  co2 += random(-co2Speed, co2Speed) * co2Trend;
  if (frameCount % 200 === 0) { co2Trend = random([-1,1]); co2Speed = random(0.3,1.2); }
  co2 = constrain(co2, 300, 2000);

  // -------- Venstre: dB gauge --------
  // Gør R lidt mindre og placer den lavere, så buen er klart inde i boksen
  const R = min(width/2, topH) * 0.52;        // var 0.56 -> mindre
  const leftCX = width * 0.25;
  const leftCY = R + topH * 0.10;             // fast: lidt margin fra top

  drawGauge(leftCX, leftCY, R, dB);

  // Labels under viseren (flytter naturligt med centeret)
  fill(255); textStyle(BOLD);
  textSize(R * 0.17);
  text('dB', leftCX, leftCY + R * 0.22);
  textSize(R * 0.18);
  text(int(dB) + ' dB', leftCX, leftCY + R * 0.40);

  // -------- Højre: smiley --------
  const rightCX = width * 0.75;
  const rightCY = topH * 0.50;
  const dia = min(width/2, topH) * 0.78;
  drawSmiley(rightCX, rightCY, dia);

  // -------- Nederst: grøn bar --------
  noStroke(); fill('#22A95B');
  rect(0, topH, width/2, bottomH);
  rect(width/2, topH, width/2, bottomH);

  fill(255); textStyle(BOLD);
  textSize(bottomH * 0.58);
  text(aktiv ? 'Stop' : 'Start', width * 0.25, topH + bottomH/2);
  text(int(co2) + ' ppm',       width * 0.75, topH + bottomH/2);

  // Alarm
  if (dB > 85 && aktiv && !alarmSpillet) {
    alarmLyd(); alarmSpillet = true; alarmTimer = millis();
  } else if (dB <= 85) alarmSpillet = false;

  if (millis() - alarmTimer < 1500) {
    fill(0,0,0,160); textSize(height*0.055);
    text('Lyden er for høj!', width/2, topH * 0.12);
  }
}

// ---------- Tegn gauge ----------
function drawGauge(cx, cy, R, dB) {
  push(); translate(cx, cy);

  const segs = ['#2EBF6B','#6CD06A','#B7DB5E','#F4D046','#F79A3A','#F04A3A'];
  const arcW = R * 0.16;
  const d = (R*2 - arcW);

  strokeWeight(arcW); noFill(); strokeCap(SQUARE);
  let a0 = -180;
  for (let i=0;i<segs.length;i++){
    const a1 = lerp(-180, 0, (i+1)/segs.length);
    stroke(segs[i]);
    arc(0, 0, d, d, a0, a1);
    a0 = a1;
  }

  // VISER
  const theta = map(dB, 30, 100, -180, 0, t
