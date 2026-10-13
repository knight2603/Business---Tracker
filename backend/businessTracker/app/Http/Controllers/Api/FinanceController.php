<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class FinanceController extends Controller
{
    private const CATEGORIES = [
        'needs' => ['label' => 'Necesidades', 'percentage' => 50],
        'wants' => ['label' => 'Deseos', 'percentage' => 30],
        'savings' => ['label' => 'Ahorro', 'percentage' => 20],
    ];

    public function dashboard(Request $request): JsonResponse
    {
        [$start, $end, $month] = $this->period($request);
        $income = (float) $request->user()->incomes()->whereBetween('received_at', [$start, $end])->sum('amount');
        $expenses = $request->user()->expenses()->whereBetween('spent_at', [$start, $end])->get();

        $categories = [];
        foreach (self::CATEGORIES as $key => $category) {
            $limit = round($income * $category['percentage'] / 100, 2);
            $categoryExpenses = $expenses->where('category', $key);
            $spent = round((float) $categoryExpenses->where('is_completed', true)->sum('amount'), 2);
            $checkedCount = $categoryExpenses->where('is_completed', true)->count();
            $totalCount = $categoryExpenses->count();
            $categories[$key] = [
                ...$category,
                'limit' => $limit,
                'spent' => $spent,
                'remaining' => round($limit - $spent, 2),
                'checked_count' => $checkedCount,
                'total_count' => $totalCount,
                'progress' => $totalCount > 0 ? round($checkedCount / $totalCount * 100) : 0,
                'expenses' => $categoryExpenses->sortByDesc('created_at')->values(),
            ];
        }

        return response()->json([
            'month' => $month,
            'income' => round($income, 2),
            'overall_progress' => $expenses->count() > 0
                ? (int) round($expenses->where('is_completed', true)->count() / $expenses->count() * 100)
                : 0,
            'checked_count' => $expenses->where('is_completed', true)->count(),
            'total_count' => $expenses->count(),
            'categories' => $categories,
            'recent_incomes' => $request->user()->incomes()->whereBetween('received_at', [$start, $end])->orderByDesc('received_at')->orderByDesc('id')->get(),
        ]);
    }

    public function storeIncome(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999.99'],
            'description' => ['required', 'string', 'max:120'],
            'date' => ['required', 'date'],
        ]);

        $income = $request->user()->incomes()->create([
            'amount' => $data['amount'],
            'description' => $data['description'],
            'received_at' => $data['date'],
        ]);

        return response()->json(['message' => 'Ingreso registrado.', 'income' => $income], 201);
    }

    public function storeExpense(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999.99'],
            'description' => ['required', 'string', 'max:120'],
            'category' => ['required', Rule::in(array_keys(self::CATEGORIES))],
            'date' => ['required', 'date'],
        ]);

        $expense = $request->user()->expenses()->create([
            'amount' => $data['amount'],
            'description' => $data['description'],
            'category' => $data['category'],
            'spent_at' => $data['date'],
        ]);

        return response()->json(['message' => 'Gasto registrado.', 'expense' => $expense], 201);
    }

    public function completeExpense(Request $request, int $expenseId): JsonResponse
    {
        $expense = $request->user()->expenses()->findOrFail($expenseId);

        if (! $expense->is_completed) {
            $expense->forceFill([
                'is_completed' => true,
                'completed_at' => now(),
            ])->save();
        }

        return response()->json(['message' => 'Gasto marcado y registrado en movimientos.', 'expense' => $expense->fresh()]);
    }

    public function movements(Request $request): JsonResponse
    {
        $movements = $request->user()->expenses()
            ->where('is_completed', true)
            ->orderByDesc('completed_at')
            ->get();

        return response()->json([
            'total' => round((float) $movements->sum('amount'), 2),
            'count' => $movements->count(),
            'movements' => $movements,
        ]);
    }

    public function statistics(Request $request): JsonResponse
    {
        $data = $request->validate([
            'months' => ['sometimes', 'integer', 'min:3', 'max:12'],
        ]);
        $monthCount = (int) ($data['months'] ?? 12);
        $currentMonth = Carbon::now()->startOfMonth();
        $start = $currentMonth->copy()->subMonths($monthCount - 1);
        $end = $currentMonth->copy()->endOfMonth()->endOfDay();
        $startKey = $start->toDateString();
        $endKey = $end->toDateTimeString();

        $incomesByMonth = [];
        foreach ($request->user()->incomes()->whereBetween('received_at', [$startKey, $end->toDateString()])->get(['amount', 'received_at']) as $income) {
            $key = Carbon::parse($income->received_at)->format('Y-m');
            $incomesByMonth[$key] = ($incomesByMonth[$key] ?? 0) + (float) $income->amount;
        }

        $expensesByMonth = [];
        foreach ($request->user()->expenses()->where('is_completed', true)->whereBetween('completed_at', [$startKey, $endKey])->get(['amount', 'category', 'completed_at']) as $expense) {
            $key = Carbon::parse($expense->completed_at)->format('Y-m');
            $expensesByMonth[$key] ??= ['needs' => 0, 'wants' => 0, 'savings' => 0, 'count' => 0];
            $expensesByMonth[$key][$expense->category] += (float) $expense->amount;
            $expensesByMonth[$key]['count']++;
        }

        $months = [];
        for ($offset = 0; $offset < $monthCount; $offset++) {
            $date = $start->copy()->addMonths($offset);
            $key = $date->format('Y-m');
            $income = round($incomesByMonth[$key] ?? 0, 2);
            $spentByCategory = $expensesByMonth[$key] ?? ['needs' => 0, 'wants' => 0, 'savings' => 0, 'count' => 0];
            $categories = [];
            foreach (['needs' => 50, 'wants' => 30, 'savings' => 20] as $category => $percentage) {
                $limit = round($income * $percentage / 100, 2);
                $spent = round($spentByCategory[$category], 2);
                $categories[$category] = [
                    'percentage' => $percentage,
                    'limit' => $limit,
                    'spent' => $spent,
                    'remaining' => round($limit - $spent, 2),
                ];
            }
            $spent = round($categories['needs']['spent'] + $categories['wants']['spent'] + $categories['savings']['spent'], 2);
            $months[] = [
                'month' => $key,
                'label' => $date->locale('es')->translatedFormat('M y'),
                'income' => $income,
                'spent' => $spent,
                'remaining' => round($income - $spent, 2),
                'completed_count' => $spentByCategory['count'],
                'categories' => $categories,
            ];
        }

        return response()->json(['months' => $months]);
    }

    private function period(Request $request): array
    {
        $month = $request->query('month', now()->format('Y-m'));
        validator(['month' => $month], ['month' => ['required', 'date_format:Y-m']])->validate();
        $date = Carbon::createFromFormat('Y-m', $month);

        return [$date->copy()->startOfMonth()->toDateString(), $date->copy()->endOfMonth()->toDateString(), $month];
    }
}
