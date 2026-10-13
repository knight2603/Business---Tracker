<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    protected $fillable = ['user_id', 'amount', 'description', 'category', 'spent_at', 'is_completed', 'completed_at'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'spent_at' => 'date', 'is_completed' => 'boolean', 'completed_at' => 'datetime'];
    }
}
