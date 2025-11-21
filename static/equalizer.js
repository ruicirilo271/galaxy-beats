function startEqualizer(audioId, canvasId) {
  const audio = document.getElementById(audioId);
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");

  if (!audio._eqInitialized) {
    canvas.width = 600;
    canvas.height = 150;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtx.createMediaElementSource(audio);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    src.connect(analyser);
    analyser.connect(audioCtx.destination);

    audio._eqInitialized = true;
    audio._analyser = analyser;
    audio._audioCtx = audioCtx;
  }

  const analyser = audio._analyser;
  const buffer = new Uint8Array(analyser.frequencyBinCount);

  function draw() {
    if (audio.paused || audio.ended) {
      requestAnimationFrame(draw);
      return;
    }

    analyser.getByteFrequencyData(buffer);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barCount = 64;
    const barWidth = canvas.width / barCount;

    for (let i = 0; i < barCount; i++) {
      const v = buffer[i];
      const h = (v / 255) * canvas.height;
      ctx.fillStyle = "#00eaff";
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#00eaff";
      ctx.fillRect(i * barWidth, canvas.height - h, barWidth - 2, h);
    }

    requestAnimationFrame(draw);
  }

  draw();
}

