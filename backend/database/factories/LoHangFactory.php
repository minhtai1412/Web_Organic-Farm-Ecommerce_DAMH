<?php

namespace Database\Factories;

use App\Models\LoCanhTac;
use App\Models\LoHang;
use App\Models\NguoiDung;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<LoHang>
 */
class LoHangFactory extends Factory
{
    protected $model = LoHang::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'Ma_lo_canh_tac' => LoCanhTac::query()->firstOrFail()->getKey(),
            'Ma_nhan_vien_phu_trach' => NguoiDung::query()->firstOrFail()->getKey(),
            'Ngay_thu_hoach' => Carbon::now()->subDay()->toDateString(),
            'Han_su_dung' => Carbon::now()->addDays(10)->toDateString(),
            'So_luong_thu_hoach' => 100,
            'So_luong_con_lai' => 10,
            'Trang_thai' => 'Con_hang',
        ];
    }

    public function sapHetHan(): static
    {
        return $this->state(fn (array $attributes) => [
            'Han_su_dung' => Carbon::now()->addDay()->toDateString(),
            'So_luong_con_lai' => 3,
            'Trang_thai' => 'Sap_het_han',
        ]);
    }

    public function conHan(): static
    {
        return $this->state(fn (array $attributes) => [
            'Han_su_dung' => Carbon::now()->addDays(4)->toDateString(),
            'So_luong_con_lai' => 10,
            'Trang_thai' => 'Con_hang',
        ]);
    }

    public function daQuaHan(): static
    {
        return $this->state(fn (array $attributes) => [
            'Han_su_dung' => Carbon::now()->subDay()->toDateString(),
            'So_luong_con_lai' => 20,
            'Trang_thai' => 'Da_huy',
        ]);
    }

    public function hetTonKho(): static
    {
        return $this->state(fn (array $attributes) => [
            'Han_su_dung' => Carbon::now()->addDays(5)->toDateString(),
            'So_luong_con_lai' => 0,
            'Trang_thai' => 'Het_hang',
        ]);
    }
}
