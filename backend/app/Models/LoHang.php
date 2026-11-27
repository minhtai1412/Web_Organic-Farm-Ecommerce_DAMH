<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class LoHang extends Model
{
    use HasFactory;

    protected $table = 'lo_hang';
    protected $primaryKey = 'Ma_lo_hang';
    protected $guarded = [];

    public function loCanhTac(): BelongsTo
    {
        return $this->belongsTo(LoCanhTac::class, 'Ma_lo_canh_tac', 'Ma_lo_canh_tac');
    }

    public function nhanVienPhuTrach(): BelongsTo
    {
        return $this->belongsTo(NguoiDung::class, 'Ma_nhan_vien_phu_trach', 'Ma_nguoi_dung');
    }

    public function maQrTruyXuat(): HasOne
    {
        return $this->hasOne(MaQrTruyXuat::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public function bienDongKhos(): HasMany
    {
        return $this->hasMany(BienDongKho::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public function chungNhans(): HasMany
    {
        return $this->hasMany(ChungNhan::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public function chiTietFlashSales(): HasMany
    {
        return $this->hasMany(ChiTietFlashSale::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public  function scopeKhaDungFefo($query)
    {
        return $query->whereIn('Trang_thai', ['Con_hang', 'Sap_het_han'])
                    ->where('So_luong_con_lai', '>', 0)
                    ->orderBy('Han_su_dung', 'asc');
    }
}
