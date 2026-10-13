<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->decimal('target_amount', 14, 2);
            $table->enum('term_unit', ['month', 'year']);
            $table->unsignedSmallInteger('term_value');
            $table->date('target_date');
            $table->decimal('monthly_installment', 14, 2);
            $table->string('photo_path')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'target_date']);
        });

        Schema::create('goal_contributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('goal_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->timestamp('contributed_at');
            $table->timestamps();
            $table->index(['goal_id', 'contributed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('goal_contributions');
        Schema::dropIfExists('goals');
    }
};
