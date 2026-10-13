<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SavingsCategory extends Model
{
    protected $fillable = ['user_id', 'name', 'color', 'balance'];

    protected function casts(): array
    {
        return ['balance' => 'decimal:2'];
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(SavingsTransaction::class);
    }
}
