<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

abstract class Controller
{
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->filled('role_id')) {
            $query->where('role_id', $request->role_id);
        }

        if ($request->filled('search')) {
            $query->where(function($q) use ($request) {
                $q->where('first_name', 'like', "%{$request->search}%")
                  ->orWhere('last_name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('order_by')) {
            $direction = $request->input('direction', 'asc');
            $query->orderBy($request->order_by, $direction);
        }

        $users = $query->paginate($request->input('per_page', 15));
        return response()->json($users);
    }
}
