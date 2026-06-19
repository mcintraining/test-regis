// ================================================================
// 🔧 CONFIG — ใส่ URL ของ Apps Script ที่ Deploy ไว้
// ================================================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyhzMueDGsB5SbL1l8MpGi1Ot_J2WNQPpapLi8LEaOP_kVgZAp20j7k6j9jeCqvmbHg_g/exec';

// ================================================================
// GLOBAL STATE
// ================================================================
let appConfig = null;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ================================================================
// INITIALIZATION — โหลดหน้าเว็บ
// ================================================================
document.addEventListener('DOMContentLoaded', function () {
    initTabs();
    initFileUploads();
    initForm();
    loadConfig();
});

// ================================================================
// TAB SWITCHING
// ================================================================
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            // ลบ active ทั้งหมด
            document.querySelectorAll('.tab-btn').forEach(function (b) {
                b.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(function (t) {
                t.classList.remove('active');
            });
            // เพิ่ม active ที่กด
            btn.classList.add('active');
            var tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// ================================================================
// LOAD CONFIG จาก Apps Script
// ================================================================
async function loadConfig() {
    try {
        var url = APPS_SCRIPT_URL + '?action=getConfig';
        var response = await fetch(url);
        var result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'โหลด Config ไม่สำเร็จ');
        }

        appConfig = result.config;
        renderConfig(appConfig);

    } catch (error) {
        console.error('loadConfig error:', error);
        showToast('❌ ไม่สามารถโหลดข้อมูลได้: ' + error.message, 'error');
    } finally {
        // ซ่อน loading แสดง container
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
    }
}

function renderConfig(config) {
    // ชื่อโครงการ
    document.getElementById('projectName').textContent = config.projectName || 'ระบบรับสมัคร';
    document.title = config.projectName || 'ระบบรับสมัคร';

    // สถิติ
    document.getElementById('statRegistered').textContent = config.registered;
    document.getElementById('statRemaining').textContent = config.remaining;
    document.getElementById('statMax').textContent = config.maxSeats;

    // Progress bar
    var percent = config.maxSeats > 0
        ? Math.round((config.registered / config.maxSeats) * 100)
        : 0;
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressText').textContent = 'สมัครแล้ว ' + percent + '%';

    // ข้อมูลชำระเงิน
    if (config.fee || config.bankName) {
        document.getElementById('feeInfoBox').style.display = 'block';
        document.getElementById('infoFee').textContent = config.fee || '-';
        document.getElementById('infoBankName').textContent = config.bankName || '-';
        document.getElementById('infoAccountNumber').textContent = config.accountNumber || '-';
        document.getElementById('infoAccountName').textContent = config.accountName || '-';
    }

    // เปิด/ปิดฟอร์ม
    if (config.isOpen) {
        document.getElementById('registrationForm').style.display = 'block';
        document.getElementById('closedBox').style.display = 'none';
    } else {
        document.getElementById('registrationForm').style.display = 'none';
        document.getElementById('closedBox').style.display = 'block';
    }
}

// ================================================================
// FILE UPLOAD PREVIEW
// ================================================================
function initFileUploads() {
    setupFileInput('studentCard', 'studentCardPreview', 'studentCardPlaceholder', 'studentCardArea');
    setupFileInput('slip', 'slipPreview', 'slipPlaceholder', 'slipArea');
}

function setupFileInput(inputId, previewId, placeholderId, areaId) {
    var input = document.getElementById(inputId);
    input.addEventListener('change', function () {
        var file = input.files;
        if (!file) return;

        // เช็คขนาด
        if (file.size > MAX_FILE_SIZE) {
            showToast('❌ ไฟล์ใหญ่เกิน 5MB กรุณาเลือกไฟล์ใหม่', 'error');
            input.value = '';
            return;
        }

        // เช็คประเภท
        if (!file.type.startsWith('image/')) {
            showToast('❌ กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
            input.value = '';
            return;
        }

        // แสดง preview
        var reader = new FileReader();
        reader.onload = function (e) {
            var preview = document.getElementById(previewId);
            preview.src = e.target.result;
            preview.style.display = 'block';
            document.getElementById(placeholderId).style.display = 'none';
            document.getElementById(areaId).classList.add('has-file');
        };
        reader.readAsDataURL(file);
    });
}

// แปลงไฟล์เป็น Base64
function fileToBase64(fileInput) {
    return new Promise(function (resolve, reject) {
        var file = fileInput.files;
        if (!file) {
            resolve({ base64: '', filename: '' });
            return;
        }
        var reader = new FileReader();
        reader.onload = function () {
            resolve({
                base64: reader.result,
                filename: file.name
            });
        };
        reader.onerror = function () {
            reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
        };
        reader.readAsDataURL(file);
    });
}

// ================================================================
// FORM SUBMIT
// ================================================================
function initForm() {
    document.getElementById('registrationForm').addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
    e.preventDefault();

    var submitBtn = document.getElementById('submitBtn');

    // Validate
    var fullName = document.getElementById('fullName').value.trim();
    var email = document.getElementById('email').value.trim();
    var age = document.getElementById('age').value.trim();
    var school = document.getElementById('school').value.trim();
    var province = document.getElementById('province').value.trim();
    var phone = document.getElementById('phone').value.trim();

    if (!fullName || !email || !age || !school || !province || !phone) {
        showToast('❌ กรุณากรอกข้อมูลให้ครบทุกช่อง', 'error');
        return;
    }

    // Validate phone
    if (!/^[0-9]{9,10}$/.test(phone)) {
        showToast('❌ เบอร์โทรไม่ถูกต้อง (ต้อง 9-10 หลัก)', 'error');
        return;
    }

    // Validate files
    var studentCardInput = document.getElementById('studentCard');
    var slipInput = document.getElementById('slip');

    if (!studentCardInput.files) {
        showToast('❌ กรุณาอัปโหลดรูปบัตรนักเรียน', 'error');
        return;
    }
    if (!slipInput.files) {
        showToast('❌ กรุณาอัปโหลดรูปสลิปโอนเงิน', 'error');
        return;
    }

    // แสดงสถานะกำลังส่ง
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังส่งข้อมูล...';
    submitBtn.classList.add('loading');

    try {
        // แปลงไฟล์เป็น Base64
        showToast('📤 กำลังอัปโหลดไฟล์...', 'warning');

        var studentCardData = await fileToBase64(studentCardInput);
        var slipData = await fileToBase64(slipInput);

        // สร้าง payload
        var payload = {
            action: 'register',
            fullName: fullName,
            email: email,
            age: age,
            school: school,
            province: province,
            phone: phone,
            studentCardBase64: studentCardData.base64,
            studentCardFilename: studentCardData.filename,
            slipBase64: slipData.base64,
            slipFilename: slipData.filename
        };

        showToast('⏳ กำลังบันทึกข้อมูล...', 'warning');

        // ส่งไป Apps Script
        var response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        var result = await response.json();

        if (result.success) {
            // สำเร็จ!
            showSuccessResult(result);
            showToast('✅ สมัครสำเร็จ!', 'success');
        } else {
            // Error จาก server
            showToast('❌ ' + result.message, 'error');
        }

    } catch (error) {
        console.error('Submit error:', error);
        showToast('❌ เกิดข้อผิดพลาด: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ ส่งใบสมัคร';
        submitBtn.classList.remove('loading');
    }
}

function showSuccessResult(result) {
    // ซ่อนฟอร์ม แสดงผลสำเร็จ
    document.getElementById('registrationForm').style.display = 'none';
    document.getElementById('successResult').style.display = 'block';

    document.getElementById('resultSeq').textContent = result.seqNumber;
    document.getElementById('resultRemaining').textContent =
        result.remaining + ' ที่นั่ง';

    if (result.pdfUrl && result.pdfUrl.indexOf('http') === 0) {
        document.getElementById('resultPdfLink').href = result.pdfUrl;
        document.getElementById('resultPdfRow').style.display = 'block';
    } else {
        document.getElementById('resultPdfRow').style.display = 'none';
    }

    // อัพเดท stats
    if (appConfig) {
        appConfig.registered = (appConfig.registered || 0) + 1;
        appConfig.remaining = Math.max(0, (appConfig.remaining || 0) - 1);
        renderConfig(appConfig);
    }
}

function resetForm() {
    document.getElementById('registrationForm').reset();
    document.getElementById('registrationForm').style.display = 'block';
    document.getElementById('successResult').style.display = 'none';

    // Reset file previews
    ['studentCard', 'slip'].forEach(function (id) {
        var preview = document.getElementById(id + 'Preview');
        var placeholder = document.getElementById(id + 'Placeholder');
        var area = document.getElementById(id + 'Area');
        preview.style.display = 'none';
        preview.src = '';
        placeholder.style.display = 'flex';
        area.classList.remove('has-file');
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // โหลด config ใหม่ เช็คที่นั่ง
    loadConfig();
}

// ================================================================
// CHECK STATUS
// ================================================================
async function handleCheckStatus() {
    var email = document.getElementById('checkEmail').value.trim();
    var ref = document.getElementById('checkRef').value.trim();
    var resultDiv = document.getElementById('statusResult');
    var checkBtn = document.getElementById('checkStatusBtn');

    if (!email && !ref) {
        showToast('❌ กรุณากรอกอีเมล หรือ เลขที่สมัคร', 'error');
        return;
    }

    checkBtn.disabled = true;
    checkBtn.textContent = '⏳ กำลังค้นหา...';
    checkBtn.classList.add('loading');

    try {
        var params = new URLSearchParams({ action: 'checkStatus' });
        if (email) params.append('email', email);
        if (ref)   params.append('ref', ref);

        var url = APPS_SCRIPT_URL + '?' + params.toString();
        var response = await fetch(url);
        var result = await response.json();

        if (result.success) {
            var reg = result.registration;
            var statusClass = 'pending';
            var statusText = '⏳ รอตรวจสอบ';

            if (reg.status === 'confirmed') {
                statusClass = 'confirmed';
                statusText = '✅ ยืนยันแล้ว';
            } else if (reg.status === 'rejected') {
                statusClass = 'rejected';
                statusText = '❌ ไม่ผ่าน';
            }

            var pdfLink = '';
            if (reg.pdfUrl && reg.pdfUrl.indexOf('http') === 0) {
                pdfLink = '<p>📄 <a href="' + reg.pdfUrl
                    + '" target="_blank" style="color:#2563eb;">ดาวน์โหลด PDF</a></p>';
            }

            resultDiv.innerHTML =
                '<div class="status-card">'
                + '<h4>📋 ข้อมูลการสมัคร</h4>'
                + '<p><strong>ลำดับ:</strong> '
                + '<span class="seq-badge">' + reg.seqNumber + '</span></p>'
                + '<p><strong>ชื่อ:</strong> ' + reg.name + '</p>'
                + '<p><strong>อีเมล:</strong> ' + reg.email + '</p>'
                + '<p><strong>สถานะ:</strong> '
                + '<span class="status-badge ' + statusClass + '">'
                + statusText + '</span></p>'
                + pdfLink
                + '</div>';
            resultDiv.style.display = 'block';

        } else {
            resultDiv.innerHTML =
                '<div class="status-card">'
                + '<p style="text-align:center;color:#ef4444;">'
                + '❌ ' + result.message + '</p>'
                + '</div>';
            resultDiv.style.display = 'block';
        }

    } catch (error) {
        console.error('Check status error:', error);
        showToast('❌ เกิดข้อผิดพลาด: ' + error.message, 'error');
    } finally {
        checkBtn.disabled = false;
        checkBtn.textContent = '🔍 ค้นหา';
        checkBtn.classList.remove('loading');
    }
}

// ================================================================
// TOAST NOTIFICATION
// ================================================================
function showToast(message, type) {
    type = type || 'error';
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.style.display = 'block';

    // ซ่อนอัตโนมัติ
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () {
        toast.style.display = 'none';
    }, 4000);
}
