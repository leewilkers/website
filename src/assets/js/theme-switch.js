(function () {
  "use strict";

  const VIDEO_DURATION = 2.15;
  const VIDEO_FPS = 20;
  const HIT_SECONDS_FWD = 0.9;
  const HIT_SECONDS_REV = VIDEO_DURATION - HIT_SECONDS_FWD - (1 / VIDEO_FPS);
  const VIDEO_RATE = 0.9;
  const VIDEO_FWD = "/img/cat_light.mp4";
  const VIDEO_REV = "/img/cat_light_rev.mp4";
  const FADE_OUT_MS = 1050;
  const INTERACTION_RESOLVE_MS = 1000;

  const root = document.documentElement;
  const button = document.querySelector(".dimmer");
  const frame = document.querySelector("[data-cat-switch]");
  const video = frame && frame.querySelector("video");
  const sourceLink = frame && frame.querySelector(".cat-switch-link");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let audioCtx = null;
  let busy = false;

  const NOTE_FREQUENCIES = {
    D4: 293.66,
    Fs4: 369.99,
    A4: 440.0,
    Cs5: 554.37,
  };
  const NOTE_SEQUENCE = {
    nightToDay: { press: ["D4"], hit: ["A4", "Cs5"] },
    dayToNight: { press: ["Cs5"], hit: ["Fs4", "D4"] },
  };
  const OLD_OPTION_2 = {
    engine: "additive-key",
    attackMs: 5,
    releaseMs: 2600,
    level: 0.18,
    partials: [
      [1, "sine", 1, 0, 1],
      [2.005, "sine", 0.41, 2, 0.65],
      [3.012, "sine", 0.16, -2, 0.4],
      [4.022, "sine", 0.064, 3, 0.25],
      [5.041, "sine", 0.023, -3, 0.15],
    ],
    shoulder: 0.22,
    decayMs: 460,
    hammerMs: 25,
    hammerGain: 0.035,
    hammerDecayMs: 3,
    hammerRatio: 6,
    hammerFloorHz: 2500,
    hammerQ: 1.5,
    filterHz: 4300,
    reverbSeconds: 1.8,
    reverbSend: 0.25,
    chordStaggerMs: 25,
  };

  if (button) {
    button.setAttribute(
      "aria-pressed",
      root.getAttribute("data-theme") === "dark" ? "true" : "false",
    );
  }

  function ensureAudio() {
    try {
      if (!audioCtx) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return null;
        audioCtx = new Context();
        audioCtx._themeReverbs = new Map();
      }
      if (audioCtx.state === "suspended" && audioCtx.resume) {
        audioCtx.resume().catch(function () {});
      }
      return audioCtx;
    } catch (error) {
      return null;
    }
  }

  function getReverb(ctx) {
    const seconds = OLD_OPTION_2.reverbSeconds;
    const key = seconds.toFixed(2);
    if (ctx._themeReverbs.has(key)) return ctx._themeReverbs.get(key);
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        data[index] =
          (Math.random() * 2 - 1) * Math.pow(1 - index / length, 2.25);
      }
    }
    const convolver = ctx.createConvolver();
    const damping = ctx.createBiquadFilter();
    convolver.buffer = buffer;
    damping.type = "lowpass";
    damping.frequency.value = 2600;
    damping.Q.value = 0.4;
    convolver.connect(damping).connect(ctx.destination);
    ctx._themeReverbs.set(key, convolver);
    return convolver;
  }

  function createNoteOutput(ctx, frequency, levelScale) {
    const input = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    const panner = ctx.createStereoPanner();
    lowpass.type = "lowpass";
    lowpass.frequency.value = OLD_OPTION_2.filterHz;
    lowpass.Q.value = 0.4;
    panner.pan.value = frequency > 500 ? 0.12 : frequency < 330 ? -0.12 : 0;
    input.connect(lowpass).connect(panner).connect(ctx.destination);
    const send = ctx.createGain();
    send.gain.value = OLD_OPTION_2.reverbSend * levelScale;
    panner.connect(send).connect(getReverb(ctx));
    return input;
  }

  function scheduleEnvelope(param, when, peak, releaseScale) {
    const releaseMs = Math.max(250, OLD_OPTION_2.releaseMs * releaseScale);
    const attackEnd = when + OLD_OPTION_2.attackMs / 1000;
    const releaseEnd = when + releaseMs / 1000;
    const decayEnd = Math.min(
      releaseEnd - 0.05,
      attackEnd + OLD_OPTION_2.decayMs / 1000,
    );
    param.setValueAtTime(0.0001, when);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), attackEnd);
    param.exponentialRampToValueAtTime(
      Math.max(0.0002, peak * OLD_OPTION_2.shoulder),
      decayEnd,
    );
    param.exponentialRampToValueAtTime(0.0001, releaseEnd);
    return releaseMs;
  }

  function playHammer(ctx, frequency, when, output) {
    const length = Math.max(
      2,
      Math.floor((ctx.sampleRate * OLD_OPTION_2.hammerMs) / 1000),
    );
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const decaySamples = Math.max(
      1,
      (ctx.sampleRate * OLD_OPTION_2.hammerDecayMs) / 1000,
    );
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * Math.exp(-index / decaySamples);
    }
    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = Math.max(
      OLD_OPTION_2.hammerFloorHz,
      frequency * OLD_OPTION_2.hammerRatio,
    );
    filter.Q.value = OLD_OPTION_2.hammerQ;
    gain.gain.value = OLD_OPTION_2.hammerGain;
    noise.connect(filter).connect(gain).connect(output);
    noise.start(when);
    noise.stop(when + OLD_OPTION_2.hammerMs / 1000 + 0.01);
  }

  function playLayeredKey(ctx, frequency, when, levelScale) {
    const output = createNoteOutput(ctx, frequency, levelScale);
    playHammer(ctx, frequency, when, output);
    OLD_OPTION_2.partials.forEach(function (partial) {
      const ratio = partial[0];
      const wave = partial[1];
      const gainLevel = partial[2];
      const detune = partial[3];
      const releaseScale = partial[4];
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = wave;
      oscillator.frequency.value = frequency * ratio;
      oscillator.detune.value = detune;
      const releaseMs = scheduleEnvelope(
        gain.gain,
        when,
        OLD_OPTION_2.level * gainLevel * levelScale,
        releaseScale,
      );
      oscillator.connect(gain).connect(output);
      oscillator.start(when);
      oscillator.stop(when + releaseMs / 1000 + 0.05);
    });
  }

  function playPianoEvent(noteNames, startAt) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const start = startAt !== undefined ? startAt : ctx.currentTime;
    const levelScale = 1 / Math.sqrt(noteNames.length);
    noteNames.forEach(function (noteName, index) {
      playLayeredKey(
        ctx,
        NOTE_FREQUENCIES[noteName],
        start + (index * OLD_OPTION_2.chordStaggerMs) / 1000,
        levelScale,
      );
    });
  }

  function playPressNote(direction, when) {
    playPianoEvent(NOTE_SEQUENCE[direction].press, when);
  }

  function playResolveChord(direction, when) {
    playPianoEvent(NOTE_SEQUENCE[direction].hit, when);
  }

  function playThemeCue(direction) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const start = ctx.currentTime;
    playPressNote(direction, start);
    playResolveChord(direction, start + INTERACTION_RESOLVE_MS / 1000);
  }

  function musicDirection(goingDark) {
    return goingDark ? "dayToNight" : "nightToDay";
  }

  function applyThemeFlip(goingDark) {
    root.setAttribute("data-theme", goingDark ? "dark" : "light");
    if (button) button.setAttribute("aria-pressed", goingDark ? "true" : "false");
  }

  function setCatVisible(visible) {
    if (!frame) return;
    frame.style.setProperty(
      "--cat-fade-ms",
      visible ? "130ms" : FADE_OUT_MS + "ms",
    );
    frame.classList.toggle("is-playing", visible);
    frame.setAttribute("aria-hidden", visible ? "false" : "true");
    if (sourceLink) sourceLink.tabIndex = visible ? 0 : -1;
  }

  function releaseCat() {
    setCatVisible(false);
    window.setTimeout(function () {
      busy = false;
      if (button) button.disabled = false;
    }, FADE_OUT_MS + 80);
  }

  function finishWithoutCat() {
    busy = false;
    if (button) button.disabled = false;
  }

  function playCatThenFlip() {
    if (busy) return;
    busy = true;
    if (button) button.disabled = true;

    const goingDark = root.getAttribute("data-theme") !== "dark";
    const direction = musicDirection(goingDark);
    const forward = direction === "dayToNight";
    applyThemeFlip(goingDark);
    playThemeCue(direction);

    if (reduced || !video || video.readyState < 3) {
      finishWithoutCat();
      return;
    }

    const seekFrom = forward ? 0 : HIT_SECONDS_REV - HIT_SECONDS_FWD;

    video.src = forward ? VIDEO_FWD : VIDEO_REV;
    video.currentTime = seekFrom;
    video.playbackRate = VIDEO_RATE;
    setCatVisible(true);

    video.onended = releaseCat;
    video.onerror = function () {
      releaseCat();
    };

    const playback = video.play();
    if (playback && playback.catch) {
      playback.catch(function () {
        releaseCat();
      });
    }
  }

  window.playCatThenFlip = playCatThenFlip;
  window.toggleTheme = playCatThenFlip;
})();
