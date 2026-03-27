document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const snackbar = document.getElementById('snackbar');
    const loginBox = document.querySelector('.login-box');
    const loginContainer = document.querySelector('.login-container');

    // Toggle Password Visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.classList.toggle('fa-eye');
            togglePassword.classList.toggle('fa-eye-slash');
        });
    }

    // Function to show snackbar
    function showSnackbar(message, type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        snackbar.innerHTML = `
            <i class="fas ${icons[type] || 'fa-info-circle'} snackbar-icon"></i>
            <span class="snackbar-message">${message}</span>
        `;
        snackbar.className = `snackbar snackbar-${type}`;

        setTimeout(() => snackbar.classList.add('show'), 10);
        setTimeout(() => snackbar.classList.remove('show'), 3000);
    }

    // Success Animation
    async function animateLoginSuccess() {
        return new Promise((resolve) => {
            loginBox.classList.add('success-glow');
            
            // Subtle transition out with a professional "premium" feel
            setTimeout(() => {
                loginContainer.style.opacity = '0';
                loginContainer.style.transform = 'translateY(-20px) scale(1.05)';
                loginContainer.style.filter = 'blur(15px)';
                setTimeout(resolve, 800);
            }, 600);
        });
    }

    // Error Animation
    async function animateLoginError() {
        return new Promise((resolve) => {
            loginBox.classList.add('shake-animation');
            setTimeout(() => {
                loginBox.classList.remove('shake-animation');
                resolve();
            }, 500);
        });
    }

    // Form Submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = passwordInput.value;
            const submitBtn = loginForm.querySelector('.btn-login');

            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            const originalContent = submitBtn.innerHTML;

            // Wait a small delay before clearing text to ensure the transition to spinner is smooth
            setTimeout(() => {
                if (submitBtn.classList.contains('loading')) {
                    submitBtn.innerHTML = '<span style="visibility: hidden">Entrar</span>';
                }
            }, 50);

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    showSnackbar(data.message, 'success');
                    await animateLoginSuccess();
                    window.location.href = '/inicio';
                } else {
                    showSnackbar(data.message, 'error');
                    await animateLoginError();
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('loading');
                    submitBtn.innerHTML = originalContent;
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            } catch (error) {
                showSnackbar('Erro ao conectar com o servidor.', 'error');
                await animateLoginError();
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
                submitBtn.innerHTML = originalContent;
            }
        });
    }
});
