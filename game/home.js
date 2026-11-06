document.addEventListener('DOMContentLoaded', () => {
    // 1. ตรวจสอบการล็อกอิน (ถ้ายังไม่ล็อกอิน ให้ดีดกลับไปหน้า login)
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentUser = localStorage.getItem('currentUser');

    if (!isLoggedIn || isLoggedIn !== 'true') {
        alert('กรุณาเข้าสู่ระบบก่อนใช้งาน');
        window.location.href = '../login/index.html';
        return;
    }

    // แสดงชื่อผู้ใช้ที่มุมขวาบนของ Navbar
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting && currentUser) {
        userGreeting.innerText = `👤 ${currentUser}`;
    }

    // 2. ระบบออกจากระบบ (Logout)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
            alert('ออกจากระบบเรียบร้อยแล้ว');
            window.location.href = '../login/index.html';
        });
    }

    // 3. ระบบกรองหมวดหมู่เกม (Filter Category)
    const filterButtons = document.querySelectorAll('.filter-btn');
    const gameCards = document.querySelectorAll('.game-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const category = button.getAttribute('data-category');

            gameCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                if (category === 'all' || cardCategory === category) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
});

// 4. ฟังก์ชันควบคุมการกดปุ่มเล่นเกม
function playGame(gameName) {
    if (gameName === 'Snake') {
        window.location.href = 'snake.html'; // เปิดหน้าเล่นเกมงู
    } else {
        alert(`เกม ${gameName} กำลังอยู่ในช่วงพัฒนา!`);
    }
}

function playGame(gameName) {
    if (gameName === 'Snake') {
        window.location.href = 'snake.html';
    } else if (gameName === 'Tic-Tac-Toe') {
        window.location.href = 'xo.html'; // เพิ่มบรรทัดนี้เข้ามา
    } else {
        alert(`เกม ${gameName} กำลังอยู่ในช่วงพัฒนา!`);
    }
}