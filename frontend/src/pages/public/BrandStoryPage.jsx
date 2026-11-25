/* ==========================================================================
 * TRANG CÂU CHUYỆN THƯƠNG HIỆU & CHỨNG NHẬN (BRAND STORY & CERTIFICATIONS)
 * Bố cục 4 phân khu rõ ràng:
 * 1. Giới thiệu thương hiệu & Thống kê minh bạch
 * 2. Hệ thống nông trại & Hồ sơ năng lực + Thư viện ảnh thực tế
 * 3. Quy trình canh tác sạch (Từ đất đến bàn ăn)
 * 4. Hồ sơ chứng nhận chất lượng & Kết quả kiểm định đất / nước / nông sản
 * ========================================================================== */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Droplets,
  FileBadge,
  FileText,
  FlaskConical,
  Leaf,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sprout,
} from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import MediaViewer from "../../components/common/MediaViewer";
import { publicApi } from "../../services/publicApi";

function formatDate(value) {
  if (!value) return "Không thời hạn";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";

  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

function getProcessPrinciples(description) {
  if (Array.isArray(description)) return description.filter(Boolean);
  if (typeof description !== "string" || !description.trim()) return [];

  const text = description.trim();
  const principleList = text.includes(":") ? text.slice(text.indexOf(":") + 1) : text;
  const principles = principleList
    .split(/,\s*(?=không\b)/i)
    .map((principle) => {
      const cleanPrinciple = principle.trim().replace(/[.;]+$/, "");
      return cleanPrinciple
        ? cleanPrinciple[0].toLocaleUpperCase("vi-VN") + cleanPrinciple.slice(1)
        : "";
    })
    .filter(Boolean);

  return principles.length > 1 ? principles : [text];
}

const SAMPLE_TYPE_META = {
  Dat: {
    label: "Mẫu đất canh tác",
    icon: Leaf,
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
    iconClass: "bg-amber-100/70 text-amber-800",
  },
  Nuoc: {
    label: "Mẫu nguồn nước tưới",
    icon: Droplets,
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200/80",
    iconClass: "bg-sky-100/70 text-sky-700",
  },
  Nong_san: {
    label: "Mẫu nông sản thu hoạch",
    icon: Sprout,
    badgeClass: "bg-emerald-50 text-[#006e1c] border-emerald-200/80",
    iconClass: "bg-[#eaf5e7] text-[#08712b]",
  },
};

function FarmPhoto({ image, farmName, className = "" }) {
  const [hasError, setHasError] = useState(false);

  if (!image?.url || hasError) {
    return (
      <div
        className={`flex min-h-48 items-center justify-center bg-gradient-to-br from-emerald-100 via-lime-50 to-[#f2f4f2] text-[#006e1c] ${className}`}
        role="img"
        aria-label={`Hình ảnh ${farmName} chưa khả dụng`}
      >
        <div className="text-center px-4">
          <Sprout className="mx-auto h-9 w-9" aria-hidden="true" />
          <p className="mt-2 text-xs font-bold">{farmName}</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={image.url}
      alt={image.caption || farmName}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

function SectionHeading({ stepNumber, eyebrow, icon: Icon, title, subtitle, rightSlot }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#dfe8db] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-[#00450d] px-1.5 text-[11px] font-black text-[#91f78e]">
            {stepNumber}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#006e1c]">
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
            {eyebrow}
          </span>
        </div>
        <h2
          className="mt-2.5 text-2xl font-black tracking-tight text-[#14391d] sm:text-3xl"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-sm leading-6 text-[#5b6957] sm:text-[15px]">
            {subtitle}
          </p>
        )}
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
  );
}

function BrandStorySkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải câu chuyện thương hiệu"
      className="mx-auto max-w-7xl animate-pulse space-y-8 px-4 py-8 sm:px-6 sm:py-10"
    >
      <div className="h-4 w-44 rounded-full bg-[#e6e9e7]" />
      <div className="grid gap-8 rounded-3xl bg-white p-6 sm:p-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="h-7 w-40 rounded-full bg-[#e6e9e7]" />
          <div className="h-10 w-4/5 rounded-xl bg-[#e6e9e7]" />
          <div className="h-20 w-full rounded-2xl bg-[#eceeec]" />
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="h-16 rounded-2xl bg-[#e6e9e7]" />
            <div className="h-16 rounded-2xl bg-[#e6e9e7]" />
            <div className="h-16 rounded-2xl bg-[#e6e9e7]" />
          </div>
        </div>
        <div className="min-h-72 rounded-3xl bg-[#e6e9e7]" />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="h-44 rounded-3xl bg-[#e6e9e7]" />
        <div className="h-44 rounded-3xl bg-[#e6e9e7]" />
        <div className="h-44 rounded-3xl bg-[#e6e9e7]" />
      </div>
    </div>
  );
}

export default function BrandStoryPage() {
  const [requestResult, setRequestResult] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState(null);

  useEffect(() => {
    let active = true;

    publicApi
      .getBrandStory()
      .then((response) => {
        if (!active) return;

        if (!response?.success || !response?.data || typeof response.data !== "object") {
          setRequestResult({
            requestKey: reloadTick,
            errorMessage: "Máy chủ chưa trả về dữ liệu câu chuyện thương hiệu hợp lệ.",
          });
          return;
        }

        setRequestResult({ requestKey: reloadTick, story: response.data });
      })
      .catch((error) => {
        if (!active) return;
        setRequestResult({
          requestKey: reloadTick,
          errorMessage:
            error?.message || "Không thể tải câu chuyện thương hiệu. Vui lòng thử lại.",
        });
      });

    return () => {
      active = false;
    };
  }, [reloadTick]);

  const currentResult =
    requestResult?.requestKey === reloadTick ? requestResult : null;
  const isLoading = !currentResult;
  const story = currentResult?.story;
  const farms = Array.isArray(story?.farms) ? story.farms : [];
  const primaryFarm = farms[0];
  const processes = Array.isArray(story?.cultivation_process)
    ? story.cultivation_process
    : [];
  const certificates = Array.isArray(story?.certification_details)
    ? story.certification_details
    : [];
  const qualityTests = farms.flatMap((farm) =>
    (Array.isArray(farm.quality_tests) ? farm.quality_tests : []).map((test) => ({
      ...test,
      farm_name: farm.name,
    }))
  );

  if (isLoading) return <BrandStorySkeleton />;

  if (currentResult?.errorMessage) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <EmptyState
          icon={RefreshCw}
          title="Chưa thể tải câu chuyện XanhFarm"
          message={currentResult.errorMessage}
          actionLabel="Thử tải lại"
          onAction={() => setReloadTick((tick) => tick + 1)}
        />
      </div>
    );
  }

  const hasStoryData =
    farms.length > 0 ||
    processes.length > 0 ||
    certificates.length > 0 ||
    qualityTests.length > 0;

  if (!hasStoryData) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <EmptyState
          icon={Sprout}
          title="Câu chuyện XanhFarm đang được cập nhật"
          message="Thông tin nông trại, quy trình canh tác và chứng nhận sẽ sớm được bổ sung."
          actionLabel="Tải lại"
          onAction={() => setReloadTick((tick) => tick + 1)}
        />
      </div>
    );
  }

  const farmImages = Array.isArray(primaryFarm?.images) ? primaryFarm.images : [];
  const primaryProcess =
    processes.find((process) => process.farm_id === primaryFarm?.id) || processes[0];
  const processPrinciples = getProcessPrinciples(primaryProcess?.description);
  const galleryItems = farms.flatMap((farm, farmIndex) =>
    (Array.isArray(farm.images) ? farm.images : [])
      .slice(farmIndex === 0 ? 3 : 0)
      .map((image) => ({ farm, image }))
  );

  return (
    <div className="bg-[#f6f8f6] pb-16">
      {/* ==================================================================
          PHẦN 1: HERO - CÂU CHUYỆN THƯƠNG HIỆU & CHỈ SỐ MINH BẠCH
         ================================================================== */}
      <section className="border-b border-[#dfe8db] bg-gradient-to-br from-[#f2f7ee] via-white to-[#eaf4e5]">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-8">
          {/* Breadcrumb */}
          <nav
            aria-label="Điều hướng đường dẫn"
            className="mb-6 flex items-center gap-2 text-xs font-medium text-[#687265]"
          >
            <Link to="/" className="transition-colors hover:text-[#006e1c]">
              Trang chủ
            </Link>
            <span className="text-[#a0a99b]">/</span>
            <span aria-current="page" className="font-bold text-[#00450d]">
              Câu chuyện &amp; Chứng nhận
            </span>
          </nav>

          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Cột trái: Nội dung thương hiệu */}
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#006e1c] shadow-2xs">
                <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                Hành trình nông nghiệp hữu cơ minh bạch
              </div>

              <h1
                className="text-3xl font-black leading-[1.12] tracking-tight text-[#103c1c] sm:text-4xl lg:text-[42px]"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                {primaryFarm?.name || "Câu chuyện thương hiệu XanhFarm"}
              </h1>

              <p className="text-sm leading-7 text-[#4c594a] sm:text-base">
                {primaryFarm?.brand_story ||
                  "Chúng tôi xây dựng chuỗi cung ứng nông sản sạch khép kín từ vùng trồng đạt chuẩn tới bàn ăn mỗi gia đình, minh bạch từng mùa vụ và hồ sơ kiểm định."}
              </p>

              {/* Thanh 3 chỉ số tổng quan rõ ràng */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="rounded-2xl border border-[#dce7d7] bg-white p-3.5 shadow-2xs">
                  <p className="text-xl font-black text-[#00450d] sm:text-2xl">
                    {farms.length}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-[#5b6957]">
                    Cơ sở nông trại
                  </p>
                </div>
                <div className="rounded-2xl border border-[#dce7d7] bg-white p-3.5 shadow-2xs">
                  <p className="text-xl font-black text-[#00450d] sm:text-2xl">
                    {processPrinciples.length || processes.length}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-[#5b6957]">
                    Nguyên tắc sạch
                  </p>
                </div>
                <div className="rounded-2xl border border-[#dce7d7] bg-white p-3.5 shadow-2xs">
                  <p className="text-xl font-black text-[#00450d] sm:text-2xl">
                    {certificates.length + qualityTests.length}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-[#5b6957]">
                    Hồ sơ kiểm định
                  </p>
                </div>
              </div>

              {/* Khối thông tin cơ sở chính */}
              {primaryFarm?.address && (
                <div className="flex items-start gap-3 rounded-2xl border border-[#dce7d7] bg-white/90 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eaf5e7] text-[#08712b]">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#006e1c]">
                      Vùng trồng chính
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#193e22]">
                      {primaryFarm.address}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Cột phải: Bộ ảnh thực tế nông trại */}
            <div className="lg:col-span-6">
              <div className="relative">
                {farmImages.length > 1 ? (
                  <div className="grid grid-cols-[1.3fr_0.7fr] grid-rows-2 gap-3">
                    <FarmPhoto
                      image={farmImages[0]}
                      farmName={primaryFarm?.name || "XanhFarm"}
                      className="row-span-2 h-[280px] w-full rounded-3xl object-cover shadow-md sm:h-[380px]"
                    />
                    {farmImages.slice(1, 3).map((image) => (
                      <FarmPhoto
                        key={image.id}
                        image={image}
                        farmName={primaryFarm?.name || "XanhFarm"}
                        className="h-[134px] w-full rounded-2xl object-cover shadow-xs sm:h-[184px]"
                      />
                    ))}
                    {farmImages.length < 3 && (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce7d7] bg-[#eaf5e7] p-4 text-center text-[#00450d]">
                        <Sprout className="h-7 w-7" aria-hidden="true" />
                        <span className="mt-1.5 text-xs font-bold">
                          Canh tác bền vững
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <FarmPhoto
                    image={farmImages[0]}
                    farmName={primaryFarm?.name || "XanhFarm"}
                    className="h-[280px] w-full rounded-3xl object-cover shadow-md sm:h-[380px]"
                  />
                )}

                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#dce7d7] bg-white px-3.5 py-1.5 text-xs font-bold text-[#14391d] shadow-2xs sm:absolute sm:bottom-4 sm:left-4 sm:mt-0">
                  <CheckCircle2 className="h-4 w-4 text-[#006e1c]" aria-hidden="true" />
                  100% Truy xuất nguồn gốc từng luống rau
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
          THANH ĐIỀU HƯỚNG NHANH GIỮA CÁC PHÂN KHU (STICKY ANCHOR BAR)
         ================================================================== */}
      <div className="sticky top-20 z-20 border-b border-[#dfe8db] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 overflow-x-auto px-4 py-2.5 sm:px-6">
          <nav aria-label="Mục lục trang" className="flex items-center gap-1.5 sm:gap-2">
            <a
              href="#nong-trai"
              className="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold text-[#41493e] transition-colors hover:bg-[#edf6e9] hover:text-[#00450d]"
            >
              01. Hệ thống nông trại
            </a>
            <a
              href="#quy-trinh"
              className="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold text-[#41493e] transition-colors hover:bg-[#edf6e9] hover:text-[#00450d]"
            >
              02. Quy trình canh tác
            </a>
            <a
              href="#chung-nhan"
              className="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold text-[#41493e] transition-colors hover:bg-[#edf6e9] hover:text-[#00450d]"
            >
              03. Chứng nhận &amp; Kiểm định
            </a>
          </nav>

          <Link
            to="/products"
            className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-[#00450d] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#006e1c] sm:inline-flex"
          >
            <span>Xem nông sản</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ==================================================================
          NỘI DUNG CHÍNH 3 PHÂN KHU
         ================================================================== */}
      <div className="mx-auto max-w-7xl space-y-14 px-4 pt-10 sm:space-y-16 sm:px-6 sm:pt-12">
        {/* ----------------------------------------------------------------
            MỤC 01: HỆ THỐNG NÔNG TRẠI & HỒ SƠ NĂNG LỰC
           ---------------------------------------------------------------- */}
        <section id="nong-trai" className="scroll-mt-36 space-y-6">
          <SectionHeading
            stepNumber="01"
            eyebrow="Cam kết từ vùng trồng"
            icon={Building2}
            title="Hệ thống nông trại & Hồ sơ năng lực"
            subtitle="Thông tin chi tiết về từng cơ sở sản xuất, quy mô canh tác và hình ảnh thực tế tại vườn."
          />

          {farms.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {farms.map((farm, idx) => (
                <article
                  key={farm.id}
                  className="flex flex-col justify-between rounded-3xl border border-[#dfe8db] bg-white p-6 shadow-2xs transition-shadow hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf5e7] text-[#08712b]">
                          <Sprout className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#006e1c]">
                            Cơ sở #{idx + 1}
                          </span>
                          <h3 className="text-lg font-extrabold text-[#14391d]">
                            {farm.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {farm.address && (
                      <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-[#5b6957]">
                        <MapPin
                          className="mt-1 h-4 w-4 shrink-0 text-[#18823a]"
                          aria-hidden="true"
                        />
                        <span>{farm.address}</span>
                      </p>
                    )}
                  </div>

                  {farm.capacity_profile && (
                    <div className="mt-5 rounded-2xl border border-[#e7efe3] bg-[#f7faf5] p-4">
                      <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#006e1c]">
                        <FileBadge className="h-4 w-4" aria-hidden="true" />
                        Hồ sơ năng lực sản xuất
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-[#42513f]">
                        {farm.capacity_profile}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[#cbd9c5] bg-white p-6 text-center text-sm text-[#697465]">
              Thông tin cơ sở nông trại đang được cập nhật.
            </p>
          )}

          {/* Thư viện ảnh thực tế bổ sung */}
          {galleryItems.length > 0 && (
            <div className="pt-2">
              <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-[#5b6957]">
                Hình ảnh thực tế tại các cơ sở ({galleryItems.length})
              </h3>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
                {galleryItems.map(({ farm, image }) => (
                  <figure
                    key={`${farm.id}-${image.id}`}
                    className="overflow-hidden rounded-2xl border border-[#dfe8db] bg-white shadow-2xs"
                  >
                    <FarmPhoto
                      image={image}
                      farmName={farm.name}
                      className="h-40 w-full object-cover transition-transform duration-300 hover:scale-105 sm:h-44"
                    />
                    {image.caption && (
                      <figcaption className="px-3.5 py-2.5 text-xs leading-5 text-[#526050]">
                        {image.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ----------------------------------------------------------------
            MỤC 02: QUY TRÌNH CANH TÁC SẠCH
           ---------------------------------------------------------------- */}
        <section
          id="quy-trinh"
          className="scroll-mt-36 rounded-3xl border border-[#d7e5d1] bg-[#edf4e9] p-6 sm:p-8 lg:p-10"
        >
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Cột trái tóm tắt */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-[#00450d] px-1.5 text-[11px] font-black text-[#91f78e]">
                  02
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#006e1c]">
                  <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                  Từ đất đến bàn ăn
                </span>
              </div>

              <h2
                className="text-2xl font-black leading-tight tracking-tight text-[#14391d] sm:text-3xl"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                Quy trình canh tác sạch
              </h2>

              <p className="text-sm leading-6 text-[#4c594a]">
                Mỗi mùa vụ đều tuân thủ nghiêm ngặt các nguyên tắc không hóa chất tổng hợp, ghi nhật ký điện tử theo từng lô thu hoạch.
              </p>

              <div className="rounded-2xl border border-[#cfe0c8] bg-white/80 p-4 space-y-2 text-xs text-[#3d563d]">
                <p className="font-extrabold text-[#14391d] flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#006e1c]" />
                  Cam kết vận hành FEFO
                </p>
                <p className="leading-5">
                  Nông sản thu hoạch sáng sớm được phân lô và xuất kho theo nguyên tắc hết hạn trước xuất trước, đảm bảo độ tươi tối đa.
                </p>
              </div>
            </div>

            {/* Cột phải danh sách nguyên tắc theo từng cơ sở */}
            <div className="lg:col-span-8">
              {processes.length > 0 ? (
                <div className="space-y-5">
                  {processes.map((process) => {
                    const principles = getProcessPrinciples(process.description);

                    return (
                      <article
                        key={process.farm_id}
                        className="rounded-2xl border border-[#d9e6d3] bg-white p-5 shadow-2xs sm:p-6"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf1ea] pb-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e9f5e5] text-[#08712b]">
                              <Sprout className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div>
                              <h3 className="text-base font-extrabold text-[#14391d]">
                                {process.farm_name || "Quy trình XanhFarm"}
                              </h3>
                              <p className="text-xs text-[#687265]">
                                Tiêu chuẩn áp dụng trực tiếp tại vùng trồng
                              </p>
                            </div>
                          </div>
                          {principles.length > 1 && (
                            <span className="rounded-full bg-[#edf6e9] px-3 py-1 text-xs font-bold text-[#006e1c]">
                              {principles.length} nguyên tắc cốt lõi
                            </span>
                          )}
                        </div>

                        {principles.length > 0 ? (
                          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                            {principles.map((principle, index) => (
                              <li
                                key={`${process.farm_id}-${principle}`}
                                className="flex items-start gap-3 rounded-xl border border-[#eef2eb] bg-[#f8faf6] p-3.5"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00450d] text-[11px] font-black text-white">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <span className="pt-0.5 text-sm font-semibold leading-6 text-[#364434]">
                                  {principle}
                                </span>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="mt-4 rounded-xl bg-[#f8faf6] p-4 text-sm text-[#526050]">
                            Chưa có mô tả quy trình cho cơ sở này.
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#bfd0b7] bg-white/80 p-8 text-center">
                  <Leaf className="mx-auto h-8 w-8 text-[#18823a]" aria-hidden="true" />
                  <p className="mt-2 text-sm text-[#5b6957]">
                    Quy trình canh tác đang được cập nhật.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------------
            MỤC 03: CHỨNG NHẬN CHẤT LƯỢNG & KẾT QUẢ KIỂM ĐỊNH
           ---------------------------------------------------------------- */}
        <section id="chung-nhan" className="scroll-mt-36 space-y-8">
          <SectionHeading
            stepNumber="03"
            eyebrow="Minh chứng xác thực"
            icon={ShieldCheck}
            title="Chứng nhận chất lượng & Kiểm định định kỳ"
            subtitle="Toàn bộ giấy chứng nhận tiêu chuẩn và phiếu xét nghiệm mẫu đất, nguồn nước, nông sản đều được công khai để khách hàng đối chiếu."
            rightSlot={
              Array.isArray(story?.certifications) &&
              story.certifications.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {story.certifications.map((certification) => (
                    <span
                      key={certification}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#cde2c6] bg-white px-3 py-1.5 text-xs font-bold text-[#006e1c] shadow-2xs"
                    >
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {certification}
                    </span>
                  ))}
                </div>
              )
            }
          />

          {/* Nhóm 3A: Hồ sơ chứng nhận chất lượng */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-[#14391d]">
                <Award className="h-5 w-5 text-[#006e1c]" aria-hidden="true" />
                <span>Giấy chứng nhận tiêu chuẩn ({certificates.length})</span>
              </h3>
            </div>

            {certificates.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {certificates.map((certificate) => {
                  const isOrganic = String(certificate.standard || certificate.name)
                    .toLowerCase()
                    .includes("hữu cơ");
                  const fileUrl = certificate.file_url || "";

                  return (
                    <article
                      key={certificate.id}
                      className="flex flex-col justify-between rounded-3xl border border-[#dfe8db] bg-white p-5 shadow-2xs transition-shadow hover:shadow-md sm:p-6"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                              isOrganic
                                ? "bg-[#edf6e9] text-[#08712b]"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            <Award className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className="rounded-full bg-[#f2f7ef] px-3 py-1 text-[11px] font-extrabold text-[#28633a]">
                            {certificate.standard || "Chứng nhận"}
                          </span>
                        </div>

                        <h4 className="mt-4 text-base font-extrabold leading-6 text-[#14391d]">
                          {certificate.name}
                        </h4>
                        <p className="mt-1 text-xs leading-5 text-[#687265]">
                          Đơn vị cấp:{" "}
                          <span className="font-semibold text-[#42513f]">
                            {certificate.issuer || "Đang cập nhật"}
                          </span>
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[#f7faf5] p-3">
                          <div>
                            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#7a8575]">
                              <CalendarDays className="h-3 w-3" aria-hidden="true" />
                              Ngày cấp
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-[#364434]">
                              {formatDate(certificate.issued_date)}
                            </p>
                          </div>
                          <div>
                            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#7a8575]">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              Hiệu lực đến
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-[#006e1c]">
                              {formatDate(certificate.expiry_date)}
                            </p>
                          </div>
                        </div>

                        {certificate.product_name && (
                          <p className="mt-3 text-xs text-[#687265]">
                            Phạm vi áp dụng:{" "}
                            <span className="font-bold text-[#14391d]">
                              {certificate.product_name}
                            </span>
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!fileUrl}
                        onClick={() =>
                          setSelectedMedia({
                            url: fileUrl,
                            title: certificate.name,
                            subtitle: certificate.issuer,
                            type: /\.pdf(?:$|[?#])/i.test(
                              certificate.file_path || fileUrl
                            )
                              ? "pdf"
                              : "image",
                          })
                        }
                        className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#00450d] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#006e1c] disabled:cursor-not-allowed disabled:bg-[#dfe6dc] disabled:text-[#7b8578] cursor-pointer"
                      >
                        {certificate.file_path &&
                        /\.pdf(?:$|[?#])/i.test(certificate.file_path) ? (
                          <FileText className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span>
                          {fileUrl ? "Xem bản scan chứng nhận" : "Chưa có tệp đính kèm"}
                        </span>
                        {fileUrl && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={ShieldCheck}
                title="Chưa có chứng nhận được công bố"
                message="Hồ sơ chứng nhận chất lượng sẽ hiển thị tại đây khi được cập nhật."
              />
            )}
          </div>

          {/* Nhóm 3B: Kết quả kiểm định đất, nước & nông sản */}
          {qualityTests.length > 0 && (
            <div className="space-y-4 pt-2">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-[#14391d]">
                <FlaskConical className="h-5 w-5 text-[#006e1c]" aria-hidden="true" />
                <span>
                  Phiếu kiểm định mẫu đất, nước &amp; nông sản ({qualityTests.length})
                </span>
              </h3>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {qualityTests.map((test) => {
                  const sampleMeta = SAMPLE_TYPE_META[test.sample_type] || {
                    label: "Mẫu kiểm định",
                    icon: FlaskConical,
                    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                    iconClass: "bg-slate-100 text-slate-700",
                  };
                  const SampleIcon = sampleMeta.icon;
                  const fileUrl = test.file_url || "";

                  return (
                    <article
                      key={test.id}
                      className="flex flex-col justify-between rounded-3xl border border-[#dfe8db] bg-white p-5 shadow-2xs transition-shadow hover:shadow-md sm:p-6"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${sampleMeta.iconClass}`}
                          >
                            <SampleIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${sampleMeta.badgeClass}`}
                          >
                            {sampleMeta.label}
                          </span>
                        </div>

                        <p className="mt-3 text-xs font-semibold text-[#687265]">
                          Cơ sở: <span className="text-[#14391d]">{test.farm_name}</span>
                        </p>

                        <p className="mt-2.5 rounded-2xl bg-[#f7faf5] p-3.5 text-sm font-bold leading-6 text-[#193e22]">
                          {test.result}
                        </p>

                        {test.note && (
                          <p className="mt-2.5 text-xs leading-5 text-[#5b6957]">
                            {test.note}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf1ea] pt-3.5">
                        <span className="text-xs text-[#687265]">
                          Ngày test:{" "}
                          <strong className="font-semibold text-[#364434]">
                            {formatDate(test.inspected_at)}
                          </strong>
                        </span>
                        {fileUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMedia({
                                url: fileUrl,
                                title: `Phiếu kiểm định — ${sampleMeta.label}`,
                                subtitle: test.farm_name,
                                type: /\.pdf(?:$|[?#])/i.test(test.file_path || fileUrl)
                                  ? "pdf"
                                  : "image",
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#edf6e9] px-3 py-1.5 text-xs font-bold text-[#006e1c] transition-colors hover:bg-[#dcefd5] cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Xem phiếu</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ==================================================================
            BANNER KÊU GỌI HÀNH ĐỘNG CUỐI TRANG
           ================================================================== */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#00450d] via-[#065214] to-[#006e1c] p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div className="space-y-1.5 max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#91f78e]">
                Trải nghiệm nông sản sạch mỗi ngày
              </p>
              <h2
                className="text-xl font-black sm:text-2xl"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                Chọn thực phẩm lành, bắt đầu từ nguồn gốc rõ ràng
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90">
                Khám phá danh mục nông sản thu hoạch trong ngày hoặc đăng ký gói rau định kỳ tiết kiệm 20%.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/subscriptions"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-colors hover:bg-white/20"
              >
                Gói rau định kỳ
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs sm:text-sm font-extrabold text-[#00450d] transition-colors hover:bg-emerald-50"
              >
                <span>Khám phá nông sản</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </div>

      <MediaViewer media={selectedMedia} onClose={() => setSelectedMedia(null)} />
    </div>
  );
}