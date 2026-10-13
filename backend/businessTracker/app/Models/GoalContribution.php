<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoalContribution extends Model
{
    protected $fillable = ['goal_id', 'amount', 'contributed_at'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'contributed_at' => 'datetime'];
    }

    public function goal(): BelongsTo
    {
        return $this->belongsTo(Goal::class);
    }
}
