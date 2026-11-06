const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyc_BJjYLnpe8dxgsDVrPs8amtfZ4CtxF7Fzbf9FasMgDVZKAuA9nPggwwBKClJh-j9-A/exec";

let isLoginMode = true; 

const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const toggleText = document.getElementById('toggleText');
const toggleBtn = document.getElementById('toggleBtn');
const authForm = document.getElementById('authForm');
const statusMessage = document.getElementById('statusMessage');

toggleBtn.addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  statusMessage.innerText = '';

  if (isLoginMode) {
    formTitle.innerText = 'เข้าสู่ระบบ';
    submitBtn.innerText = 'เข้าสู่ระบบ';
    toggleText.innerText = 'ยังไม่มีบัญชีใช่ไหม?';
    toggleBtn.innerText = 'สมัครสมาชิกใหม่';
  } else {
    formTitle.innerText = 'สมัครสมาชิกใหม่';
    submitBtn.innerText = 'ลงทะเบียน';
    toggleText.innerText = 'มีบัญชีอยู่แล้ว?';
    toggleBtn.innerText = 'เข้าสู่ระบบ';
  }
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    showStatus('กรุณากรอกข้อมูลให้ครบถ้วน', 'red');
    return;
  }

  const action = isLoginMode ? 'LOGIN' : 'REGISTER';
  showStatus('กำลังตรวจสอบข้อมูล...', 'blue');

  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: action,
        username: username,
        password: password
      })
    });

    const result = await response.json();

    if (result.status === 'success') {
      showStatus(result.message, 'green');

      if (isLoginMode) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', username);

        // ออกจากโฟลเดอร์ login เข้าไปที่โฟลเดอร์ game
        setTimeout(() => {
          window.location.href = '../game/home.html';
        }, 1200);
      } else {
        setTimeout(() => {
          toggleBtn.click();
        }, 1500);
      }

    } else {
      showStatus(result.message, 'red');
    }

  } catch (error) {
    console.error(error);
    showStatus('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ', 'red');
  }
});

function showStatus(text, color) {
  statusMessage.innerText = text;
  statusMessage.style.color = color;
}

