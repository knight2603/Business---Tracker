<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SavingsTransaction extends Model
{
    protected $fillable = ['savings_category_id', 'user_id', 'type', 'amount', 'description', 'transacted_at'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'transacted_at' => 'datetime'];
    }
}
