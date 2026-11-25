/* Hero Banner trang chủ: Slider tự động chuyển đổi các loại trái cây lấy trực tiếp từ database (Dâu tây, Dưa lưới Taki, Cà chua bi mật...), kèm ảnh minh họa và mã truy xuất nguồn gốc. */
import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Leaf,
  QrCode,
  ShieldCheck,
  Sparkles,
  Sprout,
} from "lucide-react";
import { storefrontApi } from "../../services/storefrontApi";
import { formatCurrencyVnd } from "../../services/publicApi";



// Bối cảnh nông trại tương ứng với từng dòng trái cây
const FARM_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=2000&h=900&q=85", // Nhà màng công nghệ cao (Dâu tây)
  "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=2000&h=900&q=85", // Cánh đồng đồi xanh ngát (Dưa lưới)
  "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=2000&h=900&q=85", // Bình minh nông trại sinh thái (Cà chua bi)
];

export default function HeroSection({ products: propProducts = [] }) {
  const [dbProducts, setDbProducts] = useState(propProducts);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Tải danh sách sản phẩm từ database nếu chưa được truyền từ prop
  useEffect(() => {
    if (Array.isArray(propProducts) && propProducts.length > 0) {
      setDbProducts(propProducts);
      return;
    }

    let active = true;
    storefrontApi
      .getProducts({ in_stock: 1, per_page: 30 })
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (list.length > 0) {
          setDbProducts(list);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [propProducts]);

  // Trích xuất chính xác các loại TRÁI CÂY thực tế từ Database
  const slides = useMemo(() => {
    // Lọc ưu tiên danh mục "Trái cây nhà màng" hoặc các loại trái cây thực thụ (Dâu tây, Dưa lưới, Cà chua bi)
    const fruitList = dbProducts.filter((p) => {
      const cat = String(p.category?.name || "").toLowerCase();
      const name = String(p.name || "").toLowerCase();
      return (
        cat.includes("trái cây") ||
        name.includes("dâu tây") ||
        name.includes("dưa lưới") ||
        name.includes("cà chua bi")
      );
    });

    // Nếu đã lấy được sản phẩm trái cây từ database, dựng slide động từ database
    if (fruitList.length > 0) {
      return fruitList.slice(0, 3).map((product, idx) => {
        const standard = product.certification_standards?.[0] || "VietGAP";
        const formattedPrice = formatCurrencyVnd(product.price);
        const unitSuffix = product.unit ? ` / ${product.unit}` : "";
        const bg = FARM_BACKGROUNDS[idx % FARM_BACKGROUNDS.length];
        const prodImg = product.image_url || null;

        // Tạo tiêu đề truyền cảm hứng theo từng loại trái cây
        let titleHighlight = "Ngọt Lành Tự Nhiên";
        if (product.name.includes("Dâu tây")) titleHighlight = "Trái Đỏ Thơm Ngọt";
        else if (product.name.includes("Dưa lưới")) titleHighlight = "Ruột Cam Giòn Ngọt";
        else if (product.name.includes("Cà chua")) titleHighlight = "Mọng Nước Chín Cây";

        return {
          id: `fruit-${product.id}`,
          productId: product.id,
          badge: `Chứng nhận ${standard} · Trái Cây Nhà Màng`,
          titlePrefix: product.name,
          titleHighlight,
          desc:
            product.description ||
            `Trái cây tươi ngon thu hoạch trực tiếp tại ${product.farm?.name || "Nông Trại Xanh Củ Chi"}. Cam kết không tồn dư thuốc BVTV, chuẩn sạch và an toàn tuyệt đối.`,
          primaryCta: {
            label: "Mua Ngay Trái Cây Này",
            to: `/products/${product.id}`,
          },
          secondaryCta: {
            label: product.trace_qr_code ? `Mã lô ${product.trace_qr_code}` : "Quét QR Nguồn Gốc",
            to: product.trace_qr_code ? `/trace?code=${product.trace_qr_code}` : "/trace",
            isQr: true,
          },
          bgImage: bg,
          product: {
            id: product.id,
            name: product.name,
            badge: standard,
            price: `${formattedPrice}${unitSuffix}`,
            desc: product.description || "Trái cây nhà màng chuẩn sạch từ vườn",
            image: prodImg,
            tag: "Thu hoạch trong ngày",
            to: `/products/${product.id}`,
          },
        };
      });
    }

    // Dự phòng mặc định khớp với dữ liệu database nếu đang tải
    return [
      {
        id: "dau-tay",
        productId: 13,
        badge: "Chứng nhận GlobalGAP · Trái cây nhà màng",
        titlePrefix: "Dâu tây giống Nhật nhà màng",
        titleHighlight: "Trái Đỏ Thơm Ngọt",
        desc: "Dâu tây trồng giá thể công nghệ cao, trái đỏ mọng thơm ngọt tự nhiên, an toàn cho cả gia đình.",
        primaryCta: { label: "Mua Ngay Trái Cây Này", to: "/products/13" },
        secondaryCta: { label: "Mã lô QR-LH20261117-B07", to: "/trace?code=QR-LH20261117-B07", isQr: true },
        bgImage: FARM_BACKGROUNDS[0],
        product: {
          id: 13,
          name: "Dâu tây giống Nhật nhà màng",
          badge: "GlobalGAP",
          price: "145.000 ₫ / hộp 500g",
          desc: "Dâu tây trồng giá thể công nghệ cao, trái đỏ mọng thơm ngọt",
          image: null,
          tag: "Thu hoạch trong ngày",
          to: "/products/13",
        },
      },
      {
        id: "dua-luoi",
        productId: 4,
        badge: "Chứng nhận GlobalGAP · Trái cây nhà màng",
        titlePrefix: "Dưa lưới Taki nhà màng",
        titleHighlight: "Ruột Cam Giòn Ngọt",
        desc: "Dưa lưới ruột cam giòn ngọt, trồng giá thể hữu cơ tại nhà màng công nghệ cao, vị thanh mát tự nhiên.",
        primaryCta: { label: "Mua Ngay Trái Cây Này", to: "/products/4" },
        secondaryCta: { label: "Quét QR Nguồn Gốc", to: "/trace", isQr: true },
        bgImage: FARM_BACKGROUNDS[1],
        product: {
          id: 4,
          name: "Dưa lưới Taki nhà màng",
          badge: "GlobalGAP",
          price: "120.000 ₫ / quả ~1.5kg",
          desc: "Dưa lưới ruột cam giòn ngọt, trồng giá thể hữu cơ tại nhà màng",
          image: null,
          tag: "Thu hoạch trong ngày",
          to: "/products/4",
        },
      },
      {
        id: "ca-chua-bi",
        productId: 14,
        badge: "Chứng nhận Hữu cơ TCVN · Trái cây nhà màng",
        titlePrefix: "Cà chua bi mật nhà màng",
        titleHighlight: "Mọng Nước Chín Cây",
        desc: "Cà chua bi chín cây vỏ mỏng, ngọt đậm, giàu vitamin C và chất chống oxy hóa, an toàn tuyệt đối khi ăn trực tiếp.",
        primaryCta: { label: "Mua Ngay Trái Cây Này", to: "/products/14" },
        secondaryCta: { label: "Mã lô QR-LH20261116-B08", to: "/trace?code=QR-LH20261116-B08", isQr: true },
        bgImage: FARM_BACKGROUNDS[2],
        product: {
          id: 14,
          name: "Cà chua bi mật nhà màng",
          badge: "TCVN 11041",
          price: "58.000 ₫ / hộp 500g",
          desc: "Cà chua bi chín cây vỏ mỏng, ngọt đậm, giàu vitamin C",
          image: null,
          tag: "Thu hoạch trong ngày",
          to: "/products/14",
        },
      },
    ];
  }, [dbProducts]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Tự động chuyển slide sau mỗi 5 giây
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, slides.length]);

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <div
        className="relative overflow-hidden rounded-3xl sm:rounded-[32px] min-h-[480px] sm:min-h-[520px] flex items-center shadow-2xl border border-emerald-900/30 group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        role="region"
        aria-label="Banner trái cây nông sản hữu cơ từ cơ sở dữ liệu"
      >
        {/* 1. Background Ảnh Nông Trại Chuyển Động Mờ Dần */}
        {slides.map((item, idx) => (
          <div
            key={item.id}
            aria-hidden={idx !== currentIndex}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentIndex ? "opacity-100 z-0" : "opacity-0 pointer-events-none"
            }`}
          >
            <img
              src={item.bgImage}
              alt={item.titlePrefix}
              className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
              loading={idx === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}

        {/* 2. Lớp phủ Gradient đa tầng: Đảm bảo độ sắc nét cao nhất cho chữ */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#012209]/95 via-[#01290b]/85 sm:via-[#01290b]/75 to-[#012209]/50 sm:to-[#012209]/20" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#012209]/90 via-transparent to-black/25" />

        {/* Ánh sáng hữu cơ làm nổi bật khung nhìn */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-[#91f78e]/12 blur-3xl z-[1]"
        />

        {/* 3. Khung nội dung chính & Ảnh sản phẩm trái cây từ Database */}
        <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center p-6 sm:p-10 lg:p-12">
          {/* CỘT TRÁI (7 cột Desktop): Tiêu đề, mô tả và nút điều hướng */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            {/* Tag tiêu chuẩn lấy từ Database */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10.5px] sm:text-xs font-extrabold uppercase tracking-wider text-[#91f78e] shadow-xs transition-all">
              <Sprout className="w-3.5 h-3.5 text-[#91f78e] shrink-0" />
              <span>{currentSlide.badge}</span>
            </div>

            {/* Tiêu đề trái cây sinh thái */}
            <h1
              className="text-2xl sm:text-4xl lg:text-[44px] font-black tracking-tight text-white leading-[1.16]"
              style={{ fontFamily: "var(--font-headline)" }}
            >
              {currentSlide.titlePrefix}{" "}
              <span className="text-[#91f78e] block sm:inline">
                {currentSlide.titleHighlight}
              </span>
            </h1>

            {/* Mô tả sản phẩm lấy từ Database */}
            <p className="text-xs sm:text-sm lg:text-[14.5px] text-emerald-100/90 leading-relaxed max-w-xl font-medium min-h-[48px] sm:min-h-[44px]">
              {currentSlide.desc}
            </p>

            {/* Cụm nút CTA dẫn thẳng tới trang chi tiết sản phẩm thật */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Link
                to={currentSlide.primaryCta.to}
                className="min-h-12 px-6 py-3 rounded-2xl bg-[#91f78e] hover:bg-[#7ce879] text-[#00390a] font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 hover:shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>{currentSlide.primaryCta.label}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>

              <Link
                to={currentSlide.secondaryCta.to}
                className="min-h-12 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/25 hover:border-white/40 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all"
              >
                <QrCode className="w-4 h-4 text-[#91f78e] shrink-0" />
                <span>{currentSlide.secondaryCta.label}</span>
              </Link>
            </div>

            {/* 3 Cam kết cốt lõi */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 sm:pt-5 border-t border-white/15 max-w-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-[#91f78e] shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-black text-white tabular-nums leading-tight">
                    100%
                  </p>
                  <p className="text-[10px] sm:text-xs text-emerald-200/85">
                    Hữu cơ tự nhiên
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-[#91f78e] shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-black text-[#91f78e] tabular-nums leading-tight">
                    0.00 ppm
                  </p>
                  <p className="text-[10px] sm:text-xs text-emerald-200/85">
                    Dư lượng BVTV
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-[#91f78e] shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-black text-white leading-tight">
                    Minh Bạch
                  </p>
                  <p className="text-[10px] sm:text-xs text-emerald-200/85">
                    Mã QR nguồn gốc
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (5 cột Desktop): Khung thẻ sản phẩm Trái cây lấy trực tiếp từ Database */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <Link
              to={currentSlide.product.to}
              className="relative w-full max-w-sm rounded-2xl sm:rounded-3xl bg-black/40 backdrop-blur-xl border border-white/20 p-3 sm:p-4 text-white shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:border-[#91f78e]/50 hover:bg-black/50 group/card block"
            >
              {/* Ảnh trái cây thực tế */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl sm:rounded-2xl bg-black/20">
                {currentSlide.product.image ? (
                  <img
                    key={currentSlide.product.image}
                    src={currentSlide.product.image}
                    alt={currentSlide.product.name}
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover/card:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-900/70 to-emerald-700/50 flex flex-col items-center justify-center gap-2">
                    <Leaf className="w-14 h-14 text-[#91f78e]/50" />
                    <span className="text-xs text-emerald-200/60 font-medium">Chưa có hình ảnh</span>
                  </div>
                )}

                {/* Huy hiệu chứng nhận từ Database */}
                <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10.5px] font-bold text-[#91f78e]">
                  <Sparkles className="w-3 h-3 text-[#91f78e]" />
                  <span>{currentSlide.product.badge}</span>
                </div>

                {/* Tag thu hoạch */}
                <div className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-lg bg-emerald-950/80 backdrop-blur-md border border-emerald-400/30 text-[10px] font-extrabold text-emerald-200">
                  {currentSlide.product.tag}
                </div>
              </div>

              {/* Thông tin trái cây từ Database */}
              <div className="pt-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-white group-hover/card:text-[#91f78e] transition-colors line-clamp-1">
                    {currentSlide.product.name}
                  </h2>
                  <span className="text-xs sm:text-sm font-black text-[#91f78e] shrink-0 tabular-nums">
                    {currentSlide.product.price}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-emerald-100/80 line-clamp-1">
                  {currentSlide.product.desc}
                </p>
              </div>

              {/* Lời kêu gọi xem chi tiết */}
              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-200/90 font-bold">
                <span>Trái cây tươi từ vườn</span>
                <span className="inline-flex items-center gap-1 text-[#91f78e] group-hover/card:translate-x-1 transition-transform">
                  <span>Xem chi tiết</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* 4. Nút bấm điều hướng Trước / Sau */}
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Xem trái cây trước"
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Xem trái cây tiếp theo"
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* 5. Dải chấm chỉ báo chuyển Slide */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/35 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full shadow-lg">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Chuyển đến trái cây ${idx + 1}`}
              className={`rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "w-7 h-2 bg-[#91f78e] shadow-xs shadow-emerald-400/50"
                  : "w-2 h-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
