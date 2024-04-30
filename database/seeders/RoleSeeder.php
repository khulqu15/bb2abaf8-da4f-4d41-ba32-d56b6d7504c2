<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            'Administrator', 'Editor', 'Subscriber', 'Author', 'Contributor',
            'Moderator', 'Manager', 'HR', 'IT Specialist', 'Marketer',
            'Sales Executive', 'Support Staff', 'Developer', 'Product Manager',
            'Project Manager', 'Accountant', 'Chief Executive', 'Director',
            'Consultant', 'Analyst'
        ];

        foreach($roles as $role) {
            Role::create([
                'name' => $role
            ]);
        }
    }
}
