// ==========================================
// LICENSE & GUI
// ==========================================
async function checkLicense() {
    const input = document.getElementById('license-input').value.trim();
    const btn = document.querySelector('.btn-unlock');
    const err = document.getElementById('license-error');

    if (!input) return;

    // Loading State
    btn.innerText = "VERIFYING...";
    btn.disabled = true;
    err.style.display = 'none';

    try {
        const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `product_permalink=jazz-harmony&license_key=${input}`
        });

        const data = await response.json();

        if (data.success && !data.purchase.refunded && !data.purchase.chargebacked) {
            unlockApp();
            localStorage.setItem('jazzLicense', input);
            btn.innerText = "SUCCESS!";
        } else {
            throw new Error("Invalid Key");
        }
    } catch (error) {
        err.style.display = "block";
        err.innerText = "Invalid License Key. Please check your email.";
        btn.innerText = "UNLOCK APP";
        btn.disabled = false;
    }
}
function unlockApp() {
    document.getElementById('license-wall').style.display = 'none';
    document.getElementById('app-content').classList.remove('hidden-app');
    document.body.style.overflow = 'auto'; // Enable scroll
}
function toggleGuide() {
    const modal = document.getElementById('guide-modal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}

// Auto-check logic
window.onload = function () {
    if (localStorage.getItem('jazzLicense')) unlockApp();
};


// ==========================================
// 1. THEORY ENGINE
// ==========================================
const BASE_NOTES = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
function getNoteName(cofIndex) {
    const offset = cofIndex + 1;
    const letter = BASE_NOTES[((offset % 7) + 7) % 7];
    const altCount = Math.floor(offset / 7);
    let acc = "";
    if (altCount > 0) acc = altCount === 1 ? "♯" : "𝄪";
    else if (altCount < 0) acc = altCount === -1 ? "♭" : "♭♭";
    return letter + acc;
}
const COF_DELTAS = { 'P1': 0, 'b2': -7, 'M2': 2, 'm3': -3, 'M3': 4, 'P4': -1, '#4': 6, 'b5': -6, 'P5': 1, '#5': 8, 'm6': -4, 'M6': 3, 'm7': -2, 'M7': 5, 'b9': -5, 'M9': 2, '#9': 9, 'P11': -1, '#11': 6, 'b13': -4, 'M13': 3 };

// ==========================================
// 2. VOICING & TEMPLATES (MASSIVE UPDATE)
// ==========================================
const VOICINGS_BASIC = {
    // MAJOR
    'maj9_A': { semitones: [4, 7, 11, 14], intervals: ['M3', 'P5', 'M7', 'M9'] },
    'maj9_B': { semitones: [11, 14, 16, 19], intervals: ['M7', 'M9', 'M3', 'P5'] },
    'maj69_A': { semitones: [4, 9, 14, 19], intervals: ['M3', 'M6', 'M9', 'P5'] },
    'maj69_B': { semitones: [9, 14, 16, 19], intervals: ['M6', 'M9', 'M3', 'P5'] },
    'majSharp11_A': { semitones: [4, 6, 11, 14], intervals: ['M3', '#11', 'M7', 'M9'] },
    'majSharp11_B': { semitones: [11, 14, 16, 18], intervals: ['M7', 'M9', 'M3', '#11'] },

    // MINOR
    'min9_A': { semitones: [3, 7, 10, 14], intervals: ['m3', 'P5', 'm7', 'M9'] },
    'min9_B': { semitones: [10, 14, 15, 19], intervals: ['m7', 'M9', 'm3', 'P5'] },
    'min11_A': { semitones: [3, 7, 10, 17], intervals: ['m3', 'P5', 'm7', 'P11'] },
    'min69_A': { semitones: [3, 9, 14, 19], intervals: ['m3', 'M6', 'M9', 'P5'] },
    'min69_B': { semitones: [9, 14, 15, 19], intervals: ['M6', 'M9', 'm3', 'P5'] },
    'minMaj9_A': { semitones: [3, 7, 11, 14], intervals: ['m3', 'P5', 'M7', 'M9'] },
    'minMaj9_B': { semitones: [11, 14, 15, 19], intervals: ['M7', 'M9', 'm3', 'P5'] },

    // DOMINANT
    'dom13_A': { semitones: [4, 10, 14, 21], intervals: ['M3', 'm7', 'M9', 'M13'] },
    'dom13_B': { semitones: [10, 14, 16, 21], intervals: ['m7', 'M9', 'M3', 'M13'] },
    'domAlt_A': { semitones: [4, 8, 10, 15], intervals: ['M3', '#5', 'm7', '#9'] },
    'domAlt_B': { semitones: [10, 15, 16, 20], intervals: ['m7', '#9', 'M3', 'b13'] },
    'dom7b9_A': { semitones: [4, 10, 13, 16], intervals: ['M3', 'm7', 'b9', 'M3'] },
    'dom7b9_B': { semitones: [10, 13, 16, 21], intervals: ['m7', 'b9', 'M3', 'M13'] },
    'dom9sharp11_A': { semitones: [4, 10, 14, 18], intervals: ['M3', 'm7', 'M9', '#11'] },
    'sus13_A': { semitones: [5, 10, 14, 21], intervals: ['P4', 'm7', 'M9', 'M13'] },

    // HALF DIM / DIM
    'm7b5_A': { semitones: [3, 6, 10, 17], intervals: ['m3', 'b5', 'm7', 'P11'] },
    'm7b5_B': { semitones: [10, 17, 15, 18], intervals: ['m7', 'P11', 'm3', 'b5'] },
    'dim7_A': { semitones: [3, 6, 9, 15], intervals: ['m3', 'b5', 'M6', 'm3'] },

    // NEO SOUL / CLUSTERS
    'quartal_A': { semitones: [5, 10, 15, 20], intervals: ['P4', 'm7', 'm3', 'b13'] },
    'cluster_maj_A': { semitones: [2, 4, 7, 11], intervals: ['M9', 'M3', 'P5', 'M7'] },
    'cluster_min_A': { semitones: [2, 3, 7, 10], intervals: ['M9', 'm3', 'P5', 'm7'] }
};

const VOICINGS_JAZZ = {
    // OPEN SHELL VOICINGS (Rootless / Bill Evans Style)
    // MAJOR
    'maj9_A': { semitones: [4, 11, 14, 19], intervals: ['M3', 'M7', 'M9', 'P5'] }, // 3-7-9-5
    'maj9_B': { semitones: [11, 16, 19, 26], intervals: ['M7', 'M3', 'P5', 'M9'] }, // 7-3-5-9 (Fixed: was doubling 7th)
    'maj69_A': { semitones: [4, 9, 14, 19], intervals: ['M3', 'M6', 'M9', 'P5'] },
    'maj69_B': { semitones: [9, 16, 19, 24], intervals: ['M6', 'M3', 'P5', 'R'] },
    'majSharp11_A': { semitones: [4, 11, 14, 18], intervals: ['M3', 'M7', 'M9', '#11'] },
    'majSharp11_B': { semitones: [11, 16, 18, 26], intervals: ['M7', 'M3', '#11', 'M9'] },

    // MINOR
    'min9_A': { semitones: [3, 10, 14, 19], intervals: ['m3', 'm7', 'M9', 'P5'] },
    'min9_B': { semitones: [10, 15, 19, 26], intervals: ['m7', 'm3', 'P5', 'M9'] }, // Fixed Labels & Structure
    'min11_A': { semitones: [3, 10, 14, 17], intervals: ['m3', 'm7', 'M9', 'P11'] },
    'min69_A': { semitones: [3, 9, 14, 19], intervals: ['m3', 'M6', 'M9', 'P5'] },
    'min69_B': { semitones: [9, 15, 19, 24], intervals: ['M6', 'm3', 'P5', 'R'] },
    'minMaj9_A': { semitones: [3, 11, 14, 19], intervals: ['m3', 'M7', 'M9', 'P5'] },
    'minMaj9_B': { semitones: [11, 15, 19, 26], intervals: ['M7', 'm3', 'P5', 'M9'] }, // Fixed Labels & Structure

    // DOMINANT (Crunchy Extensions)
    'dom13_A': { semitones: [4, 10, 14, 21], intervals: ['M3', 'm7', 'M9', 'M13'] },
    'dom13_B': { semitones: [10, 16, 21, 26], intervals: ['m7', 'M3', 'M13', 'M9'] },
    'domAlt_A': { semitones: [4, 10, 15, 20], intervals: ['M3', 'm7', '#9', 'b13'] }, // The "Hendrix/Jazz" Grip
    'domAlt_B': { semitones: [10, 16, 20, 27], intervals: ['m7', 'M3', 'b13', '#9'] },
    'dom7b9_A': { semitones: [4, 10, 13, 19], intervals: ['M3', 'm7', 'b9', 'P5'] },
    'dom7b9_B': { semitones: [10, 16, 19, 25], intervals: ['m7', 'M3', 'P5', 'b9'] },
    'dom9sharp11_A': { semitones: [4, 10, 14, 18], intervals: ['M3', 'm7', 'M9', '#11'] },
    'sus13_A': { semitones: [5, 10, 14, 21], intervals: ['P4', 'm7', 'M9', 'M13'] },

    // HALF DIM (Bill Evans Open Style)
    'm7b5_A': { semitones: [3, 6, 10, 17], intervals: ['m3', 'b5', 'm7', 'P11'] }, // 3-b5-7-11
    'm7b5_B': { semitones: [10, 15, 18, 24], intervals: ['m7', 'm3', 'b5', 'R'] }, // 7-3-b5-R
    'dim7_A': { semitones: [3, 6, 9, 15], intervals: ['m3', 'b5', 'M6', 'm3'] },

    // CLUSTERS (Same as Basic)
    'quartal_A': { semitones: [5, 10, 15, 20], intervals: ['P4', 'm7', 'm3', 'b13'] },
    'cluster_maj_A': { semitones: [2, 4, 7, 11], intervals: ['M9', 'M3', 'P5', 'M7'] },
    'cluster_min_A': { semitones: [2, 3, 7, 10], intervals: ['M9', 'm3', 'P5', 'm7'] }
};

let VOICINGS = VOICINGS_JAZZ; // Default to Jazz
let enableJazzVoicings = true;


const TEMPLATES = {
    // --- FOUNDATIONS ---
    '251_maj': [{ deg: 2, q: 'min9', r: 'II' }, { deg: 1, q: 'dom13', r: 'V' }, { deg: 0, q: 'maj9', r: 'I' }],
    '251_min': [{ deg: 2, q: 'm7b5', r: 'Ø' }, { deg: 1, q: 'domAlt', r: 'V(alt)' }, { deg: 0, q: 'min69', r: 'i' }],
    '1625': [{ deg: 0, q: 'maj69', r: 'I' }, { deg: 3, q: 'domAlt', r: 'VI' }, { deg: 2, q: 'min9', r: 'II' }, { deg: 1, q: 'dom13', r: 'V' }],
    '3625': [{ deg: 4, q: 'min9', r: 'III' }, { deg: 3, q: 'domAlt', r: 'VI' }, { deg: 2, q: 'min9', r: 'II' }, { deg: 1, q: 'dom13', r: 'V' }],

    // --- NEO SOUL & R&B ---
    'neosoul_1': [{ deg: 0, q: 'min9', r: 'im9' }, { deg: -2, q: 'min11', r: 'bVII' }, { deg: -4, q: 'maj9', r: 'bVI' }, { deg: 1, q: 'sus13', r: 'V(sus)' }],
    'neosoul_2': [{ deg: -1, q: 'maj9', r: 'IV' }, { deg: 0, q: 'min9', r: 'i' }, { deg: -2, q: 'min11', r: 'bVII' }, { deg: -3, q: 'domAlt', r: 'III7' }],
    'glasper_vibe': [{ deg: 0, q: 'maj9', r: 'I' }, { deg: 4, q: 'min11', r: 'iii' }, { deg: -1, q: 'maj9', r: 'IV' }, { deg: 1, q: 'sus13', r: 'Vsus' }, { deg: 4, q: 'min11', r: 'iii' }],
    'sunday_love': [{ deg: 0, q: 'min11', r: 'i' }, { deg: 2, q: 'm7b5', r: 'iiØ' }, { deg: 1, q: 'domAlt', r: 'V7alt' }, { deg: -4, q: 'majSharp11', r: 'bVI' }],

    // --- LO-FI CHILL ---
    'lofi_1': [{ deg: 0, q: 'maj9', r: 'Imaj9' }, { deg: 4, q: 'min9', r: 'iii7' }, { deg: -1, q: 'maj9', r: 'IVmaj9' }, { deg: 3, q: 'min9', r: 'vi7' }],
    'lofi_2': [{ deg: 2, q: 'min9', r: 'ii' }, { deg: 1, q: 'dom13', r: 'V7' }, { deg: 0, q: 'maj9', r: 'I' }, { deg: -1, q: 'min9', r: 'iv(min)' }],
    'anime_vibe': [{ deg: -1, q: 'maj9', r: 'IV' }, { deg: 1, q: 'dom13', r: 'V' }, { deg: 4, q: 'min11', r: 'iii' }, { deg: 3, q: 'min9', r: 'vi' }],

    // --- JAZZ STANDARDS ---
    'autumn_leaves': [{ deg: 2, q: 'min9', r: 'ii' }, { deg: 1, q: 'dom13', r: 'V7' }, { deg: 0, q: 'maj9', r: 'I' }, { deg: -1, q: 'maj9', r: 'IV' }, { deg: 5, q: 'm7b5', r: 'viiØ' }],
    'blue_bossa': [{ deg: 0, q: 'min69', r: 'i' }, { deg: -1, q: 'min9', r: 'iv' }, { deg: 2, q: 'm7b5', r: 'iiØ' }, { deg: 1, q: 'domAlt', r: 'V7alt' }],
    'stella': [{ deg: 4, q: 'm7b5', r: '#ivØ' }, { deg: 3, q: 'dom7b9', r: 'VII7' }, { deg: 0, q: 'min9', r: 'ii/bVII' }, { deg: -1, q: 'domAlt', r: 'V/bVII' }],
    'giant_steps': [{ deg: 0, q: 'maj9', r: 'I' }, { deg: -3, q: 'dom7b9', r: 'V/bVI' }, { deg: -4, q: 'maj9', r: 'bVI' }, { deg: 5, q: 'dom7b9', r: 'V/III' }, { deg: 4, q: 'maj9', r: 'III' }],

    // --- GOSPEL & WALKDOWN ---
    'gospel_walk': [{ deg: 0, q: 'maj9', r: 'I' }, { deg: -1, q: 'maj9', r: 'IV' }, { deg: 4, q: 'min11', r: 'iii' }, { deg: -3, q: 'min9', r: 'vi' }, { deg: 2, q: 'min9', r: 'ii' }, { deg: 1, q: 'sus13', r: 'V' }],
    'preacher': [{ deg: 0, q: 'dom13', r: 'I7' }, { deg: -1, q: 'dom13', r: 'IV7' }, { deg: -1, q: 'dim7', r: '#IVdim' }, { deg: 0, q: 'maj69', r: 'I' }],

    // --- SUBSTITUTIONS ---
    'tritone_sub': [{ deg: 2, q: 'min9', r: 'II' }, { deg: -5, q: 'dom9sharp11', r: '♭II7' }, { deg: 0, q: 'maj69', r: 'I' }],
    'backdoor': [{ deg: -1, q: 'min9', r: 'IVm' }, { deg: -2, q: 'dom13', r: '♭VII7' }, { deg: 0, q: 'maj9', r: 'I' }],

    // --- CINEMATIC / DARK ---
    'dark_hero': [{ deg: 0, q: 'minMaj9', r: 'i' }, { deg: -4, q: 'majSharp11', r: 'bVI' }, { deg: 2, q: 'm7b5', r: 'iiØ' }, { deg: 0, q: 'min69', r: 'i' }],
    'space_travel': [{ deg: 0, q: 'majSharp11', r: 'Lyd(I)' }, { deg: 2, q: 'majSharp11', r: 'Lyd(II)' }, { deg: -5, q: 'majSharp11', r: 'Lyd(bVI)' }],
    'noir_detective': [{ deg: 0, q: 'min11', r: 'i' }, { deg: -2, q: 'dom7b9', r: 'bVII7' }, { deg: -4, q: 'maj9', r: 'bVI' }, { deg: 1, q: 'domAlt', r: 'V7alt' }]
};

// ==========================================
// 3. LOGIC, AUDIO, RENDER (Tone.js Edition)
// ==========================================
let currentProgression = [];
let currentStepIndex = 0;
let enableBass = true;
let seqTimeout = null;
const START_MIDI = 36; const NUM_KEYS = 49;

// Init Piano UI
const pianoEl = document.getElementById('piano');
const keysDOM = [];
for (let i = 0; i < NUM_KEYS; i++) {
    const pc = (START_MIDI + i) % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(pc);
    const k = document.createElement('div');
    k.className = `key ${isBlack ? 'black' : 'white'}`;
    k.innerHTML = '<div class="label"></div>';
    pianoEl.appendChild(k);
    keysDOM.push(k);
}

// --- TONE.JS SAMPLER SETUP ---
let sampler;
let isLoaded = false;

function initAudio() {
    if (sampler) return; // Already init

    console.log("Initializing Tone.js Sampler...");
    const btnBox = document.querySelector('.controls-bottom');
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'loadingAudioMsg';
    loadingMsg.style = "color: #fbbf24; font-size: 12px; margin-right: 15px; font-weight: bold;";
    loadingMsg.innerText = "LOADING PIANO SOUNDS...";
    if (btnBox) btnBox.insertBefore(loadingMsg, btnBox.firstChild);

    sampler = new Tone.Sampler({
        urls: {
            "A0": "A0.mp3",
            "C1": "C1.mp3",
            "D#1": "Ds1.mp3",
            "F#1": "Fs1.mp3",
            "A1": "A1.mp3",
            "C2": "C2.mp3",
            "D#2": "Ds2.mp3",
            "F#2": "Fs2.mp3",
            "A2": "A2.mp3",
            "C3": "C3.mp3",
            "D#3": "Ds3.mp3",
            "F#3": "Fs3.mp3",
            "A3": "A3.mp3",
            "C4": "C4.mp3",
            "D#4": "Ds4.mp3",
            "F#4": "Fs4.mp3",
            "A4": "A4.mp3",
            "C5": "C5.mp3",
            "D#5": "Ds5.mp3",
            "F#5": "Fs5.mp3",
            "A5": "A5.mp3",
            "C6": "C6.mp3",
            "D#6": "Ds6.mp3",
            "F#6": "Fs6.mp3",
            "A6": "A6.mp3",
            "C7": "C7.mp3",
            "D#7": "Ds7.mp3",
            "F#7": "Fs7.mp3",
            "A7": "A7.mp3",
            "C8": "C8.mp3"
        },
        release: 1,
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        onload: () => {
            console.log("Sampler Loaded!");
            isLoaded = true;
            if (loadingMsg) {
                loadingMsg.innerText = "PIANO READY 🎹";
                loadingMsg.style.color = "#2ecc71";
                setTimeout(() => { if (loadingMsg) loadingMsg.remove(); }, 3000);
            }
        },
        onerror: (err) => {
            console.error("Sampler Load Error:", err);
            if (loadingMsg) {
                loadingMsg.innerText = "ERROR LOADING SOUNDS ⚠️";
                loadingMsg.style.color = "#ef4444";
            }
            alert("Error loading piano sounds. Please check your connection.");
        }
    }).toDestination();

    // Add Reverb for Jazz Vibe
    const reverb = new Tone.Reverb({ decay: 2.5, preDelay: 0.1, wet: 0.3 }).toDestination();
    sampler.connect(reverb);
}

// Auto-init on first user interaction (to bypass autoplay policy)
// Updates context for mobile devices (iOS/Android) which require explicit touchstart/click
const startAudioEngine = async () => {
    await Tone.start();
    console.log("Audio Context Started");
    initAudio();

    // Remove listeners to prevent multiple calls (though initAudio has a guard)
    ['click', 'touchstart', 'keydown'].forEach(evt =>
        document.removeEventListener(evt, startAudioEngine)
    );
};

// Listen for any interaction
['click', 'touchstart', 'keydown'].forEach(evt =>
    document.addEventListener(evt, startAudioEngine)
);


function toggleBass() {
    enableBass = !enableBass;
    const btn = document.getElementById('bass-toggle');
    btn.innerHTML = enableBass ? "BASS: <b>ON</b>" : "BASS: <b>OFF</b>";
    btn.className = enableBass ? "tool-btn active-toggle" : "tool-btn";
    selectStep(currentStepIndex);
}

function toggleVoicingMode() {
    enableJazzVoicings = !enableJazzVoicings;
    VOICINGS = enableJazzVoicings ? VOICINGS_JAZZ : VOICINGS_BASIC;
    const btn = document.getElementById('voicing-toggle');
    btn.innerHTML = enableJazzVoicings ? "VOICING: <b>JAZZ</b>" : "VOICING: <b>BASIC</b>";
    btn.className = enableJazzVoicings ? "tool-btn active-toggle" : "tool-btn";

    // Regenerate current progression with new voicings
    // We need to re-run generateProgression logic on the current template/key
    generateProgression();
}

function generateProgression() {
    if (seqTimeout) { clearTimeout(seqTimeout); seqTimeout = null; }
    const typeKey = document.getElementById('prog-selector').value;
    const template = TEMPLATES[typeKey];
    const keySelect = document.getElementById('key-selector').value;
    let keyCof;
    if (keySelect === 'random') { keyCof = Math.floor(Math.random() * 10) - 5; }
    else { keyCof = parseInt(keySelect); }
    let currentForm = Math.random() > 0.5 ? 'A' : 'B';
    let lastAvgMidi = 65; // Start target (F4)

    currentProgression = template.map((stepDef, idx) => {
        const rootCof = keyCof + stepDef.deg;
        const step = createChordStep(rootCof, stepDef.q, currentForm, stepDef.r, lastAvgMidi);
        currentForm = currentForm === 'A' ? 'B' : 'A';

        // Update lastAvg for next step based on the result
        let sum = 0;
        step.notes.forEach(n => { if (!n.isBass) sum += n.midi; });
        lastAvgMidi = sum / (step.notes.length - 1); // Exclude bass

        return step;
    });
    currentProgression.meta = { type: document.getElementById('prog-selector').options[document.getElementById('prog-selector').selectedIndex].text, key: getNoteName(keyCof), timestamp: Date.now() };
    renderProgressionUI();
    selectStep(0);
    document.getElementById('analysis-text').innerHTML = `Viewing <b>${currentProgression.meta.type}</b> in <span style="color:#2ecc71">${currentProgression.meta.key}</span>`;
}

function createChordStep(rootCof, quality, form, roman, targetAvg = 65) {
    const rootName = getNoteName(rootCof);
    const rootPC = ((rootCof * 7) % 12 + 12) % 12;
    let voicingID = `${quality}_${form}`;
    if (!VOICINGS[voicingID]) voicingID = `${quality}_A`;
    const template = VOICINGS[voicingID];
    const avgOffset = template.semitones.reduce((a, b) => a + b, 0) / template.semitones.length;
    const rawRoot = rootPC;

    // Base Calculation (Octave 0)
    const baseRootMidi = rawRoot + (Math.round((60 - avgOffset - rawRoot) / 12) * 12);

    // --- NEAREST NEIGHBOR VOICE LEADING ---
    // Generate 3 Candidates: [-1 Octave, Standard, +1 Octave]
    const candidates = [-12, 0, 12].map(shift => {
        return {
            shift: shift,
            notes: template.semitones.map((st, i) => ({
                midi: baseRootMidi + shift + st,
                role: template.intervals[i].replace('b', '♭').replace('#', '♯'),
                name: getNoteName(rootCof + COF_DELTAS[template.intervals[i]]),
                isBass: false
            }))
        };
    });

    // Filter Candidates by Safe Range (50 - 80)
    // We calculate the average pitch of each candidate
    const validCandidates = candidates.filter(c => {
        let sum = 0; c.notes.forEach(n => sum += n.midi);
        let avg = sum / c.notes.length;
        // Allow slightly wider range (50-80) to enable smooth descents
        return avg >= 50 && avg <= 80;
    });

    // Fallback: If no valid candidates (rare), use the middle one (Index 1 -> shift 0)
    // or clamp the closest one.
    const finalPool = validCandidates.length > 0 ? validCandidates : [candidates[1]];

    // Find the one closest to targetAvg
    let bestCandidate = finalPool[0];
    let minDist = Infinity;

    finalPool.forEach(c => {
        let sum = 0; c.notes.forEach(n => sum += n.midi);
        let avg = sum / c.notes.length;
        let dist = Math.abs(avg - targetAvg);
        if (dist < minDist) {
            minDist = dist;
            bestCandidate = c;
        }
    });

    const chordNotes = bestCandidate.notes;
    const bassMidi = 36 + rootPC;
    const bassNote = { midi: bassMidi, role: 'Root', name: rootName, isBass: true };

    // --- BASS COLLISION CHECK ---
    // If the lowest note of the chord is too low (< 45 / A2), shift the WHOLE chord up.
    // This prevents "mud" and preserves the voicing structure.
    let minNote = 127;
    chordNotes.forEach(n => { if (n.midi < minNote) minNote = n.midi; });

    if (minNote < 45) {
        chordNotes.forEach(n => n.midi += 12);
    }
    // Also check for piercing highs
    let maxNote = 0;
    chordNotes.forEach(n => { if (n.midi > maxNote) maxNote = n.midi; });

    if (maxNote > 88) {
        chordNotes.forEach(n => n.midi -= 12);
    }

    return {
        name: `${rootName}`,
        qualityLabel: quality.replace('dom', '').replace('maj', 'Maj').replace('min', 'm').replace('Alt', '(alt)').replace('Sharp', '♯').replace('Maj9', 'Maj7'),
        roman: roman,
        rootName: rootName,
        notes: [bassNote, ...chordNotes]
    };
}

function renderProgressionUI() {
    const bar = document.getElementById('progression-bar');
    bar.innerHTML = '';
    currentProgression.forEach((step, idx) => {
        const div = document.createElement('div');
        div.className = 'chord-step';
        div.innerHTML = `<span class="roman">${step.roman}</span><span class="name">${step.name}<small>${step.qualityLabel}</small></span>`;
        div.onclick = () => { if (seqTimeout) { clearTimeout(seqTimeout); seqTimeout = null; } selectStep(idx); };
        bar.appendChild(div);
    });
}

function selectStep(idx) {
    currentStepIndex = idx;
    const step = currentProgression[idx];
    document.querySelectorAll('.chord-step').forEach((el, i) => { el.className = i === idx ? 'chord-step active' : 'chord-step'; });
    keysDOM.forEach(k => {
        k.className = k.className.replace(' active', '').replace(' bass', '');
        k.querySelector('.label').innerText = '';
    });
    step.notes.forEach(note => {
        if (note.isBass && !enableBass) return;
        const domIdx = note.midi - START_MIDI;
        if (domIdx >= 0 && domIdx < NUM_KEYS) {
            const k = keysDOM[domIdx];
            k.className += ' active';
            if (note.isBass) k.className += ' bass';
            k.querySelector('.label').innerText = `${note.name}\n${note.isBass ? '' : note.role}`;
        }
    });
    playCurrentStep();
}

function playSequence() {
    if (seqTimeout) { clearTimeout(seqTimeout); seqTimeout = null; return; }
    if (!isLoaded) { alert("Please wait for Piano Sounds to load..."); return; }
    let i = 0;
    function loop() { if (i >= currentProgression.length) { seqTimeout = null; return; } selectStep(i); i++; seqTimeout = setTimeout(loop, 1200); }
    loop();
}

function playCurrentStep() {
    if (!isLoaded || !sampler) return;

    const step = currentProgression[currentStepIndex];
    const now = Tone.now();

    step.notes.forEach((n, i) => {
        if (n.isBass) {
            if (enableBass) sampler.triggerAttackRelease(Tone.Frequency(n.midi, "midi").toNote(), "2n", now, 0.6);
        } else {
            // Subtle strumming effect (+0.03s per note)
            sampler.triggerAttackRelease(Tone.Frequency(n.midi, "midi").toNote(), "2n", now + (i * 0.02), 0.5);
        }
    });
}

function downloadMidi() {
    if (!currentProgression || currentProgression.length === 0) return;
    const header = [0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x01, 0xE0];
    let trackEvents = [];
    const TICKS_PER_Q = 480; const CHORD_DURATION = TICKS_PER_Q * 4;
    trackEvents.push(0x00, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20); // Tempo
    currentProgression.forEach((step, i) => {
        const activeNotes = step.notes.filter(n => (enableBass || !n.isBass));
        activeNotes.forEach((n, idx) => { trackEvents.push(0x00, 0x90, n.midi, 0x50); });
        activeNotes.forEach((n, idx) => {
            const delta = (idx === 0) ? writeVarInt(CHORD_DURATION) : [0x00];
            trackEvents.push(...delta, 0x80, n.midi, 0x00);
        });
    });
    trackEvents.push(0x00, 0xFF, 0x2F, 0x00);
    const trackHeader = [0x4D, 0x54, 0x72, 0x6B, ...intTo4Bytes(trackEvents.length)];
    const fileBytes = new Uint8Array([...header, ...trackHeader, ...trackEvents]);
    const blob = new Blob([fileBytes], { type: 'audio/midi' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `JazzExplorer_${currentProgression.meta.key}${enableBass ? '' : '_NoBass'}.mid`; a.click();
}

function writeVarInt(v) { if (v === 0) return [0]; const b = []; let t = v; while (t > 0) { b.push(t & 0x7F); t >>= 7 } for (let i = 1; i < b.length; i++)b[i] |= 0x80; return b.reverse(); }
function intTo4Bytes(v) { return [(v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, (v & 0xFF)]; }

// --- LIBRARY SYSTEM (ROBUST) ---

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.className = "toast-visible";
    setTimeout(() => { toast.className = "toast-hidden"; }, 3000);
}

function saveToLibrary() {
    if (!currentProgression || currentProgression.length === 0) {
        alert("Nothing to save! Generate a progression first.");
        return;
    }
    // Open Save Modal instead of prompt
    const modal = document.getElementById('save-modal');
    const input = document.getElementById('save-name-input');
    if (modal && input) {
        modal.style.display = 'flex';
        input.value = `Idea ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        input.focus();
        input.select();

        // Enter key handler
        input.onkeydown = (e) => {
            if (e.key === 'Enter') confirmSave();
            if (e.key === 'Escape') closeSaveModal();
        };
    }
}

function closeSaveModal() {
    const modal = document.getElementById('save-modal');
    if (modal) modal.style.display = 'none';
}

function confirmSave() {
    const input = document.getElementById('save-name-input');
    const note = input.value.trim() || "Untitled Idea";

    try {
        let library = JSON.parse(localStorage.getItem('jazzLib')) || [];

        // Sanitize Data (Extract minimal necessary fields)
        const safeProgression = currentProgression.map(step => ({
            name: step.name,
            roman: step.roman,
            qualityLabel: step.qualityLabel,
            rootName: step.rootName,
            notes: step.notes.map(n => ({ midi: n.midi, role: n.role, name: n.name, isBass: n.isBass }))
        }));

        const item = {
            id: Date.now(),
            progression: safeProgression,
            meta: {
                type: currentProgression.meta ? currentProgression.meta.type : 'Custom',
                key: currentProgression.meta ? currentProgression.meta.key : '?',
                userNote: note,
                timestamp: Date.now()
            }
        };

        library.unshift(item);
        localStorage.setItem('jazzLib', JSON.stringify(library));

        renderLibrary();
        showToast("Saved to Library! ❤️");
        closeSaveModal();

    } catch (e) {
        console.error("Save Failed:", e);
        alert("Failed to save: " + e.message);
    }
}

let pendingConfirmAction = null;

function showConfirm(title, msg, action) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;

    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-msg').innerText = msg;

    pendingConfirmAction = action;
    modal.style.display = 'flex';
}

function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.style.display = 'none';
    pendingConfirmAction = null;
}

function executeConfirm() {
    if (pendingConfirmAction) pendingConfirmAction();
    closeConfirmModal();
}

function deleteFromLibrary(id, e) {
    if (e) e.stopPropagation();

    showConfirm("⚠️ Delete Idea?", "Are you sure you want to remove this progression?", () => {
        try {
            let library = JSON.parse(localStorage.getItem('jazzLib')) || [];
            library = library.filter(item => item.id !== id);
            localStorage.setItem('jazzLib', JSON.stringify(library));
            renderLibrary();
            showToast("Item Deleted.");
        } catch (e) { console.error(e); }
    });
}

function clearLibrary() {
    showConfirm("🧨 Clear ALL?", "This will permanently delete your entire library. Cannot be undone.", () => {
        localStorage.setItem('jazzLib', '[]');
        renderLibrary();
        showToast("Library Cleared.");
    });
}

function exportBackup() {
    const library = localStorage.getItem('jazzLib') || '[]';
    const blob = new Blob([library], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'JazzLib_Backup.json';
    a.click();
}

function loadFromLibrary(id) {
    if (seqTimeout) { clearTimeout(seqTimeout); seqTimeout = null; }

    try {
        let library = JSON.parse(localStorage.getItem('jazzLib')) || [];
        const item = library.find(i => i.id === id);

        if (item) {
            currentProgression = item.progression;
            currentProgression.meta = item.meta;
            renderProgressionUI();
            selectStep(0);

            const info = document.getElementById('analysis-text');
            if (info) info.innerHTML = `Loaded: <b>"${item.meta.userNote}"</b> (${item.meta.type})`;

            showToast("Loaded: " + item.meta.userNote);
        }
    } catch (e) {
        console.error("Load Failed:", e);
        alert("Failed to load idea.");
    }
}

function renderLibrary() {
    const filterEl = document.getElementById('lib-search');
    const filter = filterEl ? filterEl.value.toLowerCase() : "";
    const list = document.getElementById('library-list');
    const countEl = document.getElementById('lib-count');

    if (!list) return;

    let library = [];
    try {
        library = JSON.parse(localStorage.getItem('jazzLib')) || [];
    } catch (e) {
        console.error("Library Corrupt, resetting.", e);
        localStorage.setItem('jazzLib', '[]');
    }

    if (countEl) countEl.innerText = library.length;

    const filtered = library.filter(item => {
        const note = item.meta && item.meta.userNote ? item.meta.userNote : "";
        const type = item.meta && item.meta.type ? item.meta.type : "";
        return (note + type).toLowerCase().includes(filter);
    });

    if (!filtered.length) {
        list.innerHTML = '<div style="color:#666; font-style:italic; padding:15px; text-align:center;">Library is empty.<br>Save your first progression!</div>';
        return;
    }

    list.innerHTML = '';
    filtered.forEach(item => {
        const row = document.createElement('div');
        row.className = 'lib-item';
        row.onclick = () => loadFromLibrary(item.id);

        const note = item.meta && item.meta.userNote ? item.meta.userNote : "Untitled";
        const type = item.meta && item.meta.type ? item.meta.type : "Custom";
        const date = new Date(item.id).toLocaleDateString();

        row.innerHTML = `
            <div style="flex-grow:1;">
                <div style="color:#eee; font-weight:bold; font-size:13px;">${note}</div>
                <div style="color:#888; font-size:11px;">${type} • ${date}</div>
            </div>
            <button class="del-btn" onclick="deleteFromLibrary(${item.id}, event)">✕</button>
        `;
        list.appendChild(row);
    });
}

// Init
generateProgression();
renderLibrary();
