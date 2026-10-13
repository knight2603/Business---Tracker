<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Goal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class GoalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();
        $monthlyIncome = (float) $request->user()->incomes()
            ->whereBetween('received_at', [$monthStart, $monthEnd])
            ->sum('amount');
        $savingsCapacity = round($monthlyIncome * 0.20, 2);

        $goals = $request->user()->goals()->with('contributions')->orderBy('target_date')->get()->map(function (Goal $goal) use ($savingsCapacity) {
            $saved = round((float) $goal->contributions->sum('amount'), 2);
            $target = (float) $goal->target_amount;
            $remaining = max(0, round($target - $saved, 2));
            $installment = (float) $goal->monthly_installment;
            $monthsAtPlannedRate = $remaining > 0 && $installment > 0 ? (int) ceil($remaining / $installment) : 0;

            return [
                'id' => $goal->id,
                'name' => $goal->name,
                'target_amount' => $target,
                'saved_amount' => $saved,
                'remaining_amount' => $remaining,
                'progress' => $target > 0 ? min(100, round($saved / $target * 100, 1)) : 0,
                'term_unit' => $goal->term_unit,
                'term_value' => (int) $goal->term_value,
                'target_date' => $goal->target_date->toDateString(),
                'monthly_installment' => $installment,
                'on_track' => $installment <= $savingsCapacity,
                'estimated_finish_date' => now()->addMonths($monthsAtPlannedRate)->toDateString(),
                'photo_url' => $goal->photo_path ? '/storage/'.$goal->photo_path : null,
                'is_complete' => $remaining <= 0,
                'contributions' => $goal->contributions->sortByDesc('contributed_at')->take(5)->values(),
            ];
        });

        return response()->json([
            'monthly_income' => round($monthlyIncome, 2),
            'savings_capacity' => $savingsCapacity,
            'goals' => $goals,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'target_amount' => ['required', 'numeric', 'gt:0', 'max:999999999999.99'],
            'term_unit' => ['required', 'in:month,year'],
            'term_value' => ['required', 'integer', 'min:1', 'max:120'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        // Laravel's integer validation accepts numeric strings but keeps the input string.
        // Carbon's addMonths() requires an int/float, so normalize before date arithmetic.
        $data['term_value'] = (int) $data['term_value'];

        if ($data['term_unit'] === 'year' && $data['term_value'] > 10) {
            throw ValidationException::withMessages(['term_value' => ['El plazo máximo es de 10 años.']]);
        }

        $termMonths = (int) ($data['term_unit'] === 'year' ? $data['term_value'] * 12 : $data['term_value']);
        $targetDate = now()->addMonths($termMonths)->toDateString();
        $photoPath = $request->file('photo')?->storePublicly('goals/'.$request->user()->id, 'public');

        $goal = $request->user()->goals()->create([
            'name' => $data['name'],
            'target_amount' => $data['target_amount'],
            'term_unit' => $data['term_unit'],
            'term_value' => $data['term_value'],
            'target_date' => $targetDate,
            'monthly_installment' => round((float) $data['target_amount'] / $termMonths, 2),
            'photo_path' => $photoPath,
        ]);

        return response()->json(['message' => 'Meta creada.', 'goal_id' => $goal->id], 201);
    }

    public function contribute(Request $request, int $goalId): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'max:999999999999.99'],
        ]);

        $result = DB::transaction(function () use ($request, $goalId, $data) {
            $goal = $request->user()->goals()->whereKey($goalId)->lockForUpdate()->firstOrFail();
            $current = (float) $goal->contributions()->sum('amount');
            $remaining = round((float) $goal->target_amount - $current, 2);

            if ($remaining <= 0) {
                throw ValidationException::withMessages(['amount' => ['Esta meta ya se completó. ¡Crea una nueva!']]);
            }

            if ((float) $data['amount'] > $remaining) {
                throw ValidationException::withMessages(['amount' => ['El aporte no puede superar lo que falta para completar la meta.']]);
            }

            $goal->contributions()->create([
                'amount' => $data['amount'],
                'contributed_at' => now(),
            ]);

            $saved = round($current + (float) $data['amount'], 2);

            return [
                'saved_amount' => $saved,
                'remaining_amount' => max(0, round((float) $goal->target_amount - $saved, 2)),
                'is_complete' => $saved >= (float) $goal->target_amount,
            ];
        });

        return response()->json([
            'message' => $result['is_complete'] ? '¡Meta alcanzada! Tu disciplina hizo posible este logro.' : 'Aporte agregado a tu meta.',
            ...$result,
        ], 201);
    }
}
