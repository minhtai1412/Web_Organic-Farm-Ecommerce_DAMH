<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VaiTro extends Model
{
    protected $table = 'vai_tro';
    protected $primaryKey = 'Ma_vai_tro';
    protected $guarded = [];

    public function quyens()
    {
        return $this->belongsToMany(Quyen::class, 'vai_tro_quyen', 'Ma_vai_tro', 'Ma_quyen');
    }

    public function nguoiDungs()
    {
        return $this->hasMany(NguoiDung::class, 'Ma_vai_tro', 'Ma_vai_tro');
    }
}