const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, getDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;

// ==================== SETTINGS API ====================
app.get('/api/settings', (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        res.json(settings || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/settings', (req, res) => {
    try {
        const { ten_nha_tro, dia_chi, so_dien_thoai, gia_dien, gia_nuoc, gia_wifi, gia_rac, ngay_thu_tien } = req.body;
        db.prepare(`
            UPDATE settings SET 
                ten_nha_tro = ?, dia_chi = ?, so_dien_thoai = ?,
                gia_dien = ?, gia_nuoc = ?, gia_wifi = ?, gia_rac = ?,
                ngay_thu_tien = ?
            WHERE id = 1
        `).run(ten_nha_tro, dia_chi, so_dien_thoai, gia_dien, gia_nuoc, gia_wifi, gia_rac, ngay_thu_tien);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ROOMS API ====================
app.get('/api/rooms', (req, res) => {
    try {
        const rooms = db.prepare(`
            SELECT r.*, 
                (SELECT COUNT(*) FROM contracts c WHERE c.room_id = r.id AND c.trang_thai = 'hieu_luc') as co_hop_dong,
                (SELECT t.ho_ten FROM contracts c 
                 JOIN tenants t ON c.tenant_id = t.id 
                 WHERE c.room_id = r.id AND c.trang_thai = 'hieu_luc' LIMIT 1) as ten_khach
            FROM rooms r ORDER BY r.ten_phong
        `).all();
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/rooms/:id', (req, res) => {
    try {
        const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
        res.json(room);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rooms', (req, res) => {
    try {
        const { ten_phong, tang, dien_tich, gia_thue, mo_ta } = req.body;
        const result = db.prepare(`
            INSERT INTO rooms (ten_phong, tang, dien_tich, gia_thue, mo_ta) 
            VALUES (?, ?, ?, ?, ?)
        `).run(ten_phong, tang || 1, dien_tich, gia_thue, mo_ta);
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/rooms/:id', (req, res) => {
    try {
        const { ten_phong, tang, dien_tich, gia_thue, mo_ta, trang_thai } = req.body;
        db.prepare(`
            UPDATE rooms SET ten_phong = ?, tang = ?, dien_tich = ?, 
            gia_thue = ?, mo_ta = ?, trang_thai = ? WHERE id = ?
        `).run(ten_phong, tang, dien_tich, gia_thue, mo_ta, trang_thai, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/rooms/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== TENANTS API ====================
app.get('/api/tenants', (req, res) => {
    try {
        const tenants = db.prepare('SELECT * FROM tenants ORDER BY ho_ten').all();
        res.json(tenants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tenants/:id', (req, res) => {
    try {
        const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);
        res.json(tenant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tenants', (req, res) => {
    try {
        const { ho_ten, cccd, sdt, email, que_quan, ngay_sinh, gioi_tinh, nghe_nghiep } = req.body;
        const result = db.prepare(`
            INSERT INTO tenants (ho_ten, cccd, sdt, email, que_quan, ngay_sinh, gioi_tinh, nghe_nghiep)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(ho_ten, cccd, sdt, email, que_quan, ngay_sinh, gioi_tinh, nghe_nghiep);
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/tenants/:id', (req, res) => {
    try {
        const { ho_ten, cccd, sdt, email, que_quan, ngay_sinh, gioi_tinh, nghe_nghiep } = req.body;
        db.prepare(`
            UPDATE tenants SET ho_ten = ?, cccd = ?, sdt = ?, email = ?, 
            que_quan = ?, ngay_sinh = ?, gioi_tinh = ?, nghe_nghiep = ? WHERE id = ?
        `).run(ho_ten, cccd, sdt, email, que_quan, ngay_sinh, gioi_tinh, nghe_nghiep, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tenants/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM tenants WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== CONTRACTS API ====================
app.get('/api/contracts', (req, res) => {
    try {
        const contracts = db.prepare(`
            SELECT c.*, r.ten_phong, t.ho_ten as ten_khach, t.sdt as sdt_khach,
                COALESCE((
                    SELECT SUM(CASE WHEN loai_giao_dich = 'thu_coc' THEN so_tien ELSE -so_tien END)
                    FROM deposits WHERE contract_id = c.id
                ), c.tien_coc) as tien_coc_thuc_te
            FROM contracts c
            LEFT JOIN rooms r ON c.room_id = r.id
            LEFT JOIN tenants t ON c.tenant_id = t.id
            ORDER BY c.created_at DESC
        `).all();
        res.json(contracts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/contracts/:id', (req, res) => {
    try {
        const contract = db.prepare(`
            SELECT c.*, r.ten_phong, r.dien_tich, t.ho_ten as ten_khach, t.cccd, t.sdt as sdt_khach, t.que_quan,
                COALESCE((
                    SELECT SUM(CASE WHEN loai_giao_dich = 'thu_coc' THEN so_tien ELSE -so_tien END)
                    FROM deposits WHERE contract_id = c.id
                ), c.tien_coc) as tien_coc
            FROM contracts c
            LEFT JOIN rooms r ON c.room_id = r.id
            LEFT JOIN tenants t ON c.tenant_id = t.id
            WHERE c.id = ?
        `).get(req.params.id);
        res.json(contract);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/contracts', (req, res) => {
    try {
        const { room_id, tenant_id, ngay_bat_dau, ngay_ket_thuc, gia_thue, tien_coc, chu_ky_thanh_toan, ghi_chu } = req.body;
        
        // Cập nhật trạng thái phòng
        db.prepare('UPDATE rooms SET trang_thai = ? WHERE id = ?').run('dang_thue', room_id);
        
        const result = db.prepare(`
            INSERT INTO contracts (room_id, tenant_id, ngay_bat_dau, ngay_ket_thuc, gia_thue, tien_coc, chu_ky_thanh_toan, ghi_chu)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(room_id, tenant_id, ngay_bat_dau, ngay_ket_thuc, gia_thue, tien_coc, chu_ky_thanh_toan || 1, ghi_chu);
        
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/contracts/:id', (req, res) => {
    try {
        const { room_id, tenant_id, ngay_bat_dau, ngay_ket_thuc, gia_thue, tien_coc, chu_ky_thanh_toan, trang_thai, ghi_chu } = req.body;
        
        // Nếu kết thúc hợp đồng, cập nhật phòng về trống
        if (trang_thai === 'het_han' || trang_thai === 'da_thanh_ly') {
            db.prepare('UPDATE rooms SET trang_thai = ? WHERE id = ?').run('trong', room_id);
        }
        
        db.prepare(`
            UPDATE contracts SET room_id = ?, tenant_id = ?, ngay_bat_dau = ?, ngay_ket_thuc = ?, 
            gia_thue = ?, tien_coc = ?, chu_ky_thanh_toan = ?, trang_thai = ?, ghi_chu = ? WHERE id = ?
        `).run(room_id, tenant_id, ngay_bat_dau, ngay_ket_thuc, gia_thue, tien_coc, chu_ky_thanh_toan, trang_thai, ghi_chu, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/contracts/:id', (req, res) => {
    try {
        const contract = db.prepare('SELECT room_id FROM contracts WHERE id = ?').get(req.params.id);
        if (contract) {
            db.prepare('UPDATE rooms SET trang_thai = ? WHERE id = ?').run('trong', contract.room_id);
        }
        db.prepare('DELETE FROM contracts WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== METER READINGS API ====================
app.get('/api/meters', (req, res) => {
    try {
        const { thang } = req.query;
        let query = `
            SELECT m.*, r.ten_phong 
            FROM meter_readings m
            LEFT JOIN rooms r ON m.room_id = r.id
        `;
        if (thang) {
            query += ` WHERE m.thang = '${thang}'`;
        }
        query += ' ORDER BY r.ten_phong';
        const meters = db.prepare(query).all();
        res.json(meters);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/meters', (req, res) => {
    try {
        const { room_id, thang, chi_so_dien_cu, chi_so_dien_moi, chi_so_nuoc_cu, chi_so_nuoc_moi } = req.body;
        
        // Kiểm tra đã có chưa
        const existing = db.prepare('SELECT id FROM meter_readings WHERE room_id = ? AND thang = ?').get(room_id, thang);
        
        if (existing) {
            db.prepare(`
                UPDATE meter_readings SET chi_so_dien_cu = ?, chi_so_dien_moi = ?, 
                chi_so_nuoc_cu = ?, chi_so_nuoc_moi = ? WHERE id = ?
            `).run(chi_so_dien_cu, chi_so_dien_moi, chi_so_nuoc_cu, chi_so_nuoc_moi, existing.id);
            res.json({ id: existing.id, success: true });
        } else {
            const result = db.prepare(`
                INSERT INTO meter_readings (room_id, thang, chi_so_dien_cu, chi_so_dien_moi, chi_so_nuoc_cu, chi_so_nuoc_moi)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(room_id, thang, chi_so_dien_cu, chi_so_dien_moi, chi_so_nuoc_cu, chi_so_nuoc_moi);
            res.json({ id: result.lastInsertRowid, success: true });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/meters/:id', (req, res) => {
    try {
        const { chi_so_dien_cu, chi_so_dien_moi, chi_so_nuoc_cu, chi_so_nuoc_moi } = req.body;
        db.prepare(`
            UPDATE meter_readings SET chi_so_dien_cu = ?, chi_so_dien_moi = ?, 
            chi_so_nuoc_cu = ?, chi_so_nuoc_moi = ? WHERE id = ?
        `).run(chi_so_dien_cu, chi_so_dien_moi, chi_so_nuoc_cu, chi_so_nuoc_moi, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== INVOICES API ====================
app.get('/api/invoices', (req, res) => {
    try {
        const invoices = db.prepare(`
            SELECT i.*, r.ten_phong, t.ho_ten as ten_khach, t.sdt as sdt_khach
            FROM invoices i
            LEFT JOIN rooms r ON i.room_id = r.id
            LEFT JOIN contracts c ON i.contract_id = c.id
            LEFT JOIN tenants t ON c.tenant_id = t.id
            ORDER BY i.created_at DESC
        `).all();
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/invoices/:id', (req, res) => {
    try {
        const invoice = db.prepare(`
            SELECT i.*, r.ten_phong, t.ho_ten as ten_khach, t.sdt as sdt_khach, t.cccd
            FROM invoices i
            LEFT JOIN rooms r ON i.room_id = r.id
            LEFT JOIN contracts c ON i.contract_id = c.id
            LEFT JOIN tenants t ON c.tenant_id = t.id
            WHERE i.id = ?
        `).get(req.params.id);
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/invoices/generate', (req, res) => {
    try {
        const { thang } = req.body;
        const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        
        // Lấy các hợp đồng còn hiệu lực
        const contracts = db.prepare(`
            SELECT c.*, r.ten_phong, r.id as room_id
            FROM contracts c
            JOIN rooms r ON c.room_id = r.id
            WHERE c.trang_thai = 'hieu_luc'
        `).all();
        
        let created = 0;
        const ngayThuTien = settings.ngay_thu_tien || 5;
        const [year, month] = thang.split('-');
        const hanThanhToan = `${year}-${month}-${String(ngayThuTien).padStart(2, '0')}`;
        
        for (const contract of contracts) {
            // Kiểm tra đã có hóa đơn chưa
            const existing = db.prepare('SELECT id FROM invoices WHERE contract_id = ? AND thang = ?').get(contract.id, thang);
            if (existing) continue;
            
            // Lấy chỉ số điện nước
            const meter = db.prepare('SELECT * FROM meter_readings WHERE room_id = ? AND thang = ?').get(contract.room_id, thang);
            
            const soDien = meter ? (meter.chi_so_dien_moi - meter.chi_so_dien_cu) : 0;
            const soNuoc = meter ? (meter.chi_so_nuoc_moi - meter.chi_so_nuoc_cu) : 0;
            
            const tienDien = soDien * (settings.gia_dien || 3500);
            const tienNuoc = soNuoc * (settings.gia_nuoc || 25000);
            const tienWifi = settings.gia_wifi || 50000;
            const tienRac = settings.gia_rac || 20000;
            const tienPhong = contract.gia_thue || 0;
            const tongTien = tienPhong + tienDien + tienNuoc + tienWifi + tienRac;
            
            db.prepare(`
                INSERT INTO invoices (contract_id, room_id, thang, tien_phong, tien_dien, tien_nuoc, tien_wifi, tien_rac, tong_tien, han_thanh_toan)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(contract.id, contract.room_id, thang, tienPhong, tienDien, tienNuoc, tienWifi, tienRac, tongTien, hanThanhToan);
            created++;
        }
        
        res.json({ success: true, created });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/invoices/:id/pay', (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const invoice = db.prepare('SELECT tong_tien FROM invoices WHERE id = ?').get(req.params.id);
        
        db.prepare(`
            UPDATE invoices SET trang_thai = 'da_thanh_toan', da_thanh_toan = ?, ngay_thanh_toan = ? WHERE id = ?
        `).run(invoice.tong_tien, today, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/invoices/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== DEPOSITS API ====================
app.get('/api/deposits', (req, res) => {
    try {
        const deposits = db.prepare(`
            SELECT d.*, r.ten_phong, t.ho_ten as ten_khach
            FROM deposits d
            LEFT JOIN rooms r ON d.room_id = r.id
            LEFT JOIN contracts c ON d.contract_id = c.id
            LEFT JOIN tenants t ON c.tenant_id = t.id
            ORDER BY d.ngay_giao_dich DESC
        `).all();
        res.json(deposits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/deposits', (req, res) => {
    try {
        const { contract_id, room_id, so_tien, loai_giao_dich, ghi_chu, ngay_giao_dich } = req.body;
        const result = db.prepare(`
            INSERT INTO deposits (contract_id, room_id, so_tien, loai_giao_dich, ghi_chu, ngay_giao_dich)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(contract_id, room_id, so_tien, loai_giao_dich, ghi_chu, ngay_giao_dich || new Date().toISOString().split('T')[0]);
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/deposits/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM deposits WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== STATISTICS API ====================
app.get('/api/statistics', (req, res) => {
    try {
        // Tổng quan
        const tongPhong = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
        const phongDangThue = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE trang_thai = 'dang_thue'").get().count;
        const phongTrong = tongPhong - phongDangThue;
        
        // Doanh thu tháng này
        const thangNay = new Date().toISOString().slice(0, 7);
        const doanhThuThang = db.prepare(`
            SELECT COALESCE(SUM(da_thanh_toan), 0) as total FROM invoices 
            WHERE thang = ? AND trang_thai = 'da_thanh_toan'
        `).get(thangNay).total;
        
        // Tổng nợ
        const tongNo = db.prepare(`
            SELECT COALESCE(SUM(tong_tien - da_thanh_toan), 0) as total FROM invoices 
            WHERE trang_thai != 'da_thanh_toan'
        `).get().total;
        
        // Doanh thu 6 tháng gần nhất
        const doanhThu6Thang = db.prepare(`
            SELECT thang, SUM(da_thanh_toan) as total 
            FROM invoices 
            WHERE trang_thai = 'da_thanh_toan'
            GROUP BY thang 
            ORDER BY thang DESC 
            LIMIT 6
        `).all();
        
        res.json({
            tongPhong,
            phongDangThue,
            phongTrong,
            doanhThuThang,
            tongNo,
            doanhThu6Thang
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== OVERDUE INVOICES API ====================
app.get('/api/overdue-invoices', (req, res) => {
    try {
        const settings = db.prepare('SELECT ngay_thu_tien FROM settings WHERE id = 1').get();
        const today = new Date().toISOString().split('T')[0];
        
        const overdueInvoices = db.prepare(`
            SELECT i.*, r.ten_phong, t.ho_ten as ten_khach, t.sdt as sdt_khach,
                   julianday(?) - julianday(i.han_thanh_toan) as so_ngay_qua_han
            FROM invoices i
            LEFT JOIN rooms r ON i.room_id = r.id
            LEFT JOIN contracts c ON i.contract_id = c.id
            LEFT JOIN tenants t ON c.tenant_id = t.id
            WHERE i.trang_thai != 'da_thanh_toan' AND date(?) > date(i.han_thanh_toan)
            ORDER BY i.han_thanh_toan ASC
        `).all(today, today);
        
        const tongNo = overdueInvoices.reduce((sum, inv) => sum + (inv.tong_tien - inv.da_thanh_toan), 0);
        
        res.json({
            ngay_thu_tien: settings ? settings.ngay_thu_tien : 5,
            tong_no: tongNo,
            so_phong_no: overdueInvoices.length,
            danh_sach: overdueInvoices
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== DASHBOARD API ====================
app.get('/api/dashboard', (req, res) => {
    try {
        const stats = db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM rooms) as tong_phong,
                (SELECT COUNT(*) FROM rooms WHERE trang_thai = 'dang_thue') as dang_thue,
                (SELECT COUNT(*) FROM rooms WHERE trang_thai = 'trong' OR trang_thai IS NULL) as phong_trong,
                (SELECT COUNT(*) FROM contracts WHERE trang_thai = 'hieu_luc') as hop_dong_hieu_luc
        `).get();
        
        const thangNay = new Date().toISOString().slice(0, 7);
        const doanhThu = db.prepare(`
            SELECT COALESCE(SUM(da_thanh_toan), 0) as total FROM invoices 
            WHERE thang = ? AND trang_thai = 'da_thanh_toan'
        `).get(thangNay);
        
        const chuaThu = db.prepare(`
            SELECT COALESCE(SUM(tong_tien - da_thanh_toan), 0) as total FROM invoices 
            WHERE trang_thai != 'da_thanh_toan'
        `).get();
        
        res.json({
            ...stats,
            doanh_thu_thang: doanhThu.total,
            chua_thu: chuaThu.total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Khởi động server
async function startServer() {
    try {
        db = await initDatabase();
        db = getDb();
        
        app.listen(PORT, () => {
            console.log(`🏠 Server đang chạy tại http://localhost:${PORT}`);
            console.log(`📱 Truy cập từ điện thoại: http://[IP-máy-tính]:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Lỗi khởi động server:', error);
    }
}

startServer();
