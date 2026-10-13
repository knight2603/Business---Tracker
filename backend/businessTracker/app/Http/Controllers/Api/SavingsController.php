<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SavingsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $categories = $request->user()->savingsCategories()
            ->with(['transactions' => fn ($query) => $query->orderByDesc('transacted_at')->orderByDesc('id')])
            ->orderBy('name')
            ->get();

        return response()->json([
            'total_saved' => round((float) $categories->sum('balance'), 2),
            'categories' => $categories,
        ]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'color' => ['required', Rule::in(['green', 'blue', 'violet', 'orange'])],
        ]);

        $category = $request->user()->savingsCategories()->create($data);

        return response()->json(['message' => 'Clasificación creada.', 'category' => $category->load('transactions')], 201);
    }

    public function transact(Request $request, int $categoryId): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['deposit', 'withdrawal'])],
            'amount' => ['required', 'numeric', 'gt:0', 'max:999999999999.99'],
            'description' => ['nullable', 'string', 'max:120'],
            'date' => ['required', 'date'],
        ]);

        $category = DB::transaction(function () use ($request, $categoryId, $data) {
            $category = $request->user()->savingsCategories()->whereKey($categoryId)->lockForUpdate()->firstOrFail();
            $amount = round((float) $data['amount'], 2);
            $balance = round((float) $category->balance, 2);

            if ($data['type'] === 'withdrawal' && $amount > $balance) {
                throw ValidationException::withMessages(['amount' => ['El retiro no puede superar el saldo de esta clasificación.']]);
            }

            $newBalance = $data['type'] === 'deposit' ? $balance + $amount : $balance - $amount;
            $category->update(['balance' => round($newBalance, 2)]);
            $category->transactions()->create([
                'user_id' => $request->user()->id,
                'type' => $data['type'],
                'amount' => $amount,
                'description' => $data['description'] ?? null,
                'transacted_at' => $data['date'],
            ]);

            return $category->fresh()->load(['transactions' => fn ($query) => $query->orderByDesc('transacted_at')->orderByDesc('id')]);
        });

        return response()->json(['message' => $data['type'] === 'deposit' ? 'Ahorro agregado.' : 'Retiro registrado.', 'category' => $category]);
    }
}
