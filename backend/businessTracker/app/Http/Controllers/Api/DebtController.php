<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DebtController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $debts = $request->user()->debts()->orderBy('due_date')->orderByDesc('id')->get();

        return response()->json([
            'active_total' => round((float) $debts->where('status', 'active')->sum('amount'), 2),
            'active_count' => $debts->where('status', 'active')->count(),
            'debts' => $debts,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:999999999999.99'],
            'due_date' => ['required', 'date'],
        ]);

        $debt = $request->user()->debts()->create($data);

        return response()->json(['message' => 'Deuda registrada.', 'debt' => $debt], 201);
    }

    public function pay(Request $request, int $debtId): JsonResponse
    {
        $result = DB::transaction(function () use ($request, $debtId) {
            $debt = $request->user()->debts()->whereKey($debtId)->lockForUpdate()->firstOrFail();

            if ($debt->status === 'paid') {
                throw ValidationException::withMessages(['debt' => ['Esta deuda ya fue marcada como pagada.']]);
            }

            $paidAt = now();
            $debt->update(['status' => 'paid', 'paid_at' => $paidAt]);
            $expense = $request->user()->expenses()->create([
                'amount' => $debt->amount,
                'description' => 'Deuda: '.$debt->name,
                'category' => 'needs',
                'spent_at' => $paidAt->toDateString(),
                'is_completed' => true,
                'completed_at' => $paidAt,
            ]);

            return ['debt' => $debt->fresh(), 'expense' => $expense];
        });

        return response()->json(['message' => 'Deuda pagada y agregada al módulo del 50%.', ...$result]);
    }
}
