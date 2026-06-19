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
// INITIALIZATION
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initFileUploads();
    initForm();
    loadConfig();
});

// ================================================================
// TAB SWITCHING
// ================================================================
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(function(t) {
                t.classList.remove('active');
            });
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
        });
    });
}

// ================================================================
// LOAD CONFIG
// ================================================================
async function loadConfig() {
    try {
        var response = await fetch(APPS_SCRIPT_URL + '?action=getConfig');
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
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
    }
}

function renderConfig(config) {
    document.getElementById('projectName').textContent = config.projectName || 'ระบบรับสมัคร';
    document.title = config.projectName || 'ระบบรับสมัคร';

    document.getElementById('statRegistered').textContent = config.registered;
    document.getElementById('statRemaining').textContent = config.remaining;
    document.getElementById('statMax').textContent = config.maxSeats;

    var percent = config.maxSeats > 0
        ? Math.round((config.registered / config.maxSeats) * 100)
        : 0;
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressText').textContent = 'สมัครแล้ว ' + percent + '%';

    if (config.fee || config.bankName) {
        document.getElementById('feeInfoBox').style.display = 'block';
        document.getElementById('infoFee').textContent = config.fee || '-';
        document.getElementById('infoBankName').textContent = config.bankName || '-';
        document.getElementById('infoAccountNumber').textContent = config.accountNumber || '-';
        document.getElementById('infoAccountName').textContent = config.accountName || '-';
    }

    if (config.isOpen) {
        document.getElementById('registrationForm').style.display = 'block';
        document.getElementById('closedBox').style.display = 'none';
    } else {
        document.getElementById('registrationForm').style.display = 'none';
        document.getElementById('closedBox').style.display = 'block';
    }
}

// ================================================================
// FILE UPLOAD — แก้ Bug ตรงนี้!
// ================================================================
function initFileUploads() {
    setupFileInput('studentCard', 'studentCardPreview', 'studentCardPlaceholder', 'studentCardArea');
    setupFileInput('slip', 'slipPreview', 'slipPlaceholder', 'slipArea');
}

function setupFileInput(inputId, previewId, placeholderId, areaId) {
    var input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('change', function(e) {
        // ===== แก้ Bug: ใช้ e.target.files =====
        var file = e.target.files;
        if (!file) return;

        // เช็คขนาด
        if (file.size > MAX_FILE_SIZE) {
            showToast('❌ ไฟล์ใหญ่เกิน 5MB กรุณาเลือกไฟล์ใหม่', 'error');
            input.value = '';
            return;
        }

        // เช็คประเภท
        if (!file.type.startsWith('image/')) {
            showToast('❌ กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG)', 'error');
            input.value = '';
            return;
        }

        // แสดง preview
        var reader = new FileReader();
        reader.onload = function(ev) {
            var preview = document.getElementById(previewId);
            var placeholder = document.getElementById(placeholderId);
            var area = document.getElementById(areaId);

            if (preview) {
                preview.src = ev.target.result;
                preview.style.display = 'block';
            }
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            if (area) {
                area.classList.add('has-file');
            }
        };
        reader.readAsDataURL(file);  // ✅ ส่ง file (Blob) ไม่ใช่ element
    });
}

// ===== แก้ Bug หลัก: แปลงไฟล์เป็น Base64 =====
function fileToBase64(inputElement) {
    return new Promise(function(resolve, reject) {
        // ตรวจสอบว่ามีไฟล์จริง
        if (!inputElement || !inputElement.files || !inputElement.files) {
            resolve({ base64: '', filename: '' });
            return;
        }

        var file = inputElement.files;  // ✅ ดึง File object ออกมา

        var reader = new FileReader();
        reader.onload = function() {
            resolve({
                base64: reader.result,    // data:image/jpeg;base64,/9j/4AAQ...
                filename: file.name
            });
        };
        reader.onerror = function() {
            reject(new Error('ไม่สามารถอ่านไฟล์ "' + file.name + '" ได้'));
        };
        reader.readAsDataURL(file);  // ✅ ส่ง file (Blob) เข้า readAsDataURL
    });
}

// ================================================================
// FORM SUBMIT
// ================================================================
function initForm() {
    var form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}

async function handleSubmit(e) {
    e.preventDefault();

    var submitBtn = document.getElementById('submitBtn');

    // ดึงค่าจากฟอร์ม
    var fullName = document.getElementById('fullName').value.trim();
    var email    = document.getElementById('email').value.trim();
    var age      = document.getElementById('age').value.trim();
    var school   = document.getElementById('school').value.trim();
    var province = document.getElementById('province').value.trim();
    var phone    = document.getElementById('phone').value.trim();

    // ===== Validate =====
    if (!fullName || !email || !age || !school || !province || !phone) {
        showToast('❌ กรุณากรอกข้อมูลให้ครบทุกช่อง', 'error');
        return;
    }

    if (!/^[0-9]{9,10}$/.test(phone)) {
        showToast('❌ เบอร์โทรไม่ถูกต้อง (ต้อง 9-10 หลัก)', 'error');
        return;
    }

    // ตรวจไฟล์
    var studentCardInput = document.getElementById('studentCard');
    var slipInput = document.getElementById('slip');

    if (!studentCardInput.files || !studentCardInput.files) {
        showToast('❌ กรุณาอัปโหลดรูปบัตรนักเรียน', 'error');
        return;
    }
    if (!slipInput.files || !slipInput.files) {
        showToast('❌ กรุณาอัปโหลดรูปสลิปโอนเงิน', 'error');
        return;
    }

    // ===== แสดงสถานะ =====
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    var originalText = submitBtn.textContent;
    submitBtn.textContent = '';

    try {
        // Step 1: แปลงไฟล์เป็น Base64
        showToast('📤 กำลังอัปโหลดรูปภาพ...', 'warning');

        var studentCardData = await fileToBase64(studentCardInput);
        var slipData = await fileToBase64(slipInput);

        // ตรวจสอบว่าได้ base64 จริง
        if (!studentCardData.base64) {
            showToast('❌ ไม่สามารถอ่านไฟล์บัตรนักเรียนได้', 'error');
            return;
        }
        if (!slipData.base64) {
            showToast('❌ ไม่สามารถอ่านไฟล์สลิปได้', 'error');
            return;
        }

        // Step 2: สร้าง payload
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

        // Step 3: ส่งข้อมูล
        showToast('⏳ กำลังบันทึกข้อมูล อาจใช้เวลา 10-30 วินาที...', 'warning');

        var response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        var result = await response.json();

        if (result.success) {
            showSuccessResult(result);
            showToast('✅ สมัครสำเร็จ!', 'success');
        } else {
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
    document.getElementById('registrationForm').style.display = 'none';
    var box = document.getElementById('successResult');
    box.style.display = 'block';

    document.getElementById('resultSeq').textContent = result.seqNumber;
    document.getElementById('resultRemaining').textContent = result.remaining + ' ที่นั่ง';

    var pdfRow = document.getElementById('resultPdfRow');
    if (result.pdfUrl && result.pdfUrl.indexOf('http') === 0) {
        document.getElementById('resultPdfLink').href = result.pdfUrl;
        pdfRow.style.display = 'block';
    } else {
        pdfRow.style.display = 'none';
    }

    if (appConfig) {
        appConfig.registered = (appConfig.registered || 0) + 1;
        appConfig.remaining = Math.max(0, (appConfig.remaining || 0) - 1);
        renderConfig(appConfig);
    }

    box.scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('registrationForm').reset();
    document.getElementById('registrationForm').style.display = 'block';
    document.getElementById('successResult').style.display = 'none';

    ['studentCard', 'slip'].forEach(function(id) {
        var preview = document.getElementById(id + 'Preview');
        var placeholder = document.getElementById(id + 'Placeholder');
        var area = document.getElementById(id + 'Area');
        if (preview) { preview.style.display = 'none'; preview.src = ''; }
        if (placeholder) { placeholder.style.display = 'flex'; }
        if (area) { area.classList.remove('has-file'); }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    checkBtn.classList.add('loading');
    checkBtn.textContent = '';

    try {
        var params = new URLSearchParams({ action: 'checkStatus' });
        if (email) params.append('email', email);
        if (ref) params.append('ref', ref);

        var response = await fetch(APPS_SCRIPT_URL + '?' + params.toString());
        var result = await response.json();

        if (result.success) {
            var reg = result.registration;
            var statusClass = 'pending';
            var statusText = '⏳ รอตรวจสอบการชำระเงิน';

            if (reg.status === 'confirmed') {
                statusClass = 'confirmed';
                statusText = '✅ ยืนยันสิทธิ์แล้ว';
            } else if (reg.status === 'rejected') {
                statusClass = 'rejected';
                statusText = '❌ ไม่ผ่านการตรวจสอบ';
            }

            var pdfLink = '';
            if (reg.pdfUrl && reg.pdfUrl.indexOf('http') === 0) {
                pdfLink = '<p>📄 <a href="' + reg.pdfUrl
                    + '" target="_blank" style="color:#2563eb;font-weight:600;">ดาวน์โหลด PDF</a></p>';
            }

            resultDiv.innerHTML =
                '<div class="status-card">'
                + '<h4>📋 ข้อมูลการสมัคร</h4>'
                + '<p><strong>ลำดับ:</strong> <span class="seq-badge">' + reg.seqNumber + '</span></p>'
                + '<p><strong>ชื่อ:</strong> ' + reg.name + '</p>'
                + '<p><strong>อีเมล:</strong> ' + reg.email + '</p>'
                + '<p><strong>สถานะ:</strong> <span class="status-badge ' + statusClass + '">' + statusText + '</span></p>'
                + pdfLink
                + '</div>';
            resultDiv.style.display = 'block';
        } else {
            resultDiv.innerHTML =
                '<div class="status-card"><p style="text-align:center;color:#ef4444;">❌ ' + result.message + '</p></div>';
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
// TOAST
// ================================================================
function showToast(message, type) {
    type = type || 'error';
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.style.display = 'block';

    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function() {
        toast.style.display = 'none';
    }, 5000);
}
