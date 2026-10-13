<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $plainTextToken = $request->bearerToken();

        if (! $plainTextToken) {
            return response()->json(['message' => 'Inicia sesión para continuar.'], 401);
        }

        $token = ApiToken::with('user')
            ->where('token_hash', hash('sha256', $plainTextToken))
            ->first();

        if (! $token || ($token->expires_at && $token->expires_at->isPast())) {
            $token?->delete();

            return response()->json(['message' => 'Tu sesión venció. Inicia sesión nuevamente.'], 401);
        }

        auth()->setUser($token->user);
        $request->attributes->set('api_token', $token);

        return $next($request);
    }
}
