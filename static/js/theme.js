// ==================== TEMA ====================

function updateThemeUI(isDark) {
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    const themeCheckbox = document.getElementById('themeCheckbox');

    if (themeIcon) {
        themeIcon.textContent = isDark ? 'dark_mode' : 'light_mode';
        themeIcon.style.color = isDark ? '#ffffff' : '#000000';
    }

    if (themeText) {
        themeText.textContent = isDark ? 'Modo Escuro' : 'Modo Claro';
    }

    if (themeCheckbox) {
        themeCheckbox.checked = isDark;
    }

    if (isDark) {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
}

function initTheme(savedTheme = null) {
    const saved = savedTheme || localStorage.getItem('theme');
    const isDark = (saved === 'dark');

    updateThemeUI(isDark);

    const themeCheckbox = document.getElementById('themeCheckbox');
    if (themeCheckbox) {
        // Re-attach listener
        const newCheckbox = themeCheckbox.cloneNode(true);
        themeCheckbox.parentNode.replaceChild(newCheckbox, themeCheckbox);

        newCheckbox.addEventListener('change', () => {
            toggleTheme();
        });
    }
}

async function toggleTheme() {
    const isDark = !document.body.classList.contains('dark');
    const themeName = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', themeName);

    updateThemeUI(isDark);

    // Save to backend
    try {
        await fetch('/api/user/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: themeName })
        });
    } catch (e) {
        console.error('Erro ao salvar preferência de tema:', e);
    }

    if (typeof criarGraficos === 'function') criarGraficos();
    if (typeof atualizarDashboardETL === 'function') atualizarDashboardETL();
}
