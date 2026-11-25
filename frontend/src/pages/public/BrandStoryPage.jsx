import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarDays,
  Check,
  ExternalLink,
  FileBadge,
  FileText,
  FlaskConical,
  Leaf,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sprout,
  Droplets,
} from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import MediaViewer from "../../components/common/MediaViewer";
import { publicApi } from "../../services/publicApi";

function formatDate(value) {
  if (!value) return "Không thời hạn";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";

  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(date);
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

function FarmPhoto({ image, farmName, className = "" }) {
  const [hasError, setHasError] = useState(false);

  if (!image?.url || hasError) {
    return (
      <div
        className={`flex min-h-48 items-center justify-center bg-gradient-to-br from-emerald-100 via-lime-50 to-[#f2f4f2] text-[#006e1c] ${className}`}
        role="img"
        aria-label={`Hình ảnh ${farmName} chưa khả dụng`}
      >
        <div className="text-center">
          <Sprout className="mx-auto h-10 w-10" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold">{farmName}</p>
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

function BrandStorySkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải câu chuyện thương hiệu"
      className="mx-auto max-w-7xl animate-pulse space-y-8 px-4 py-8 sm:px-6 sm:py-12"
    >
      <div className="h-5 w-36 rounded-full bg-[#e6e9e7]" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-5 py-5">
          <div className="h-10 w-4/5 rounded-xl bg-[#e6e9e7]" />
          <div className="h-5 w-full rounded bg-[#eceeec]" />
          <div className="h-5 w-3/4 rounded bg-[#eceeec]" />
          <div className="h-28 rounded-3xl bg-[#e6e9e7]" />
        </div>
        <div className="min-h-72 rounded-[2rem] bg-[#e6e9e7]" />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="h-40 rounded-3xl bg-[#e6e9e7]" />
        <div className="h-40 rounded-3xl bg-[#e6e9e7]" />
        <div className="h-40 rounded-3xl bg-[#e6e9e7]" />
      </div>
    </div>
  );
}

// Thêm object ánh xạ phía trên component BrandStoryPage (gần hàm formatDate)
const SAMPLE_TYPE_META = {
  Dat: { label: "Mẫu đất", icon: Leaf },
  Nuoc: { label: "Mẫu nước", icon: Droplets },
  Nong_san: { label: "Mẫu nông sản", icon: Sprout },
};

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
    <div className="overflow-hidden bg-[#f6f8f6] pb-14 sm:pb-20">
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#f4f8ef] via-white to-[#eaf4e5]">
        <div className="pointer-events-none absolute -right-24 -top-32 -z-10 h-96 w-96 rounded-full bg-lime-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 -z-10 h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:pb-20">
          <nav
            aria-label="Điều hướng đường dẫn"
            className="mb-8 text-xs font-medium text-[#687265] sm:mb-10 sm:text-sm"
          >
            <Link to="/" className="transition-colors hover:text-[#006e1c]">
              Trang chủ
            </Link>
            <span className="mx-2 text-[#a0a99b]">/</span>
            <span aria-current="page" className="text-[#00450d]">
              Câu chuyện thương hiệu
            </span>
          </nav>

          <div className="grid items-center gap-9 lg:grid-cols-[0.94fr_1.06fr] lg:gap-14">
            <div className="order-2 lg:order-1">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/80 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#006e1c] shadow-sm sm:text-sm">
                <Leaf className="h-4 w-4" aria-hidden="true" />
                Câu chuyện thương hiệu
              </span>
              <h1
                className="mt-5 max-w-2xl text-4xl font-black leading-[1.08] tracking-tight text-[#103c1c] sm:mt-6 sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                {primaryFarm?.name || "Câu chuyện thương hiệu"}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#526050] sm:mt-6 sm:text-lg sm:leading-8">
                {primaryFarm?.brand_story ||
                  "Câu chuyện thương hiệu đang được cập nhật."}
              </p>

              {primaryFarm && (
                <div className="mt-7 rounded-3xl border border-[#dce7d7] bg-white/85 p-5 shadow-[0_16px_50px_-38px_rgba(16,60,28,0.5)] backdrop-blur sm:mt-9 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf5e7] text-[#08712b]">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-extrabold leading-snug text-[#163e20] sm:text-xl">
                        {primaryFarm.name}
                      </h2>
                      {primaryFarm.address && (
                        <p className="mt-1.5 text-sm leading-6 text-[#667163]">
                          {primaryFarm.address}
                        </p>
                      )}
                    </div>
                  </div>
                  {primaryFarm.capacity_profile && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-[#f5f8f2] p-3.5 text-sm leading-6 text-[#3d563d]">
                      <FileBadge className="mt-0.5 h-4 w-4 shrink-0 text-[#18823a]" aria-hidden="true" />
                      <span>{primaryFarm.capacity_profile}</span>
                    </div>
                  )}
                </div>
              )}

              <a
                href="#quy-trinh"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-bold text-[#006e1c] transition-colors hover:text-[#00450d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18823a] focus-visible:ring-offset-2"
              >
                Khám phá quy trình canh tác
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
              {processPrinciples.length > 0 && (
                <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#657061]">
                  <ShieldCheck className="h-4 w-4 text-[#18823a]" aria-hidden="true" />
                  {processPrinciples.length} nguyên tắc canh tác sạch được nông trại chia sẻ
                </p>
              )}
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative mx-auto max-w-2xl">
                {farmImages.length > 1 ? (
                  <div className="grid grid-cols-[1.25fr_0.75fr] grid-rows-2 gap-3 sm:gap-4">
                    <FarmPhoto
                      image={farmImages[0]}
                      farmName={primaryFarm?.name || "XanhFarm"}
                      className="row-span-2 h-[300px] w-full rounded-[1.75rem] object-cover shadow-[0_24px_70px_-35px_rgba(16,60,28,0.55)] sm:h-[440px] sm:rounded-[2rem]"
                    />
                    {farmImages.slice(1, 3).map((image) => (
                      <FarmPhoto
                        key={image.id}
                        image={image}
                        farmName={primaryFarm?.name || "XanhFarm"}
                        className="h-[143px] w-full rounded-2xl object-cover shadow-md sm:h-[212px] sm:rounded-[1.5rem]"
                      />
                    ))}
                    {farmImages.length < 3 && (
                      <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl bg-[#e7f2e2] p-4 text-center text-[#276139] sm:rounded-[1.5rem]">
                        <Sprout className="h-8 w-8" aria-hidden="true" />
                        <span className="mt-2 text-xs font-bold sm:text-sm">
                          Gieo trồng bằng sự tận tâm
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <FarmPhoto
                    image={farmImages[0]}
                    farmName={primaryFarm?.name || "XanhFarm"}
                    className="h-[300px] w-full rounded-[1.75rem] object-cover shadow-[0_24px_70px_-35px_rgba(16,60,28,0.55)] sm:h-[440px] sm:rounded-[2rem]"
                  />
                )}
                <div className="absolute -bottom-4 left-4 inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-3.5 py-2.5 text-xs font-bold text-[#315638] shadow-lg sm:bottom-5 sm:left-5 sm:px-4 sm:text-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e9f5e7] text-[#08712b]">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  Minh bạch từ nông trại
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {qualityTests.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#18823a] sm:text-sm">
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              Kết quả kiểm định
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#173c20] sm:text-4xl">
              Đất &amp; nước được kiểm tra
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#657061] sm:text-base">
              Hồ sơ kiểm định do từng cơ sở nông trại ghi nhận.
            </p>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {qualityTests.map((test) => {
              const sampleMeta = SAMPLE_TYPE_META[test.sample_type] || {
                label: "Mẫu kiểm định",
                icon: FlaskConical,
              };
              const SampleIcon = sampleMeta.icon;
              const fileUrl = test.file_url || "";

              return (
                <article
                  key={test.id}
                  className="rounded-3xl border border-[#dfe8db] bg-white p-5 shadow-[0_12px_42px_-34px_rgba(19,54,24,0.5)] sm:p-6"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf6e9] text-[#08712b]">
                      <SampleIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-[#173c20]">
                        {sampleMeta.label}
                      </h3>
                      <p className="mt-1 text-xs text-[#778272]">{test.farm_name}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-6 text-[#42513f]">
                    {test.result}
                  </p>
                  {test.note && (
                    <p className="mt-2 text-sm leading-6 text-[#697465]">{test.note}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#edf1ea] pt-4">
                    <span className="text-xs text-[#778272]">
                      Kiểm định: {formatDate(test.inspected_at)}
                    </span>
                    {fileUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMedia({
                            url: fileUrl,
                            title: `Kết quả kiểm định ${sampleMeta.label.toLowerCase()}`,
                            subtitle: test.farm_name,
                            type: /\.pdf(?:$|[?#])/i.test(test.file_path || fileUrl)
                              ? "pdf"
                              : "image",
                          })
                        }
                        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#edf6e9] px-3 text-xs font-bold text-[#226437] transition-colors hover:bg-[#dcefd5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18823a]"
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        Xem hồ sơ
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#18823a] sm:text-sm">
            Cam kết từ nông trại
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#173c20] sm:text-4xl">
            Nông trại &amp; hồ sơ năng lực
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#657061] sm:text-base">
            Mỗi cơ sở được giới thiệu bằng thông tin và hình ảnh thực tế do XanhFarm cung cấp.
          </p>
        </div>

        {farms.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2">
            {farms.map((farm) => (
              <article
                key={farm.id}
                className="group rounded-3xl border border-[#dfe8db] bg-white p-5 shadow-[0_12px_42px_-34px_rgba(19,54,24,0.5)] transition-shadow hover:shadow-[0_18px_48px_-32px_rgba(19,54,24,0.45)] sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf6e9] text-[#08712b] transition-transform group-hover:scale-105">
                    <Sprout className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold text-[#173c20]">{farm.name}</h3>
                    {farm.address && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-6 text-[#697465]">
                        <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#18823a]" aria-hidden="true" />
                        {farm.address}
                      </p>
                    )}
                  </div>
                </div>
                {farm.capacity_profile && (
                  <div className="mt-5 rounded-2xl bg-[#f6f8f4] p-4">
                    <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#18823a]">
                      <FileBadge className="h-4 w-4" aria-hidden="true" />
                      Hồ sơ năng lực
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#4c594a]">
                      {farm.capacity_profile}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl border border-dashed border-[#cbd9c5] bg-white p-6 text-center text-sm text-[#697465]">
            Thông tin cơ sở nông trại đang được cập nhật.
          </p>
        )}

        {galleryItems.length > 0 && (
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {galleryItems.map(({ farm, image }) => (
              <figure
                key={`${farm.id}-${image.id}`}
                className="overflow-hidden rounded-2xl border border-[#e0e8dc] bg-white"
              >
                <FarmPhoto
                  image={image}
                  farmName={farm.name}
                  className="h-36 w-full object-cover transition-transform duration-300 hover:scale-[1.03] sm:h-48"
                />
                {image.caption && (
                  <figcaption className="px-3 py-2.5 text-xs leading-5 text-[#657061] sm:px-4 sm:text-sm">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </section>

      <section id="quy-trinh" className="scroll-mt-24 bg-[#edf4e9] py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#18823a] shadow-sm sm:text-sm">
                <Leaf className="h-4 w-4" aria-hidden="true" />
                Từ đất đến bàn ăn
              </span>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-[#173c20] sm:text-4xl">
                Quy trình canh tác sạch
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#5b6957] sm:text-base">
                Các nguyên tắc canh tác được nông trại chia sẻ, giúp khách hàng hiểu rõ hơn về cách XanhFarm chăm sóc mùa vụ.
              </p>
            </div>

            {processes.length > 0 ? (
              <div className="space-y-5">
                {processes.map((process) => {
                  const principles = getProcessPrinciples(process.description);

                  return (
                    <article
                      key={process.farm_id}
                      className="rounded-3xl border border-[#d9e6d3] bg-white p-5 shadow-sm sm:p-7"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e9f5e5] text-[#08712b]">
                          <Sprout className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="text-base font-extrabold text-[#173c20] sm:text-lg">
                            {process.farm_name || "Quy trình XanhFarm"}
                          </h3>
                          <p className="mt-1 text-xs text-[#778272] sm:text-sm">
                            {principles.length > 1
                              ? `${principles.length} nguyên tắc canh tác`
                              : "Nguyên tắc canh tác"}
                          </p>
                        </div>
                      </div>

                      {principles.length > 0 ? (
                        <ol className="mt-5 grid gap-2.5 sm:grid-cols-2">
                          {principles.map((principle, index) => (
                            <li
                              key={`${process.farm_id}-${principle}`}
                              className="flex items-start gap-3 rounded-2xl bg-[#f7f9f5] p-3.5"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-[#18823a] shadow-sm">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="pt-1 text-sm font-semibold leading-6 text-[#42513f]">
                                {principle}
                              </span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="mt-5 rounded-2xl bg-[#f7f9f5] p-4 text-sm leading-7 text-[#526050]">
                          Chưa có mô tả quy trình cho cơ sở này.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[#bfd0b7] bg-white/70 p-7 text-center">
                <Leaf className="mx-auto h-8 w-8 text-[#18823a]" aria-hidden="true" />
                <p className="mt-3 text-sm leading-6 text-[#5b6957]">
                  Quy trình canh tác đang được cập nhật.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#18823a] sm:text-sm">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Chất lượng được xác thực
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#173c20] sm:text-4xl">
              Chứng nhận &amp; kiểm định
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#657061] sm:text-base">
              Hồ sơ chứng nhận còn hiệu lực được liên kết với sản phẩm hoặc lô hàng của nông trại.
            </p>
          </div>
          {Array.isArray(story?.certifications) && story.certifications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {story.certifications.map((certification) => (
                <span
                  key={certification}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#cde2c6] bg-white px-3 py-1.5 text-xs font-bold text-[#226437] shadow-sm"
                >
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                  {certification}
                </span>
              ))}
            </div>
          )}
        </div>

        {certificates.length > 0 ? (
          <div className="mt-7 grid gap-4 sm:mt-9 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.map((certificate) => {
              const isOrganic = String(certificate.standard || certificate.name)
                .toLowerCase()
                .includes("hữu cơ");
              const fileUrl = certificate.file_url || "";

              return (
                <article
                  key={certificate.id}
                  className="flex flex-col rounded-3xl border border-[#dfe8db] bg-white p-5 shadow-[0_12px_42px_-34px_rgba(19,54,24,0.5)] sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isOrganic
                          ? "bg-[#edf6e9] text-[#08712b]"
                          : "bg-amber-50 text-amber-700"
                        }`}
                    >
                      <Award className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-[#f2f7ef] px-3 py-1.5 text-[11px] font-extrabold text-[#28633a] sm:text-xs">
                      {certificate.standard || "Chứng nhận chất lượng"}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-extrabold leading-6 text-[#193e22] sm:text-lg">
                    {certificate.name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#6a7565]">
                    {certificate.issuer || "Đơn vị cấp chưa cập nhật"}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#edf1ea] pt-4">
                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8a9485]">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        Ngày cấp
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#465344]">
                        {formatDate(certificate.issued_date)}
                      </p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8a9485]">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Hiệu lực đến
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#246238]">
                        {formatDate(certificate.expiry_date)}
                      </p>
                    </div>
                  </div>

                  {certificate.product_name && (
                    <p className="mt-3 text-xs text-[#7a8575]">
                      Áp dụng cho:{" "}
                      <span className="font-semibold text-[#4e5b4b]">
                        {certificate.product_name}
                      </span>
                    </p>
                  )}

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
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#075b25] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#00450d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18823a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#dfe6dc] disabled:text-[#7b8578]"
                  >
                    {certificate.file_path &&
                      /\.pdf(?:$|[?#])/i.test(certificate.file_path) ? (
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    )}
                    {fileUrl ? "Xem hồ sơ chứng nhận" : "Chưa có tệp đính kèm"}
                    {fileUrl && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              icon={ShieldCheck}
              title="Chưa có chứng nhận được công bố"
              message="Hồ sơ chứng nhận chất lượng sẽ hiển thị tại đây khi được cập nhật."
            />
          </div>
        )}
      </section>

      <section className="mx-4 overflow-hidden rounded-[2rem] bg-[#064e2e] sm:mx-6 lg:mx-auto lg:max-w-7xl">
        <div className="relative px-6 py-9 text-center text-white sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-emerald-400/15 blur-2xl" />
          <div className="relative mx-auto max-w-2xl">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-200">
              <Sprout className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-2xl font-black sm:text-3xl">
              Chọn thực phẩm lành, bắt đầu từ nguồn gốc rõ ràng
            </h2>
            <p className="mt-3 text-sm leading-7 text-emerald-100/90 sm:text-base">
              Khám phá nông sản XanhFarm và hành trình phía sau mỗi mùa thu hoạch.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-[#075b25] transition-colors hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#064e2e]"
            >
              Khám phá nông sản
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <MediaViewer media={selectedMedia} onClose={() => setSelectedMedia(null)} />
    </div>
  );
}
