/* 
   Staff Portal Redesign - Javascript Application Controller
   Handles Session, OnDuty widgets, Custom Widget Layouts, News, Overhauled Users Grid, Rules and Settings.
*/

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. ROUTING GUARD & SESSION CHECK
    // =========================================================================
    const activeSession = sessionStorage.getItem('nrw_active_session');
    if (!activeSession) {
        window.location.href = 'login.html';
        return;
    }

    let currentUser = JSON.parse(activeSession);

    // Sync header elements (Username, Rank, Avatar)
    function syncUserProfileHeader() {
        const usernameEl = document.getElementById('sidebar-username-el');
        const roleEl = document.getElementById('sidebar-role-el');
        const avatarPreview = document.getElementById('sidebar-avatar-preview');
        const settingsAvatarPreview = document.getElementById('settings-avatar-preview');

        if (usernameEl) usernameEl.textContent = currentUser.username;
        if (roleEl) roleEl.textContent = currentUser.primaryRole;
        
        const avatarHtml = currentUser.avatar 
            ? `<img src="${currentUser.avatar}" alt="Avatar">`
            : currentUser.username.charAt(0).toUpperCase();

        if (avatarPreview) {
            avatarPreview.innerHTML = avatarHtml;
        }
        if (settingsAvatarPreview) {
            settingsAvatarPreview.innerHTML = avatarHtml;
        }
    }
    syncUserProfileHeader();

    // Ranks definitions
    const ROLES = {
        ADMIN: 'Admin Account',
        PL: 'Projektleitung',
        SPL: 'Stv. Projektleitung',
        PM: 'Projektmanager',
        SPM: 'Stv. Projektmanager',
        TV: 'Teamverwaltung',
        STV_TV: 'Stv. Teamverwaltung',
        HA: 'Head of Administration',
        SA: 'Senior Administrator',
        A: 'Administrator',
        JA: 'Junior Administrator',
        TA: 'Test Administrator',
        HM: 'Head of Moderation',
        SM: 'Senior Moderator',
        M: 'Moderator',
        JM: 'Junior Moderator',
        TM: 'Test Moderator',
        P: 'Praktikant',
        ML: 'Management Leader',
        FM: 'Fraktions Management'
    };

    // SVG Icon Definitions (Clean & Professional Vector Paths)
    const ICONS = {
        edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        delete: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
        arrowUp: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`,
        arrowDown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
    };

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('nrw_active_session');
            window.location.href = 'login.html';
        });
    }

    // =========================================================================
    // 2. TAB SWITCHER LOGIC
    // =========================================================================
    const sidebarButtons = document.querySelectorAll('.sidebar-menu-btn[data-tab]');
    const panels = document.querySelectorAll('.portal-workspace .portal-panel');

    sidebarButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            sidebarButtons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const targetPanel = document.getElementById(`panel-${targetTab}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
            
            // Tab-specific initialization
            if (targetTab === 'news') {
                renderNewsTab();
            } else if (targetTab === 'users') {
                renderUsersTab();
            } else if (targetTab === 'rules') {
                renderRulesTab();
            }
        });
    });

    // =========================================================================
    // 3. ONDUTY PANEL: WIDGETS LAYOUT CUSTOMIZER (PERSONALIZATION)
    // =========================================================================
    const DEFAULT_LAYOUT = [
        { id: 'widget-stopwatch', name: 'Stoppuhr', visible: true, size: 'half' },
        { id: 'widget-timer', name: 'Countdown-Timer', visible: true, size: 'half' },
        { id: 'widget-calculator', name: 'RP-Rechner', visible: true, size: 'half' },
        { id: 'widget-notes', name: 'Notizen', visible: true, size: 'half' },
        { id: 'widget-exam', name: 'Prüfungs-Assistent', visible: true, size: 'full' }
    ];

    let userLayout = [];

    // Load widget layout config
    function loadUserLayout() {
        const key = `nrw_onduty_layout_${currentUser.username}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            userLayout = JSON.parse(stored);
            
            // Re-sync in case new widgets were added to default config
            DEFAULT_LAYOUT.forEach(def => {
                if (!userLayout.some(w => w.id === def.id)) {
                    userLayout.push(def);
                }
            });
        } else {
            userLayout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT)); // deep copy
        }
    }

    // Apply layout positions, sizing, and visibility to DOM
    function applyUserLayout() {
        const grid = document.getElementById('onduty-widgets-grid');
        if (!grid) return;

        userLayout.forEach(config => {
            const el = document.getElementById(config.id);
            if (el) {
                // Adjust visibility
                el.style.display = config.visible ? 'block' : 'none';
                
                // Adjust sizing
                el.classList.remove('widget-half', 'widget-full');
                el.classList.add(`widget-${config.size}`);
                
                // Append inside DOM to rearrange order
                grid.appendChild(el);
            }
        });
    }

    // Modal elements
    const openCustomizerBtn = document.getElementById('open-customizer-btn');
    const closeCustomizerBtn = document.getElementById('close-customizer-btn');
    const customizerModal = document.getElementById('layout-customizer-modal');
    const customizerItemsList = document.getElementById('customizer-items-list');
    const customizerSaveBtn = document.getElementById('customizer-save-btn');
    const customizerResetBtn = document.getElementById('customizer-reset-btn');

    let tempLayout = []; // Holds unsaved edits

    function renderCustomizerList() {
        if (!customizerItemsList) return;
        customizerItemsList.innerHTML = '';

        tempLayout.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'customizer-item';
            div.innerHTML = `
                <div class="customizer-item-title">
                    <span>${item.name}</span>
                </div>
                <div class="customizer-controls">
                    <!-- Visibility Toggle (Switch) -->
                    <div class="switch-container">
                        <span style="font-size:0.75rem; color:var(--text-secondary);">Anzeigen</span>
                        <label class="switch">
                            <input type="checkbox" class="vis-checkbox" data-index="${index}" ${item.visible ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>

                    <!-- Size Select -->
                    <select class="customizer-select size-select" data-index="${index}">
                        <option value="half" ${item.size === 'half' ? 'selected' : ''}>Kompakt</option>
                        <option value="full" ${item.size === 'full' ? 'selected' : ''}>Breit</option>
                    </select>

                    <!-- Order buttons -->
                    <div class="order-btn-group">
                        <button type="button" class="order-btn up-btn" data-index="${index}">${ICONS.arrowUp}</button>
                        <button type="button" class="order-btn down-btn" data-index="${index}">${ICONS.arrowDown}</button>
                    </div>
                </div>
            `;
            customizerItemsList.appendChild(div);
        });

        // Add listeners to customizer row elements
        const visCheckboxes = customizerItemsList.querySelectorAll('.vis-checkbox');
        visCheckboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                tempLayout[idx].visible = e.target.checked;
            });
        });

        const sizeSelects = customizerItemsList.querySelectorAll('.size-select');
        sizeSelects.forEach(sel => {
            sel.addEventListener('change', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                tempLayout[idx].size = e.target.value;
            });
        });

        const upBtns = customizerItemsList.querySelectorAll('.up-btn');
        upBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.getAttribute('data-index'));
                if (idx > 0) {
                    // Swap elements
                    const temp = tempLayout[idx];
                    tempLayout[idx] = tempLayout[idx - 1];
                    tempLayout[idx - 1] = temp;
                    renderCustomizerList();
                }
            });
        });

        const downBtns = customizerItemsList.querySelectorAll('.down-btn');
        downBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.getAttribute('data-index'));
                if (idx < tempLayout.length - 1) {
                    // Swap elements
                    const temp = tempLayout[idx];
                    tempLayout[idx] = tempLayout[idx + 1];
                    tempLayout[idx + 1] = temp;
                    renderCustomizerList();
                }
            });
        });
    }

    if (openCustomizerBtn) {
        openCustomizerBtn.addEventListener('click', () => {
            tempLayout = JSON.parse(JSON.stringify(userLayout)); // Clone current layout
            renderCustomizerList();
            customizerModal.classList.add('active');
        });
    }

    if (closeCustomizerBtn) {
        closeCustomizerBtn.addEventListener('click', () => {
            customizerModal.classList.remove('active');
        });
    }

    // Close on click outside modal content
    if (customizerModal) {
        customizerModal.addEventListener('click', (e) => {
            if (e.target === customizerModal) {
                customizerModal.classList.remove('active');
            }
        });
    }

    if (customizerSaveBtn) {
        customizerSaveBtn.addEventListener('click', () => {
            userLayout = tempLayout;
            const key = `nrw_onduty_layout_${currentUser.username}`;
            localStorage.setItem(key, JSON.stringify(userLayout));
            applyUserLayout();
            customizerModal.classList.remove('active');
            addLog('OnDuty-Layout angepasst', 'Benutzer-Dashboard Widgets umsortiert');
        });
    }

    if (customizerResetBtn) {
        customizerResetBtn.addEventListener('click', () => {
            if (confirm("Möchtest du das Layout wirklich auf die Standard-Einstellungen zurücksetzen?")) {
                tempLayout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
                renderCustomizerList();
            }
        });
    }

    // Initialize layout configurations
    loadUserLayout();
    applyUserLayout();

    // =========================================================================
    // 4. ONDUTY PANEL: STOPWATCH
    // =========================================================================
    let stopwatchInterval = null;
    let stopwatchStartTimestamp = 0;
    let stopwatchElapsed = 0; // ms

    const stopwatchDisplay = document.getElementById('stopwatch-display');
    const stopwatchStartBtn = document.getElementById('stopwatch-start');
    const stopwatchPauseBtn = document.getElementById('stopwatch-pause');
    const stopwatchResetBtn = document.getElementById('stopwatch-reset');

    function updateStopwatch() {
        const now = Date.now();
        const totalMs = stopwatchElapsed + (now - stopwatchStartTimestamp);
        
        let hours = Math.floor(totalMs / 3600000);
        let mins = Math.floor((totalMs % 3600000) / 60000);
        let secs = Math.floor((totalMs % 60000) / 1000);
        let hundredths = Math.floor((totalMs % 1000) / 10);
        
        stopwatchDisplay.textContent = 
            `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
    }

    if (stopwatchStartBtn) {
        stopwatchStartBtn.addEventListener('click', () => {
            if (stopwatchInterval === null) {
                stopwatchStartTimestamp = Date.now();
                stopwatchInterval = setInterval(updateStopwatch, 10);
                stopwatchStartBtn.disabled = true;
                stopwatchPauseBtn.disabled = false;
            }
        });
    }

    if (stopwatchPauseBtn) {
        stopwatchPauseBtn.addEventListener('click', () => {
            if (stopwatchInterval !== null) {
                clearInterval(stopwatchInterval);
                stopwatchInterval = null;
                stopwatchElapsed += (Date.now() - stopwatchStartTimestamp);
                stopwatchStartBtn.disabled = false;
                stopwatchPauseBtn.disabled = true;
            }
        });
    }

    if (stopwatchResetBtn) {
        stopwatchResetBtn.addEventListener('click', () => {
            if (stopwatchInterval !== null) {
                clearInterval(stopwatchInterval);
                stopwatchInterval = null;
            }
            stopwatchElapsed = 0;
            stopwatchDisplay.textContent = "00:00:00.00";
            stopwatchStartBtn.disabled = false;
            stopwatchPauseBtn.disabled = true;
        });
    }

    // =========================================================================
    // 5. ONDUTY PANEL: TIMER (COUNTDOWN)
    // =========================================================================
    let timerInterval = null;
    let timerDuration = 300; // default 5 mins in seconds
    let timerRemaining = 300;

    const timerDisplay = document.getElementById('timer-display');
    const timerStartBtn = document.getElementById('timer-start');
    const timerPauseBtn = document.getElementById('timer-pause');
    const timerResetBtn = document.getElementById('timer-reset');
    const timerHrIn = document.getElementById('timer-hr');
    const timerMinIn = document.getElementById('timer-min');
    const timerSecIn = document.getElementById('timer-sec');

    function formatTimer(totalSecs) {
        let hrs = Math.floor(totalSecs / 3600);
        let mins = Math.floor((totalSecs % 3600) / 60);
        let secs = totalSecs % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        timerDisplay.textContent = formatTimer(timerRemaining);
        if (timerRemaining <= 10 && timerRemaining > 0) {
            timerDisplay.classList.add('timer-warning');
        } else {
            timerDisplay.classList.remove('timer-warning');
        }
    }

    function syncInputsFromDuration() {
        timerHrIn.value = Math.floor(timerDuration / 3600);
        timerMinIn.value = Math.floor((timerDuration % 3600) / 60);
        timerSecIn.value = timerDuration % 60;
    }

    function getDurationFromInputs() {
        const hrs = parseInt(timerHrIn.value) || 0;
        const mins = parseInt(timerMinIn.value) || 0;
        const secs = parseInt(timerSecIn.value) || 0;
        return (hrs * 3600) + (mins * 60) + secs;
    }

    function playBeep() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            let delay = 0;
            for (let i = 0; i < 4; i++) {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, audioCtx.currentTime + delay);
                gain.gain.setValueAtTime(0.5, audioCtx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.25);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.start(audioCtx.currentTime + delay);
                osc.stop(audioCtx.currentTime + delay + 0.3);
                
                delay += 0.4;
            }
        } catch (e) {
            console.error("Audio Web API not allowed or supported yet.", e);
        }
    }

    // Set presets
    const presetBtns = document.querySelectorAll('.timer-presets .preset-btn');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const addSecs = parseInt(btn.getAttribute('data-sec')) || 0;
            if (timerInterval !== null) {
                timerRemaining += addSecs;
                timerDuration += addSecs;
                updateTimerDisplay();
            } else {
                const cur = getDurationFromInputs();
                timerDuration = cur + addSecs;
                timerRemaining = timerDuration;
                syncInputsFromDuration();
                updateTimerDisplay();
            }
        });
    });

    // Inputs change
    [timerHrIn, timerMinIn, timerSecIn].forEach(input => {
        if (input) {
            input.addEventListener('change', () => {
                if (timerInterval === null) {
                    timerDuration = getDurationFromInputs();
                    timerRemaining = timerDuration;
                    updateTimerDisplay();
                }
            });
        }
    });

    if (timerStartBtn) {
        timerStartBtn.addEventListener('click', () => {
            if (timerInterval === null) {
                if (timerRemaining <= 0) {
                    timerDuration = getDurationFromInputs();
                    timerRemaining = timerDuration;
                }
                if (timerRemaining <= 0) return;

                timerStartBtn.disabled = true;
                timerPauseBtn.disabled = false;
                timerInterval = setInterval(() => {
                    timerRemaining--;
                    updateTimerDisplay();
                    if (timerRemaining <= 0) {
                        clearInterval(timerInterval);
                        timerInterval = null;
                        timerStartBtn.disabled = false;
                        timerPauseBtn.disabled = true;
                        playBeep();
                        alert("⏱️ Der Countdown-Timer ist abgelaufen!");
                    }
                }, 1000);
            }
        });
    }

    if (timerPauseBtn) {
        timerPauseBtn.disabled = true;
        timerPauseBtn.addEventListener('click', () => {
            if (timerInterval !== null) {
                clearInterval(timerInterval);
                timerInterval = null;
                timerStartBtn.disabled = false;
                timerPauseBtn.disabled = true;
            }
        });
    }

    if (timerResetBtn) {
        timerResetBtn.addEventListener('click', () => {
            if (timerInterval !== null) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            timerDuration = getDurationFromInputs() || 300;
            timerRemaining = timerDuration;
            updateTimerDisplay();
            timerStartBtn.disabled = false;
            timerPauseBtn.disabled = true;
        });
    }

    // =========================================================================
    // 6. ONDUTY PANEL: CALCULATOR & POINTS VERGABE
    // =========================================================================
    let calcExpression = "0";
    let activePoints = 0;
    const calcDisplay = document.getElementById('calc-display');
    const pointsDisplay = document.getElementById('points-display');

    function syncPointsDisplay() {
        if (pointsDisplay) {
            pointsDisplay.textContent = `${activePoints} / 100 Punkte`;
        }
        if (examActive) {
            updateExamScore();
        }
    }

    // Num keys
    document.querySelectorAll('.calc-buttons button[data-val]').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-val');
            if (calcExpression === "0" || calcExpression === "Fehler") {
                calcExpression = val;
            } else {
                calcExpression += val;
            }
            calcDisplay.textContent = calcExpression;
        });
    });

    // Operators
    const ops = {
        'calc-add': '+',
        'calc-sub': '-',
        'calc-mul': '*',
        'calc-div': '/'
    };
    Object.keys(ops).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                const operator = ops[id];
                const lastChar = calcExpression.slice(-1);
                if (['+', '-', '*', '/'].includes(lastChar)) {
                    calcExpression = calcExpression.slice(0, -1) + operator;
                } else {
                    calcExpression += operator;
                }
                calcDisplay.textContent = calcExpression;
            });
        }
    });

    const calcClear = document.getElementById('calc-clear');
    if (calcClear) {
        calcClear.addEventListener('click', () => {
            calcExpression = "0";
            calcDisplay.textContent = calcExpression;
        });
    }

    const calcBack = document.getElementById('calc-back');
    if (calcBack) {
        calcBack.addEventListener('click', () => {
            if (calcExpression.length > 1) {
                calcExpression = calcExpression.slice(0, -1);
            } else {
                calcExpression = "0";
            }
            calcDisplay.textContent = calcExpression;
        });
    }

    const calcEquals = document.getElementById('calc-equals');
    if (calcEquals) {
        calcEquals.addEventListener('click', () => {
            const sanitized = calcExpression.replace(/[^0-9+\-*/.]/g, '');
            try {
                const result = Function(`"use strict"; return (${sanitized})`)();
                calcExpression = String(Number(result.toFixed(3)));
            } catch(e) {
                calcExpression = "Fehler";
            }
            calcDisplay.textContent = calcExpression;
        });
    }

    const calcUsePoints = document.getElementById('calc-use-points');
    if (calcUsePoints) {
        calcUsePoints.addEventListener('click', () => {
            const val = parseFloat(calcDisplay.textContent);
            if (!isNaN(val)) {
                activePoints = Math.max(0, Math.min(100, Math.round(val)));
                syncPointsDisplay();
            }
        });
    }

    // Points adjusters
    const adjustPoints = (amount) => {
        activePoints = Math.max(0, Math.min(100, activePoints + amount));
        syncPointsDisplay();
    };

    const adjusters = {
        'pts-sub-10': -10,
        'pts-sub-1': -1,
        'pts-add-1': 1,
        'pts-add-10': 10
    };
    Object.keys(adjusters).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => adjustPoints(adjusters[id]));
        }
    });

    const ptsReset = document.getElementById('pts-reset');
    if (ptsReset) {
        ptsReset.addEventListener('click', () => {
            activePoints = 0;
            syncPointsDisplay();
        });
    }

    // =========================================================================
    // 7. ONDUTY PANEL: NOTES
    // =========================================================================
    const notesTextarea = document.getElementById('notes-textarea');
    const notesCopyBtn = document.getElementById('notes-copy-btn');
    
    if (notesTextarea) {
        notesTextarea.value = localStorage.getItem('nrw_staff_notes') || '';
        notesTextarea.addEventListener('input', () => {
            localStorage.setItem('nrw_staff_notes', notesTextarea.value);
        });
    }

    if (notesCopyBtn && notesTextarea) {
        notesCopyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(notesTextarea.value);
            notesCopyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Kopiert!`;
            setTimeout(() => { 
                notesCopyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Kopieren`; 
            }, 1500);
        });
    }

    // =========================================================================
    // 8. ONDUTY PANEL: EXAM ASSISTANT (PRÜFUNGS-ASSISTENT)
    // =========================================================================
    let examActive = false;
    let examStartTime = 0;
    let examTimerInterval = null;

    const examToggleBtn = document.getElementById('exam-toggle-btn');
    const examAssistant = document.getElementById('exam-assistant-container');
    const examCandidate = document.getElementById('exam-candidate');
    const examType = document.getElementById('exam-type');
    const examChecklist = document.getElementById('exam-checklist-items');
    const examScorePercent = document.getElementById('exam-score-percent');
    const examPassBadge = document.getElementById('exam-pass-badge');
    const examNotes = document.getElementById('exam-notes');
    const examProtocolBox = document.getElementById('exam-protocol-box');
    const copyProtocolBtn = document.getElementById('copy-protocol-btn');
    const examStatusDot = document.getElementById('exam-status-dot');
    const examStatusText = document.getElementById('exam-status-text');
    const examTimeElapsed = document.getElementById('exam-time-elapsed');

    const EXAM_SCHEMES = {
        polizei: {
            name: "Polizei Grundausbildung (LSPD)",
            maxPoints: 100,
            passingPoints: 70,
            criteria: [
                { name: "Theorie: StVO & Dienstvorschrift", max: 25 },
                { name: "Fahrprüfung & Verkehrskontrolle", max: 25 },
                { name: "Waffengebrauch & Taktik", max: 25 },
                { name: "Funkdisziplin & Kommunikation", max: 25 }
            ]
        },
        support: {
            name: "Support-Team Qualifikation",
            maxPoints: 100,
            passingPoints: 75,
            criteria: [
                { name: "Serverregelwerk-Abfrage", max: 30 },
                { name: "Support-Simulation (Deeskalation)", max: 30 },
                { name: "Admin-Befehle & Log-Check", max: 20 },
                { name: "Ticket-Abwicklung im System", max: 20 }
            ]
        },
        fahrprüfung: {
            name: "Fahr- und Verfolgungsprüfung",
            maxPoints: 100,
            passingPoints: 70,
            criteria: [
                { name: "Grundlegende Fahrzeugbeherrschung", max: 30 },
                { name: "Verkehrsregeln & Stadtfahrt", max: 30 },
                { name: "Verfolgungssimulation (Pit-Manöver)", max: 40 }
            ]
        },
        custom: {
            name: "Benutzerdefinierte Prüfung",
            maxPoints: 100,
            passingPoints: 70,
            criteria: [
                { name: "Kriterium 1: Grundlagen", max: 25 },
                { name: "Kriterium 2: Praxis", max: 25 },
                { name: "Kriterium 3: Verhalten", max: 25 },
                { name: "Kriterium 4: Abschlussfragen", max: 25 }
            ]
        }
    };

    function renderExamChecklist() {
        const scheme = EXAM_SCHEMES[examType.value] || EXAM_SCHEMES.custom;
        examChecklist.innerHTML = '';
        
        scheme.criteria.forEach((crit, index) => {
            const item = document.createElement('div');
            item.className = 'exam-check-item';
            item.innerHTML = `
                <input type="checkbox" id="crit-check-${index}">
                <div style="flex-grow:1;">
                    <span class="exam-check-label">${crit.name}</span>
                    <div style="font-size:0.7rem; color:var(--text-muted);">Erreichte Punkte (Max: ${crit.max})</div>
                </div>
                <input type="number" id="crit-pts-${index}" class="timer-input" style="width:60px;" min="0" max="${crit.max}" value="0">
            `;
            examChecklist.appendChild(item);

            const checkbox = item.querySelector(`#crit-check-${index}`);
            const ptsInput = item.querySelector(`#crit-pts-${index}`);

            checkbox.addEventListener('change', calculateExamPointsFromCriteria);
            ptsInput.addEventListener('input', () => {
                let v = parseInt(ptsInput.value) || 0;
                if (v > crit.max) v = crit.max;
                if (v < 0) v = 0;
                ptsInput.value = v;
                checkbox.checked = v > 0;
                calculateExamPointsFromCriteria();
            });
        });
    }

    function calculateExamPointsFromCriteria() {
        if (!examActive) return;
        const scheme = EXAM_SCHEMES[examType.value] || EXAM_SCHEMES.custom;
        let sum = 0;

        scheme.criteria.forEach((crit, index) => {
            const ptsInput = document.getElementById(`crit-pts-${index}`);
            if (ptsInput) {
                sum += parseInt(ptsInput.value) || 0;
            }
        });

        activePoints = sum;
        syncPointsDisplay();
    }

    function updateExamScore() {
        const scheme = EXAM_SCHEMES[examType.value] || EXAM_SCHEMES.custom;
        const percent = Math.round((activePoints / scheme.maxPoints) * 100);
        
        examScorePercent.textContent = `${percent}% (${activePoints} / ${scheme.maxPoints} Pkt.)`;
        
        if (activePoints >= scheme.passingPoints) {
            examPassBadge.textContent = "BESTANDEN";
            examPassBadge.className = "exam-badge passed";
        } else {
            examPassBadge.textContent = "NICHT BESTANDEN";
            examPassBadge.className = "exam-badge failed";
        }

        generateProtocolText();
    }

    function generateProtocolText() {
        const candidate = examCandidate.value.trim() || "[Name eintragen]";
        const typeScheme = EXAM_SCHEMES[examType.value] || EXAM_SCHEMES.custom;
        const totalDuration = formatExamDuration();
        const percent = Math.round((activePoints / typeScheme.maxPoints) * 100);
        const resultText = activePoints >= typeScheme.passingPoints ? "✅ BESTANDEN" : "❌ NICHT BESTANDEN";
        
        let criteriaList = "";
        typeScheme.criteria.forEach((crit, index) => {
            const checked = document.getElementById(`crit-check-${index}`)?.checked;
            const pts = document.getElementById(`crit-pts-${index}`)?.value || 0;
            criteriaList += `  - ${checked ? ' [x] ' : ' [ ] '} ${crit.name}: ${pts} / ${crit.max} Pkt.\n`;
        });

        const notes = examNotes.value.trim() || "Keine zusätzlichen Anmerkungen.";

        const protocol = `================================================
🎓 NRW RP PRÜFUNGSPROTOKOLL
================================================
👤 Prüfling: @${candidate}
👔 Prüfer: @${currentUser.username}
📅 Datum: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}
⏱️ Prüfungsdauer: ${totalDuration}
------------------------------------------------
📝 Prüfungstyp: ${typeScheme.name}
📊 Punkteauswertung:
${criteriaList}
🏆 Gesamtergebnis: ${activePoints} / ${typeScheme.maxPoints} Punkte (${percent}%)
📢 Resultat: ${resultText}
------------------------------------------------
📌 Anmerkungen des Prüfers:
"${notes}"
================================================`;

        examProtocolBox.textContent = protocol;
        if (examCandidate.value.trim() !== "") {
            copyProtocolBtn.disabled = false;
        } else {
            copyProtocolBtn.disabled = true;
        }
    }

    function formatExamDuration() {
        if (examStartTime === 0) return "00:00";
        const diffSecs = Math.floor((Date.now() - examStartTime) / 1000);
        const mins = Math.floor(diffSecs / 60);
        const secs = diffSecs % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    if (examType) {
        examType.addEventListener('change', () => {
            renderExamChecklist();
            calculateExamPointsFromCriteria();
        });
    }

    if (examCandidate) {
        examCandidate.addEventListener('input', generateProtocolText);
    }

    if (examNotes) {
        examNotes.addEventListener('input', generateProtocolText);
    }

    if (examToggleBtn) {
        examToggleBtn.addEventListener('click', () => {
            if (!examActive) {
                examActive = true;
                examStartTime = Date.now();
                
                examToggleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg> Prüfung beenden`;
                examToggleBtn.className = "exam-toggle-btn active";
                examAssistant.classList.add('active');
                
                examStatusDot.className = "exam-status-dot active";
                examStatusText.textContent = "Prüfung läuft...";
                examTimeElapsed.style.display = "block";
                
                examCandidate.value = "";
                examNotes.value = "";
                activePoints = 0;
                syncPointsDisplay();
                renderExamChecklist();

                examTimerInterval = setInterval(() => {
                    examTimeElapsed.textContent = `Zeit: ${formatExamDuration()}`;
                    generateProtocolText();
                }, 1000);
                
                if (stopwatchInterval === null) {
                    stopwatchStartBtn.click();
                }
            } else {
                examActive = false;
                clearInterval(examTimerInterval);
                examTimerInterval = null;

                examToggleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Neue Prüfung beginnen`;
                examToggleBtn.className = "exam-toggle-btn inactive";
                
                examStatusDot.className = "exam-status-dot";
                examStatusText.textContent = "Prüfung abgeschlossen";
                examTimeElapsed.style.display = "none";
                
                const examHistory = JSON.parse(localStorage.getItem('nrw_exam_history') || '[]');
                examHistory.unshift({
                    candidate: examCandidate.value.trim(),
                    examiner: currentUser.username,
                    type: EXAM_SCHEMES[examType.value]?.name || examType.value,
                    score: activePoints,
                    passed: activePoints >= (EXAM_SCHEMES[examType.value]?.passingPoints || 70),
                    timestamp: new Date().toLocaleString('de-DE'),
                    protocol: examProtocolBox.textContent
                });
                localStorage.setItem('nrw_exam_history', JSON.stringify(examHistory));
                
                addLog('Prüfung durchgeführt', `@${examCandidate.value.trim()} geprüft in ${EXAM_SCHEMES[examType.value]?.name || examType.value}. Ergebnis: ${activePoints} Pkt.`);
                copyProtocolBtn.click();
            }
        });
    }

    if (copyProtocolBtn) {
        copyProtocolBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(examProtocolBox.textContent);
            copyProtocolBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Protokoll kopiert!`;
            setTimeout(() => {
                copyProtocolBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Protokoll kopieren & Prüfung abschließen`;
            }, 3000);
        });
    }


    // =========================================================================
    // 9. TAB: NEWS MANAGEMENT (CRUD with SVG icons)
    // =========================================================================
    const newsForm = document.getElementById('news-form');
    const newsTableBody = document.getElementById('news-table-body');
    const newsCancelBtn = document.getElementById('news-cancel-btn');
    const newsFormTitleText = document.getElementById('news-form-title-text');
    const newsSubmitBtn = document.getElementById('news-submit-btn');

    function renderNewsTab() {
        if (!newsTableBody) return;
        newsTableBody.innerHTML = '';

        const newsList = JSON.parse(localStorage.getItem('nrw_news') || '[]');
        if (newsList.length === 0) {
            newsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Keine Newsbeiträge vorhanden.</td></tr>`;
            return;
        }

        newsList.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.date}</strong></td>
                <td><span class="sidebar-role-badge" style="background: rgba(30, 58, 138, 0.1); color: var(--accent); font-weight:700;">${item.category}</span></td>
                <td><strong>${item.title}</strong></td>
                <td><span style="font-size:0.85rem; color:var(--text-secondary); max-width:240px; display:inline-block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.excerpt}</span></td>
                <td>
                    <div class="action-buttons" style="justify-content: center;">
                        <button class="action-btn edit" onclick="editNewsItem('${item.id}')" title="Beitrag bearbeiten">${ICONS.edit}</button>
                        <button class="action-btn delete" onclick="deleteNewsItem('${item.id}')" title="Beitrag löschen">${ICONS.delete}</button>
                    </div>
                </td>
            `;
            newsTableBody.appendChild(tr);
        });
    }

    if (newsForm) {
        newsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('news-id').value;
            const title = document.getElementById('news-title').value.trim();
            const category = document.getElementById('news-category').value;
            const placeholder = document.getElementById('news-placeholder').value.trim();
            const excerpt = document.getElementById('news-excerpt').value.trim();

            const newsList = JSON.parse(localStorage.getItem('nrw_news') || '[]');

            if (id) {
                const idx = newsList.findIndex(n => n.id === id);
                if (idx !== -1) {
                    newsList[idx].title = title;
                    newsList[idx].category = category;
                    newsList[idx].placeholder = placeholder;
                    newsList[idx].excerpt = excerpt;
                    addLog('News-Beitrag aktualisiert', `Titel: "${title}"`);
                }
            } else {
                const options = { day: 'numeric', month: 'long', year: 'numeric' };
                const today = new Date().toLocaleDateString('de-DE', options);
                
                newsList.unshift({
                    id: 'news_' + Date.now(),
                    category,
                    placeholder,
                    date: today,
                    title,
                    excerpt
                });
                addLog('News-Beitrag erstellt', `Titel: "${title}"`);
            }

            localStorage.setItem('nrw_news', JSON.stringify(newsList));
            resetNewsForm();
            renderNewsTab();
        });
    }

    if (newsCancelBtn) {
        newsCancelBtn.addEventListener('click', resetNewsForm);
    }

    function resetNewsForm() {
        if (!newsForm) return;
        newsForm.reset();
        document.getElementById('news-id').value = '';
        newsFormTitleText.textContent = "Neuen Beitrag erstellen";
        newsSubmitBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Beitrag veröffentlichen`;
        newsCancelBtn.style.display = "none";
    }

    window.editNewsItem = function(id) {
        const newsList = JSON.parse(localStorage.getItem('nrw_news') || '[]');
        const item = newsList.find(n => n.id === id);
        if (item) {
            document.getElementById('news-id').value = item.id;
            document.getElementById('news-title').value = item.title;
            document.getElementById('news-category').value = item.category;
            document.getElementById('news-placeholder').value = item.placeholder;
            document.getElementById('news-excerpt').value = item.excerpt;

            newsFormTitleText.textContent = "Beitrag bearbeiten";
            newsSubmitBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Änderungen speichern`;
            newsCancelBtn.style.display = "flex";
            
            newsForm.scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.deleteNewsItem = function(id) {
        if (confirm("Möchtest du diesen News-Beitrag wirklich löschen?")) {
            let newsList = JSON.parse(localStorage.getItem('nrw_news') || '[]');
            const item = newsList.find(n => n.id === id);
            if (item) {
                newsList = newsList.filter(n => n.id !== id);
                localStorage.setItem('nrw_news', JSON.stringify(newsList));
                addLog('News-Beitrag gelöscht', `Titel: "${item.title}"`);
                renderNewsTab();
            }
        }
    };


    // =========================================================================
    // 10. TAB: USER MANAGEMENT (OVERHAULED DYNAMIC CARD GRID WITH FILTERS)
    // =========================================================================
    const userForm = document.getElementById('user-form');
    const usersCardsContainer = document.getElementById('users-cards-container');
    const userCancelBtn = document.getElementById('user-cancel-btn');
    const userFormTitleEl = document.getElementById('user-form-title-el');
    const userSubmitBtn = document.getElementById('user-submit-btn');
    const userPrimaryRoleSelect = document.getElementById('user-primary-role');
    const userSearchInput = document.getElementById('user-search-input');
    const filterCategoryBtns = document.querySelectorAll('.filter-category-btn');

    let activeFilterRank = 'all'; // 'all', 'leitung', 'admin', 'moderation', 'praktikant'
    let activeFilterSearch = '';

    // Populate role select
    if (userPrimaryRoleSelect) {
        userPrimaryRoleSelect.innerHTML = '';
        Object.values(ROLES).forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            userPrimaryRoleSelect.appendChild(opt);
        });
    }

    function renderUsersTab() {
        if (!usersCardsContainer) return;
        usersCardsContainer.innerHTML = '';

        const staffList = JSON.parse(localStorage.getItem('nrw_staff_members') || '[]');

        // Filter staff members based on search input & category buttons
        const filteredList = staffList.filter(member => {
            // Search filter (Case insensitive)
            const matchesSearch = member.username.toLowerCase().includes(activeFilterSearch.toLowerCase()) || 
                                 member.primaryRole.toLowerCase().includes(activeFilterSearch.toLowerCase());
            
            // Category filter
            let matchesCategory = true;
            if (activeFilterRank === 'leitung') {
                matchesCategory = [ROLES.PL, ROLES.SPL, ROLES.PM, ROLES.SPM].includes(member.primaryRole);
            } else if (activeFilterRank === 'admin') {
                matchesCategory = [ROLES.ADMIN, ROLES.TV, ROLES.STV_TV, ROLES.HA, ROLES.SA, ROLES.A, ROLES.JA, ROLES.TA].includes(member.primaryRole);
            } else if (activeFilterRank === 'moderation') {
                matchesCategory = [ROLES.HM, ROLES.SM, ROLES.M, ROLES.JM, ROLES.TM].includes(member.primaryRole);
            } else if (activeFilterRank === 'praktikant') {
                matchesCategory = member.primaryRole === ROLES.P;
            }

            return matchesSearch && matchesCategory;
        });

        if (filteredList.length === 0) {
            usersCardsContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted); font-weight:600;">Keine Teammitglieder gefunden, die den Filtern entsprechen.</div>`;
            return;
        }

        filteredList.forEach(member => {
            const card = document.createElement('div');
            card.className = 'user-profile-card';

            // Role hierarchy categorization for rings and badges
            let categoryClass = 'other';
            let ringClass = 'ring-other';
            
            if ([ROLES.PL, ROLES.SPL, ROLES.PM, ROLES.SPM].includes(member.primaryRole)) {
                categoryClass = 'leitung';
                ringClass = 'ring-leitung';
            } else if ([ROLES.ADMIN, ROLES.TV, ROLES.STV_TV, ROLES.HA, ROLES.SA, ROLES.A, ROLES.JA, ROLES.TA].includes(member.primaryRole)) {
                categoryClass = 'admin-role';
                ringClass = 'ring-admin';
            } else if ([ROLES.HM, ROLES.SM, ROLES.M, ROLES.JM, ROLES.TM].includes(member.primaryRole)) {
                categoryClass = 'mod-role';
                ringClass = 'ring-moderator';
            } else if (member.primaryRole === ROLES.P) {
                categoryClass = 'other';
                ringClass = 'ring-praktikant';
            }

            const secRolesHtml = (member.secondaryRoles || []).map(r => `<span class="sec-role-tag">${r}</span>`).join(' ');
            const isSelf = member.username.toLowerCase() === currentUser.username.toLowerCase();

            // Create profile image or initial
            const avatarHtml = member.avatar 
                ? `<img src="${member.avatar}" alt="Avatar">`
                : member.username.charAt(0).toUpperCase();

            card.innerHTML = `
                <!-- Hover actions menu -->
                <div class="user-card-actions">
                    <button class="user-card-action-btn edit-btn" onclick="editStaffMember('${member.username}')" title="Account bearbeiten">
                        ${ICONS.edit}
                    </button>
                    ${!isSelf ? `
                        <button class="user-card-action-btn delete-btn" onclick="deleteStaffMember('${member.username}')" title="Account löschen">
                            ${ICONS.delete}
                        </button>
                    ` : ''}
                </div>

                <!-- Card Body -->
                <div class="user-card-avatar ${ringClass}">
                    ${avatarHtml}
                </div>
                <div class="user-card-name">${member.username}</div>
                <div class="user-card-primary-role rank-badge ${categoryClass}">${member.primaryRole}</div>
                <div class="user-card-secondary-roles">${secRolesHtml || '<span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">Keine Zusatzrollen</span>'}</div>
            `;
            usersCardsContainer.appendChild(card);
        });
    }

    // Live search listener
    if (userSearchInput) {
        userSearchInput.addEventListener('input', (e) => {
            activeFilterSearch = e.target.value;
            renderUsersTab();
        });
    }

    // Category filters tab switching
    filterCategoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterCategoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilterRank = btn.getAttribute('data-filter');
            renderUsersTab();
        });
    });

    if (userForm) {
        userForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const originalUsername = document.getElementById('user-original-username').value;
            const username = document.getElementById('user-username').value.trim();
            const password = document.getElementById('user-password').value;
            const primaryRole = document.getElementById('user-primary-role').value;
            
            const secCheckboxes = document.querySelectorAll('input[name="user-sec-role"]:checked');
            const secondaryRoles = Array.from(secCheckboxes).map(c => c.value);

            const staffList = JSON.parse(localStorage.getItem('nrw_staff_members') || '[]');

            const isDuplicate = staffList.some(u => 
                u.username.toLowerCase() === username.toLowerCase() && 
                u.username.toLowerCase() !== originalUsername.toLowerCase()
            );

            if (isDuplicate) {
                alert("Dieser Benutzername existiert bereits!");
                return;
            }

            if (originalUsername) {
                const idx = staffList.findIndex(u => u.username.toLowerCase() === originalUsername.toLowerCase());
                if (idx !== -1) {
                    staffList[idx].username = username;
                    staffList[idx].primaryRole = primaryRole;
                    staffList[idx].secondaryRoles = secondaryRoles;
                    if (password) {
                        staffList[idx].password = password;
                    }
                    addLog('Mitarbeiter-Account bearbeitet', `@${username} (${primaryRole})`);
                    
                    if (originalUsername.toLowerCase() === currentUser.username.toLowerCase()) {
                        currentUser = staffList[idx];
                        sessionStorage.setItem('nrw_active_session', JSON.stringify(currentUser));
                        syncUserProfileHeader();
                    }
                }
            } else {
                staffList.push({
                    username,
                    password,
                    primaryRole,
                    secondaryRoles,
                    avatar: ''
                });
                addLog('Mitarbeiter-Account erstellt', `@${username} (${primaryRole})`);
            }

            localStorage.setItem('nrw_staff_members', JSON.stringify(staffList));
            resetUserForm();
            renderUsersTab();
        });
    }

    if (userCancelBtn) {
        userCancelBtn.addEventListener('click', resetUserForm);
    }

    function resetUserForm() {
        if (!userForm) return;
        userForm.reset();
        document.getElementById('user-original-username').value = '';
        userFormTitleEl.textContent = "Neues Teammitglied anlegen";
        userSubmitBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Mitglied speichern`;
        document.getElementById('user-password').required = true;
        userCancelBtn.style.display = "none";
    }

    window.editStaffMember = function(username) {
        const staffList = JSON.parse(localStorage.getItem('nrw_staff_members') || '[]');
        const member = staffList.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (member) {
            document.getElementById('user-original-username').value = member.username;
            document.getElementById('user-username').value = member.username;
            document.getElementById('user-password').value = "";
            document.getElementById('user-password').required = false;
            document.getElementById('user-primary-role').value = member.primaryRole;
            
            const checkboxes = document.querySelectorAll('input[name="user-sec-role"]');
            checkboxes.forEach(cb => {
                cb.checked = (member.secondaryRoles || []).includes(cb.value);
            });

            userFormTitleEl.textContent = "Teammitglied bearbeiten";
            userSubmitBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Änderungen speichern`;
            userCancelBtn.style.display = "flex";

            userForm.scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.deleteStaffMember = function(username) {
        if (confirm(`Möchtest du das Teammitglied @${username} wirklich löschen?`)) {
            let staffList = JSON.parse(localStorage.getItem('nrw_staff_members') || '[]');
            staffList = staffList.filter(u => u.username.toLowerCase() !== username.toLowerCase());
            localStorage.setItem('nrw_staff_members', JSON.stringify(staffList));
            addLog('Mitarbeiter-Account gelöscht', `@${username}`);
            renderUsersTab();
        }
    };


    // =========================================================================
    // 11. TAB: RULES EDITOR (CRUD with SVG icons)
    // =========================================================================
    let activeRulesGroup = "ingame";
    const rulesCatBtns = document.querySelectorAll('.rules-cat-btn');
    const rulesListTitle = document.getElementById('rules-list-title');
    const rulesEditorList = document.getElementById('rules-editor-list');
    const ruleForm = document.getElementById('rule-form');
    const ruleFormTitleText = document.getElementById('rule-form-title-text');
    const ruleSubmitBtn = document.getElementById('rule-submit-btn');
    const ruleCancelBtn = document.getElementById('rule-cancel-btn');
    const ruleClausesContainer = document.getElementById('rule-clauses-container');
    const ruleAddClauseField = document.getElementById('rule-add-clause-field');

    // Rule Category tabs
    rulesCatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            activeRulesGroup = btn.getAttribute('data-group');
            rulesCatBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            let prettyGroup = "Ingame Regelwerk";
            if (activeRulesGroup === "fraktion") prettyGroup = "Fraktions Regelwerk";
            else if (activeRulesGroup === "discord") prettyGroup = "Discord Regelwerk";
            
            if (rulesListTitle) {
                rulesListTitle.textContent = `⚖️ Aktuelle Regeln im ${prettyGroup}`;
            }
            resetRuleForm();
            renderRulesTab();
        });
    });

    if (ruleAddClauseField) {
        ruleAddClauseField.addEventListener('click', () => addClauseInputField('', ''));
    }

    function addClauseInputField(title = '', text = '') {
        const div = document.createElement('div');
        div.className = 'form-grid';
        div.style.gridTemplateColumns = '1.2fr 2fr auto';
        div.style.gap = '0.5rem';
        div.style.alignItems = 'center';
        div.innerHTML = `
            <input type="text" class="clause-title-input" placeholder="z. B. 1.1 RDM" value="${title}" required>
            <textarea class="clause-text-input" placeholder="Absatzbeschreibung..." rows="2" required>${text}</textarea>
            <button type="button" class="btn btn-danger" style="padding: 0.6rem; border-radius:6px; display:flex; align-items:center;" onclick="this.parentElement.remove()" title="Absatz entfernen">
                ${ICONS.delete}
            </button>
        `;
        ruleClausesContainer.appendChild(div);
    }

    function renderRulesTab() {
        if (!rulesEditorList) return;
        rulesEditorList.innerHTML = '';

        const rulesList = JSON.parse(localStorage.getItem('nrw_rules') || '[]');
        const filtered = rulesList.filter(r => r.group === activeRulesGroup);

        if (filtered.length === 0) {
            rulesEditorList.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">Keine Regeln in dieser Kategorie vorhanden.</div>`;
            return;
        }

        filtered.forEach(rule => {
            const item = document.createElement('div');
            item.className = 'rule-editor-item';
            
            let clausesHtml = '';
            rule.clauses.forEach(clause => {
                clausesHtml += `
                    <div class="clause-item">
                        <div class="clause-item-header">
                            <span class="clause-item-title">${clause.title}</span>
                        </div>
                        <div class="clause-item-text">${clause.text}</div>
                    </div>
                `;
            });

            item.innerHTML = `
                <div class="rule-editor-header">
                    <div class="rule-editor-title">
                        <span style="color:var(--accent); font-weight:800;">${rule.num}</span> ${rule.title}
                    </div>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="editRuleItem('${rule.id}')" title="Regel bearbeiten">${ICONS.edit} Bearbeiten</button>
                        <button class="action-btn delete" onclick="deleteRuleItem('${rule.id}')" title="Regel löschen">${ICONS.delete} Löschen</button>
                    </div>
                </div>
                <div class="rule-editor-body">
                    ${clausesHtml || '<div style="color:var(--text-muted); font-size:0.8rem; font-style:italic;">Keine Absätze vorhanden.</div>'}
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.5rem;">Suchbegriffe: ${rule.searchTags || '-'}</div>
                </div>
            `;
            rulesEditorList.appendChild(item);
        });
    }

    if (ruleForm) {
        ruleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('rule-id').value;
            const num = document.getElementById('rule-num').value.trim();
            const title = document.getElementById('rule-title').value.trim();
            const searchTags = document.getElementById('rule-searchtags').value.trim();

            const clauses = [];
            const titleInputs = ruleClausesContainer.querySelectorAll('.clause-title-input');
            const textInputs = ruleClausesContainer.querySelectorAll('.clause-text-input');

            for (let i = 0; i < titleInputs.length; i++) {
                clauses.push({
                    title: titleInputs[i].value.trim(),
                    text: textInputs[i].value.trim()
                });
            }

            const rulesList = JSON.parse(localStorage.getItem('nrw_rules') || '[]');

            if (id) {
                const idx = rulesList.findIndex(r => r.id === id);
                if (idx !== -1) {
                    rulesList[idx].num = num;
                    rulesList[idx].title = title;
                    rulesList[idx].searchTags = searchTags;
                    rulesList[idx].clauses = clauses;
                    addLog('Regelwerk-Paragraphen geändert', `[${num}] ${title}`);
                }
            } else {
                rulesList.push({
                    id: 'rule_' + activeRulesGroup + '_' + Date.now(),
                    group: activeRulesGroup,
                    num,
                    title,
                    searchTags,
                    clauses
                });
                addLog('Regelwerk-Paragraphen erstellt', `[${num}] ${title}`);
            }

            localStorage.setItem('nrw_rules', JSON.stringify(rulesList));
            resetRuleForm();
            renderRulesTab();
        });
    }

    if (ruleCancelBtn) {
        ruleCancelBtn.addEventListener('click', resetRuleForm);
    }

    function resetRuleForm() {
        if (!ruleForm) return;
        ruleForm.reset();
        document.getElementById('rule-id').value = '';
        ruleClausesContainer.innerHTML = '';
        ruleFormTitleText.textContent = "Neuen Paragraphen / Bereich anlegen";
        ruleSubmitBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Änderungen speichern`;
        ruleCancelBtn.style.display = "none";
    }

    window.editRuleItem = function(id) {
        const rulesList = JSON.parse(localStorage.getItem('nrw_rules') || '[]');
        const rule = rulesList.find(r => r.id === id);
        if (rule) {
            document.getElementById('rule-id').value = rule.id;
            document.getElementById('rule-num').value = rule.num;
            document.getElementById('rule-title').value = rule.title;
            document.getElementById('rule-searchtags').value = rule.searchTags || '';

            ruleClausesContainer.innerHTML = '';
            rule.clauses.forEach(c => addClauseInputField(c.title, c.text));

            ruleFormTitleText.textContent = "Paragraphen bearbeiten";
            ruleSubmitBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Änderungen speichern`;
            ruleCancelBtn.style.display = "flex";

            ruleForm.scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.deleteRuleItem = function(id) {
        if (confirm("Möchtest du diese Regel wirklich vollständig löschen?")) {
            let rulesList = JSON.parse(localStorage.getItem('nrw_rules') || '[]');
            const rule = rulesList.find(r => r.id === id);
            if (rule) {
                rulesList = rulesList.filter(r => r.id !== id);
                localStorage.setItem('nrw_rules', JSON.stringify(rulesList));
                addLog('Regelwerk-Paragraphen gelöscht', `[${rule.num}] ${rule.title}`);
                renderRulesTab();
            }
        }
    };


    // =========================================================================
    // 12. TAB: PROFILE SETTINGS
    // =========================================================================
    const settingsForm = document.getElementById('settings-form');
    const settingsUsernameInput = document.getElementById('settings-username');
    const settingsPasswordInput = document.getElementById('settings-password');
    const settingsAvatarFileInput = document.getElementById('settings-avatar-file');

    let newAvatarBase64 = currentUser.avatar || '';

    if (settingsUsernameInput) {
        settingsUsernameInput.value = currentUser.username;
    }

    if (settingsAvatarFileInput) {
        settingsAvatarFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    newAvatarBase64 = event.target.result;
                    const preview = document.getElementById('settings-avatar-preview');
                    if (preview) {
                        preview.innerHTML = `<img src="${newAvatarBase64}">`;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newUsername = settingsUsernameInput.value.trim();
            const newPassword = settingsPasswordInput.value;

            const staffList = JSON.parse(localStorage.getItem('nrw_staff_members') || '[]');
            const uIdx = staffList.findIndex(u => u.username.toLowerCase() === currentUser.username.toLowerCase());

            if (uIdx === -1) return;

            const dup = staffList.some((u, index) => 
                index !== uIdx && u.username.toLowerCase() === newUsername.toLowerCase()
            );

            if (dup) {
                alert("Dieser Benutzername ist bereits vergeben.");
                return;
            }

            staffList[uIdx].username = newUsername;
            if (newPassword && newPassword.trim() !== '') {
                staffList[uIdx].password = newPassword.trim();
            }
            staffList[uIdx].avatar = newAvatarBase64;

            localStorage.setItem('nrw_staff_members', JSON.stringify(staffList));
            addLog('Mitarbeiter-Einstellungen geändert', `Benutzername von @${currentUser.username} zu @${newUsername}`);

            currentUser = staffList[uIdx];
            sessionStorage.setItem('nrw_active_session', JSON.stringify(currentUser));

            alert("Deine Einstellungen wurden erfolgreich gespeichert! Die Seite wird neu geladen.");
            window.location.reload();
        });
    }

    function addLog(action, details = '') {
        const logs = JSON.parse(localStorage.getItem('nrw_logs') || '[]');
        const timestamp = new Date().toLocaleString('de-DE');
        logs.unshift({ username: currentUser.username, action, details, timestamp });
        localStorage.setItem('nrw_logs', JSON.stringify(logs));
    }
});
