/* Trang chủ XanhFarm: điều phối bố cục responsive đồng bộ trên cả Mobile và Desktop. */
import { useEffect, useState } from "react";
import HeroSection from "../../components/home/HeroSection";
import TrustBadgesSection from "../../components/home/TrustBadgesSection";
import CategoryGridSection from "../../components/home/CategoryGridSection";
import FlashSaleSection from "../../components/home/FlashSaleSection";
import FeaturedProductsSection from "../../components/home/FeaturedProductsSection";
import SubscriptionPackagesSection from "../../components/home/SubscriptionPackagesSection";
import FarmJourneySection from "../../components/home/FarmJourneySection";
import GreenhouseShowcaseSection from "../../components/home/GreenhouseShowcaseSection";
import { storefrontApi } from "../../services/storefrontApi";

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      storefrontApi.getCategories(),
      storefrontApi.getProducts({ sort: "best_selling", in_stock: 1, per_page: 12 }),
      storefrontApi.getFlashSales?.() ?? Promise.resolve([]),
    ])
      .then(([catRes, prodRes, flashRes]) => {
        if (!active) return;

        if (catRes.status === "fulfilled") {
          const list = catRes.value?.data ?? catRes.value ?? [];
          setCategories(Array.isArray(list) ? list : []);
        }
        if (prodRes.status === "fulfilled") {
          const raw = prodRes.value?.data ?? prodRes.value ?? [];
          const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
          setFeaturedProducts(list);
        }
        if (flashRes.status === "fulfilled") {
          const list = flashRes.value?.data ?? flashRes.value ?? [];
          setFlashSales(Array.isArray(list) ? list : []);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="pb-14 sm:pb-20 overflow-x-hidden">
      {/* 1. Hero Banner chính */}
      <HeroSection products={featuredProducts} />

      {/* 2. Các phân khu nội dung giữ nhịp khoảng cách đồng đều Mobile -> Desktop */}
      <div className="space-y-10 sm:space-y-14 lg:space-y-16 mt-6 sm:mt-8 lg:mt-10">
        <TrustBadgesSection />

        <CategoryGridSection categories={categories} loading={loading} />

        {flashSales.length > 0 && (
          <FlashSaleSection items={flashSales} loading={loading} />
        )}

        <FeaturedProductsSection products={featuredProducts} loading={loading} />

        <SubscriptionPackagesSection />

        <FarmJourneySection />

        <GreenhouseShowcaseSection />
      </div>
    </div>
  );
}