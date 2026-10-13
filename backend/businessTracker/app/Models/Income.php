<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Income extends Model
{
    protected $fillable = ['user_id', 'amount', 'description', 'received_at'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'received_at' => 'date'];
    }
}
