<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable()->after('email');
        });

        $users = DB::table('users')
            ->select(['id', 'email'])
            ->orderBy('id')
            ->get();

        foreach ($users as $user) {
            $username = $this->generateUniqueUsername(
                (int) $user->id,
                is_string($user->email) ? $user->email : null,
            );

            DB::table('users')
                ->where('id', $user->id)
                ->update(['username' => $username]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unique('username');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_username_unique');
            $table->dropColumn('username');
        });
    }

    private function generateUniqueUsername(int $userId, ?string $email): string
    {
        $base = Str::of((string) $email)
            ->before('@')
            ->lower()
            ->replaceMatches('/[^a-z0-9_]+/', '_')
            ->trim('_')
            ->value();

        if ($base === '') {
            $base = 'usuario';
        }

        $base = Str::limit($base, 40, '');
        $candidate = $base;
        $suffix = 0;

        while (DB::table('users')
            ->where('username', $candidate)
            ->where('id', '!=', $userId)
            ->exists()) {
            $suffix++;
            $suffixText = '_'.$suffix;
            $candidate = Str::limit($base, 40 - strlen($suffixText), '').$suffixText;
        }

        return $candidate;
    }
};
