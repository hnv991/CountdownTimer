// Tất cả code được gộp vào một file để tránh vấn đề với ES modules
let wakeLock = null;
let isWakeLockEnabled = true;

// Audio Manager
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API không được hỗ trợ');
        }
    }

    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    playSound(soundType) {
        if (!this.audioContext) return;

        switch (soundType) {
            case 'beep':
                this.playBeepSound();
                break;
            case 'bell':
                this.playBellSound();
                break;
            case 'alarm':
                this.playAlarmSound();
                break;
            case 'ding':
                this.playDingSound();
                break;
        }
    }

    playBeepSound() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }

    playBellSound() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = 523.25;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 1);
    }

    playAlarmSound() {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.frequency.value = 880;
                osc.type = 'square';
                
                gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                gain.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.01);
                gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);
                
                osc.start(this.audioContext.currentTime);
                osc.stop(this.audioContext.currentTime + 0.2);
            }, i * 300);
        }
    }

    playDingSound() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = 1000;
        oscillator.type = 'triangle';

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.8);
    }
}

// State Manager
class StateManager {
    constructor() {
        this.STATE_KEY = 'timerState';
        this.END_TIME_KEY = 'timerEndTime';
        this.WAKELOCK_KEY = 'wakeLockEnabled';
    }

    saveState(state) {
        localStorage.setItem(this.STATE_KEY, JSON.stringify(state));
    }

    loadState() {
        const savedState = localStorage.getItem(this.STATE_KEY);
        return savedState ? JSON.parse(savedState) : null;
    }

    saveEndTime(currentSeconds) {
        const endTime = Date.now() + (currentSeconds * 1000);
        localStorage.setItem(this.END_TIME_KEY, endTime.toString());
    }

    calculateRemainingTime() {
        const endTimeStr = localStorage.getItem(this.END_TIME_KEY);
        if (endTimeStr) {
            const endTime = parseInt(endTimeStr);
            const now = Date.now();
            return Math.ceil((endTime - now) / 1000);
        }
        return null;
    }

    clearEndTime() {
        localStorage.removeItem(this.END_TIME_KEY);
    }

    resetState() {
        localStorage.removeItem(this.STATE_KEY);
        this.clearEndTime();
    }

    saveWakeLockSetting(enabled) {
        localStorage.setItem(this.WAKELOCK_KEY, JSON.stringify(enabled));
    }

    loadWakeLockSetting() {
        const setting = localStorage.getItem(this.WAKELOCK_KEY);
        return setting ? JSON.parse(setting) : true;
    }
}

// Timer UI
class TimerUI {
    constructor() {
        this.initElements();
    }

    initElements() {
        this.minutesInput = document.getElementById('minutes');
        this.secondsInput = document.getElementById('seconds');
        this.soundSelect = document.getElementById('soundSelect');
        this.maxCyclesInput = document.getElementById('maxCycles');
        this.timerDisplay = document.getElementById('timerDisplay');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.cycleCounter = document.getElementById('cycleCounter');
        this.status = document.getElementById('status');
        this.wakeLockToggle = document.getElementById('wakeLockToggle');
    }

    getInputValues() {
        return {
            minutes: parseInt(this.minutesInput.value) || 0,
            seconds: parseInt(this.secondsInput.value) || 0,
            maxCycles: parseInt(this.maxCyclesInput.value) || 0,
            soundType: this.soundSelect.value
        };
    }

    updateDisplay(minutes, seconds, warning = false) {
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.timerDisplay.textContent = display;

        if (warning) {
            this.timerDisplay.classList.add('warning');
        } else {
            this.timerDisplay.classList.remove('warning');
        }
    }

    updateButtonStates(isRunning, isPaused) {
        if (isRunning) {
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
            this.stopBtn.disabled = false;
            this.startBtn.textContent = 'Đang Chạy';
        } else if (isPaused) {
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.startBtn.textContent = 'Tiếp Tục';
        } else {
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.stopBtn.disabled = true;
            this.startBtn.textContent = 'Bắt Đầu';
        }
    }

    updateStatus(status) {
        this.status.className = `status ${status}`;
        switch (status) {
            case 'running':
                this.status.textContent = '⏳ Đang chạy...';
                break;
            case 'paused':
                this.status.textContent = '⏸️ Tạm dừng';
                break;
            case 'stopped':
                this.status.textContent = '⏹️ Đã dừng';
                break;
            case 'completed':
                this.status.textContent = '🎉 Hoàn thành!';
                this.status.className = 'status running';
                break;
            default:
                this.status.textContent = '✅ Sẵn sàng';
                this.status.className = 'status';
        }
    }

    updateCycleCounter(currentCycle, maxCycles) {
        if (maxCycles === 0) {
            this.cycleCounter.textContent = `Chu kỳ: ${currentCycle} / ∞`;
        } else {
            this.cycleCounter.textContent = `Chu kỳ: ${currentCycle} / ${maxCycles}`;
        }
    }

    showNotification(title, message) {
        console.log('Attempting to show notification:', title, message);
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                console.log('Notification permission granted, showing notification');
                new Notification(title, {
                    body: message,
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⏰</text></svg>'
                });
            } else if (Notification.permission === 'denied') {
                console.log('Notification permission denied, showing alert instead');
                alert(message);
            } else {
                console.log('Requesting notification permission');
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(title, {
                            body: message,
                            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⏰</text></svg>'
                        });
                    } else {
                        alert(message);
                    }
                });
            }
        } else {
            console.log('Notifications not supported, showing alert');
            alert(message);
        }
    }

    disableInputs() {
        this.minutesInput.disabled = true;
        this.secondsInput.disabled = true;
        this.maxCyclesInput.disabled = true;
        this.soundSelect.disabled = true;
    }

    enableInputs() {
        this.minutesInput.disabled = false;
        this.secondsInput.disabled = false;
        this.maxCyclesInput.disabled = false;
        this.soundSelect.disabled = false;
    }

    setWakeLockState(enabled) {
        if (this.wakeLockToggle) {
            this.wakeLockToggle.checked = enabled;
        }
    }
}

// Main Timer Class
class CountdownTimer {
    constructor() {
        this.totalSeconds = 0;
        this.currentSeconds = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.cycleCount = 0;
        this.maxCycles = 0;
        this.intervalId = null;

        this.ui = new TimerUI();
        this.audio = new AudioManager();
        this.stateManager = new StateManager();

        this.initializeApp();
        this.bindEvents();
        this.loadSavedState();
        this.setupWakeLock();
    }

    initializeApp() {
        if ('Notification' in window) {
            console.log('Checking notification permission status');
            Notification.requestPermission().then(permission => {
                console.log('Notification permission status:', permission);
            });
        } else {
            console.log('Notifications not supported in this browser');
        }

        window.addEventListener('beforeunload', (e) => {
            if (this.isRunning) {
                e.preventDefault();
                e.returnValue = 'Timer đang chạy. Bạn có chắc muốn thoát?';
            }
        });

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(console.error);
        }
    }

    setupWakeLock() {
        isWakeLockEnabled = this.stateManager.loadWakeLockSetting();
        this.ui.setWakeLockState(isWakeLockEnabled);
        
        if (this.ui.wakeLockToggle) {
            this.ui.wakeLockToggle.addEventListener('change', (e) => {
                isWakeLockEnabled = e.target.checked;
                this.stateManager.saveWakeLockSetting(isWakeLockEnabled);
                if (isWakeLockEnabled) {
                    this.requestWakeLock();
                } else if (wakeLock) {
                    wakeLock.release();
                    wakeLock = null;
                }
            });
        }
    }

    async requestWakeLock() {
        if (!isWakeLockEnabled || !('wakeLock' in navigator)) return;

        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('WakeLock được kích hoạt');
        } catch (err) {
            console.log(`${err.name}, ${err.message}`);
        }
    }

    bindEvents() {
        this.ui.startBtn.addEventListener('click', () => this.start());
        this.ui.pauseBtn.addEventListener('click', () => this.pause());
        this.ui.stopBtn.addEventListener('click', () => this.stop());
        
        this.ui.minutesInput.addEventListener('input', () => this.updateTimeFromInputs());
        this.ui.secondsInput.addEventListener('input', () => this.updateTimeFromInputs());
        this.ui.maxCyclesInput.addEventListener('input', () => this.updateCycleCounter());

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.isRunning) {
                this.handleBackgroundState();
            } else if (document.visibilityState === 'visible') {
                this.handleForegroundState();
            }
        });
    }

    loadSavedState() {
        const savedState = this.stateManager.loadState();
        if (savedState) {
            Object.assign(this, savedState);
            this.updateUI();
        }
    }

    handleBackgroundState() {
        console.log('App entering background state');
        this.stateManager.saveState(this.getState());
        this.stateManager.saveEndTime(this.currentSeconds);
        
        // Schedule notification for timer completion in background
        if (this.isRunning && this.currentSeconds > 0) {
            const timeLeft = this.currentSeconds;
            console.log('Scheduling background notification in', timeLeft, 'seconds');
            setTimeout(() => {
                if (document.visibilityState === 'hidden') {
                    const message = 'Hẹn giờ đã kết thúc!';
                    if (window.Android) {
                        window.Android.showNotification('Hoàn thành!', message);
                    } else {
                        this.ui.showNotification('Hoàn thành!', message);
                    }
                }
            }, timeLeft * 1000);
        }
    }

    handleForegroundState() {
        const remainingTime = this.stateManager.calculateRemainingTime();
        if (remainingTime !== null && this.isRunning) {
            this.currentSeconds = remainingTime > 0 ? remainingTime : 0;
            if (remainingTime <= 0) {
                this.onTimerComplete();
            } else {
                this.start(true);
            }
            this.stateManager.clearEndTime();
        }
    }

    updateTimeFromInputs() {
        if (!this.isRunning) {
            const { minutes, seconds } = this.ui.getInputValues();
            this.totalSeconds = minutes * 60 + seconds;
            this.currentSeconds = this.totalSeconds;
            this.updateUI();
        }
    }

    async start(isRestoring = false) {
        await this.requestWakeLock();

        if (!isRestoring) {
            if (!this.isPaused) {
                const { minutes, seconds, maxCycles } = this.ui.getInputValues();
                this.totalSeconds = minutes * 60 + seconds;
                this.currentSeconds = this.totalSeconds;
                this.maxCycles = maxCycles;
            }

            if (this.currentSeconds <= 0) {
                this.ui.showNotification('Lỗi', 'Vui lòng nhập thời gian hợp lệ!');
                return;
            }

            if (this.maxCycles > 0 && this.cycleCount >= this.maxCycles) {
                this.ui.showNotification('Hoàn thành', 'Đã hoàn thành đủ số chu kỳ!');
                return;
            }
        }

        this.isRunning = true;
        this.isPaused = false;
        this.updateUI();
        await this.audio.resume();

        clearInterval(this.intervalId);
        this.intervalId = setInterval(() => {
            this.currentSeconds--;
            this.updateUI();
            this.stateManager.saveState(this.getState());

            if (this.currentSeconds <= 0) {
                this.onTimerComplete();
            }
        }, 1000);
    }

    pause() {
        if (this.isRunning) {
            this.isRunning = false;
            this.isPaused = true;
            clearInterval(this.intervalId);
            this.updateUI();
        }
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.cycleCount = 0;
        clearInterval(this.intervalId);
        this.updateTimeFromInputs();
        this.updateUI();
        this.stateManager.resetState();
    }

    onTimerComplete() {
        console.log('Timer completed, current cycle:', this.cycleCount + 1);
        this.cycleCount++;
        this.playCompletionSound();

        // Show notification for cycle completion
        const message = `Đã hoàn thành chu kỳ ${this.cycleCount}`;
        if (window.Android) {
            console.log('Showing Android notification');
            window.Android.showNotification('Hoàn thành chu kỳ!', message);
        } else {
            console.log('Showing web notification');
            this.ui.showNotification('Hoàn thành chu kỳ!', message);
        }
        
        if (this.maxCycles > 0 && this.cycleCount >= this.maxCycles) {
            this.handleCycleCompletion();
            return;
        }
        
        this.currentSeconds = this.totalSeconds;
        this.updateUI();
    }

    playCompletionSound() {
        const soundType = this.ui.soundSelect.value;
        if (window.Android) {
            window.Android.playSound(soundType);
        } else {
            this.audio.playSound(soundType);
        }
    }

    handleCycleCompletion() {
        this.isRunning = false;
        clearInterval(this.intervalId);
        this.updateUI();

        const message = `🎉 Đã hoàn thành ${this.cycleCount} chu kỳ!`;
        if (window.Android) {
            window.Android.showNotification('Hoàn thành!', message);
        } else {
            alert(message);
        }
    }

    updateUI() {
        const minutes = Math.floor(this.currentSeconds / 60);
        const seconds = this.currentSeconds % 60;
        const warning = this.currentSeconds <= 10 && this.currentSeconds > 0;

        this.ui.updateDisplay(minutes, seconds, warning);
        this.ui.updateButtonStates(this.isRunning, this.isPaused);
        this.ui.updateCycleCounter(this.cycleCount, this.maxCycles);
        this.ui.updateStatus(this.getStatus());

        if (this.isRunning) {
            this.ui.disableInputs();
        } else {
            this.ui.enableInputs();
        }
    }

    getStatus() {
        if (!this.isRunning && !this.isPaused) return 'stopped';
        if (this.isPaused) return 'paused';
        if (this.maxCycles > 0 && this.cycleCount >= this.maxCycles) return 'completed';
        return 'running';
    }

    getState() {
        return {
            totalSeconds: this.totalSeconds,
            currentSeconds: this.currentSeconds,
            isRunning: this.isRunning,
            cycleCount: this.cycleCount,
            maxCycles: this.maxCycles
        };
    }
}

// Khởi tạo ứng dụng
// Khởi tạo AudioContext khi có tương tác người dùng
document.addEventListener('click', function initAudio() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    document.removeEventListener('click', initAudio);
}, { once: true });

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    new CountdownTimer();
});
