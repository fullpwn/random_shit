const audioCtx = new AudioContext();
const audioPlayer = document.getElementById('audio');
const localAudioElement = document.getElementById('audioFileInput');
localAudioElement.addEventListener('change', loadLocalFile);
const canvas = document.getElementById('canvas'),
      ctx = canvas.getContext('2d'),
      container = document.getElementById('container');
const audioSource = audioCtx.createMediaElementSource(audioPlayer);
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 32768; // maxes out FFT size
const dataArray = new Float32Array(analyser.fftSize);
audioSource.connect(audioCtx.destination);
audioSource.connect(analyser);

const visualizerSettings = {
  inputSize: 2048,
  outputSize: 1024,
  compensateDC: true,
  polarity: 'both',
  freeze: false
},
      loader = {
        url: '',
        load: function() {
          audioPlayer.src = this.url;
          audioPlayer.play();
        },
        loadLocal: function() {
          localAudioElement.click();
        }
      };

let gui = new dat.GUI();
gui.add(loader, 'url').name('URL');
gui.add(loader, 'load').name('Load');
gui.add(loader, 'loadLocal').name('Load from local device');
let settings = gui.addFolder('Visualization settings');
settings.add(visualizerSettings, 'inputSize', 32, 32768, 1).name('Input size');
settings.add(visualizerSettings, 'outputSize', 32, 32768, 1).name('Output size');
settings.add(visualizerSettings, 'compensateDC').name('Compensate for DC offset');
settings.add(visualizerSettings, 'polarity', ['up', 'down', 'both']).name('Polarity');
settings.add(visualizerSettings, 'freeze').name('Freeze analyser');

function resizeCanvas() {
  const scale = devicePixelRatio;
  canvas.width = container.clientWidth*scale;
  canvas.height = container.clientHeight*scale;
}

addEventListener('click', () => {
  if (audioCtx.state == 'suspended')
    audioCtx.resume();
});
addEventListener('resize', resizeCanvas);
resizeCanvas();

function loadLocalFile(event) {
  const file = event.target.files[0],
        reader = new FileReader();
  reader.onload = (e) => {
    audioPlayer.src = e.target.result;
    audioPlayer.play();
  };

  reader.readAsDataURL(file);
}
const test = map(0, 0, 1, -1, 1); // Smoke testing
visualize();
function visualize() {
  requestAnimationFrame(visualize);
  if (!visualizerSettings.freeze) {
    analyser.getFloatTimeDomainData(dataArray);
  }
  const data = [];
  for (let i = 0; i < visualizerSettings.inputSize; i++) {
    data[i] = dataArray[i+analyser.fftSize-visualizerSettings.inputSize];
  }
  const oscilloscope = calcOscilloscope(data, visualizerSettings.outputSize, visualizerSettings.compensateDC, visualizerSettings.polarity);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  oscilloscope.map((x, i, arr) => {
    ctx.lineTo(map(i, 0, arr.length-1, 0, canvas.width), map(x, -1, 1, canvas.height, 0));
  })
  ctx.stroke();
}

function calcOscilloscope(waveform, outputSize, compensateDC = true, polarity = 'regardless') {
  const dataArray = [];
  let dc = 0;
  waveform.map(x => {
    dc += x * compensateDC; // account for DC offset
  });
  dc /= waveform.length;
  let idx = 0;
  for (let i = 1; i < waveform.length-outputSize; i++) {
    if (
       ((waveform[i-1] >= dc && waveform[i] < dc) && polarity !== 'up') ||
       ((waveform[i-1] < dc && waveform[i] >= dc) && polarity !== 'down'))
      idx = i;
  }
  for (let i = 0; i < Math.min(waveform.length, outputSize); i++) {
    dataArray[i] = waveform[i+idx];
  }
  return dataArray;
}