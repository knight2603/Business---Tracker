<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incomes', function (Blueprint $table) {
            $table->id();
            $table->decimal('amount', 12, 2);
            $table->string('description', 120);
            $table->date('received_at');
            $table->timestamps();
            $table->index('received_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incomes');
    }
};
