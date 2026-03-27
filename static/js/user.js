// ==================== USER MANAGEMENT ====================

async function loadUserInfo() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const user = await response.json();

            // Critical for role-based logic
            state.userRole = user.username.toLowerCase();

            if (user.preferences && user.preferences.theme && typeof initTheme === 'function') {
                initTheme(user.preferences.theme);
            }

            const userNameEl = document.getElementById('userName');
            const dropdownUserNameEl = document.getElementById('dropdownUserName');
            const userRoleEl = document.getElementById('userRole');

            if (userNameEl) userNameEl.textContent = user.nome;
            if (dropdownUserNameEl) dropdownUserNameEl.textContent = user.nome;
            if (userRoleEl) userRoleEl.textContent = user.cargo;

            return user;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        return null;
    }
}

function initUserMenu() {
    const btn = document.getElementById('userMenuBtn'), menu = document.getElementById('userDropdown');
    if (!btn || !menu) return;

    btn.onclick = (e) => {
        e.stopPropagation();
        const open = menu.classList.contains('show');
        btn.setAttribute('aria-expanded', !open);
        menu.classList.toggle('show');
    };

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            btn.setAttribute('aria-expanded', 'false');
            menu.classList.remove('show');
        }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            // Limpar filtros ao sair para garantir que o ano padrão seja aplicado no próximo login
            localStorage.removeItem('dashboard_filters');
            const res = await fetch('/logout');
            if (res.redirected) window.location.href = res.url;
        } catch (e) { window.location.href = '/login'; }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Note: loadUserInfo is now called and awaited by init() in main.js
    initUserMenu();
});
