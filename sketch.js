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

  drawGauge(leftCX, leftCY, R, dB)
