// ===== API Helper =====
const API = {
    async get(url) {
        const res = await fetch(`/api${url}`);
        return res.json();
    },
    async post(url, data) {
        const res = await fetch(`/api${url}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    async put(url, data) {
        const res = await fetch(`/api${url}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    async delete(url) {
        const res = await fetch(`/api${url}`, { method: 'DELETE' });
        return res.json();
    }
};

// ===== State =====
let currentPage = 'dashboard';
let rooms = [], tenants = [], contracts = [], invoices = [], settings = {};

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initModal();
    initTime();
    initTheme();
    loadAppName();
    loadPage('dashboard');
});

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadPage(page);
        });
    });

    document.getElementById('menuToggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('active');
    });
}

function initModal() {
    const overlay = document.getElementById('modalOverlay');
    document.getElementById('modalClose').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
}

function openModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

function initTime() {
    const updateTime = () => {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleString('vi-VN', {
            weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };
    updateTime();
    setInterval(updateTime, 60000);
}

function initTheme() {
    const themeBtn = document.getElementById('themeToggle');
    const html = document.documentElement;
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        html.setAttribute('data-theme', 'light');
        themeBtn.textContent = '🌙';
    }

    themeBtn.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        if (currentTheme === 'light') {
            html.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
            themeBtn.textContent = '☀️';
        } else {
            html.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            themeBtn.textContent = '🌙';
        }
    });
}

async function updateSidebarName(nameOverride = null) {
    try {
        let name = nameOverride;
        if (!name) {
            const settings = await API.get('/settings');
            name = settings.ten_nha_tro;
        }
        const nameEl = document.getElementById('appName');
        if (nameEl && name) {
            const upperName = name.toUpperCase();
            if (upperName.includes('NHÀ TRỌ')) {
                nameEl.innerHTML = upperName.replace('NHÀ TRỌ', 'NHÀ TRỌ<br><span class="brand-name">') + '</span>';
            } else {
                nameEl.textContent = upperName;
            }
        }
    } catch (e) {
        console.error("Lỗi cập nhật tên:", e);
    }
}

const loadAppName = () => updateSidebarName();

// ===== Toast =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'danger' ? '❌' : 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== Format =====
function formatMoney(n) {
    return new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ';
}

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('vi-VN');
}

// ===== Page Loader =====
async function loadPage(page) {
    currentPage = page;
    const titles = {
        dashboard: 'Tổng quan', rooms: 'Phòng trọ', tenants: 'Khách thuê',
        contracts: 'Hợp đồng', invoices: 'Hóa đơn', meters: 'Điện nước',
        deposits: 'Quản lý Tiền Cọc', statistics: 'Thống kê', settings: 'Cài đặt'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;
    document.querySelector('.sidebar').classList.remove('active');

    const content = document.getElementById('pageContent');
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        switch (page) {
            case 'dashboard': await renderDashboard(); break;
            case 'rooms': await renderRooms(); break;
            case 'tenants': await renderTenants(); break;
            case 'contracts': await renderContracts(); break;
            case 'invoices': await renderInvoices(); break;
            case 'meters': await renderMeters(); break;
            case 'deposits': await renderDeposits(); break;
            case 'statistics': await renderStatistics(); break;
            case 'settings': await renderSettings(); break;
        }
    } catch (e) {
        content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><div>Lỗi: ${e.message}</div></div>`;
    }
}

// ===== Dashboard =====
async function renderDashboard() {
    const data = await API.get('/dashboard');
    const overdueData = await API.get('/overdue-invoices');
    const content = document.getElementById('pageContent');

    content.innerHTML = `
    <div class="stats-grid slide-up">
      <div class="stat-card"><div class="stat-icon">🚪</div><div class="stat-value">${data.rooms?.tong || 0}</div><div class="stat-label">Tổng số phòng</div></div>
      <div class="stat-card success"><div class="stat-icon">✅</div><div class="stat-value">${data.rooms?.thue || 0}</div><div class="stat-label">Đang cho thuê</div></div>
      <div class="stat-card warning"><div class="stat-icon">🔓</div><div class="stat-value">${data.rooms?.trong || 0}</div><div class="stat-label">Phòng trống</div></div>
      <div class="stat-card secondary"><div class="stat-icon">💰</div><div class="stat-value">${formatMoney(data.monthRevenue)}</div><div class="stat-label">Doanh thu tháng này</div></div>
    </div>
    
    ${overdueData.so_phong_no > 0 ? `
    <div class="card slide-up" style="margin-bottom: 24px; border-left: 4px solid var(--danger);">
      <div class="card-header">
        <h3 class="card-title" style="color: var(--danger);">🚨 CẢNH BÁO: ${overdueData.so_phong_no} phòng chưa đóng tiền quá hạn!</h3>
        <span class="badge badge-danger">Tổng nợ: ${formatMoney(overdueData.tong_no)}</span>
      </div>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Phòng</th>
              <th>Khách thuê</th>
              <th>Số tiền nợ</th>
              <th>Hạn thanh toán</th>
              <th>Quá hạn</th>
              <th>SĐT liên hệ</th>
            </tr>
          </thead>
          <tbody>
            ${overdueData.danh_sach.map(inv => `
              <tr>
                <td><strong>Phòng ${inv.so_phong}</strong></td>
                <td>${inv.ho_ten}</td>
                <td style="color: var(--danger); font-weight: bold;">${formatMoney(inv.con_no)}</td>
                <td>${formatDate(inv.han_thanh_toan)}</td>
                <td><span class="badge badge-danger">${Math.floor(inv.so_ngay_qua_han)} ngày</span></td>
                <td><a href="tel:${inv.so_dien_thoai}" style="color: var(--info);">${inv.so_dien_thoai || '-'}</a></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}
    
    <div class="grid-2">
      <div class="card slide-up">
        <div class="card-header"><h3 class="card-title">💳 Thanh toán gần đây</h3></div>
        <div class="activity-list" id="recentPayments"></div>
      </div>
      <div class="card slide-up">
        <div class="card-header"><h3 class="card-title">⚠️ Hợp đồng sắp hết hạn</h3></div>
        <div class="activity-list" id="expiringContracts"></div>
      </div>
    </div>
  `;

    const paymentsEl = document.getElementById('recentPayments');
    if (data.recentPayments?.length) {
        paymentsEl.innerHTML = data.recentPayments.map(p => `
      <div class="activity-item">
        <div class="activity-icon">💵</div>
        <div class="activity-content">
          <div class="activity-title">Phòng ${p.so_phong} - ${p.ho_ten}</div>
          <div class="activity-time">${formatDate(p.ngay_thanh_toan)}</div>
        </div>
        <div class="activity-amount">+${formatMoney(p.so_tien)}</div>
      </div>
    `).join('');
    } else {
        paymentsEl.innerHTML = '<div class="empty-state"><div>Chưa có thanh toán</div></div>';
    }

    const contractsEl = document.getElementById('expiringContracts');
    if (data.expiringContracts?.length) {
        contractsEl.innerHTML = data.expiringContracts.map(c => `
      <div class="activity-item">
        <div class="activity-icon">📋</div>
        <div class="activity-content">
          <div class="activity-title">Phòng ${c.so_phong} - ${c.ho_ten}</div>
          <div class="activity-time">Hết hạn: ${formatDate(c.ngay_ket_thuc)}</div>
        </div>
      </div>
    `).join('');
    } else {
        contractsEl.innerHTML = '<div class="empty-state"><div>Không có hợp đồng sắp hết hạn</div></div>';
    }
}

// ===== Rooms =====
async function renderRooms() {
    rooms = await API.get('/rooms');
    const content = document.getElementById('pageContent');

    content.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-box"><input type="text" class="form-control" placeholder="Tìm phòng..." id="searchRoom"></div>
        <select class="form-control filter-select" id="filterStatus">
          <option value="">Tất cả trạng thái</option>
          <option value="trong">Phòng trống</option>
          <option value="dang_thue">Đang thuê</option>
          <option value="sua_chua">Đang sửa</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="showRoomForm()">➕ Thêm phòng</button>
    </div>
    <div class="rooms-grid" id="roomsGrid"></div>
  `;

    document.getElementById('searchRoom').addEventListener('input', filterRooms);
    document.getElementById('filterStatus').addEventListener('change', filterRooms);
    filterRooms();
}

function filterRooms() {
    const search = document.getElementById('searchRoom').value.toLowerCase();
    const status = document.getElementById('filterStatus').value;
    const filtered = rooms.filter(r => {
        const matchSearch = r.so_phong.toLowerCase().includes(search);
        const matchStatus = !status || r.trang_thai === status;
        return matchSearch && matchStatus;
    });
    renderRoomCards(filtered);
}

function renderRoomCards(list) {
    const grid = document.getElementById('roomsGrid');
    if (!list.length) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚪</div><div class="empty-state-text">Chưa có phòng nào</div></div>';
        return;
    }

    const statusText = { trong: 'Trống', dang_thue: 'Đang thuê', sua_chua: 'Đang sửa' };
    grid.innerHTML = list.map(r => `
    <div class="room-card ${r.trang_thai}" onclick="showRoomDetail(${r.id})">
      <div class="room-header">
        <div class="room-number">Phòng ${r.so_phong}</div>
        <span class="room-status ${r.trang_thai}">${statusText[r.trang_thai]}</span>
      </div>
      <div class="room-info">
        <div class="room-info-item"><span class="room-info-label">Giá thuê:</span><span class="room-info-value">${formatMoney(r.gia_thue)}</span></div>
        <div class="room-info-item"><span class="room-info-label">Diện tích:</span><span class="room-info-value">${r.dien_tich || 0}m²</span></div>
        <div class="room-info-item"><span class="room-info-label">Tầng:</span><span class="room-info-value">${r.tang || 1}</span></div>
      </div>
      ${r.ten_khach ? `<div class="room-tenant"><span>👤</span> <span class="room-tenant-name">${r.ten_khach}</span></div>` : ''}
    </div>
  `).join('');
}

function showRoomForm(room = null) {
    const isEdit = !!room;
    openModal(isEdit ? 'Sửa phòng' : 'Thêm phòng mới', `
    <form id="roomForm">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Số phòng *</label><input type="text" class="form-control" name="so_phong" value="${room?.so_phong || ''}" required></div>
        <div class="form-group"><label class="form-label">Tầng</label><input type="number" class="form-control" name="tang" value="${room?.tang || 1}" min="1"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Diện tích (m²)</label><input type="number" class="form-control" name="dien_tich" value="${room?.dien_tich || ''}" step="0.1"></div>
        <div class="form-group"><label class="form-label">Giá thuê *</label><input type="number" class="form-control" name="gia_thue" value="${room?.gia_thue || ''}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Tiền cọc</label><input type="number" class="form-control" name="tien_coc" value="${room?.tien_coc || ''}"></div>
        <div class="form-group"><label class="form-label">Trạng thái</label>
          <select class="form-control" name="trang_thai">
            <option value="trong" ${room?.trang_thai === 'trong' ? 'selected' : ''}>Trống</option>
            <option value="dang_thue" ${room?.trang_thai === 'dang_thue' ? 'selected' : ''}>Đang thuê</option>
            <option value="sua_chua" ${room?.trang_thai === 'sua_chua' ? 'selected' : ''}>Đang sửa</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Mô tả</label><textarea class="form-control" name="mo_ta" rows="3">${room?.mo_ta || ''}</textarea></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Cập nhật' : 'Thêm mới'}</button>
      </div>
    </form>
  `);

    document.getElementById('roomForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const data = Object.fromEntries(form);
        try {
            if (isEdit) await API.put(`/rooms/${room.id}`, data);
            else await API.post('/rooms', data);
            showToast(isEdit ? 'Đã cập nhật phòng!' : 'Đã thêm phòng mới!', 'success');
            closeModal();
            loadPage('rooms');
        } catch (e) {
            showToast('Lỗi: ' + e.message, 'danger');
        }
    });
}

async function showRoomDetail(id) {
    const room = rooms.find(r => r.id === id);
    if (!room) return;

    openModal(`Phòng ${room.so_phong}`, `
    <div class="room-info">
      <div class="room-info-item"><span class="room-info-label">Giá thuê:</span><span class="room-info-value">${formatMoney(room.gia_thue)}</span></div>
      <div class="room-info-item"><span class="room-info-label">Tiền cọc:</span><span class="room-info-value">${formatMoney(room.tien_coc)}</span></div>
      <div class="room-info-item"><span class="room-info-label">Diện tích:</span><span class="room-info-value">${room.dien_tich || 0}m²</span></div>
      <div class="room-info-item"><span class="room-info-label">Tầng:</span><span class="room-info-value">${room.tang || 1}</span></div>
      ${room.ten_khach ? `<div class="room-info-item"><span class="room-info-label">Khách thuê:</span><span class="room-info-value">${room.ten_khach}</span></div>` : ''}
      ${room.mo_ta ? `<div class="room-info-item"><span class="room-info-label">Mô tả:</span><span class="room-info-value">${room.mo_ta}</span></div>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" onclick="deleteRoom(${room.id})">🗑️ Xóa</button>
      <button class="btn btn-primary" onclick='showRoomForm(${JSON.stringify(room)})'>✏️ Sửa</button>
    </div>
  `);
}

async function deleteRoom(id) {
    if (!confirm('Bạn có chắc muốn xóa phòng này?')) return;
    try {
        await API.delete(`/rooms/${id}`);
        showToast('Đã xóa phòng!', 'success');
        closeModal();
        loadPage('rooms');
    } catch (e) {
        showToast('Lỗi: ' + e.message, 'danger');
    }
}

// ===== Tenants =====
async function renderTenants() {
    tenants = await API.get('/tenants');
    const content = document.getElementById('pageContent');

    content.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-box"><input type="text" class="form-control" placeholder="Tìm khách thuê..." id="searchTenant"></div>
      </div>
      <button class="btn btn-primary" onclick="showTenantForm()">➕ Thêm khách</button>
    </div>
    <div class="card"><div class="table-container"><table class="table" id="tenantsTable"></table></div></div>
  `;

    document.getElementById('searchTenant').addEventListener('input', filterTenants);
    filterTenants();
}

function filterTenants() {
    const search = document.getElementById('searchTenant').value.toLowerCase();
    const filtered = tenants.filter(t => t.ho_ten.toLowerCase().includes(search) || (t.so_dien_thoai || '').includes(search));
    renderTenantsTable(filtered);
}

function renderTenantsTable(list) {
    const table = document.getElementById('tenantsTable');
    const genderText = { nam: 'Nam', nu: 'Nữ', khac: 'Khác' };
    table.innerHTML = `
    <thead><tr><th>Họ tên</th><th>CCCD</th><th>SĐT</th><th>Giới tính</th><th>Phòng</th><th>Thao tác</th></tr></thead>
    <tbody>${list.length ? list.map(t => `
      <tr>
        <td><strong>${t.ho_ten}</strong></td>
        <td>${t.cccd || '-'}</td>
        <td>${t.so_dien_thoai || '-'}</td>
        <td>${genderText[t.gioi_tinh] || '-'}</td>
        <td>${t.so_phong ? `<span class="badge badge-info">${t.so_phong}</span>` : '-'}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick='showTenantForm(${JSON.stringify(t)})'>✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteTenant(${t.id})">🗑️</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="empty-state">Chưa có khách thuê</td></tr>'}</tbody>
  `;
}

function showTenantForm(tenant = null) {
    const isEdit = !!tenant;
    openModal(isEdit ? 'Sửa thông tin' : 'Thêm khách thuê', `
    <form id="tenantForm">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Họ tên *</label><input type="text" class="form-control" name="ho_ten" value="${tenant?.ho_ten || ''}" required></div>
        <div class="form-group"><label class="form-label">CCCD</label><input type="text" class="form-control" name="cccd" value="${tenant?.cccd || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Ngày sinh</label><input type="date" class="form-control" name="ngay_sinh" value="${tenant?.ngay_sinh || ''}"></div>
        <div class="form-group"><label class="form-label">Giới tính</label>
          <select class="form-control" name="gioi_tinh">
            <option value="nam" ${tenant?.gioi_tinh === 'nam' ? 'selected' : ''}>Nam</option>
            <option value="nu" ${tenant?.gioi_tinh === 'nu' ? 'selected' : ''}>Nữ</option>
            <option value="khac" ${tenant?.gioi_tinh === 'khac' ? 'selected' : ''}>Khác</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">SĐT</label><input type="tel" class="form-control" name="so_dien_thoai" value="${tenant?.so_dien_thoai || ''}"></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-control" name="email" value="${tenant?.email || ''}"></div>
      </div>
      <div class="form-group"><label class="form-label">Quê quán</label><input type="text" class="form-control" name="que_quan" value="${tenant?.que_quan || ''}"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nghề nghiệp</label><input type="text" class="form-control" name="nghe_nghiep" value="${tenant?.nghe_nghiep || ''}"></div>
        <div class="form-group"><label class="form-label">Nơi làm việc</label><input type="text" class="form-control" name="noi_lam_viec" value="${tenant?.noi_lam_viec || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Liên hệ khẩn cấp</label><input type="text" class="form-control" name="lien_he_khan_cap" value="${tenant?.lien_he_khan_cap || ''}"></div>
        <div class="form-group"><label class="form-label">SĐT khẩn cấp</label><input type="tel" class="form-control" name="sdt_khan_cap" value="${tenant?.sdt_khan_cap || ''}"></div>
      </div>
      <div class="form-group"><label class="form-label">Ghi chú</label><textarea class="form-control" name="ghi_chu" rows="2">${tenant?.ghi_chu || ''}</textarea></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Cập nhật' : 'Thêm mới'}</button>
      </div>
    </form>
  `);

    document.getElementById('tenantForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const data = Object.fromEntries(form);
        try {
            if (isEdit) await API.put(`/tenants/${tenant.id}`, data);
            else await API.post('/tenants', data);
            showToast(isEdit ? 'Đã cập nhật!' : 'Đã thêm khách!', 'success');
            closeModal();
            loadPage('tenants');
        } catch (e) {
            showToast('Lỗi: ' + e.message, 'danger');
        }
    });
}

async function deleteTenant(id) {
    if (!confirm('Bạn có chắc muốn xóa khách thuê này?')) return;
    try {
        await API.delete(`/tenants/${id}`);
        showToast('Đã xóa khách thuê!', 'success');
        loadPage('tenants');
    } catch (e) {
        showToast('Lỗi: ' + e.message, 'danger');
    }
}

// ===== Contracts =====
async function renderContracts() {
    contracts = await API.get('/contracts');
    rooms = await API.get('/rooms');
    tenants = await API.get('/tenants');
    settings = await API.get('/settings');
    const content = document.getElementById('pageContent');

    content.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-box"><input type="text" class="form-control" placeholder="Tìm hợp đồng..." id="searchContract"></div>
      </div>
      <button class="btn btn-primary" onclick="showContractForm()">➕ Tạo hợp đồng</button>
    </div>
    <div class="card"><div class="table-container">
      <table class="table">
        <thead><tr><th>Phòng</th><th>Khách thuê</th><th>Ngày bắt đầu</th><th>Ngày kết thúc</th><th>Giá thuê</th><th>Tiền cọc</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody id="contractsBody"></tbody>
      </table>
    </div></div>
  `;

    document.getElementById('searchContract').addEventListener('input', filterContracts);
    filterContracts();
}

function filterContracts() {
    const search = document.getElementById('searchContract').value.toLowerCase();
    const filtered = contracts.filter(c =>
        c.so_phong?.toLowerCase().includes(search) ||
        c.ten_khach?.toLowerCase().includes(search)
    );
    renderContractsTable(filtered);
}

function renderContractsTable(list) {
    const tbody = document.getElementById('contractsBody');
    const statusText = { hieu_luc: 'Hiệu lực', het_han: 'Hết hạn', da_thanh_ly: 'Đã thanh lý' };
    const statusClass = { hieu_luc: 'success', het_han: 'warning', da_thanh_ly: 'secondary' };

    tbody.innerHTML = list.length ? list.map(c => `
    <tr>
      <td><strong>Phòng ${c.so_phong}</strong></td>
      <td>${c.ten_khach}</td>
      <td>${formatDate(c.ngay_bat_dau)}</td>
      <td>${formatDate(c.ngay_ket_thuc)}</td>
      <td>${formatMoney(c.gia_thue)}</td>
      <td>${formatMoney(c.tien_coc)}</td>
      <td><span class="badge badge-${statusClass[c.trang_thai]}">${statusText[c.trang_thai]}</span></td>
      <td>
        <button class="btn btn-sm btn-info" onclick="showContractDetail(${c.id})">👁️</button>
        <button class="btn btn-sm btn-secondary" onclick="editContract(${c.id})">✏️</button>
        <button class="btn btn-sm btn-primary" onclick="exportContract(${c.id})">📄</button>
        <button class="btn btn-sm btn-danger" onclick="deleteContract(${c.id})">🗑️</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="8" class="empty-state">Chưa có hợp đồng</td></tr>';
}

function showContractForm(contract = null) {
    const isEdit = !!contract;
    const availableRooms = rooms.filter(r => r.trang_thai === 'trong' || (isEdit && r.id === contract?.room_id));
    const availableTenants = tenants.filter(t => !t.so_phong || (isEdit && contracts.find(c => c.id === contract?.id)?.tenant_id === t.id));

    openModal(isEdit ? 'Sửa hợp đồng' : 'Tạo hợp đồng mới', `
    <form id="contractForm">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Phòng *</label>
          <select class="form-control" name="room_id" required ${isEdit ? 'disabled' : ''}>
            <option value="">-- Chọn phòng --</option>
            ${availableRooms.map(r => `<option value="${r.id}" ${contract?.room_id === r.id ? 'selected' : ''}>Phòng ${r.so_phong} - ${formatMoney(r.gia_thue)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Khách thuê *</label>
          <select class="form-control" name="tenant_id" required ${isEdit ? 'disabled' : ''}>
            <option value="">-- Chọn khách --</option>
            ${availableTenants.map(t => `<option value="${t.id}" ${contract?.tenant_id === t.id ? 'selected' : ''}>${t.ho_ten}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Ngày bắt đầu *</label><input type="date" class="form-control" name="ngay_bat_dau" value="${contract?.ngay_bat_dau || ''}" required></div>
        <div class="form-group"><label class="form-label">Ngày kết thúc</label><input type="date" class="form-control" name="ngay_ket_thuc" value="${contract?.ngay_ket_thuc || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Giá thuê *</label><input type="number" class="form-control" name="gia_thue" value="${contract?.gia_thue || ''}" required></div>
        <div class="form-group"><label class="form-label">Tiền cọc</label><input type="number" class="form-control" name="tien_coc" value="${contract?.tien_coc || 0}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Chu kỳ TT (tháng)</label><input type="number" class="form-control" name="chu_ky_thanh_toan" value="${contract?.chu_ky_thanh_toan || 1}" min="1"></div>
        <div class="form-group"><label class="form-label">Trạng thái</label>
          <select class="form-control" name="trang_thai">
            <option value="hieu_luc" ${contract?.trang_thai === 'hieu_luc' ? 'selected' : ''}>Hiệu lực</option>
            <option value="het_han" ${contract?.trang_thai === 'het_han' ? 'selected' : ''}>Hết hạn</option>
            <option value="da_thanh_ly" ${contract?.trang_thai === 'da_thanh_ly' ? 'selected' : ''}>Đã thanh lý</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Nơi lưu trữ HĐ gốc</label><input type="text" class="form-control" name="noi_luu_tru" value="${contract?.noi_luu_tru || ''}" placeholder="VD: Tủ hồ sơ A, Ngăn 3"></div>
      <div class="form-group"><label class="form-label">Điều khoản bổ sung</label><textarea class="form-control" name="dieu_khoan" rows="3">${contract?.dieu_khoan || ''}</textarea></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Cập nhật' : 'Tạo hợp đồng'}</button>
      </div>
    </form>
  `);

    document.querySelector('[name="room_id"]').addEventListener('change', (e) => {
        const room = rooms.find(r => r.id == e.target.value);
        if (room) {
            document.querySelector('[name="gia_thue"]').value = room.gia_thue;
            document.querySelector('[name="tien_coc"]').value = room.tien_coc || 0;
        }
    });

    document.getElementById('contractForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const data = Object.fromEntries(form);
        try {
            if (isEdit) await API.put(`/contracts/${contract.id}`, data);
            else await API.post('/contracts', data);
            showToast(isEdit ? 'Đã cập nhật!' : 'Đã tạo hợp đồng!', 'success');
            closeModal();
            loadPage('contracts');
        } catch (e) {
            showToast('Lỗi: ' + e.message, 'danger');
        }
    });
}

async function showContractDetail(id) {
    const c = await API.get(`/contracts/${id}`);
    openModal(`Hợp đồng - Phòng ${c.so_phong}`, `
    <div class="room-info">
      <div class="room-info-item"><span class="room-info-label">Khách thuê:</span><span class="room-info-value">${c.ten_khach}</span></div>
      <div class="room-info-item"><span class="room-info-label">Ngày bắt đầu:</span><span class="room-info-value">${formatDate(c.ngay_bat_dau)}</span></div>
      <div class="room-info-item"><span class="room-info-label">Ngày kết thúc:</span><span class="room-info-value">${formatDate(c.ngay_ket_thuc)}</span></div>
      <div class="room-info-item"><span class="room-info-label">Giá thuê:</span><span class="room-info-value">${formatMoney(c.gia_thue)}</span></div>
      <div class="room-info-item"><span class="room-info-label">Tiền cọc:</span><span class="room-info-value">${formatMoney(c.tien_coc)}</span></div>
      <div class="room-info-item"><span class="room-info-label">Nơi lưu trữ:</span><span class="room-info-value">${c.noi_luu_tru || 'Chưa cập nhật'}</span></div>
      ${c.dieu_khoan ? `<div class="room-info-item"><span class="room-info-label">Điều khoản:</span><span class="room-info-value">${c.dieu_khoan}</span></div>` : ''}
    </div>
  `);
}

async function editContract(id) {
    const c = await API.get(`/contracts/${id}`);
    showContractForm(c);
}

async function deleteContract(id) {
    if (!confirm('Bạn có chắc muốn xóa hợp đồng này?')) return;
    try {
        await API.delete(`/contracts/${id}`);
        showToast('Đã xóa hợp đồng!', 'success');
        loadPage('contracts');
    } catch (e) {
        showToast('Lỗi: ' + e.message, 'danger');
    }
}

// ===== Invoices =====
async function renderInvoices() {
    invoices = await API.get('/invoices');
    const content = document.getElementById('pageContent');
    const now = new Date();

    content.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <select class="form-control filter-select" id="filterMonth">
          ${[...Array(12)].map((_, i) => `<option value="${i + 1}" ${now.getMonth() + 1 === i + 1 ? 'selected' : ''}>Tháng ${i + 1}</option>`).join('')}
        </select>
        <select class="form-control filter-select" id="filterYear">
          ${[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => `<option value="${y}" ${now.getFullYear() === y ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary" onclick="generateInvoices()">📄 Tạo hóa đơn tháng</button>
    </div>
    <div class="card"><div class="table-container">
      <table class="table">
        <thead><tr><th>Phòng</th><th>Khách</th><th>Tháng</th><th>Tiền phòng</th><th>Điện</th><th>Nước</th><th>Tổng</th><th>Còn nợ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody id="invoicesBody"></tbody>
      </table>
    </div></div>
  `;

    document.getElementById('filterMonth').addEventListener('change', filterInvoices);
    document.getElementById('filterYear').addEventListener('change', filterInvoices);
    filterInvoices();
}

// === HÀM LỌC VÀ HIỂN THỊ HÓA ĐƠN (ĐÃ SỬA) ===
function filterInvoices() {
    const month = document.getElementById('filterMonth').value;
    const year = document.getElementById('filterYear').value;
    
    const filtered = invoices.filter(i => i.thang == month && i.nam == year);
    const tbody = document.getElementById('invoicesBody');
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center">Không có hóa đơn nào trong tháng ${month}/${year}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(inv => {
        // Kiểm tra trạng thái: 'da_thanh_toan' hoặc con_no <= 0
        const isPaid = inv.trang_thai === 'da_thanh_toan' || inv.con_no <= 0;
        const badgeClass = isPaid ? 'success' : 'warning';
        const statusText = isPaid ? 'Đã TT' : 'Chưa TT';

        return `
        <tr>
            <td><strong>${inv.so_phong || 'P.' + inv.room_id}</strong></td>
            <td>${inv.ten_khach || 'Khách'}</td>
            <td>${inv.thang}/${inv.nam}</td>
            <td>${formatMoney(inv.tien_phong)}</td>
            <td>
                <div>${inv.so_dien} kWh</div>
                <small class="text-muted">${formatMoney(inv.tien_dien)}</small>
            </td>
            <td>
                <div>${inv.so_nuoc} m³</div>
                <small class="text-muted">${formatMoney(inv.tien_nuoc)}</small>
            </td>
            <td><strong>${formatMoney(inv.tong_tien)}</strong></td>
            <td class="${inv.con_no > 0 ? 'text-danger' : 'text-success'}">
                ${formatMoney(inv.con_no)}
            </td>
            <td><span class="badge badge-${badgeClass}">${statusText}</span></td>
            <td>
                <div style="display: flex; gap: 5px;">
                    ${!isPaid 
                        ? `<button class="btn btn-warning btn-sm" onclick="payInvoice(${inv.id})" title="Thanh toán">💰</button>` 
                        : `<button class="btn btn-success btn-sm" disabled title="Đã thanh toán">✅</button>`
                    }
                    <button class="btn btn-info btn-sm" onclick="showInvoiceDetail(${inv.id})" title="Xem chi tiết">👁️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteInvoice(${inv.id})" title="Xóa">🗑️</button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

async function generateInvoices() {
    const thang = document.getElementById('filterMonth').value;
    const nam = document.getElementById('filterYear').value;
    try {
        const result = await API.post('/invoices/generate-all', { thang, nam });
        showToast(`Đã tạo ${result.count} hóa đơn!`, 'success');
        // Reload lại dữ liệu
        invoices = await API.get('/invoices');
        filterInvoices();
    } catch (e) {
        showToast('Lỗi: ' + e.message, 'danger');
    }
}

async function showInvoiceDetail(id) {
    const inv = await API.get(`/invoices/${id}`);
    openModal(`Hóa đơn - Phòng ${inv.so_phong}`, `
    <div class="invoice-preview">
      <div class="invoice-header"><div class="invoice-title">HÓA ĐƠN TIỀN PHÒNG</div><div>Tháng ${inv.thang}/${inv.nam}</div></div>
      <div class="invoice-details">
        <div class="invoice-detail-item"><span>Phòng:</span><span>${inv.so_phong}</span></div>
        <div class="invoice-detail-item"><span>Khách:</span><span>${inv.ten_khach}</span></div>
      </div>
      <table class="invoice-table">
        <tr><th>Khoản mục</th><th>Chi tiết</th><th>Thành tiền</th></tr>
        <tr><td>Tiền phòng</td><td>-</td><td>${formatMoney(inv.tien_phong)}</td></tr>
        <tr><td>Tiền điện</td><td>${inv.so_dien} kWh</td><td>${formatMoney(inv.tien_dien)}</td></tr>
        <tr><td>Tiền nước</td><td>${inv.so_nuoc} m³</td><td>${formatMoney(inv.tien_nuoc)}</td></tr>
        <tr><td>Wifi</td><td>-</td><td>${formatMoney(inv.tien_wifi)}</td></tr>
        <tr><td>Rác</td><td>-</td><td>${formatMoney(inv.tien_rac)}</td></tr>
      </table>
      <div class="invoice-total">TỔNG CỘNG: ${formatMoney(inv.tong_tien)}</div>
      <div class="invoice-status" style="margin-top: 10px; padding: 10px; background: ${inv.con_no <= 0 ? '#d4edda' : '#fff3cd'}; border-radius: 5px;">
        <strong>Trạng thái:</strong> ${inv.con_no <= 0 ? '✅ Đã thanh toán' : '⏳ Còn nợ: ' + formatMoney(inv.con_no)}
      </div>
    </div>
  `);
}

// === HÀM XỬ LÝ THANH TOÁN (ĐÃ SỬA - Không reload trang) ===
async function payInvoice(id) {
    if (confirm('Xác nhận khách đã thanh toán toàn bộ số tiền này?')) {
        try {
            const result = await API.put(`/invoices/${id}/pay`, {});
            
            if (result.success) {
                showToast('✅ Đã thanh toán thành công!', 'success');
                
                // Cập nhật lại dữ liệu invoices từ server
                invoices = await API.get('/invoices');
                
                // Render lại bảng hóa đơn
                filterInvoices();
            } else {
                showToast('Lỗi: ' + (result.error || 'Không thể thanh toán'), 'danger');
            }
        } catch (e) {
            console.error(e);
            showToast('Có lỗi xảy ra: ' + e.message, 'danger');
        }
    }
}

// === HÀM XỬ LÝ XÓA HÓA ĐƠN ===
async function deleteInvoice(id) {
    if (confirm('Bạn có chắc chắn muốn xóa hóa đơn này không?')) {
        try {
            await API.delete(`/invoices/${id}`);
            showToast('Đã xóa hóa đơn thành công!', 'success');
            invoices = await API.get('/invoices');
            filterInvoices();
        } catch (e) {
            showToast('Lỗi khi xóa: ' + e.message, 'danger');
        }
    }
}

// ===== Meters =====
async function renderMeters() {
    rooms = await API.get('/rooms');
    const rentedRooms = rooms.filter(r => r.trang_thai === 'dang_thue');
    const now = new Date();

    const content = document.getElementById('pageContent');
    content.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <select class="form-control filter-select" id="meterMonth">
          ${[...Array(12)].map((_, i) => `<option value="${i + 1}" ${now.getMonth() + 1 === i + 1 ? 'selected' : ''}>Tháng ${i + 1}</option>`).join('')}
        </select>
        <select class="form-control filter-select" id="meterYear">
          ${[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => `<option value="${y}" ${now.getFullYear() === y ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" onclick="loadMeterReadings()">Tải dữ liệu</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3 class="card-title">⚡ Ghi số điện nước</h3></div>
      <div class="table-container">
        <table class="table">
          <thead><tr><th>Phòng</th><th>Điện cũ</th><th>Điện mới</th><th>Tiêu thụ</th><th>Nước cũ</th><th>Nước mới</th><th>Tiêu thụ</th><th>Thao tác</th></tr></thead>
          <tbody id="meterBody">
            ${rentedRooms.map(r => `
              <tr data-room="${r.id}">
                <td><strong>Phòng ${r.so_phong}</strong></td>
                <td><input type="number" class="form-control" name="dien_cu" style="width:80px" min="0"></td>
                <td><input type="number" class="form-control" name="dien_moi" style="width:80px" min="0"></td>
                <td class="dien-used">0 kWh</td>
                <td><input type="number" class="form-control" name="nuoc_cu" style="width:80px" min="0"></td>
                <td><input type="number" class="form-control" name="nuoc_moi" style="width:80px" min="0"></td>
                <td class="nuoc-used">0 m³</td>
                <td><button class="btn btn-sm btn-primary" onclick="saveMeterReading(${r.id})">💾</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

    document.querySelectorAll('#meterBody input').forEach(input => {
        input.addEventListener('input', updateMeterCalc);
    });

    loadMeterReadings();
}

function updateMeterCalc(e) {
    const row = e.target.closest('tr');
    const dienCu = parseInt(row.querySelector('[name="dien_cu"]').value) || 0;
    const dienMoi = parseInt(row.querySelector('[name="dien_moi"]').value) || 0;
    const nuocCu = parseInt(row.querySelector('[name="nuoc_cu"]').value) || 0;
    const nuocMoi = parseInt(row.querySelector('[name="nuoc_moi"]').value) || 0;
    row.querySelector('.dien-used').textContent = `${dienMoi - dienCu} kWh`;
    row.querySelector('.nuoc-used').textContent = `${nuocMoi - nuocCu} m³`;
}

async function loadMeterReadings() {
    const thang = document.getElementById('meterMonth').value;
    const nam = document.getElementById('meterYear').value;
    const readings = await API.get(`/meter-readings?thang=${thang}&nam=${nam}`);

    readings.forEach(r => {
        const row = document.querySelector(`tr[data-room="${r.room_id}"]`);
        if (row) {
            row.querySelector('[name="dien_cu"]').value = r.chi_so_dien_cu || 0;
            row.querySelector('[name="dien_moi"]').value = r.chi_so_dien_moi || 0;
            row.querySelector('[name="nuoc_cu"]').value = r.chi_so_nuoc_cu || 0;
            row.querySelector('[name="nuoc_moi"]').value = r.chi_so_nuoc_moi || 0;
            row.querySelector('.dien-used').textContent = `${(r.chi_so_dien_moi || 0) - (r.chi_so_dien_cu || 0)} kWh`;
            row.querySelector('.nuoc-used').textContent = `${(r.chi_so_nuoc_moi || 0) - (r.chi_so_nuoc_cu || 0)} m³`;
        }
    });
}

async function saveMeterReading(roomId) {
    const thang = document.getElementById('meterMonth').value;
    const nam = document.getElementById('meterYear').value;
    const row = document.querySelector(`tr[data-room="${roomId}"]`);

    const data = {
        room_id: roomId, thang, nam,
        chi_so_dien_cu: parseInt(row.querySelector('[name="dien_cu"]').value) || 0,
        chi_so_dien_moi: parseInt(row.querySelector('[name="dien_moi"]').value) || 0,
        chi_so_nuoc_cu: parseInt(row.querySelector('[name="nuoc_cu"]').value) || 0,
        chi_so_nuoc_moi: parseInt(row.querySelector('[name="nuoc_moi"]').value) || 0
    };

    try {
        await API.post('/meter-readings', data);
        showToast('Đã lưu!', 'success');
    } catch (e) {
        showToast('Lỗi: ' + e.message, 'danger');
    }
}

// ===== Statistics =====
async function renderStatistics() {
    const stats = await API.get('/statistics');
    const content = document.getElementById('pageContent');

    content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">🚪</div><div class="stat-value">${stats.rooms?.tong_phong || 0}</div><div class="stat-label">Tổng số phòng</div></div>
      <div class="stat-card success"><div class="stat-icon">✅</div><div class="stat-value">${stats.rooms?.phong_thue || 0}</div><div class="stat-label">Đang thuê</div></div>
      <div class="stat-card warning"><div class="stat-icon">🔓</div><div class="stat-value">${stats.rooms?.phong_trong || 0}</div><div class="stat-label">Phòng trống</div></div>
      <div class="stat-card secondary"><div class="stat-icon">👥</div><div class="stat-value">${stats.tenants?.tong_khach || 0}</div><div class="stat-label">Khách thuê</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3 class="card-title">📊 Doanh thu theo tháng</h3></div>
        <div class="chart-container"><canvas id="revenueChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title">💰 Tổng quan tài chính</h3></div>
        <div class="activity-list">
          <div class="activity-item"><div class="activity-icon">💵</div><div class="activity-content"><div class="activity-title">Doanh thu năm nay</div></div><div class="activity-amount">${formatMoney(stats.yearRevenue?.tong_doanh_thu)}</div></div>
          <div class="activity-item"><div class="activity-icon">📋</div><div class="activity-content"><div class="activity-title">Hợp đồng hiệu lực</div></div><div>${stats.contracts?.hop_dong_hieu_luc || 0}</div></div>
          <div class="activity-item"><div class="activity-icon">⚠️</div><div class="activity-content"><div class="activity-title">Công nợ</div></div><div style="color:var(--danger)">${formatMoney(stats.outstanding?.tong_no)}</div></div>
        </div>
      </div>
    </div>
  `;

    // Revenue Chart
    const ctx = document.getElementById('revenueChart').getContext('2d');
    const months = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);
    const revenueData = months.map((_, i) => {
        const found = stats.monthlyRevenue?.find(r => r.thang === i + 1);
        return found ? found.doanh_thu : 0;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Doanh thu',
                data: revenueData,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => formatMoney(v) }
                }
            }
        }
    });
}

// ===== Deposits (Phiên bản đầy đủ có In phiếu thu) =====
async function renderDeposits() {
    // 1. Tải dữ liệu cọc, hợp đồng VÀ CÀI ĐẶT
    const deposits = await API.get('/deposits');
    contracts = await API.get('/contracts');
    settings = await API.get('/settings'); // Lấy tên nhà trọ mới nhất
    
    window.tempContracts = contracts; 
    
    const content = document.getElementById('pageContent');
    
    content.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left"><h3>💎 Lịch sử giao dịch tiền cọc</h3></div>
      <button class="btn btn-primary" onclick="showDepositForm()">➕ Ghi nhận cọc</button>
    </div>
    
    <div class="card">
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Phòng</th>
              <th>Khách hàng</th>
              <th>Loại giao dịch</th>
              <th>Số tiền</th>
              <th>Ghi chú</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${deposits.length ? deposits.map(d => {
                let badgeClass = 'info';
                let text = 'Thu cọc';
                let sign = '+';
                
                if (d.loai_giao_dich === 'hoan_coc') { badgeClass = 'warning'; text = 'Hoàn cọc'; sign = '-'; }
                if (d.loai_giao_dich === 'tru_coc') { badgeClass = 'danger'; text = 'Trừ cọc'; sign = '-'; }
                
                // Chuẩn bị dữ liệu in
                const printData = JSON.stringify({
                    id: d.id, date: d.ngay_giao_dich, room: d.so_phong, 
                    guest: d.ten_khach, type: text, amount: d.so_tien, note: d.ghi_chu
                }).replace(/"/g, '&quot;');

                return `
                <tr>
                  <td>${formatDate(d.ngay_giao_dich)}</td>
                  <td><strong>Phòng ${d.so_phong || '-'}</strong></td>
                  <td>${d.ten_khach || '-'}</td>
                  <td><span class="badge badge-${badgeClass}">${text}</span></td>
                  <td style="font-weight:bold; color: ${sign === '+' ? 'var(--success)' : 'var(--danger)'}">
                    ${sign}${formatMoney(d.so_tien)}
                  </td>
                  <td>${d.ghi_chu || ''}</td>
                  <td>
                    <button class="btn btn-sm btn-secondary" onclick="printDepositReceipt(${printData})">🖨️ In phiếu</button>
                  </td>
                </tr>
                `;
            }).join('') : '<tr><td colspan="7" class="empty-state">Chưa có giao dịch cọc nào</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    `;
}

// Hàm xử lý in phiếu thu tiền cọc
function printDepositReceipt(data) {
    const tienBangChu = docSoTien(data.amount);
    
    // Lấy tên nhà trọ từ biến settings toàn cục
    const tenNhaTro = settings.ten_nha_tro ? settings.ten_nha_tro.toUpperCase() : "NHÀ TRỌ";
    const soDienThoai = settings.so_dien_thoai || "";

    const printWindow = window.open('', '', 'height=800,width=800');
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Phiếu Thu - ${data.guest}</title>
            <style>
                body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; }
                .brand { font-size: 26px; font-weight: bold; margin-bottom: 5px; color: #000; }
                .phone { font-size: 14px; font-style: italic; margin-bottom: 15px; }
                .title { font-size: 32px; font-weight: bold; text-transform: uppercase; margin-top: 15px; }
                .date { font-style: italic; margin-bottom: 20px; }
                .content { font-size: 18px; line-height: 1.8; margin-bottom: 40px; }
                .row { margin-bottom: 10px; }
                .money { font-weight: bold; }
                .sign-section { display: flex; justify-content: space-between; margin-top: 50px; }
                .sign-box { text-align: center; width: 45%; }
                .sign-title { font-weight: bold; font-size: 18px; }
                .sign-note { font-style: italic; font-size: 14px; }
                .sign-space { height: 100px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="brand">${tenNhaTro}</div>
                <div class="phone">${soDienThoai ? 'Hotline: ' + soDienThoai : ''}</div>
                
                <hr style="width: 50%; border-top: 1px solid #000;">
                
                <div class="title">PHIẾU ${data.type.toUpperCase()}</div>
                <div class="date">Ngày ${new Date(data.date).getDate()} tháng ${new Date(data.date).getMonth() + 1} năm ${new Date(data.date).getFullYear()}</div>
            </div>
            
            <div class="content">
                <div class="row">Họ và tên người nộp: <b>${data.guest}</b></div>
                <div class="row">Thuê tại: <b>Phòng ${data.room}</b></div>
                <div class="row">Lý do nộp: ${data.type} (${data.note || 'Theo thỏa thuận'})</div>
                <div class="row">Số tiền: <b class="money">${new Intl.NumberFormat('vi-VN').format(data.amount)} VNĐ</b></div>
                <div class="row"><i>(Viết bằng chữ): <b>${tienBangChu} ./ .</b></i></div>
            </div>

            <div class="sign-section">
                <div class="sign-box">
                    <div class="sign-title">Người nộp tiền</div>
                    <div class="sign-note">(Ký, ghi rõ họ tên)</div>
                    <div class="sign-space"></div>
                    <b>${data.guest}</b>
                </div>
                <div class="sign-box">
                    <div class="sign-title">Người thu tiền</div>
                    <div class="sign-note">(Ký, ghi rõ họ tên)</div>
                    <div class="sign-space"></div>
                    <b>Chủ trọ</b>
                </div>
            </div>
            
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function showDepositForm() {
    // Chỉ lấy các hợp đồng đang hiệu lực để hiện trong form
    const activeContracts = (window.tempContracts || contracts || []).filter(c => c.trang_thai === 'hieu_luc');
    
    openModal('Ghi nhận giao dịch cọc', `
      <form id="depositForm">
        <div class="form-group">
          <label class="form-label">Chọn Hợp đồng / Phòng</label>
          <select class="form-control" name="contract_info" id="contractSelect" required>
             <option value="">-- Chọn phòng --</option>
             ${activeContracts.map(c => 
               `<option value="${c.id}|${c.room_id}|${c.tenant_id}">Phòng ${c.so_phong} - ${c.ten_khach} (Đang giữ: ${formatMoney(c.tien_coc)})</option>`
             ).join('')}
          </select>
        </div>
        
        <div class="form-row">
            <div class="form-group">
              <label class="form-label">Loại giao dịch</label>
              <select class="form-control" name="loai_giao_dich">
                <option value="thu_coc">➕ Thu thêm cọc</option>
                <option value="hoan_coc">↩️ Hoàn trả cọc (Trả phòng)</option>
                <option value="tru_coc">⚠️ Trừ cọc (Phạt/Hư hỏng)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Số tiền</label>
              <input type="number" class="form-control" name="so_tien" required min="0">
            </div>
        </div>
        
        <div class="form-group">
            <label class="form-label">Ngày giao dịch</label>
            <input type="date" class="form-control" name="ngay_giao_dich" value="${new Date().toISOString().split('T')[0]}">
        </div>
        
        <div class="form-group">
            <label class="form-label">Ghi chú</label>
            <textarea class="form-control" name="ghi_chu" rows="2" placeholder="Ví dụ: Trừ tiền sơn lại tường..."></textarea>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Hủy</button>
          <button type="submit" class="btn btn-primary">Lưu giao dịch</button>
        </div>
      </form>
    `);
    
    document.getElementById('depositForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        
        // Tách thông tin từ value của select (contract_id|room_id|tenant_id)
        const [contractId, roomId, tenantId] = form.get('contract_info').split('|');
        
        const data = {
            contract_id: contractId,
            room_id: roomId,
            tenant_id: tenantId,
            loai_giao_dich: form.get('loai_giao_dich'),
            so_tien: form.get('so_tien'),
            ngay_giao_dich: form.get('ngay_giao_dich'),
            ghi_chu: form.get('ghi_chu')
        };
        
        try {
            await API.post('/deposits', data);
            showToast('Đã lưu giao dịch cọc!', 'success');
            closeModal();
            loadPage('deposits');
        } catch (e) {
            showToast('Lỗi: ' + e.message, 'danger');
        }
    });
}

// ===== HÀM ĐỌC SỐ TIỀN THÀNH CHỮ TIẾNG VIỆT =====
function docSoTien(n) {
    if (!n || n === 0) return "Không đồng";
    n = parseInt(n);
    const chuSo = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    const tien = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

    let lan = 0;
    let i = 0;
    let so = 0;
    let ketQua = "";
    let tmp = "";
    let viTri = [];

    if (n < 0) return "Số tiền âm";
    
    // Chia số thành các nhóm 3 số
    while (n > 0) {
        viTri[lan] = (n % 1000);
        n = Math.floor(n / 1000);
        lan++;
    }

    // Đọc từng nhóm
    for (i = lan - 1; i >= 0; i--) {
        so = viTri[i];
        tmp = "";
        let tram = Math.floor(so / 100);
        let chuc = Math.floor((so % 100) / 10);
        let donVi = so % 10;

        if (tram === 0 && chuc === 0 && donVi === 0) continue;

        if (tram !== 0 || (i < lan - 1 && (chuc !== 0 || donVi !== 0))) {
             if (tram === 0 && i < lan - 1) tmp += "không trăm ";
             else if (tram !== 0) tmp += chuSo[tram] + " trăm ";
        }

        if (chuc !== 0 && chuc !== 1) {
            tmp += chuSo[chuc] + " mươi ";
            if ((chuc === 0) && (donVi !== 0)) tmp += "linh ";
        }
        
        if (chuc === 1) tmp += "mười ";
        
        // Xử lý linh/lẻ
        if (chuc === 0 && donVi !== 0 && tram!==0) tmp += "linh ";

        if (donVi === 1 && chuc > 1) tmp += "mốt";
        else if (donVi === 5 && chuc > 0) tmp += "lăm";
        else if (donVi !== 0) tmp += chuSo[donVi];
        
        ketQua += tmp + " " + tien[i] + " ";
    }

    // Xóa khoảng trắng thừa và viết hoa chữ cái đầu
    ketQua = ketQua.trim();
    return ketQua.charAt(0).toUpperCase() + ketQua.slice(1) + " đồng";
}

// ===== Settings =====
async function renderSettings() {
    settings = await API.get('/settings');
    const content = document.getElementById('pageContent');

    content.innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title">⚙️ Cài đặt hệ thống</h3></div>
      <form id="settingsForm" style="padding: 20px;">
        <h4 style="color: var(--primary); margin-bottom: 15px;">🏠 Thông tin nhà trọ</h4>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Tên nhà trọ</label><input type="text" class="form-control" name="ten_nha_tro" value="${settings.ten_nha_tro || ''}"></div>
          <div class="form-group"><label class="form-label">Số điện thoại</label><input type="tel" class="form-control" name="so_dien_thoai" value="${settings.so_dien_thoai || ''}"></div>
        </div>
        <div class="form-group"><label class="form-label">Địa chỉ</label><input type="text" class="form-control" name="dia_chi" value="${settings.dia_chi || ''}"></div>
        <hr style="margin: 25px 0; border-color: var(--border);">
        <h4 style="color: var(--primary); margin-bottom: 15px;">💰 Đơn giá dịch vụ</h4>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Giá điện (đ/kWh)</label><input type="number" class="form-control" name="gia_dien" value="${settings.gia_dien || 3500}"></div>
          <div class="form-group"><label class="form-label">Giá nước (đ/m³)</label><input type="number" class="form-control" name="gia_nuoc" value="${settings.gia_nuoc || 25000}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Phí Wifi (đ/tháng)</label><input type="number" class="form-control" name="gia_wifi" value="${settings.gia_wifi || 50000}"></div>
          <div class="form-group"><label class="form-label">Phí rác (đ/tháng)</label><input type="number" class="form-control" name="gia_rac" value="${settings.gia_rac || 20000}"></div>
        </div>
        <div class="form-group"><label class="form-label">Ngày thu tiền hàng tháng (hạn thanh toán)</label><input type="number" class="form-control" name="ngay_thu_tien" value="${settings.ngay_thu_tien || 5}" min="1" max="28" style="width: 100px;"></div>
        <div class="modal-footer" style="padding: 20px 0 0 0;">
          <button type="submit" class="btn btn-primary">💾 Lưu cài đặt</button>
        </div>
      </form>
    </div>
    
    <div class="card" style="margin-top: 20px; border-left: 4px solid var(--info);">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 class="card-title" style="color: var(--info);">📘 Hướng dẫn sử dụng</h3>
          <p style="margin: 5px 0 0 0; color: var(--text-secondary); font-size: 14px;">Bạn chưa rõ quy trình? Tải ngay tài liệu hướng dẫn chi tiết để tra cứu.</p>
        </div>
        <button class="btn btn-info" onclick="downloadUserManual()">📥 Tải Cẩm Nang (.docx)</button>
      </div>
    </div>
  `;

    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const data = Object.fromEntries(form);
        try {
            await API.put('/settings', data);
            showToast('Đã lưu cài đặt!', 'success');
            updateSidebarName(data.ten_nha_tro);
        } catch (e) {
            showToast('Lỗi: ' + e.message, 'danger');
        }
    });
}

// ===== HÀM TẢI HƯỚNG DẪN SỬ DỤNG =====
function downloadUserManual() {
    const manualContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Hướng Dẫn Sử Dụng</title></head>
    <body style="font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.6;">
        
        <h1 style="text-align: center; color: #2c3e50;">CẨM NANG QUẢN LÝ NHÀ TRỌ</h1>
        <p style="text-align: center; font-style: italic;">(Tài liệu hướng dẫn sử dụng phần mềm nội bộ)</p>
        <hr>

        <h2>1. Quy trình đón khách mới (Check-in)</h2>
        <ul>
            <li><b>Bước 1:</b> Vào menu <b>Phòng trọ</b> để kiểm tra phòng trống.</li>
            <li><b>Bước 2:</b> Vào menu <b>Khách thuê</b> -> Bấm "Thêm khách" để lưu thông tin CCCD, quê quán.</li>
            <li><b>Bước 3:</b> Vào menu <b>Hợp đồng</b> -> Bấm "Tạo hợp đồng", chọn phòng và khách tương ứng. Sau đó bấm nút "📄" để in hợp đồng ra file Word.</li>
            <li><b>Bước 4:</b> Vào menu <b>Tiền cọc</b> -> Chọn "Ghi nhận cọc" -> Chọn loại "Thu cọc". Bấm "🖨️ In phiếu" để xuất phiếu thu cho khách.</li>
        </ul>

        <h2>2. Quy trình thu tiền hàng tháng</h2>
        <ul>
            <li><b>Bước 1:</b> Đến ngày chốt (VD: ngày 5), vào menu <b>Điện nước</b> -> Chọn tháng -> Nhập chỉ số điện/nước mới.</li>
            <li><b>Bước 2:</b> Vào menu <b>Hóa đơn</b> -> Bấm "📄 Tạo hóa đơn tháng". Hệ thống tự tính tiền dựa trên đơn giá trong Cài đặt.</li>
            <li><b>Bước 3:</b> Gửi thông báo cho khách. Khi khách đóng tiền, bấm nút <b>"💰 Thanh toán"</b> để gạch nợ.</li>
        </ul>

        <h2>3. Quy trình trả phòng (Check-out)</h2>
        <ul>
            <li>Tìm hợp đồng cũ -> Sửa trạng thái thành "Đã thanh lý" hoặc "Hết hạn".</li>
            <li>Vào menu <b>Tiền cọc</b> -> Ghi nhận giao dịch <b>"Hoàn cọc"</b> (trả tiền lại cho khách) hoặc <b>"Trừ cọc"</b> (nếu có hư hại).</li>
        </ul>

        <h2>4. Các tính năng khác</h2>
        <ul>
            <li><b>Tổng quan:</b> Xem nhanh thống kê phòng, doanh thu, và danh sách nợ quá hạn (nếu có).</li>
            <li><b>Cài đặt:</b> Thay đổi giá điện, nước, wifi, rác, tên nhà trọ, ngày thu tiền hàng tháng.</li>
            <li><b>Báo cáo nợ tự động:</b> Hệ thống tự động gửi Email báo cáo các phòng nợ tiền quá hạn vào 8:00 sáng hàng ngày.</li>
            <li><b>Dark Mode:</b> Bấm biểu tượng 🌙/☀️ để đổi giao diện sáng/tối.</li>
        </ul>

        <h2>5. Lưu ý quan trọng</h2>
        <ul>
            <li>Số tiền cọc trong <b>Hợp đồng</b> được tính tự động từ các giao dịch trong trang <b>Tiền cọc</b>.</li>
            <li>Ngày thu tiền trong <b>Cài đặt</b> quyết định hạn thanh toán của hóa đơn (tính từ ngày tạo).</li>
            <li>Nên sao lưu file <b>nhatro.db</b> định kỳ để tránh mất dữ liệu.</li>
        </ul>

        <p style="margin-top: 50px; text-align: center; font-weight: bold; color: #27ae60;">CHÚC BẠN QUẢN LÝ HIỆU QUẢ!</p>
    </body>
    </html>
    `;

    const converted = htmlDocx.asBlob(manualContent);
    saveAs(converted, 'Cam_Nang_Quan_Ly_Nha_Tro.docx');
}

// ===== Export Contract to Word (Phiên bản đầy đủ điều khoản) =====
async function exportContract(id) {
    const c = await API.get(`/contracts/${id}`);
    settings = await API.get('/settings');
    
    // Tiền cọc đã được server tính sẵn từ bảng deposits
    const tienCoc = c.tien_coc || 0;
    
    const contractHTML = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Hợp Đồng Thuê Trọ</title></head>
    <body style="font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.6;">
        
        <p style="text-align: center; font-weight: bold; font-size: 14pt;">
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>
            <span style="text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</span>
        </p>
        <p style="text-align: center;">---oOo---</p>
        
        <h1 style="text-align: center; font-size: 18pt; color: #1a365d; margin-top: 20px;">HỢP ĐỒNG THUÊ PHÒNG TRỌ</h1>
        <p style="text-align: center; font-style: italic;">(Số: .../${new Date().getFullYear()}/HĐTP)</p>

        <p>Hôm nay, ngày ${new Date().toLocaleDateString('vi-VN')}, tại ${settings.dia_chi || '..................'}, chúng tôi gồm:</p>

        <p><b>BÊN A (BÊN CHO THUÊ):</b></p>
        <p>Đại diện: ${settings.ten_nha_tro || '..................'}<br>
        Địa chỉ: ${settings.dia_chi || '..................'}<br>
        Điện thoại: ${settings.so_dien_thoai || '..................'}</p>

        <p><b>BÊN B (BÊN THUÊ):</b></p>
        <p>Ông/Bà: ${c.ten_khach}<br>
        Số điện thoại: ${c.so_dien_thoai || '..................'}<br>
        CCCD/CMND số: .......................................</p>

        <p>Hai bên thỏa thuận ký kết hợp đồng thuê trọ với các điều khoản sau:</p>

        <p><b>Điều 1: Đối tượng hợp đồng</b><br>
        Bên A đồng ý cho Bên B thuê phòng trọ số <b>${c.so_phong}</b> thuộc sở hữu của Bên A để ở.</p>

        <p><b>Điều 2: Thời hạn và Giá cả</b><br>
        - Thời hạn thuê: Từ ngày ${formatDate(c.ngay_bat_dau)} đến ngày ${formatDate(c.ngay_ket_thuc)}.<br>
        - Giá thuê phòng: <b>${formatMoney(c.gia_thue)}/tháng</b>.<br>
        - Hình thức thanh toán: Trả trước từ ngày 01 đến ngày ${settings.ngay_thu_tien || 5} hàng tháng.</p>

        <p><b>Điều 3: Chi phí dịch vụ</b><br>
        - Tiền điện: ${formatMoney(settings.gia_dien)}/kWh (theo công tơ riêng).<br>
        - Tiền nước: ${formatMoney(settings.gia_nuoc)}/m³ (hoặc người).<br>
        - Wifi: ${formatMoney(settings.gia_wifi)}/tháng.<br>
        - Rác: ${formatMoney(settings.gia_rac)}/tháng.</p>

        <p><b>Điều 4: Tiền đặt cọc</b><br>
        - Bên B đã đặt cọc cho Bên A số tiền: <b>${formatMoney(tienCoc)}</b>.<br>
        - Số tiền này dùng để đảm bảo thực hiện hợp đồng và bồi thường hư hại (nếu có).<br>
        - Bên A sẽ hoàn trả lại tiền cọc khi hết hạn hợp đồng và Bên B đã thanh toán đầy đủ các chi phí, trả phòng nguyên vẹn.</p>

        <p><b>Điều 5: Trách nhiệm và Nghĩa vụ chung</b><br>
        1. Bên B cam kết sử dụng phòng đúng mục đích để ở, không tàng trữ chất cấm, vật liệu nổ, không gây mất trật tự ảnh hưởng người xung quanh.<br>
        2. Giữ gìn vệ sinh chung, để xe đúng nơi quy định, khóa cửa cẩn thận khi ra ngoài.<br>
        3. Không được tự ý đục tường, thay đổi kết cấu phòng khi chưa có sự đồng ý của Bên A.<br>
        4. Nghiêm cấm cờ bạc, mại dâm, sử dụng ma túy trong khu trọ. Nếu vi phạm Bên A có quyền đơn phương chấm dứt hợp đồng và không hoàn trả tiền cọc.<br>
        5. Nếu Bên B muốn chấm dứt hợp đồng trước thời hạn phải báo trước 30 ngày. Nếu không báo trước sẽ mất toàn bộ tiền cọc.<br>
        6. Sau 22h00 yêu cầu giữ trật tự, không tụ tập nhậu nhẹt gây ồn ào.</p>

        <p><b>Điều 6: Cam kết chung</b><br>
        - Hai bên cam kết thực hiện đúng các điều khoản trên. Nếu có tranh chấp sẽ thương lượng giải quyết trên tinh thần hòa giải.<br>
        - Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau.</p>

        <br><br>
        <table style="width: 100%; border: none;">
            <tr>
                <td style="text-align: center; width: 50%;"><b>ĐẠI DIỆN BÊN A</b><br><i>(Ký, ghi rõ họ tên)</i><br><br><br><br><br></td>
                <td style="text-align: center; width: 50%;"><b>ĐẠI DIỆN BÊN B</b><br><i>(Ký, ghi rõ họ tên)</i><br><br><br><br><br>${c.ten_khach}</td>
            </tr>
        </table>
    </body>
    </html>
    `;

    const converted = htmlDocx.asBlob(contractHTML);
    saveAs(converted, `Hop_Dong_Phong_${c.so_phong}.docx`);
}
