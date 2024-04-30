<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $fillable = ['name'];
    protected $hidden = ['id'];
    protected $appends = ['hashid'];

    public function getHashidAttribute()
    {
        $hashids = app(Hashids::class);
        return $hashids->encode($this->id);
    }

    public static function findByHashid($hashid)
    {
        $hashids = app(Hashids::class);
        $decoded = $hashids->decode($hashid);
        return !empty($decoded) ? static::find($decoded[0]) : null;
    }
}
