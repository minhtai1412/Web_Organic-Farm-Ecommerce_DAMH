-- 1. Quyền & Vai trò
INSERT INTO Quyen (Ma_quyen, Ten_quyen, Mo_ta) VALUES
(1, 'manage_users_roles', 'Quản lý người dùng và phân quyền hệ thống'),
(2, 'view_admin_reports', 'Xem báo cáo doanh thu, hao hụt, khách quay lại'),
(3, 'manage_farm_season', 'Quản lý mùa vụ và lô canh tác'),
(4, 'manage_farming_log', 'Cập nhật nhật ký canh tác, ảnh/video, kiểm định'),
(5, 'manage_batch_qr', 'Tạo lô hàng, mã QR truy xuất và chứng nhận'),
(6, 'manage_inventory_loss', 'Ghi nhận hao hụt, xuất hủy tồn kho theo lô'),
(7, 'confirm_dispatch_order', 'Xác nhận đơn hàng và điều phối giao nhận'),
(8, 'manage_flash_sale', 'Cấu hình chương trình Flash Sale cho lô cận hạn'),
(9, 'handle_complaints', 'Tiếp nhận khiếu nại, duyệt hoàn tiền hoặc tạo đơn giao bù'),
(10, 'place_order_subscription', 'Đặt mua lẻ, đăng ký gói định kỳ, dùng điểm, khiếu nại');

INSERT INTO Vai_tro (Ma_vai_tro, Ten_vai_tro, Mo_ta) VALUES
(1, 'Admin', 'Quản trị viên toàn hệ thống'),
(2, 'Sales', 'Nhân viên Bán hàng và Chăm sóc khách hàng'),
(3, 'Farm_Staff', 'Nhân viên Nông trại (cô lập quyền doanh thu & dữ liệu khách)'),
(4, 'Customer', 'Khách hàng thành viên');

INSERT INTO Vai_tro_quyen (Ma_vai_tro, Ma_quyen) VALUES
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),
(2,7),(2,8),(2,9),
(3,3),(3,4),(3,5),(3,6),
(4,10);

INSERT INTO Vai_tro_quyen (Ma_vai_tro, Ma_quyen)
SELECT vt.Ma_vai_tro, q.Ma_quyen
FROM Vai_tro AS vt
CROSS JOIN Quyen AS q
WHERE (vt.Ten_vai_tro = 'Admin' AND q.Ten_quyen IN (
    'view_revenue', 'view_financial_reports', 'view_customers', 'manage_customers'
))
OR (vt.Ten_vai_tro = 'Sales' AND q.Ten_quyen IN ('view_customers', 'manage_customers'));

-- 2. Người dùng & Địa chỉ giao hàng (Mật khẩu mẫu đều là 'password')
INSERT INTO Nguoi_dung (Ma_nguoi_dung, Ma_vai_tro, Ho_ten, Email, So_dien_thoai, Mat_khau_ma_hoa, Trang_thai) VALUES
(1, 1, 'Nguyễn Minh Quản Trị', 'admin@nongsansach.vn', '0901000001', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Hoat_dong'),
(2, 2, 'Trần Thị Thu Hà (Sales)', 'sales.ha@nongsansach.vn', '0901000002', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Hoat_dong'),
(3, 3, 'Lê Văn Nông (Farm Staff)', 'farm.nong@nongsansach.vn', '0901000003', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Hoat_dong'),
(4, 3, 'Phạm Hoàng Kỹ Thuật (Farm Staff)', 'farm.kythuat@nongsansach.vn', '0901000004', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Hoat_dong'),
(5, 4, 'Đặng Ngọc Anh', 'ngocanh.khach@gmail.com', '0912345678', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Hoat_dong'),
(6, 4, 'Võ Quốc Bảo', 'quocbao.khach@gmail.com', '0987654321', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Hoat_dong');

INSERT INTO Dia_chi_giao_hang (Ma_dia_chi, Ma_nguoi_dung, Ten_nguoi_nhan, So_dien_thoai_nguoi_nhan, Dia_chi_chi_tiet, Phuong_xa, Quan_huyen, Tinh_thanh, Vi_do, Kinh_do, La_mac_dinh) VALUES
(1, 5, 'Đặng Ngọc Anh', '0912345678', '120 Nguyễn Đình Chiểu', 'Phường Võ Thị Sáu', 'Quận 3', 'TP. Hồ Chí Minh', 10.7825400, 106.6934200, 1),
(2, 5, 'Đặng Ngọc Anh (Cơ quan)', '0912345678', '45 Lê Duẩn', 'Phường Bến Nghé', 'Quận 1', 'TP. Hồ Chí Minh', 10.7812300, 106.7001500, 0),
(3, 6, 'Võ Quốc Bảo', '0987654321', '88 Phan Xích Long', 'Phường 2', 'Quận Phú Nhuận', 'TP. Hồ Chí Minh', 10.7981200, 106.6873100, 1);

-- 3. Nông trại, Hình ảnh, Kiểm định & Danh mục - Sản phẩm
INSERT INTO Nong_trai (Ma_nong_trai, Ten_nong_trai, Dia_chi, Vi_do, Kinh_do, Cau_chuyen_thuong_hieu, Triet_ly_canh_tac, Ho_so_nang_luc) VALUES
(1, 'Nông Trại Xanh Củ Chi', 'Ấp 3, Xã Nhuận Đức, Huyện Củ Chi, TP. Hồ Chí Minh', 10.9985000, 106.5123000,
 'Nông Trại Xanh Củ Chi ra đời từ ước mơ mang nguồn nông sản sạch đúng nghĩa từ vườn nhà đến thẳng mâm cơm mỗi gia đình Việt. Trên vùng đất Nhuận Đức, Củ Chi đầy nắng gió, đội ngũ kỹ sư và nông dân bản địa của XanhFarm kiên định theo đuổi quy tắc canh tác 6 Không: không thuốc trừ sâu hóa học, không phân bón tổng hợp, không chất kích thích tăng trưởng, không giống biến đổi gen, không chất bảo quản và không giấu giếm nguồn gốc. Với quy mô 12 hecta nhà màng công nghệ cao đạt chuẩn VietGAP, từng luống rau được chăm sóc thuận tự nhiên bằng hệ vi sinh bản địa, thu hoạch lúc rạng sáng và vận chuyển đến tận bếp nhà bạn trong vòng 6 giờ kèm mã QR minh bạch toàn bộ nhật ký trồng trọt lẫn giấy kiểm định chất lượng.',
 'Canh tác 6 không: Không thuốc trừ sâu hóa học, không phân bón vô cơ, không chất kích thích tăng trưởng, không biến đổi gen, không chất bảo quản, không thuốc diệt cỏ.',
 'Quy mô 12 ha nhà màng công nghệ cao tại Củ Chi, đạt chuẩn VietGAP và Hữu cơ TCVN 11041.');

INSERT INTO Hinh_anh_nong_trai (Ma_hinh_anh, Ma_nong_trai, Duong_dan, Mo_ta, Thu_tu) VALUES
(1, 1, '/uploads/farms/cuchi_nhamang_01.jpg', 'Khu nhà màng trồng xà lách thủy canh hữu cơ', 1),
(2, 1, '/uploads/farms/cuchi_soche_02.jpg', 'Khu vực đóng gói và dán tem QR truy xuất', 2),
(3, 1, '/uploads/farms/cuchi_vuon_03.jpg', 'Toàn cảnh khu vườn canh tác hữu cơ Củ Chi', 3);

INSERT INTO Ket_qua_kiem_dinh (Ma_kiem_dinh, Ma_nong_trai, Loai_mau, Ngay_kiem_dinh, Ket_qua, Tep_scan, Ghi_chu) VALUES
(1, 1, 'Dat', '2026-10-01', 'Đạt chuẩn QCVN 03-MT:2015/BTNMT - Không tồn dư kim loại nặng', '/uploads/labs/kiem_dinh_dat_q4_2026.pdf', 'Kiểm định mẫu đất định kỳ Quý IV/2026'),
(2, 1, 'Nuoc', '2026-10-01', 'Đạt chuẩn QCVN 08-MT:2015/BTNMT - Nguồn nước tưới sạch', '/uploads/labs/kiem_dinh_nuoc_q4_2026.pdf', 'Mẫu nước giếng khoan đã qua lọc RO');

INSERT INTO Danh_muc (Ma_danh_muc, Ten_danh_muc, Mo_ta) VALUES
(1, 'Rau ăn lá hữu cơ', 'Các loại rau xanh thu hoạch trong ngày, tươi giòn tự nhiên'),
(2, 'Củ quả sạch', 'Củ quả giàu dinh dưỡng trồng theo quy trình VietGAP / Hữu cơ'),
(3, 'Trái cây nhà màng', 'Trái cây canh tác công nghệ cao, thu hoạch chín cây tự nhiên'),
(4, 'Rau gia vị & Thảo mộc', 'Rau thơm, thảo mộc hữu cơ không thuốc bảo vệ thực vật');

INSERT INTO San_pham (Ma_san_pham, Ma_danh_muc, Ma_nong_trai, Ten_san_pham, Mo_ta, Don_vi_tinh, Gia_ban, Hinh_anh_dai_dien, Ty_le_tich_diem, Trang_thai) VALUES
(1, 1, 1, 'Xà lách Romaine hữu cơ', 'Xà lách lá giòn ngọt, trồng nhà màng không thuốc trừ sâu', 'kg', 35000.00, '/uploads/products/xa_lach_romaine.jpg', 2.00, 'Dang_ban'),
(2, 2, 1, 'Cà chua Beef hữu cơ', 'Cà chua quả to, thịt dày, ít hạt, giàu Lycopene', 'kg', 45000.00, '/uploads/products/ca_chua_beef.jpg', 1.50, 'Dang_ban'),
(3, 1, 1, 'Cải bó xôi Baby', 'Cải bó xôi non mềm, giàu sắt và vitamin', 'kg', 40000.00, '/uploads/products/cai_bo_xoi.jpg', 2.00, 'Dang_ban'),
(4, 3, 1, 'Dưa lưới Taki nhà màng', 'Dưa lưới ruột cam giòn ngọt, trồng giá thể hữu cơ tại nhà màng', 'quả ~1.5kg', 120000.00, '/uploads/products/dua_luoi_taki.jpg', 3.00, 'Dang_ban'),
(5, 2, 1, 'Cà rốt Baby hữu cơ', 'Cà rốt củ nhỏ ngọt tự nhiên, không hóa chất', 'kg', 38000.00, '/uploads/products/ca_rot_baby.jpg', 1.00, 'Dang_ban'),
(6, 4, 1, 'Húng quế hữu cơ', 'Rau thơm tinh dầu đậm, hái sáng sớm', 'bó 200g', 15000.00, '/uploads/products/hung_que.jpg', 1.00, 'Dang_ban'),
(7, 1, 1, 'Cải Kale hữu cơ', 'Cải xoăn Kale trồng nhà màng, giàu chất xơ và chất chống oxy hóa', 'kg', 65000.00, '/uploads/products/cai_kale.jpg', 2.00, 'Dang_ban'),
(8, 1, 1, 'Rau muống nước hữu cơ', 'Rau muống cọng giòn xanh non, canh tác sạch không hóa chất', 'bó 500g', 22000.00, '/uploads/products/rau_muong.jpg', 1.00, 'Dang_ban'),
(9, 1, 1, 'Cải ngọt hữu cơ', 'Cải ngọt lá xanh mướt, vị thanh mát tự nhiên', 'kg', 28000.00, '/uploads/products/cai_ngot.jpg', 1.00, 'Dang_ban'),
(10, 2, 1, 'Dưa leo Baby nhà màng', 'Dưa leo trái nhỏ giòn ngọt, ít hạt, ăn sống trực tiếp', 'kg', 42000.00, '/uploads/products/dua_leo_baby.jpg', 1.50, 'Dang_ban'),
(11, 2, 1, 'Bí đỏ Nhật hữu cơ', 'Bí đỏ thịt dẻo bùi ngọt đậm, giàu beta-carotene', 'kg', 52000.00, '/uploads/products/bi_do_nhat.jpg', 1.50, 'Dang_ban'),
(12, 2, 1, 'Khoai lang mật Đà Lạt', 'Khoai lang ruột vàng dẻo thơm, nướng lên tươm mật tự nhiên', 'kg', 48000.00, '/uploads/products/khoai_lang_mat.jpg', 1.50, 'Dang_ban'),
(13, 3, 1, 'Dâu tây giống Nhật nhà màng', 'Dâu tây trồng giá thể công nghệ cao, trái đỏ mọng thơm ngọt', 'hộp 500g', 145000.00, '/uploads/products/dau_tay_nhat.jpg', 3.00, 'Dang_ban'),
(14, 3, 1, 'Cà chua bi mật nhà màng', 'Cà chua bi chín cây vỏ mỏng, ngọt đậm, giàu vitamin C', 'hộp 500g', 58000.00, '/uploads/products/ca_chua_bi.jpg', 2.00, 'Dang_ban'),
(15, 4, 1, 'Hành lá hữu cơ', 'Hành lá thơm nồng, trồng đất sạch xử lý vi sinh', 'bó 200g', 16000.00, '/uploads/products/hanh_la.jpg', 1.00, 'Dang_ban'),
(16, 4, 1, 'Bạc hà hữu cơ', 'Lá bạc hà tươi mát giàu tinh dầu, thích hợp pha trà và nấu ăn', 'bó 150g', 18000.00, '/uploads/products/bac_ha.jpg', 1.00, 'Dang_ban');

-- 4. Mùa vụ, Lô canh tác, Nhật ký, Lô hàng, QR & Chứng nhận
INSERT INTO Mua_vu (Ma_mua_vu, Ma_nong_trai, Ten_mua_vu, Ngay_bat_dau, Ngay_ket_thuc, Trang_thai) VALUES
(1, 1, 'Vụ Thu Đông 2026 - Khu Nhà Màng A', '2026-09-15', '2026-12-30', 'Dang_dien_ra'),
(2, 1, 'Vụ Đông Xuân 2026 - Khu Vườn Hữu Cơ B', '2026-10-15', '2027-02-15', 'Dang_dien_ra');

INSERT INTO Lo_canh_tac (Ma_lo_canh_tac, Ma_mua_vu, Ma_san_pham, Ten_lo, Dien_tich, Ngay_gieo_trong, Trang_thai) VALUES
(1, 1, 1, 'Lô A01 - Xà lách Romaine', 1200.00, '2026-10-01', 'Da_thu_hoach'),
(2, 1, 2, 'Lô A02 - Cà chua Beef', 1500.00, '2026-09-20', 'Da_thu_hoach'),
(3, 1, 3, 'Lô A03 - Cải bó xôi Baby', 800.00, '2026-10-12', 'Da_thu_hoach'),
(4, 1, 5, 'Lô A04 - Cà rốt Baby', 1000.00, '2026-09-25', 'Da_thu_hoach'),
(5, 2, 7, 'Lô B01 - Cải Kale hữu cơ', 900.00, '2026-10-18', 'Da_thu_hoach'),
(6, 2, 8, 'Lô B02 - Rau muống nước hữu cơ', 700.00, '2026-10-20', 'Da_thu_hoach'),
(7, 2, 9, 'Lô B03 - Cải ngọt hữu cơ', 850.00, '2026-10-21', 'Da_thu_hoach'),
(8, 2, 10, 'Lô B04 - Dưa leo Baby nhà màng', 1100.00, '2026-10-10', 'Da_thu_hoach'),
(9, 2, 11, 'Lô B05 - Bí đỏ Nhật hữu cơ', 1400.00, '2026-09-18', 'Da_thu_hoach'),
(10, 2, 12, 'Lô B06 - Khoai lang mật Đà Lạt', 1300.00, '2026-09-15', 'Da_thu_hoach'),
(11, 2, 13, 'Lô B07 - Dâu tây giống Nhật', 950.00, '2026-09-22', 'Da_thu_hoach'),
(12, 2, 14, 'Lô B08 - Cà chua bi mật', 1000.00, '2026-10-05', 'Da_thu_hoach'),
(13, 2, 15, 'Lô B09 - Hành lá hữu cơ', 500.00, '2026-10-24', 'Da_thu_hoach');

INSERT INTO Nhat_ky_canh_tac (Ma_nhat_ky, Ma_lo_canh_tac, Ma_nhan_vien, Loai_hoat_dong, Thoi_gian_thuc_hien, Noi_dung) VALUES
(1, 1, 3, 'Gieo_hat', '2026-10-01 07:30:00', 'Gieo hạt giống xà lách Romaine F1 lên khay xơ dừa đã xử lý vi sinh.'),
(2, 1, 3, 'Bon_phan', '2026-10-15 08:00:00', 'Bón phân trùn quế hữu cơ và bổ sung dịch chuối ủ vi sinh.'),
(3, 1, 3, 'Tuoi_tieu', '2026-10-28 06:30:00', 'Tưới phun sương tự động bằng nước đạt chuẩn QCVN.'),
(4, 1, 3, 'Thu_hoach', '2026-11-10 05:30:00', 'Thu hoạch đợt 1 đạt 100 kg xà lách tươi chuẩn loại 1.'),
(5, 2, 4, 'Bon_phan', '2026-10-10 09:00:00', 'Bón phân hữu cơ vi sinh kết hợp chế phẩm nấm đối kháng Trichoderma.'),
(6, 2, 4, 'Thu_hoach', '2026-11-11 06:00:00', 'Thu hoạch 120 kg cà chua Beef chín đỏ tự nhiên.');

INSERT INTO Tep_nhat_ky (Ma_tep, Ma_nhat_ky, Loai_tep, Duong_dan, Mo_ta) VALUES
(1, 1, 'Hinh_anh', '/uploads/logs/lo_a01_gieo_hat.jpg', 'Khay ươm hạt giống ngày đầu tiên'),
(2, 2, 'Hinh_anh', '/uploads/logs/lo_a01_bon_phan.jpg', 'Bón phân hữu cơ trùn quế'),
(3, 3, 'Video', '/uploads/logs/lo_a01_tuoi_tieu.mp4', 'Video hệ thống tưới phun sương tự động'),
(4, 4, 'Hinh_anh', '/uploads/logs/lo_a01_thu_hoach.jpg', 'Rau thu hoạch sáng sớm trước khi đóng gói'),
(5, 6, 'Hinh_anh', '/uploads/logs/lo_a02_ca_chua.jpg', 'Cà chua Beef thu hoạch tại vườn');

INSERT INTO Lo_hang (Ma_lo_hang, Ma_lo_canh_tac, Ma_nhan_vien_phu_trach, Ngay_thu_hoach, Han_su_dung, So_luong_thu_hoach, So_luong_con_lai, Trang_thai) VALUES
(1, 1, 3, '2026-11-10', '2026-11-16', 100.00, 95.00, 'Sap_het_han'),
(2, 1, 3, '2026-11-13', '2026-11-22', 150.00, 150.00, 'Con_hang'),
(3, 2, 4, '2026-11-11', '2026-11-18', 120.00, 113.00, 'Con_hang'),
(4, 3, 3, '2026-11-12', '2026-11-17', 80.00, 77.00, 'Con_hang'),
(5, 4, 4, '2026-11-12', '2026-11-25', 200.00, 197.00, 'Con_hang'),
(6, 5, 3, '2026-11-15', '2026-11-23', 90.00, 86.00, 'Con_hang'),
(7, 6, 3, '2026-11-16', '2026-11-21', 110.00, 104.00, 'Con_hang'),
(8, 7, 3, '2026-11-16', '2026-11-22', 130.00, 125.00, 'Con_hang'),
(9, 8, 4, '2026-11-15', '2026-11-24', 140.00, 132.00, 'Con_hang'),
(10, 9, 4, '2026-11-14', '2026-12-05', 180.00, 175.00, 'Con_hang'),
(11, 10, 4, '2026-11-14', '2026-12-02', 160.00, 154.00, 'Con_hang'),
(12, 11, 4, '2026-11-17', '2026-11-22', 65.00, 58.00, 'Con_hang'),
(13, 12, 4, '2026-11-16', '2026-11-24', 95.00, 89.00, 'Con_hang'),
(14, 13, 3, '2026-11-17', '2026-11-21', 75.00, 70.00, 'Con_hang');

INSERT INTO Ma_QR_truy_xuat (Ma_qr, Ma_lo_hang, Ma_nhan_vien_tao, Chuoi_ma_qr, Duong_dan_anh_qr, So_luot_quet) VALUES
(1, 1, 3, 'QR-LH20261110-A01', '/uploads/qr/qr_lh_1.png', 48),
(2, 2, 3, 'QR-LH20261113-A01B', '/uploads/qr/qr_lh_2.png', 12),
(3, 3, 4, 'QR-LH20261111-A02', '/uploads/qr/qr_lh_3.png', 35),
(4, 4, 3, 'QR-LH20261112-A03', '/uploads/qr/qr_lh_4.png', 19),
(5, 5, 4, 'QR-LH20261112-A04', '/uploads/qr/qr_lh_5.png', 27),
(6, 6, 3, 'QR-LH20261115-B01', '/uploads/qr/qr_lh_6.png', 14),
(7, 7, 3, 'QR-LH20261116-B02', '/uploads/qr/qr_lh_7.png', 9),
(8, 8, 3, 'QR-LH20261116-B03', '/uploads/qr/qr_lh_8.png', 11),
(9, 9, 4, 'QR-LH20261115-B04', '/uploads/qr/qr_lh_9.png', 22),
(10, 10, 4, 'QR-LH20261114-B05', '/uploads/qr/qr_lh_10.png', 16),
(11, 11, 4, 'QR-LH20261114-B06', '/uploads/qr/qr_lh_11.png', 18),
(12, 12, 4, 'QR-LH20261117-B07', '/uploads/qr/qr_lh_12.png', 31),
(13, 13, 4, 'QR-LH20261116-B08', '/uploads/qr/qr_lh_13.png', 20),
(14, 14, 3, 'QR-LH20261117-B09', '/uploads/qr/qr_lh_14.png', 7);

INSERT INTO Chung_nhan (Ma_chung_nhan, Ma_lo_hang, Ma_san_pham, Ten_chung_nhan, To_chuc_cap, Ngay_cap, Ngay_het_han, Duong_dan_tep) VALUES
(1, 1, 1, 'Chứng nhận Hữu cơ Việt Nam (TCVN 11041)', 'Trung tâm Chứng nhận Phù hợp QUACERT', '2026-01-15', '2028-01-15', '/uploads/certs/huu_co_xa_lach.pdf'),
(2, 3, 2, 'Chứng nhận VietGAP Trồng trọt', 'Viện Nghiên cứu Rau quả', '2026-03-10', '2028-03-10', '/uploads/certs/vietgap_ca_chua.pdf'),
(3, 4, 3, 'Chứng nhận Hữu cơ Việt Nam (TCVN 11041)', 'Trung tâm Chứng nhận Phù hợp QUACERT', '2026-01-15', '2028-01-15', '/uploads/certs/huu_co_cai_bo_xoi.pdf'),
(4, NULL, 4, 'Chứng nhận GlobalGAP', 'SGS Việt Nam', '2026-02-20', '2027-02-20', '/uploads/certs/globalgap_dua_luoi.pdf'),
(5, 6, 7, 'Chứng nhận Hữu cơ Việt Nam (TCVN 11041)', 'Trung tâm Chứng nhận Phù hợp QUACERT', '2026-01-15', '2028-01-15', '/uploads/certs/huu_co_cai_kale.pdf'),
(6, 8, 9, 'Chứng nhận VietGAP Trồng trọt', 'Viện Nghiên cứu Rau quả', '2026-03-10', '2028-03-10', '/uploads/certs/vietgap_cai_ngot.pdf'),
(7, 9, 10, 'Chứng nhận VietGAP Trồng trọt', 'Viện Nghiên cứu Rau quả', '2026-03-10', '2028-03-10', '/uploads/certs/vietgap_dua_leo.pdf'),
(8, 10, 11, 'Chứng nhận Hữu cơ Việt Nam (TCVN 11041)', 'Trung tâm Chứng nhận Phù hợp QUACERT', '2026-01-15', '2028-01-15', '/uploads/certs/huu_co_bi_do.pdf'),
(9, 11, 12, 'Chứng nhận VietGAP Trồng trọt', 'Viện Nghiên cứu Rau quả', '2026-03-10', '2028-03-10', '/uploads/certs/vietgap_khoai_lang.pdf'),
(10, 12, 13, 'Chứng nhận GlobalGAP', 'SGS Việt Nam', '2026-02-20', '2027-02-20', '/uploads/certs/globalgap_dau_tay.pdf'),
(11, 13, 14, 'Chứng nhận Hữu cơ Việt Nam (TCVN 11041)', 'Trung tâm Chứng nhận Phù hợp QUACERT', '2026-01-15', '2028-01-15', '/uploads/certs/huu_co_ca_chua_bi.pdf');

INSERT INTO Bien_dong_kho (Ma_bien_dong, Ma_lo_hang, Ma_nhan_vien, Loai_bien_dong, So_luong, Ly_do, Ngay_ghi_nhan) VALUES
(1, 1, 3, 'Hao_hut', 3.00, 'Dập lá ngoài trong quá trình sơ chế phân loại', '2026-11-11 09:00:00'),
(2, 4, 3, 'Xuat_huy', 2.00, 'Hư hỏng do ẩm mốc cục bộ 2 bó cải', '2026-11-13 08:30:00');

-- 5. Giỏ hàng, Gói định kỳ & Flash Sale
INSERT INTO Gio_hang (Ma_gio_hang, Ma_nguoi_dung) VALUES (1, 5), (2, 6);

INSERT INTO Chi_tiet_gio_hang (Ma_ct_gio_hang, Ma_gio_hang, Ma_san_pham, So_luong) VALUES
(1, 1, 4, 1.00),
(2, 2, 1, 2.00),
(3, 2, 2, 1.50);

INSERT INTO Goi_dinh_ky (Ma_goi, Ten_goi, Mo_ta, Gia_goi, Ky_han_thang, Khoi_luong_moi_lan, Trang_thai) VALUES
(1, 'Gói Rau Củ Gia Đình 3kg (Giao 2 lần/tuần)', 'Cung cấp 3kg rau củ hữu cơ tươi mới mỗi lần giao vào Thứ Ba và Thứ Sáu hằng tuần (8 lần/tháng).', 950000.00, 1, 3.00, 'Dang_mo'),
(2, 'Gói Detox Xanh 2kg (Giao 1 lần/tuần)', 'Rau ăn lá và củ quả ép nước chuẩn hữu cơ giao sáng Thứ Hai.', 520000.00, 1, 2.00, 'Dang_mo');

INSERT INTO Chi_tiet_goi (Ma_ct_goi, Ma_goi, Ma_san_pham, So_luong) VALUES
(1, 1, 2, 1.00),
(2, 1, 3, 1.00),
(3, 1, 5, 1.00),
(4, 2, 1, 2.00);

INSERT INTO Dang_ky_goi (Ma_dang_ky, Ma_nguoi_dung, Ma_goi, Ma_dia_chi, Ngay_bat_dau, Ngay_ket_thuc, Trang_thai) VALUES
(1, 5, 1, 1, '2026-11-01', '2026-11-30', 'Dang_hoat_dong');

INSERT INTO Lich_giao_dinh_ky (Ma_lich_giao, Ma_dang_ky, Thu_trong_tuan, Khung_gio_giao, Trang_thai) VALUES
(1, 1, 3, '08:00 - 10:00', 'Hoat_dong'),
(2, 1, 6, '08:00 - 10:00', 'Hoat_dong');

INSERT INTO Chuong_trinh_flash_sale (Ma_flash_sale, Ma_sales_tao, Ten_chuong_trinh, Thoi_gian_bat_dau, Thoi_gian_ket_thuc, Trang_thai) VALUES
(1, 2, 'Flash Sale Rau Tươi Trong Ngày - Giải Cứu Nông Sản Sạch', '2026-11-12 00:00:00', '2026-11-15 23:59:59', 'Dang_dien_ra');

INSERT INTO Chi_tiet_flash_sale (Ma_ct_flash_sale, Ma_flash_sale, Ma_lo_hang, Gia_giam, So_luong_gioi_han, So_luong_da_ban) VALUES
(1, 1, 1, 25000.00, 30.00, 2.00);

-- 6. Đơn hàng, Phân bổ FEFO, Thanh toán ApiPay & Giao hàng
INSERT INTO Don_hang (Ma_don_hang, Ma_nguoi_dung, Ma_dia_chi, Ma_nhan_vien_xac_nhan, Ma_dang_ky_goi, Ma_don_goc, Ma_khieu_nai, Loai_don, Ngay_dat, Tien_hang, Khoang_cach_km, Phi_giao_hang, So_diem_su_dung, Tien_giam_tu_diem, Tong_tien, Trang_thai, Ghi_chu) VALUES
(1, 5, 1, 2, NULL, NULL, NULL, 'Mua_le', '2026-11-12 09:15:00', 185000.00, 12.50, 25000.00, 50, 50000.00, 160000.00, 'Hoan_thanh', 'Giao giờ hành chính giúp mình'),
(2, 5, 1, 2, NULL, NULL, NULL, 'Mua_le', '2026-11-12 14:20:00', 166000.00, 12.50, 25000.00, 0, 0.00, 191000.00, 'Hoan_thanh', NULL),
(3, 5, 1, 2, 1, NULL, NULL, 'Dinh_ky', '2026-11-13 06:00:00', 0.00, 12.50, 0.00, 0, 0.00, 0.00, 'Hoan_thanh', 'Đơn tự động theo Gói Rau Củ Gia Đình 3kg'),
(4, 5, 1, 2, NULL, 2, NULL, 'Giao_bu', '2026-11-13 09:00:00', 0.00, 12.50, 0.00, 0, 0.00, 0.00, 'Dang_giao', 'Giao bù 1kg Cà chua Beef bị dập ở đơn #2');

INSERT INTO Chi_tiet_don_hang (Ma_ct_don_hang, Ma_don_hang, Ma_san_pham, Ma_ct_flash_sale, So_luong, Don_gia, Thanh_tien) VALUES
(1, 1, 1, 1,    2.00, 25000.00, 50000.00),
(2, 1, 2, NULL, 3.00, 45000.00, 135000.00),
(3, 2, 2, NULL, 2.00, 45000.00, 90000.00),
(4, 2, 5, NULL, 2.00, 38000.00, 76000.00),
(5, 3, 2, NULL, 1.00, 0.00, 0.00),
(6, 3, 3, NULL, 1.00, 0.00, 0.00),
(7, 3, 5, NULL, 1.00, 0.00, 0.00),
(8, 4, 2, NULL, 1.00, 0.00, 0.00);

INSERT INTO Phan_bo_lo_hang (Ma_phan_bo, Ma_ct_don_hang, Ma_lo_hang, So_luong_xuat, Ngay_xuat_kho) VALUES
(1, 1, 1, 2.00, '2026-11-12 09:30:00'),
(2, 2, 3, 3.00, '2026-11-12 09:30:00'),
(3, 3, 3, 2.00, '2026-11-12 14:35:00'),
(4, 4, 5, 2.00, '2026-11-12 14:35:00'),
(5, 5, 3, 1.00, '2026-11-13 06:30:00'),
(6, 6, 4, 1.00, '2026-11-13 06:30:00'),
(7, 7, 5, 1.00, '2026-11-13 06:30:00'),
(8, 8, 3, 1.00, '2026-11-13 09:10:00');

INSERT INTO Thanh_toan (Ma_thanh_toan, Ma_don_hang, Ma_dang_ky_goi, Phuong_thuc, Ma_giao_dich_apipay, So_tien, Trang_thai, Thoi_gian_thanh_toan) VALUES
(1, NULL, 1, 'ApiPay', 'APIPAY_SUB_20261101_001', 950000.00, 'Thanh_cong', '2026-11-01 08:10:00'),
(2, 1, NULL, 'ApiPay', 'APIPAY_ORD_20261112_001', 160000.00, 'Thanh_cong', '2026-11-12 09:16:30'),
(3, 2, NULL, 'ApiPay', 'APIPAY_ORD_20261112_002', 191000.00, 'Thanh_cong', '2026-11-12 14:21:15'),
(4, 3, 1, 'Mien_phi_goi', NULL, 0.00, 'Thanh_cong', '2026-11-13 06:00:00'),
(5, 4, NULL, 'Giao_bu', NULL, 0.00, 'Thanh_cong', '2026-11-13 09:00:00');

INSERT INTO Giao_hang (Ma_giao_hang, Ma_don_hang, Ma_nhan_vien_dieu_phoi, Don_vi_van_chuyen, Ma_van_don, Trang_thai, Ngay_xuat_giao, Ngay_giao_thanh_cong) VALUES
(1, 1, 2, 'Ahamove Tươi Sống', 'AHA2026111201', 'Giao_thanh_cong', '2026-11-12 10:00:00', '2026-11-12 10:45:00'),
(2, 2, 2, 'Ahamove Tươi Sống', 'AHA2026111202', 'Giao_thanh_cong', '2026-11-12 15:00:00', '2026-11-12 15:50:00'),
(3, 3, 2, 'Đội Xe Lạnh Nội Bộ', 'XE2026111301', 'Giao_thanh_cong', '2026-11-13 07:30:00', '2026-11-13 08:40:00'),
(4, 4, 2, 'Ahamove Tươi Sống', 'AHA2026111302', 'Dang_giao', '2026-11-13 09:20:00', NULL);

-- 7. Điểm tích lũy, Khiếu nại, Bằng chứng & Hoàn tiền
INSERT INTO Diem_tich_luy (Ma_gd_diem, Ma_nguoi_dung, Ma_don_hang, Loai_giao_dich, So_diem, Mo_ta) VALUES
(1, 5, NULL, 'Tich_diem', 100, 'Tặng 100 điểm chào mừng thành viên mới'),
(2, 5, 1, 'Su_dung', -50, 'Sử dụng 50 điểm giảm 50.000đ cho đơn hàng #1'),
(3, 5, 1, 'Tich_diem', 16, 'Tích điểm hoàn thành đơn hàng #1'),
(4, 5, 2, 'Tich_diem', 19, 'Tích điểm hoàn thành đơn hàng #2');

INSERT INTO Khieu_nai (Ma_khieu_nai, Ma_don_hang, Ma_nguoi_dung, Ma_nhan_vien_xu_ly, Ly_do, Mo_ta_chi_tiet, Hinh_thuc_xu_ly, Trang_thai, Ngay_xu_ly) VALUES
(1, 2, 5, 2, 'Sản phẩm bị dập nát khi vận chuyển', 'Có 1kg cà chua Beef ở đáy hộp bị dập nát do chèn ép.', 'Giao_bu', 'Da_giai_quyet', '2026-11-12 17:00:00'),
(2, 1, 5, 2, 'Thiếu 1 bó rau tặng kèm chương trình', 'Khách phản hồi thiếu phần quà dùng thử và đề nghị hoàn một phần tiền.', 'Hoan_tien', 'Da_giai_quyet', '2026-11-12 18:15:00');

UPDATE Don_hang SET Ma_khieu_nai = 1 WHERE Ma_don_hang = 4;

INSERT INTO Tep_bang_chung (Ma_tep, Ma_khieu_nai, Loai_tep, Duong_dan) VALUES
(1, 1, 'Hinh_anh', '/uploads/complaints/kn1_ca_chua_dap_01.jpg'),
(2, 1, 'Video', '/uploads/complaints/kn1_mo_hop_video.mp4'),
(3, 2, 'Hinh_anh', '/uploads/complaints/kn2_kiem_hang.jpg');

INSERT INTO Hoan_tien (Ma_hoan_tien, Ma_khieu_nai, Ma_thanh_toan, So_tien, Ma_giao_dich_hoan_tham_chieu_cu, Trang_thai, Ngay_hoan) VALUES
(1, 2, 2, 20000.00, 'APIPAY_REFUND_20261112_001', 'Thanh_cong', '2026-11-12 18:20:00');
