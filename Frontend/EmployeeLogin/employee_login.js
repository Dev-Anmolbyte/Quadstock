document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('employee-login-form');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');

    // --- Toggle Password Visibility ---
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Toggle Icon
            const icon = togglePasswordBtn.querySelector('i');
            if (type === 'text') {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    }

    // --- Handle Login ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const empId = document.getElementById('employee-id').value;
            const password = passwordInput.value;

            console.log('Logging in with:', empId, password);

            // For now, simulate a successful login
            const loginBtn = loginForm.querySelector('.btn-login');
            const originalContent = loginBtn.innerHTML;

            loginBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
            loginBtn.disabled = true;

            setTimeout(() => {
                // Redirect logic based on role (Mocking for now)
                // In a real app, this would check against a database
                alert('Login Successful! Welcome ' + empId);

                // If the user is a manager, redirect to manager dashboard
                // For demo purposes, let's say all EMP logins go to manager dashboard if ID contains 'MGR'
                if (empId.toUpperCase().includes('MGR')) {
                    window.location.href = '../Managerdashboard/manager_dashboard.html';
                } else {
                    // For now, just go to dashboard or stay here
                    window.location.href = '../Managerdashboard/manager_dashboard.html';
                }
            }, 1000);
        });
    }

    // --- Dynamic Background Interaction ---
    document.addEventListener('mousemove', (e) => {
        const orbs = document.querySelectorAll('.orb');
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        orbs.forEach((orb, index) => {
            const speed = (index + 1) * 20;
            const moveX = (x * speed);
            const moveY = (y * speed);
            orb.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    });
});
