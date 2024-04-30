<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        $query = Role::query();
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }
        if ($request->filled('sort_by')) {
            $direction = $request->input('direction', 'asc');
            $query->orderBy($request->sort_by, $direction);
        }
        $roles = $query->paginate($request->input('per_page', 10));
        return response()->json($roles);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
        ]);

        $role = Role::create($request->all());

        return response()->json($role, 201);
    }

    public function show($hashid)
    {
        $role = Role::findByHashid($hashid);
        if (!$role) {
            return response()->json(['message' => 'Role not found'], 404);
        }
        return response()->json($role);
    }

    public function update(Request $request, $hashid)
    {
        $role = Role::findByHashid($hashid);
        if (!$role) {
            return response()->json(['message' => 'Role not found'], 404);
        }

        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $role->id,
        ]);

        $role->update($request->all());

        return response()->json($role);
    }

    public function destroy($hashid)
    {
        $role = Role::findByHashid($hashid);
        if (!$role) {
            return response()->json(['message' => 'Role not found'], 404);
        }

        $role->delete();

        return response()->json(['message' => 'Role deleted successfully']);
    }
}
