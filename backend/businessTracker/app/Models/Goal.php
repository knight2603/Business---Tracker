<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Goal extends Model
{
    protected $fillable = [
        'user_id', 'name', 'target_amount', 'term_unit', 'term_value',
        'target_date', 'monthly_installment', 'photo_path',
    ];

    protected function casts(): array
    {
        return [
            'target_amount' => 'decimal:2',
            'monthly_installment' => 'decimal:2',
            'target_date' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(GoalContribution::class);
    }
}
