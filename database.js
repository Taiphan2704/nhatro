// Database module sử dụng sql.js (pure JavaScript SQLite)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'nhatro.db');

let db = null;

// Khởi tạo database
async function initDatabase() {
    const SQL = await initSqlJs();
    
    // Load database file nếu tồn tại
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }
    
    // Tạo các bảng
    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY,
            ten_nha_tro TEXT DEFAULT 'Nhà Trọ Hoàn Mỹ',
            dia_chi TEXT DEFAULT '',
            so_dien_thoai TEXT DEFAULT '',
            gia_dien INTEGER DEFAULT 3500,
            gia_nuoc INTEGER DEFAULT 25000,
            gia_wifi INTEGER DEFAULT 50000,
            gia_rac INTEGER DEFAULT 20000,
            ngay_thu_tien INTEGER DEFAULT 5
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ten_phong TEXT NOT NULL,
            tang INTEGER DEFAULT 1,
            dien_tich REAL,
            gia_thue INTEGER,
            mo_ta TEXT,
            trang_thai TEXT DEFAULT 'trong'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS tenants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ho_ten TEXT NOT NULL,
            cccd TEXT,
            sdt TEXT,
            email TEXT,
            que_quan TEXT,
            ngay_sinh TEXT,
            gioi_tinh TEXT,
            nghe_nghiep TEXT,
            anh_cccd_truoc TEXT,
            anh_cccd_sau TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER,
            tenant_id INTEGER,
            ngay_bat_dau TEXT,
            ngay_ket_thuc TEXT,
            gia_thue INTEGER,
            tien_coc INTEGER,
            chu_ky_thanh_toan INTEGER DEFAULT 1,
            trang_thai TEXT DEFAULT 'hieu_luc',
            ghi_chu TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (room_id) REFERENCES rooms(id),
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS meter_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER,
            thang TEXT,
            chi_so_dien_cu INTEGER DEFAULT 0,
            chi_so_dien_moi INTEGER DEFAULT 0,
            chi_so_nuoc_cu INTEGER DEFAULT 0,
            chi_so_nuoc_moi INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contract_id INTEGER,
            room_id INTEGER,
            thang TEXT,
            tien_phong INTEGER DEFAULT 0,
            tien_dien INTEGER DEFAULT 0,
            tien_nuoc INTEGER DEFAULT 0,
            tien_wifi INTEGER DEFAULT 0,
            tien_rac INTEGER DEFAULT 0,
            phi_khac INTEGER DEFAULT 0,
            ghi_chu_phi_khac TEXT,
            tong_tien INTEGER DEFAULT 0,
            da_thanh_toan INTEGER DEFAULT 0,
            ngay_thanh_toan TEXT,
            trang_thai TEXT DEFAULT 'chua_thanh_toan',
            han_thanh_toan TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contract_id) REFERENCES contracts(id),
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS deposits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contract_id INTEGER,
            room_id INTEGER,
            so_tien INTEGER,
            loai_giao_dich TEXT,
            ghi_chu TEXT,
            ngay_giao_dich TEXT DEFAULT CURRENT_TIMESTAMP,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contract_id) REFERENCES contracts(id),
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        )
    `);

    // Thêm settings mặc định nếu chưa có
    const settings = db.exec("SELECT * FROM settings WHERE id = 1");
    if (settings.length === 0 || settings[0].values.length === 0) {
        db.run("INSERT INTO settings (id) VALUES (1)");
    }

    // Lưu database
    saveDatabase();
    
    console.log('✅ Database initialized successfully');
    return db;
}

// Lưu database xuống file
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// Helper function để chuyển đổi kết quả query
function queryToObjects(result) {
    if (!result || result.length === 0) return [];
    const columns = result[0].columns;
    const values = result[0].values;
    return values.map(row => {
        const obj = {};
        columns.forEach((col, i) => {
            obj[col] = row[i];
        });
        return obj;
    });
}

// Wrapper functions để tương thích với code cũ
function getDb() {
    return {
        prepare: (sql) => ({
            all: (...params) => {
                try {
                    const stmt = db.prepare(sql);
                    if (params.length > 0) stmt.bind(params);
                    const results = [];
                    while (stmt.step()) {
                        const row = stmt.getAsObject();
                        results.push(row);
                    }
                    stmt.free();
                    return results;
                } catch (e) {
                    console.error('Query error:', e.message);
                    return [];
                }
            },
            get: (...params) => {
                try {
                    const stmt = db.prepare(sql);
                    if (params.length > 0) stmt.bind(params);
                    let result = null;
                    if (stmt.step()) {
                        result = stmt.getAsObject();
                    }
                    stmt.free();
                    return result;
                } catch (e) {
                    console.error('Query error:', e.message);
                    return null;
                }
            },
            run: (...params) => {
                try {
                    const stmt = db.prepare(sql);
                    if (params.length > 0) stmt.bind(params);
                    stmt.step();
                    stmt.free();
                    saveDatabase();
                    return { 
                        changes: db.getRowsModified(),
                        lastInsertRowid: getLastInsertRowId()
                    };
                } catch (e) {
                    console.error('Query error:', e.message);
                    return { changes: 0, lastInsertRowid: 0 };
                }
            }
        }),
        exec: (sql) => {
            db.run(sql);
            saveDatabase();
        }
    };
}

function getLastInsertRowId() {
    const result = db.exec("SELECT last_insert_rowid() as id");
    if (result.length > 0 && result[0].values.length > 0) {
        return result[0].values[0][0];
    }
    return 0;
}

module.exports = { initDatabase, getDb, saveDatabase };
