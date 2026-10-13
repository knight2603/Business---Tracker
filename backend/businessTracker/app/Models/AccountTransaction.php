<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountTransaction extends Model
{
    protected $fillable = ['account_id', 'user_id', 'type', 'amount', 'description', 'transacted_at'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'transacted_at' => 'datetime'];
    }
}
