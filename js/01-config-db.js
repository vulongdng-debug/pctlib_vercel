    const SUPABASE_CONFIG = {
      url: localStorage.getItem('SMARTLIB_SB_URL') || "https://fsqxqagupqsehzplrbmz.supabase.co",
      anonKey: localStorage.getItem('SMARTLIB_SB_KEY') || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcXhxYWd1cHFzZWh6cGxyYm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NjQ2MzAsImV4cCI6MjEwODU0MDYzMH0.TvUWVS3HUo5jVDxI0s_7rRjOrp9yhNcddbPUTfFy0Sc"
    };

    let supabaseClient = null;
    let isCloudConnected = false;

    const STORAGE_KEY = 'SMARTLIB_V35_CLOUD_DB';
    const SESSION_USER_KEY = 'SMARTLIB_SESSION_USER';

    let selectedBookForBorrow = null;
    let pendingTargetView = null;
    let currentFocusSuggestionIndex = -1;
    let activeSuggestionsList = [];

    let adminUserPage = 1;
    let selectedAdminUserIds = new Set();
    let usersPerPage = 100;

    let adminBookPage = 1;
    let selectedAdminBookIds = new Set();
    let booksPerPage = 100;
    const INITIAL_DB = {
      currentSchoolYear: '2026-2027',
      finePerDay: 5000,
      productionMode: true,
      adminAccount: { username: 'ADMIN', password: 'admin123', fullName: 'Quản Trị', email: 'longnv@pct.edu.vn', twoFactorEnabled: true },
      books: [
        { id: 1, code: 'TH12-001', title: 'Sách giáo khoa Tin học 12 - Cánh Diều (Định hướng CS & ICT)', author: 'Hồ Sĩ Đàm, Hồ Cẩm Hà, Nguyễn Thế Lộc', category: 'Tin học & CNTT', publisher: 'NXB Đại học Sư phạm', shelf: 'Kệ A1', total: 15, available: 12, featured: true, desc: 'Tài liệu chuẩn chương trình GDPT 2018 gồm HTML/CSS, Trí tuệ nhân tạo, Mạng máy tính và Cơ sở dữ liệu.' },
        { id: 2, code: 'TH12-002', title: 'Lập trình Web Full-Stack với HTML5, Tailwind CSS & JavaScript', author: 'Nguyễn Vũ Long', category: 'Tin học & CNTT', publisher: 'NXB Thông tin & Truyền thông', shelf: 'Kệ A1', total: 8, available: 7, featured: true, desc: 'Hướng dẫn thiết kế giao diện web hiện đại, tương tác DOM và xây dựng ứng dụng quản lý thực tế.' },
        { id: 3, code: 'TH12-003', title: 'Cơ sở Dữ liệu MySQL và HeidiSQL Thực Chiến', author: 'Nguyễn Vũ Long', category: 'Tin học & CNTT', publisher: 'NXB Khoa học Kỹ thuật', shelf: 'Kệ A2', total: 10, available: 9, featured: true, desc: 'Thiết kế cơ sở dữ liệu quan hệ, chuẩn hóa dữ liệu và truy vấn dữ liệu nâng cao.' },
        { id: 4, code: 'VH-101', title: 'Mắt Biếc', author: 'Nguyễn Nhật Ánh', category: 'Văn học & Nghệ thuật', publisher: 'NXB Trẻ', shelf: 'Kệ B1', total: 10, available: 8, featured: true, desc: 'Tác phẩm văn học Việt Nam kinh điển viết về tuổi học trò và tình yêu quê hương.' },
        { id: 5, code: 'VH-102', title: 'Cho Tôi Xin Một Vé Đi Tuổi Thơ', author: 'Nguyễn Nhật Ánh', category: 'Văn học & Nghệ thuật', publisher: 'NXB Trẻ', shelf: 'Kệ B1', total: 12, available: 11, featured: false, desc: 'Tập truyện thiếu nhi nổi tiếng gợi nhớ những ký ức tuổi thơ trong trẻo và hồn nhiên.' },
        { id: 6, code: 'VH-103', title: 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh', author: 'Nguyễn Nhật Ánh', category: 'Văn học & Nghệ thuật', publisher: 'NXB Trẻ', shelf: 'Kệ B2', total: 8, available: 0, featured: false, desc: 'Bức tranh làng quê yên bình cùng những câu chuyện cảm động về tình anh em.' },
        { id: 7, code: 'KHTN-201', title: 'Vũ Trụ Trong Vỏ Hạt Dẻ', author: 'Stephen Hawking', category: 'Khoa học tự nhiên', publisher: 'NXB Trẻ', shelf: 'Kệ C1', total: 6, available: 6, featured: true, desc: 'Khám phá vật lý thiên văn hiện đại, thuyết tương đối và cơ học lượng tử.' },
        { id: 8, code: 'KHTN-202', title: 'Lược Sử Thời Gian', author: 'Stephen Hawking', category: 'Khoa học tự nhiên', publisher: 'NXB Trẻ', shelf: 'Kệ C1', total: 5, available: 3, featured: false, desc: 'Cuốn sách khoa học đại chúng kinh điển giải thích về nguồn gốc và số phận của vũ trụ.' },
        { id: 9, code: 'KN-301', title: 'Tư Duy Nhanh Và Chậm (Thinking, Fast and Slow)', author: 'Daniel Kahneman', category: 'Kỹ năng & Kinh tế', publisher: 'NXB Thế Giới', shelf: 'Kệ D1', total: 5, available: 0, featured: false, desc: 'Giải mã hai hệ thống tư duy chi phối nhận thức và quyết định của con người.' },
        { id: 10, code: 'KN-302', title: 'Đắc Nhân Tâm', author: 'Dale Carnegie', category: 'Kỹ năng & Kinh tế', publisher: 'NXB Tổng hợp TP.HCM', shelf: 'Kệ D2', total: 15, available: 14, featured: false, desc: 'Nghệ thuật giao tiếp, thu phục lòng người và xây dựng các mối quan hệ bền vững.' }
      ],
      users: [
        { id: 101, cardCode: 'HS12A1-01', fullName: 'Trần Minh Khôi', group: '12A1', email: 'khoitm.12a1@pct.edu.vn', phone: '', password: '123456', status: 'active', schoolYear: '2026-2027' },
        { id: 102, cardCode: 'HS12A2-05', fullName: 'Lê Ngọc Bảo Trân', group: '12A2', email: 'tranlnb.12a2@pct.edu.vn', phone: '', password: '123456', status: 'active', schoolYear: '2026-2027' },
        { id: 103, cardCode: 'GV-TIN01', fullName: 'Thầy Nguyễn Vũ Long', group: 'Tin học', email: 'longnv@pct.edu.vn', phone: '', password: '123456', status: 'active', schoolYear: '2026-2027' }
      ],
      borrows: [
        { id: 501, ticketCode: 'PM-2610-01', userId: 101, bookId: 1, schoolYear: '2026-2027', borrowDate: '2026-10-01', dueDate: '2026-10-12', returnDate: null, status: 'borrowing' },
        { id: 502, ticketCode: 'PM-2610-02', userId: 101, bookId: 2, schoolYear: '2026-2027', borrowDate: '2026-10-18', dueDate: '2026-11-01', returnDate: null, status: 'pending' },
        { id: 503, ticketCode: 'PM-2610-03', userId: 102, bookId: 4, schoolYear: '2026-2027', borrowDate: '2026-10-15', dueDate: '2026-10-29', returnDate: null, status: 'borrowing' }
      ]
    };

    // ==================== LÕI BẢO MẬT CẤP ĐỘ 1: SHA-256 + SALT, CHỐNG GIẢ MẠO F12 & CHỐNG XSS ====================
    const SECURITY_SALT = 'SMARTLIB_PCT_DN_SALT_2026';

    // Thuật toán băm SHA-256 chuẩn FIPS 180-4 thuần JS (chạy đồng bộ trên cả HTTPS, HTTP và file://)
    function sha256Hex(ascii) {
      function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
      }
      const utf8 = unescape(encodeURIComponent(String(ascii)));
      const mathPow = Math.pow;
      const maxWord = mathPow(2, 32);
      let result = '';
      const words = [];
      const asciiBitLength = utf8.length * 8;
      let hash = [];
      const k = [];
      let primeCounter = 0;
      const isComposite = {};
      for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
          for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
          hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
          k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
      }
      let str = utf8 + '\x80';
      while ((str.length % 64) - 56) str += '\x00';
      for (let i = 0; i < str.length; i++) {
        const j = str.charCodeAt(i);
        words[i >> 2] |= j << (((3 - i) % 4) * 8);
      }
      words[words.length] = (asciiBitLength / maxWord) | 0;
      words[words.length] = asciiBitLength;
      for (let j = 0; j < words.length; ) {
        const w = words.slice(j, (j += 16));
        const oldHash = hash.slice(0);
        for (let i = 0; i < 64; i++) {
          const w15 = w[i - 15], w2 = w[i - 2];
          const a = hash[0], e = hash[4];
          const temp1 =
            hash[7] +
            (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
            ((e & hash[5]) ^ (~e & hash[6])) +
            k[i] +
            (w[i] =
              i < 16
                ? w[i]
                : (w[i - 16] +
                    (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                    w[i - 7] +
                    (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                  0);
          const temp2 =
            (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
            ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
          hash = [(temp1 + temp2) | 0].concat(hash);
          hash[4] = (hash[4] + temp1) | 0;
          hash.pop();
        }
        for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
      }
      for (let i = 0; i < 8; i++) {
        for (let j = 3; j + 1; j--) {
          const b = (hash[i] >> (j * 8)) & 255;
          result += (b < 16 ? 0 : '') + b.toString(16);
        }
      }
      return result;
    }

    const PASSWORD_HASH_CACHE = new Map();
    const EMPTY_PASSWORD_HASH = 'sha256$98456b18ee3e6838e1e290921920de32655c88e68615ac2ad138298f173a34be';

    function hashPassword(rawOrHashed) {
      let s = String(rawOrHashed ?? '').trim();
      if (!s || s === 'null' || s === 'undefined' || s === '********') s = '123456';
      if (s.startsWith('sha256$')) return s;
      if (PASSWORD_HASH_CACHE.has(s)) return PASSWORD_HASH_CACHE.get(s);
      const hashed = 'sha256$' + sha256Hex(SECURITY_SALT + '::' + s);
      PASSWORD_HASH_CACHE.set(s, hashed);
      return hashed;
    }

    function verifyPassword(inputPlain, storedPassword) {
      const cleanInput = String(inputPlain || '').trim();
      const stored = String(storedPassword || '123456').trim();
      // Nếu mật khẩu được lưu là rỗng/lỗi hoặc là hash của chuỗi rỗng: chấp nhận mật khẩu mặc định 123456
      if (stored === '' || stored === '123456' || stored === '********' || stored === EMPTY_PASSWORD_HASH || stored === hashPassword('123456')) {
        return cleanInput === '123456';
      }
      if (stored.startsWith('sha256$')) {
        return hashPassword(cleanInput) === stored;
      }
      return cleanInput === stored || hashPassword(cleanInput) === hashPassword(stored);
    }

    function isDefaultReaderPassword(storedPassword) {
      if (!storedPassword) return true;
      const s = String(storedPassword).trim();
      return s === '' || s === '123456' || s === '********' || s === EMPTY_PASSWORD_HASH || s === hashPassword('123456');
    }

    // Xóa bỏ chuỗi null / undefined và lọc rác
    function cleanNullText(val, fallback = '') {
      if (val === null || val === undefined) return fallback;
      const s = String(val).trim();
      if (s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return fallback;
      return s;
    }

    // Escape đầy đủ ký tự HTML đặc biệt chống XSS khi đưa vào innerHTML
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Lọc bỏ thẻ độc hại chống XSS cho dữ liệu văn bản (đồng thời loại bỏ từ Null rác)
    function sanitizeText(str) {
      if (str === null || str === undefined) return '';
      const s = cleanNullText(str);
      return s
        .replace(/<\/?script[^>]*>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/[<>]/g, c => (c === '<' ? '‹' : '›'));
    }

    const READER_AUTH_KEY = 'SMARTLIB_READER_CRED';
    let publicStatsCache = { totalBooks: 0, totalCopies: 0, totalReaders: 0, totalBorrows: 0 };
    let pendingSupaStaffAuth = null;

    function getSavedReaderCred() {
      try {
        const raw = localStorage.getItem(READER_AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }
    function setSavedReaderCred(cred) {
      try {
        if (cred) localStorage.setItem(READER_AUTH_KEY, JSON.stringify(cred));
        else localStorage.removeItem(READER_AUTH_KEY);
      } catch (e) {}
    }

    function mapBookFromDB(row) {
      if (!row) return null;
      return {
        id: Number(row.id),
        code: cleanNullText(row.code),
        title: cleanNullText(row.title),
        author: cleanNullText(row.author),
        category: cleanNullText(row.category, 'Chưa phân loại'),
        publisher: cleanNullText(row.publisher),
        shelf: cleanNullText(row.shelf),
        total: Number(row.total) || 0,
        available: Number(row.available) || 0,
        featured: Boolean(row.featured),
        desc: cleanNullText(row.description ?? row.desc),
        publishYear: cleanNullText(row.publish_year ?? row.publishYear),
        pages: cleanNullText(row.pages)
      };
    }

    function mapBookToDB(b) {
      const total = Math.max(0, Number(b.total) || 0);
      const available = Math.min(total, Math.max(0, Number(b.available) || 0));
      return {
        code: sanitizeText(b.code).toUpperCase(),
        title: sanitizeText(b.title),
        author: sanitizeText(b.author || ''),
        category: sanitizeText(b.category || 'Chưa phân loại'),
        publisher: sanitizeText(b.publisher || ''),
        shelf: sanitizeText(b.shelf || ''),
        total,
        available,
        featured: Boolean(b.featured),
        description: sanitizeText(b.desc || ''),
        publish_year: sanitizeText(b.publishYear || ''),
        pages: sanitizeText(b.pages || '')
      };
    }

    function mapReaderFromDB(row) {
      if (!row) return null;
      return {
        id: Number(row.id),
        cardCode: cleanNullText(row.card_code ?? row.cardCode),
        fullName: cleanNullText(row.full_name ?? row.fullName),
        gender: cleanNullText(row.gender, 'Nam'),
        birthDate: cleanNullText(row.birth_date ?? row.birthDate),
        group: cleanNullText(row.group_name ?? row.group),
        email: cleanNullText(row.email),
        phone: cleanNullText(row.phone),
        password: cleanNullText(row.password_hash ?? row.password, '123456'),
        status: row.status === 'locked' ? 'locked' : 'active',
        schoolYear: cleanNullText(row.school_year ?? row.schoolYear, '2026-2027'),
        userType: cleanNullText(row.user_type ?? row.userType, ''),
        classesHistory: row.classes_history || row.classesHistory || {}
      };
    }

    function mapReaderToDB(u) {
      return {
        card_code: cleanNullText(u.cardCode).toUpperCase(),
        full_name: sanitizeText(u.fullName),
        gender: cleanNullText(u.gender, 'Nam'),
        birth_date: cleanNullText(u.birthDate),
        group_name: sanitizeText(u.group || ''),
        email: sanitizeText(u.email || ''),
        phone: sanitizeText(u.phone || ''),
        password_hash: u.password && String(u.password).startsWith('sha256$') ? u.password : hashPassword(u.password || '123456'),
        status: u.status === 'locked' ? 'locked' : 'active',
        school_year: cleanNullText(u.schoolYear, '2026-2027'),
        user_type: u.userType || getUserType(u),
        classes_history: u.classesHistory || {}
      };
    }

    function mapBorrowFromDB(row) {
      if (!row) return null;
      return {
        id: Number(row.id),
        ticketCode: cleanNullText(row.ticket_code ?? row.ticketCode),
        userId: Number(row.reader_id ?? row.userId),
        bookId: Number(row.book_id ?? row.bookId),
        schoolYear: cleanNullText(row.school_year ?? row.schoolYear, '2026-2027'),
        borrowDate: cleanNullText(row.borrow_date ?? row.borrowDate),
        dueDate: cleanNullText(row.due_date ?? row.dueDate),
        returnDate: row.return_date ?? row.returnDate ?? null,
        status: cleanNullText(row.status, 'borrowing'),
        renewed: Boolean(row.renewed),
        processedBy: cleanNullText(row.processed_by_name ?? row.processedBy),
        returnedBy: cleanNullText(row.returned_by_name ?? row.returnedBy)
      };
    }

    function mapStaffFromDB(row) {
      if (!row) return null;
      return {
        id: Number(row.id),
        authUserId: row.auth_user_id || null,
        username: cleanNullText(row.username),
        fullName: cleanNullText(row.full_name ?? row.fullName),
        email: cleanNullText(row.email),
        phone: cleanNullText(row.phone),
        role: row.role || 'librarian',
        roleTitle: cleanNullText(row.role_title, row.role === 'super_admin' ? 'Quản Trị Trưởng' : 'Thủ thư'),
        status: row.status === 'locked' ? 'locked' : 'active',
        permissions: row.permissions || {}
      };
    }

    async function fetchAllRows(table, orderCol = 'id', ascending = true) {
      const PAGE_SIZE = 1000;
      let all = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabaseClient
          .from(table)
          .select('*')
          .order(orderCol, { ascending })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return all;
    }

    async function upsertInChunks(table, rows, conflictCol, chunkSize = 400) {
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabaseClient.from(table).upsert(chunk, { onConflict: conflictCol });
        if (error) throw error;
      }
    }

    // Chữ ký phiên đăng nhập chống sửa quyền role='admin' hoặc nâng quyền Thủ thư qua F12
    function computeSessionSignature(userObj, dbRef) {
      const targetDb = dbRef || db;
      if (!userObj || !targetDb) return '';
      if (userObj.role === 'admin') {
        if (userObj.authUserId) {
          const permStr = JSON.stringify(userObj.permissions || {});
          return sha256Hex(`SIG_SUPA_STAFF::${userObj.authUserId}::${userObj.isSuperAdmin ? 'SA' : 'LIB'}::${permStr}`);
        }
        if (userObj.isStaff) {
          const staff = (targetDb.staffAccounts || []).find(s => s.id === userObj.staffId || String(s.username).toUpperCase() === String(userObj.username).toUpperCase());
          if (!staff || staff.status === 'locked') return 'INVALID_STAFF_SIG';
          const permStr = JSON.stringify(staff.permissions || {});
          return sha256Hex(`SIG_STAFF::${staff.username}::${hashPassword(staff.password)}::${permStr}`);
        }
        const adminPassHash = hashPassword(targetDb.adminAccount?.password || 'admin123');
        return sha256Hex(`SIG_SUPER_ADMIN::${targetDb.adminAccount?.username || 'ADMIN'}::${adminPassHash}`);
      } else {
        const cred = getSavedReaderCred();
        if (cred && String(cred.cardCode).toUpperCase() === String(userObj.cardCode).toUpperCase()) {
          return sha256Hex(`SIG_READER_RPC::${userObj.cardCode}::${cred.passHash}`);
        }
        const found = (targetDb.users || []).find(u => u.id === userObj.id || u.cardCode === userObj.cardCode);
        const readerPassHash = hashPassword(found ? found.password : '123456');
        return sha256Hex(`SIG_READER::${userObj.cardCode}::${readerPassHash}`);
      }
    }
    function verifySessionIntegrity(userObj, dbRef) {
      if (!userObj) return null;
      const expectedSig = computeSessionSignature(userObj, dbRef);
      if (!userObj.sessionSig || userObj.sessionSig !== expectedSig) {
        try { localStorage.removeItem(SESSION_USER_KEY); } catch (e) {}
        return null;
      }
      return userObj;
    }

    function migrateSecurityDB(parsed) {
      if (!parsed) return parsed;
      if (!parsed.adminAccount) parsed.adminAccount = JSON.parse(JSON.stringify(INITIAL_DB.adminAccount));
      parsed.adminAccount.password = hashPassword(parsed.adminAccount.password || 'admin123');
      parsed.adminAccount.username = sanitizeText(parsed.adminAccount.username || 'ADMIN');
      parsed.adminAccount.fullName = sanitizeText(parsed.adminAccount.fullName || 'Quản Trị');
      parsed.adminAccount.email = sanitizeText(parsed.adminAccount.email || 'longnv@pct.edu.vn');
      if (parsed.adminAccount.twoFactorEnabled === undefined) parsed.adminAccount.twoFactorEnabled = true;
      if (parsed.productionMode === undefined) parsed.productionMode = true;

      const defaultHash = hashPassword('123456');
      parsed.users = (parsed.users || []).map(u => {
        let p = String(u.password || '').trim();
        if (!p || p === EMPTY_PASSWORD_HASH || p === '123456' || p === '********' || p === 'null' || p === 'undefined') {
          p = defaultHash;
        } else if (!p.startsWith('sha256$')) {
          p = hashPassword(p);
        }
        return {
          ...u,
          cardCode: cleanNullText(u.cardCode),
          fullName: cleanNullText(u.fullName),
          gender: cleanNullText(u.gender, 'Nam'),
          birthDate: cleanNullText(u.birthDate),
          group: cleanNullText(u.group),
          email: cleanNullText(u.email),
          phone: cleanNullText(u.phone),
          password: p,
          schoolYear: cleanNullText(u.schoolYear, '2026-2027')
        };
      });

      parsed.books = (parsed.books || []).map(b => ({
        ...b,
        code: sanitizeText(b.code),
        title: sanitizeText(b.title),
        author: sanitizeText(b.author),
        category: sanitizeText(b.category),
        publisher: sanitizeText(b.publisher || ''),
        shelf: sanitizeText(b.shelf || '')
      }));

      return parsed;
    }

    let db = loadLocalDB();

    function loadSessionUser(dbRef) {
      try {
        const raw = localStorage.getItem(SESSION_USER_KEY);
        if (!raw) return null;
        const parsedUser = JSON.parse(raw);
        return verifySessionIntegrity(parsedUser, dbRef);
      } catch {
        return null;
      }
    }

    function saveSessionUser(userObj) {
      if (userObj) {
        userObj.sessionSig = computeSessionSignature(userObj, db);
        db.currentUser = userObj;
        try { localStorage.setItem(SESSION_USER_KEY, JSON.stringify(userObj)); } catch (e) {}
      } else {
        db.currentUser = null;
        try { localStorage.removeItem(SESSION_USER_KEY); } catch (e) {}
      }
    }

    function loadLocalDB() {
      let raw = null;
      try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) {}
      let parsed = null;
      if (raw) {
        try { parsed = JSON.parse(raw); } catch { parsed = null; }
      }
      if (!parsed || !parsed.books) {
        parsed = JSON.parse(JSON.stringify(INITIAL_DB));
      }
      migrateSecurityDB(parsed);
      parsed.currentUser = loadSessionUser(parsed);
      return parsed;
    }

    async function saveDB(changedSection = 'ALL') {
      migrateSecurityDB(db);
      const toStore = isCloudConnected
        ? {
            currentSchoolYear: db.currentSchoolYear,
            finePerDay: db.finePerDay,
            productionMode: Boolean(db.productionMode),
            adminAccount: { ...db.adminAccount, password: '' },
            books: db.books.slice(0, 500),
            users: [],
            borrows: []
          }
        : {
            currentSchoolYear: db.currentSchoolYear,
            finePerDay: db.finePerDay,
            productionMode: Boolean(db.productionMode),
            adminAccount: db.adminAccount,
            staffAccounts: db.staffAccounts || [],
            books: db.books,
            users: db.users,
            borrows: db.borrows
          };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch (e) {
        if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
          console.warn('SmartLib: Bộ nhớ đệm localStorage đã đầy (>5MB). Dữ liệu vẫn được lưu trên Supabase Cloud.');
        }
      }
      renderAll();

      if (isCloudConnected && supabaseClient && (changedSection === 'ALL' || changedSection === 'settings')) {
        try {
          const isSuperAdmin = db.currentUser && db.currentUser.role === 'admin' && db.currentUser.isSuperAdmin && verifySessionIntegrity(db.currentUser, db);
          if (isSuperAdmin) {
            const { error } = await supabaseClient.from('library_settings').upsert({
              id: 1,
              current_school_year: db.currentSchoolYear || '2026-2027',
              fine_per_day: Number(db.finePerDay) || 5000,
              production_mode: Boolean(db.productionMode),
              admin_email: db.adminAccount?.email || 'vulongdng@gmail.com',
              two_factor_enabled: db.adminAccount?.twoFactorEnabled !== false,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
            if (error) console.error('Lỗi cập nhật library_settings:', error);
          }
        } catch (err) {
          console.error('Lỗi kết nối Cloud:', err);
        }
      }
    }

    async function restoreAuthSessionFromSupabase() {
      if (!supabaseClient) return;
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
          const { data: staffRow, error } = await supabaseClient
            .from('staff_accounts')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          if (!error && staffRow && staffRow.status === 'active') {
            const isSuper = staffRow.role === 'super_admin';
            saveSessionUser({
              role: 'admin',
              isSuperAdmin: isSuper,
              isStaff: !isSuper,
              authUserId: session.user.id,
              staffId: staffRow.id,
              username: staffRow.username,
              fullName: staffRow.full_name,
              roleTitle: staffRow.role_title || (isSuper ? 'Quản Trị Trưởng' : 'Thủ thư'),
              permissions: staffRow.permissions || {}
            });
            return;
          }
        }

        // Nếu không phải phiên Staff Auth -> kiểm tra phiên Độc giả
        const readerCred = getSavedReaderCred();
        if (readerCred && readerCred.cardCode && readerCred.passHash) {
          const { data: res, error } = await supabaseClient.rpc('reader_login_and_fetch', {
            p_card_code: readerCred.cardCode,
            p_password_hash: readerCred.passHash,
            p_plain_is_default: Boolean(readerCred.isDefaultInput)
          });
          if (!error && res && res.success) {
            db.users = [res.reader];
            db.borrows = res.borrows || [];
            saveSessionUser({
              role: 'reader',
              id: res.reader.id,
              cardCode: res.reader.cardCode,
              fullName: res.reader.fullName
            });
            return;
          } else {
            setSavedReaderCred(null);
            saveSessionUser(null);
          }
        } else if (db.currentUser && db.currentUser.authUserId) {
          saveSessionUser(null);
        }
      } catch (err) {
        console.error('Lỗi khôi phục phiên đăng nhập:', err);
      }
    }

    async function initCloudConnection() {
      const badge = document.getElementById('cloudStatusBadge');
      if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || !window.supabase) {
        isCloudConnected = false;
        if (badge) {
          badge.className = 'inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Chế độ Offline (Local)';
        }
        return;
      }

      try {
        supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        await restoreAuthSessionFromSupabase();
        await syncFromCloud(false);
      } catch (err) {
        console.error('Không thể khởi tạo Supabase:', err);
      }
    }

    async function syncFromCloud(showNotification = false) {
      const badge = document.getElementById('cloudStatusBadge');
      if (!supabaseClient) return;

      try {
        // 1. Đọc cấu hình công khai + Kho sách (RLS cho phép mọi người xem sách)
        const [settingsRes, bookRows, statsRes, sessionRes] = await Promise.all([
          supabaseClient.from('library_settings').select('*').eq('id', 1).maybeSingle(),
          fetchAllRows('books', 'id', true),
          supabaseClient.rpc('get_public_library_stats'),
          supabaseClient.auth.getSession()
        ]);

        if (settingsRes.error) throw settingsRes.error;

        isCloudConnected = true;
        if (badge) {
          badge.className = 'inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Cloud: Đã kết nối (RLS)';
        }

        if (settingsRes.data) {
          db.currentSchoolYear = settingsRes.data.current_school_year || db.currentSchoolYear || '2026-2027';
          db.finePerDay = settingsRes.data.fine_per_day ?? db.finePerDay;
          db.productionMode = settingsRes.data.production_mode !== undefined ? Boolean(settingsRes.data.production_mode) : db.productionMode;
          if (!db.adminAccount) db.adminAccount = {};
          db.adminAccount.email = settingsRes.data.admin_email || db.adminAccount.email || 'vulongdng@gmail.com';
          db.adminAccount.twoFactorEnabled = settingsRes.data.two_factor_enabled !== undefined ? Boolean(settingsRes.data.two_factor_enabled) : true;
        }

        db.books = (bookRows || []).map(mapBookFromDB).filter(Boolean);

        if (!statsRes.error && statsRes.data) {
          publicStatsCache = {
            totalBooks: Number(statsRes.data.totalBooks) || db.books.length,
            totalCopies: Number(statsRes.data.totalCopies) || 0,
            totalReaders: Number(statsRes.data.totalReaders) || 0,
            totalBorrows: Number(statsRes.data.totalBorrows) || 0
          };
        }

        const session = sessionRes?.data?.session || null;
        if (session && session.user && db.currentUser && db.currentUser.role === 'admin') {
          // 2A. Đang đăng nhập Admin / Thủ thư (Supabase Auth) -> Tải đủ bảng readers, borrows, staff_accounts
          const [readerRows, borrowRows] = await Promise.all([
            fetchAllRows('readers', 'id', true),
            fetchAllRows('borrows', 'id', false)
          ]);
          db.users = (readerRows || []).map(mapReaderFromDB).filter(Boolean);
          db.borrows = (borrowRows || []).map(mapBorrowFromDB).filter(Boolean);

          if (db.currentUser.isSuperAdmin) {
            const { data: staffRows } = await supabaseClient.from('staff_accounts').select('*').order('id', { ascending: true });
            if (Array.isArray(staffRows)) {
              const supaAdminRow = staffRows.find(s => s.role === 'super_admin');
              if (supaAdminRow) {
                db.adminAccount.username = supaAdminRow.username || 'ADMIN';
                db.adminAccount.fullName = supaAdminRow.full_name || 'Quản Trị';
                db.adminAccount.email = db.adminAccount.email || supaAdminRow.email;
              }
              db.staffAccounts = staffRows.filter(s => s.role !== 'super_admin').map(mapStaffFromDB).filter(Boolean);
            }
          } else {
            db.staffAccounts = [];
          }
        } else if (db.currentUser && db.currentUser.role === 'reader') {
          // 2B. Đang đăng nhập Độc giả -> Chỉ đồng bộ đúng hồ sơ & phiếu mượn của độc giả này
          const cred = getSavedReaderCred();
          if (cred && cred.cardCode && cred.passHash) {
            const { data: rData } = await supabaseClient.rpc('reader_login_and_fetch', {
              p_card_code: cred.cardCode,
              p_password_hash: cred.passHash,
              p_plain_is_default: Boolean(cred.isDefaultInput)
            });
            if (rData && rData.success) {
              db.users = [rData.reader];
              db.borrows = rData.borrows || [];
            }
          }
        } else {
          // 2C. Khách vãng lai -> Không tải dữ liệu cá nhân học sinh & phiếu mượn
          db.users = [];
          db.borrows = [];
          db.staffAccounts = [];
        }

        migrateSecurityDB(db);
        if (db.currentUser) {
          saveSessionUser(db.currentUser);
        }

        renderAll();
        if (showNotification) {
          const readerCount = db.users.length || publicStatsCache.totalReaders;
          showToast(`Đã đồng bộ từ Cloud (${db.books.length} sách, ${readerCount} độc giả)!`);
        }
      } catch (err) {
        console.error('Lỗi syncFromCloud:', err);
        isCloudConnected = false;
        if (badge) {
          badge.className = 'inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Lỗi kết nối Cloud';
        }
        if (showNotification) showNoticeModal('Lỗi kết nối Cloud', 'Không thể tải dữ liệu từ Supabase! Hãy kiểm tra lại URL, Key và cấu hình RLS.');
      }
    }

    function openCloudConfigModal() {
      document.getElementById('inputSupabaseUrl').value = SUPABASE_CONFIG.url;
      document.getElementById('inputSupabaseKey').value = SUPABASE_CONFIG.anonKey;
      document.getElementById('cloudConfigModal').classList.remove('hidden');
    }

    function closeCloudConfigModal() {
      document.getElementById('cloudConfigModal').classList.add('hidden');
    }

    async function saveCloudConfigForm(e) {
      e.preventDefault();
      SUPABASE_CONFIG.url = document.getElementById('inputSupabaseUrl').value.trim();
      SUPABASE_CONFIG.anonKey = document.getElementById('inputSupabaseKey').value.trim();
      try { localStorage.setItem('SMARTLIB_SB_URL', SUPABASE_CONFIG.url); localStorage.setItem('SMARTLIB_SB_KEY', SUPABASE_CONFIG.anonKey); } catch (e) {}
      closeCloudConfigModal();
      await initCloudConnection();
      showToast('Đã lưu cấu hình và kết nối Supabase Cloud!');
    }

    async function pushLocalDBToCloud() {
      if (!isCloudConnected || !supabaseClient) {
        showNoticeModal('Chưa kết nối Cloud', 'Vui lòng nhập URL, Key và bấm "Lưu & Kết nối" trước!');
        return;
      }
      if (!db.currentUser || db.currentUser.role !== 'admin') {
        showNoticeModal('Yêu cầu quyền Quản trị', 'Vui lòng đăng nhập tài khoản Admin trước khi đồng bộ lên Cloud!');
        return;
      }
      try {
        showToast('Đang đồng bộ dữ liệu theo lô lên Supabase...');
        if (db.books.length > 0) {
          await upsertInChunks('books', db.books.map(mapBookToDB), 'code');
        }
        if (db.users.length > 0) {
          await upsertInChunks('readers', db.users.map(mapReaderToDB), 'card_code');
        }
        await saveDB('settings');
        await syncFromCloud(false);
        closeCloudConfigModal();
        showToast(`Đã đồng bộ ${db.books.length} sách và ${db.users.length} độc giả lên Cloud!`);
      } catch (err) {
        showNoticeModal('Lỗi đồng bộ Cloud', err.message || 'Không thể đẩy dữ liệu lên Supabase!');
      }
    }

