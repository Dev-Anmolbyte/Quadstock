import { initInteractiveBackground } from '../Shared/Components/interactive-bg.js';

const API_BASE = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    // ── Background ────────────────────────────────────────────────────────────
    try { initInteractiveBackground('interactive-bg'); } catch (_) {}

    // ── Email from sessionStorage ─────────────────────────────────────────────
    const pendingEmail = sessionStorage.getItem('pendingVerificationEmail');
    if (!pendingEmail) {
        window.location.href = 'signup.html';
        return;
    }
    document.getElementById('email-display').textContent = pendingEmail;

    // ── DOM refs ──────────────────────────────────────────────────────────────
    const digits    = [...document.querySelectorAll('.otp-digit')];
    const statusEl  = document.getElementById('status-message');
    const verifyBtn = document.getElementById('verify-btn');
    const resendBtn = document.getElementById('resend-btn');
    const countdownEl   = document.getElementById('countdown');
    const timerDisplay  = document.getElementById('timer-display');

    // ── OTP digit box logic ───────────────────────────────────────────────────
    digits.forEach((input, idx) => {

        // Only allow digits; handle backspace / arrows
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                e.preventDefault();
                if (input.value) {
                    // Clear current box first
                    input.value = '';
                    input.classList.remove('filled');
                } else if (idx > 0) {
                    // Move back and clear
                    digits[idx - 1].focus();
                    digits[idx - 1].value = '';
                    digits[idx - 1].classList.remove('filled');
                }
                return;
            }
            if (e.key === 'ArrowLeft'  && idx > 0) { e.preventDefault(); digits[idx - 1].focus(); return; }
            if (e.key === 'ArrowRight' && idx < 5) { e.preventDefault(); digits[idx + 1].focus(); return; }

            // Block non-digit keys (except Tab)
            if (!/^\d$/.test(e.key) && e.key !== 'Tab') {
                e.preventDefault();
            }
        });

        input.addEventListener('input', () => {
            // Keep only the last digit typed
            const cleaned = input.value.replace(/\D/g, '').slice(-1);
            input.value = cleaned;

            if (cleaned) {
                input.classList.add('filled');
                // Auto-advance
                if (idx < 5) digits[idx + 1].focus();
            } else {
                input.classList.remove('filled');
            }
        });

        // Paste support — paste whole OTP at once
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            pasted.split('').forEach((char, i) => {
                if (digits[i]) {
                    digits[i].value = char;
                    digits[i].classList.add('filled');
                }
            });
            const nextEmpty = digits.findIndex(d => !d.value);
            (nextEmpty >= 0 ? digits[nextEmpty] : digits[5]).focus();
        });

        // Click on any box → clear it so user can retype
        input.addEventListener('click', () => {
            input.select();
        });
    });

    // Focus first digit on page load
    setTimeout(() => digits[0].focus(), 100);

    // ── Timer ─────────────────────────────────────────────────────────────────
    let timerInterval = null;

    const startTimer = () => {
        // Clear any existing timer first
        if (timerInterval) clearInterval(timerInterval);

        let seconds = 60;
        countdownEl.textContent = seconds;
        resendBtn.disabled = true;
        timerDisplay.style.display = 'inline';

        timerInterval = setInterval(() => {
            seconds--;
            countdownEl.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                resendBtn.disabled = false;
                timerDisplay.style.display = 'none';
            }
        }, 1000);
    };

    startTimer();

    // ── Resend OTP ────────────────────────────────────────────────────────────
    resendBtn.addEventListener('click', async () => {
        resendBtn.disabled = true;
        setStatus('', '');

        try {
            const res = await fetch(`${API_BASE}/users/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: pendingEmail })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Failed to resend OTP.');

            setStatus('success', 'New OTP sent! Check your inbox.');
            startTimer(); // Restart timer after successful resend

        } catch (err) {
            setStatus('error', err.message || 'Could not resend OTP. Try again.');
            resendBtn.disabled = false; // Allow retry on failure
        }
    });

    // ── Verify OTP ────────────────────────────────────────────────────────────
    document.getElementById('otp-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const otp = digits.map(d => d.value).join('');

        if (otp.length < 6) {
            setStatus('error', 'Please enter all 6 digits.');
            digits[0].focus();
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verifying...';
        setStatus('', '');

        try {
            const res = await fetch(`${API_BASE}/users/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: pendingEmail, otp })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Invalid OTP.');

            // ✅ Success
            setStatus('success', 'Account verified! Redirecting to login...');
            sessionStorage.removeItem('pendingVerificationEmail');
            if (timerInterval) clearInterval(timerInterval);

            setTimeout(() => { window.location.href = 'login.html'; }, 1800);

        } catch (err) {
            // ❌ Shake & clear boxes
            digits.forEach(d => {
                d.classList.add('error');
                d.value = '';
                d.classList.remove('filled');
            });
            setTimeout(() => digits.forEach(d => d.classList.remove('error')), 500);

            setStatus('error', err.message || 'Verification failed. Please try again.');
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = 'Verify Account';
            digits[0].focus();
        }
    });

    // ── Helper ────────────────────────────────────────────────────────────────
    function setStatus(type, message) {
        statusEl.textContent = message;
        statusEl.className = 'status-message' + (type ? ' ' + type : '');
    }
});
