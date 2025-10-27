/* ---------------- Interaktion (klik + touch) ---------------- */
function isInRect(x, y, r){ return x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h; }

function handlePress(x, y){
  const topH = height * 0.7;

  // Venstre/højre "Stop/Tænd lyd" (mute-toggles)
  if (muteBtnLeft && isInRect(x, y, muteBtnLeft)) { muteLyd = !muteLyd; return; }
  if (muteBtnRight && isInRect(x, y, muteBtnRight)) { muteCO2 = !muteCO2; return; }

  // Bund venstre: Start/Stop måling
  if (y >= topH && x < width/2) {
    getAudioContext().resume();
    if (!aktiv) { mic.start(); aktiv = true; }
    else { mic.stop(); aktiv = false; }
    return;
  }
}

function mousePressed(){ handlePress(mouseX, mouseY); }
function touchStarted(){
  // p5 kalder ofte også mousePressed ved touch, men vi sikrer os alligevel
  getAudioContext().resume();
  if (touches && touches.length) {
    handlePress(touches[0].x, touches[0].y);
  } else {
    handlePress(mouseX, mouseY);
  }
  // return false for at forhindre dobbelte events på mobil
  return false;
}
