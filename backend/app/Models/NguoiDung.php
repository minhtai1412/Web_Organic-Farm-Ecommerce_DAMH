<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Notifications\QueuedResetPasswordNotification;

class NguoiDung extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'nguoi_dung';
    protected $primaryKey = 'Ma_nguoi_dung';
    protected $guarded = [];

    protected $hidden = [
        'Mat_khau_ma_hoa',
    ];

    public function getAuthPassword(): string
    {
        return $this->Mat_khau_ma_hoa;
    }

    public function getAuthPasswordName(): string
    {
        return 'Mat_khau_ma_hoa';
    }

    public function getRememberTokenName(): string
    {
        return '';
    }

    public function getEmailForPasswordReset(): string
    {
        return $this->Email;
    }

    public function routeNotificationForMail(): string
    {
        return $this->Email;
    }

    public function vaiTro()
    {
        return $this->belongsTo(VaiTro::class, 'Ma_vai_tro', 'Ma_vai_tro');
    }

    public function hasPermission(string $tenQuyen): bool
    {
        if (
            $this->getRoleSlug() === 'farm_staff'
            && in_array($tenQuyen, [
                'view_admin_reports',
                'view_revenue',
                'view_financial_reports',
                'view_customers',
                'manage_customers',
            ], true)
        ) {
            return false;
        }

        return $this->vaiTro?->quyens()->where('Ten_quyen', $tenQuyen)->exists() ?? false;
    }

    public function getRoleSlug(): string
    {
        $roleName = $this->vaiTro?->Ten_vai_tro;

        return match (strtolower((string) $roleName)) {
            'admin' => 'admin',
            'sales' => 'sales',
            'farm_staff' => 'farm_staff',
            default => 'customer',
        };
    }

    public function hasRole(string|array $roles): bool
    {
        $currentRole = $this->getRoleSlug();
        if (is_array($roles)) {
            $normalized = array_map(fn($r) => strtolower(trim($r)), $roles);
            return in_array($currentRole, $normalized, true);
        }

        return $currentRole === strtolower(trim($roles));
    }

    // Thêm vào bên trong class NguoiDung:
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new QueuedResetPasswordNotification($token));
    }
}
