<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\DebtController;
use App\Http\Controllers\Api\GoalController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SavingsController;
use App\Http\Middleware\AuthenticateApiToken;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware(AuthenticateApiToken::class)->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/profile', [ProfileController::class, 'update']);
    Route::get('/savings', [SavingsController::class, 'index']);
    Route::post('/savings/categories', [SavingsController::class, 'storeCategory']);
    Route::post('/savings/categories/{categoryId}/transactions', [SavingsController::class, 'transact']);
    Route::get('/debts', [DebtController::class, 'index']);
    Route::post('/debts', [DebtController::class, 'store']);
    Route::post('/debts/{debtId}/pay', [DebtController::class, 'pay']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/dashboard', [FinanceController::class, 'dashboard']);
    Route::post('/incomes', [FinanceController::class, 'storeIncome']);
    Route::post('/expenses', [FinanceController::class, 'storeExpense']);
    Route::post('/expenses/{expenseId}/complete', [FinanceController::class, 'completeExpense']);
    Route::get('/movements', [FinanceController::class, 'movements']);
    Route::get('/statistics', [FinanceController::class, 'statistics']);
    Route::get('/goals', [GoalController::class, 'index']);
    Route::post('/goals', [GoalController::class, 'store']);
    Route::post('/goals/{goalId}/contributions', [GoalController::class, 'contribute']);
    Route::get('/accounts', [AccountController::class, 'index']);
    Route::post('/accounts', [AccountController::class, 'store']);
    Route::post('/accounts/{accountId}/deposits', [AccountController::class, 'deposit']);
});
