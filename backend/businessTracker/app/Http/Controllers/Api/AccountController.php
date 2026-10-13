<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $accounts = $request->user()->accounts()->with(['transactions' => fn ($query) => $query->orderByDesc('transacted_at')->orderByDesc('id')])->orderBy('name')->get();

        return response()->json([
            'total_balance' => round((float) $accounts->sum('balance'), 2),
            'accounts' => $accounts,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', 'in:bank,credit,wallet,other'],
            'initial_balance' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
        ]);

        $account = DB::transaction(function () use ($request, $data) {
            $balance = (float) ($data['initial_balance'] ?? 0);
            $account = $request->user()->accounts()->create([
                'name' => $data['name'], 'type' => $data['type'], 'balance' => $balance,
            ]);

            if ($balance > 0) {
                $account->transactions()->create([
                    'user_id' => $request->user()->id,
                    'type' => 'opening_balance',
                    'amount' => $balance,
                    'description' => 'Saldo inicial',
                    'transacted_at' => now(),
                ]);
            }

            return $account;
        });

        return response()->json(['message' => 'Cuenta creada.', 'account' => $account->load('transactions')], 201);
    }

    public function deposit(Request $request, int $accountId): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'max:999999999999.99'],
            'description' => ['nullable', 'string', 'max:120'],
            'date' => ['nullable', 'date'],
        ]);

        $account = DB::transaction(function () use ($request, $data, $accountId) {
            $account = $request->user()->accounts()->whereKey($accountId)->lockForUpdate()->firstOrFail();
            $amount = (float) $data['amount'];
            $account->increment('balance', $amount);
            $account->transactions()->create([
                'user_id' => $request->user()->id,
                'type' => 'deposit',
                'amount' => $amount,
                'description' => $data['description'] ?: 'Ingreso a la cuenta',
                'transacted_at' => $data['date'] ?? now(),
            ]);

            return $account->fresh()->load(['transactions' => fn ($query) => $query->orderByDesc('transacted_at')->orderByDesc('id')]);
        });

        return response()->json(['message' => 'Ingreso agregado a la cuenta.', 'account' => $account]);
    }
}
