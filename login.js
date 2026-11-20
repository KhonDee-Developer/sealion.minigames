const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyc_BJjYLnpe8dxgsDVrPs8amtfZ4CtxF7Fzbf9FasMgDVZKAuA9nPggwwBKClJh-j9-A/exec";

let isLoginMode = true;
let isSubmitting = false;

// DOM Elements
const eyebrowText = document.getElementById('eyebrowText');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const authForm = document.getElementById('authForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const eyeIcon = document.getElementById('eyeIcon');

const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const btnArrow = document.getElementById('btnArrow');

const toggleText = document.getElementById('toggleText');
const toggleBtn = document.getElementById('toggleBtn');
const statusBox = document.getElementById('statusBox');
const statusIcon = document.getElementById('statusIcon');
const statusMessage = document.getElementById('statusMessage');

// ฟังก์ชันสลับโหมด Login / Register
function setMode(loginMode) {
  if (isSubmitting) return;
  isLoginMode = loginMode;
  hideStatus();

  if (isLoginMode) {
    eyebrowText.innerText = '01 / AUTHENTICATION';
    formTitle.innerText = 'เข้าสู่ระบบ';
    formSubtitle.innerText = 'ยืนยันตัวตนเพื่อเข้าถึงพื้นที่ทำงานและระบบเกมของคุณ';
    btnText.innerText = 'เข้าสู่ระบบ';
    toggleText.innerText = 'ยังไม่มีบัญชีใช่ไหม?';
    toggleBtn.innerText = 'สร้างบัญชีใหม่ →';
    passwordInput.setAttribute('autocomplete', 'current-password');

    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    eyebrowText.innerText = '02 / REGISTRATION';
    formTitle.innerText = 'สมัครสมาชิกใหม่';
    formSubtitle.innerText = 'สร้างบัญชีผู้ใช้งานใหม่เพื่อเริ่มต้นใช้งานระบบ';
    btnText.innerText = 'ลงทะเบียนบัญชี';
    toggleText.innerText = 'มีบัญชีอยู่แล้ว?';
    toggleBtn.innerText = 'เข้าสู่ระบบ →';
    passwordInput.setAttribute('autocomplete', 'new-password');

    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
  }
}

// Event Listeners สำหรับการสลับโหมด
tabLogin.addEventListener('click', () => setMode(true));
tabRegister.addEventListener('click', () => setMode(false));
toggleBtn.addEventListener('click', (e) => {
  e.preventDefault();
  setMode(!isLoginMode);
});

// ปุ่มแสดง/ซ่อนรหัสผ่าน
togglePasswordBtn.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  
  if (isPassword) {
    // ไอคอนปิดตา
    eyeIcon.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    `;
  } else {
    // ไอคอนเปิดตา
    eyeIcon.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    `;
  }
});

// จัดการการส่งฟอร์ม
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // ตรวจสอบความถูกต้องเบื้องต้น
  if (!username || !password) {
    showStatus('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน', 'error');
    return;
  }

  if (!isLoginMode && password.length < 4) {
    showStatus('รหัสผ่านควรมีความยาวอย่างน้อย 4 ตัวอักษร', 'error');
    return;
  }

  const action = isLoginMode ? 'LOGIN' : 'REGISTER';
  setLoadingState(true);
  showStatus(isLoginMode ? 'กำลังตรวจสอบข้อมูลบัญชี...' : 'กำลังบันทึกข้อมูลสมาชิก...', 'info');

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
      showStatus(result.message, 'success');

      if (isLoginMode) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', username);

        setTimeout(() => {
          window.location.href = '../game/home.html';
        }, 1000);
      } else {
        setTimeout(() => {
          setLoadingState(false);
          passwordInput.value = '';
          setMode(true);
          showStatus('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบด้วยบัญชีใหม่ของคุณ', 'success');
        }, 1200);
      }
    } else {
      setLoadingState(false);
      showStatus(result.message || 'ข้อมูลไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง', 'error');
    }

  } catch (error) {
    console.error(error);
    setLoadingState(false);
    showStatus('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่', 'error');
  }
});

// ควบคุมสถานะ Loading ของปุ่ม
function setLoadingState(loading) {
  isSubmitting = loading;
  submitBtn.disabled = loading;
  usernameInput.disabled = loading;
  passwordInput.disabled = loading;

  if (loading) {
    btnSpinner.classList.remove('hidden');
    btnArrow.classList.add('hidden');
    btnText.innerText = isLoginMode ? 'กำลังเข้าสู่ระบบ...' : 'กำลังลงทะเบียน...';
  } else {
    btnSpinner.classList.add('hidden');
    btnArrow.classList.remove('hidden');
    btnText.innerText = isLoginMode ? 'เข้าสู่ระบบ' : 'ลงทะเบียนบัญชี';
  }
}

// แสดงกล่องสถานะพร้อมไอคอน
function showStatus(text, type) {
  statusBox.className = `status-box ${type}`;
  statusMessage.innerText = text;

  if (type === 'error') {
    statusIcon.innerText = '✕';
  } else if (type === 'success') {
    statusIcon.innerText = '✓';
  } else {
    statusIcon.innerText = '●';
  }
}

function hideStatus() {
  statusBox.className = 'status-box hidden';
  statusMessage.innerText = '';
}