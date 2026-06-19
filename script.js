// =========================================
// 🔧 ใส่ URL ของ Apps Script ที่ Deploy ไว้ตรงนี้
// =========================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyhzMueDGsB5SbL1l8MpGi1Ot_J2WNQPpapLi8LEaOP_kVgZAp20j7k6j9jeCqvmbHg_g/exec';


// ===== จัดการ Form Submit =====
document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const resultDiv = document.getElementById('result');
    
    // เก็บข้อมูลจาก form
    const formData = {
        fullname:     document.getElementById('fullname').value.trim(),
        email:        document.getElementById('email').value.trim(),
        phone:        document.getElementById('phone').value.trim(),
        organization: document.getElementById('organization').value.trim(),
        position:     document.getElementById('position').value,
        note:         document.getElementById('note').value.trim(),
        timestamp:    new Date().toLocaleString('th-TH')
    };

    // Validate เบื้องต้น
    if (!formData.fullname || !formData.email || !formData.phone) {
        showResult('❌ กรุณากรอกข้อมูลที่จำเป็นให้ครบ', 'error');
        return;
    }

    // แสดงสถานะกำลังส่ง
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ กำลังส่งข้อมูล...';
    submitBtn.classList.add('loading');
    resultDiv.style.display = 'none';

    try {
        // ===== ส่งข้อมูลไป Apps Script =====
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',  // จำเป็นสำหรับ Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        // mode: 'no-cors' จะไม่ได้ response body กลับมา
        // แต่ถ้าไม่ error แสดงว่าส่งสำเร็จ
        showResult('✅ ส่งใบสมัครเรียบร้อยแล้ว! ขอบคุณค่ะ', 'success');
        
        // เคลียร์ฟอร์ม
        document.getElementById('registrationForm').reset();

    } catch (error) {
        console.error('Error:', error);
        showResult('❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ ส่งใบสมัคร';
        submitBtn.classList.remove('loading');
    }
});


// ===== แสดงผลลัพธ์ =====
function showResult(message, type) {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = message;
    resultDiv.className = 'result ' + type;
    resultDiv.style.display = 'block';
    
    // Scroll ไปดูผลลัพธ์
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}
