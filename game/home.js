document.addEventListener('DOMContentLoaded', () => {
    const LOGIN_PAGE_URL = '../login/index.html';

    // 1. ตรวจสอบสถานะการเข้าสู่ระบบ
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentUser = localStorage.getItem('currentUser');

    if (!isLoggedIn || isLoggedIn !== 'true' || !currentUser) {
        window.location.replace(LOGIN_PAGE_URL);
        return;
    }

    // แสดงชื่อผู้ใช้งานบน Navbar
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting) {
        userGreeting.textContent = `@${currentUser}`;
    }

    // 2. ออกจากระบบ
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
            showToast('ออกจากระบบเรียบร้อยแล้ว');

            setTimeout(() => {
                window.location.href = LOGIN_PAGE_URL;
            }, 650);
        });
    }

    // 3. ระบบกรองหมวดหมู่เกม + นับจำนวนอัตโนมัติ
    const filterButtons = document.querySelectorAll('.filter-btn');
    const gameCards = document.querySelectorAll('.game-card');
    const gameGrid = document.querySelector('.game-grid');

    updateFilterLabels(filterButtons, gameCards);

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const selectedCategory = button.getAttribute('data-category');
            let visibleCount = 0;

            gameCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                const matches = selectedCategory === 'all' || cardCategory === selectedCategory;

                if (matches) {
                    visibleCount++;
                    card.style.display = 'flex';
                    card.classList.remove('card-enter');
                    void card.offsetWidth;
                    card.classList.add('card-enter');
                } else {
                    card.style.display = 'none';
                }
            });

            toggleEmptyState(gameGrid, visibleCount);
        });
    });

    // 4. ผูกปุ่มเปิดเกม
    const actionButtons = document.querySelectorAll('.btn-card-action[data-game]');
    actionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const gameName = btn.getAttribute('data-game');
            playGame(gameName);
        });
    });
});

function updateFilterLabels(filterButtons, gameCards) {
    filterButtons.forEach(btn => {
        const category = btn.getAttribute('data-category');
        const baseText = btn.getAttribute('data-base') || btn.textContent.trim();
        btn.setAttribute('data-base', baseText);

        const count = category === 'all'
            ? gameCards.length
            : Array.from(gameCards).filter(card => card.getAttribute('data-category') === category).length;

        btn.textContent = `${baseText} ${String(count).padStart(2, '0')}`;
    });
}

function toggleEmptyState(gameGrid, visibleCount) {
    if (!gameGrid) return;
    let notice = document.getElementById('emptyCategoryNotice');

    if (visibleCount === 0) {
        if (!notice) {
            notice = document.createElement('div');
            notice.id = 'emptyCategoryNotice';
            notice.className = 'empty-notice';
            notice.textContent = 'ยังไม่มีเกมในหมวดหมู่นี้';
            gameGrid.appendChild(notice);
        }
    } else if (notice) {
        notice.remove();
    }
}

function playGame(gameName) {
    const routes = {
        'Snake': 'snake.html',
        'Tic-Tac-Toe': 'xo.html',
        'Space Runner': 'space.html',
        'Memory Match': 'memory.html',
        'Chess': 'chess.html',
        'Logic Gate': 'logic.html',
    };

    if (routes[gameName]) {
        window.location.href = routes[gameName];
    } else {
        showToast(`เกม "${gameName}" กำลังอยู่ในช่วงพัฒนา`);
    }
}

let toastTimer;
function showToast(message) {
    let toast = document.getElementById('craftToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'craftToast';
        toast.className = 'craft-toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2400);
}