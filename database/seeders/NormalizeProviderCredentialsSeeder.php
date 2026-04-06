<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class NormalizeProviderCredentialsSeeder extends Seeder
{
    public function run(): void
    {
        $temporaryPassword = '1234';
        $updatedUsers = 0;

        $users = User::query()
            ->with('provider')
            ->where('role', UserRole::PROVIDER->value)
            ->orderBy('id')
            ->get();

        foreach ($users as $user) {
            $sourceName = $user->provider?->company_name ?? $user->name;
            $baseUsername = $this->abbreviateProviderName((string) $sourceName);
            $resolvedUsername = $this->resolveUniqueUsername($baseUsername, (int) $user->id);

            $user->forceFill([
                'username' => $resolvedUsername,
                'password' => Hash::make($temporaryPassword),
            ])->save();

            $updatedUsers++;

            $this->command?->line(($sourceName ?? 'Proveedor').' => '.$resolvedUsername);
        }

        $this->command?->info('NormalizeProviderCredentialsSeeder completado.');
        $this->command?->line('Usuarios proveedor actualizados: '.$updatedUsers);
        $this->command?->line('Contrasena temporal aplicada: '.$temporaryPassword);
    }

    private function abbreviateProviderName(string $name): string
    {
        $normalized = Str::upper(Str::ascii($name));

        $normalized = str_replace(
            ['S.A.S.', 'S.A.S', 'S. A. S.', 'S.A.', 'S.A', 'S. A.', 'Y/O'],
            ['SAS', 'SAS', 'SAS', 'SA', 'SA', 'SA', 'YO'],
            $normalized,
        );

        $tokens = preg_split('/[^A-Z0-9]+/', $normalized, -1, PREG_SPLIT_NO_EMPTY);

        if (! is_array($tokens) || $tokens === []) {
            return 'proveedor';
        }

        $suffixTokens = ['SA', 'SAS', 'LTDA', 'EU', 'SASBIC'];
        $parts = [];

        foreach ($tokens as $token) {
            if ($token === '') {
                continue;
            }

            if (in_array($token, $suffixTokens, true)) {
                $parts[] = Str::lower($token);

                continue;
            }

            $parts[] = Str::lower((string) Str::of($token)->substr(0, 1));
        }

        $abbreviation = preg_replace('/[^a-z0-9]/', '', implode('', $parts)) ?? '';

        if ($abbreviation === '') {
            $abbreviation = 'proveedor';
        }

        return Str::limit($abbreviation, 30, '');
    }

    private function resolveUniqueUsername(string $baseUsername, int $currentUserId): string
    {
        $candidate = $baseUsername;
        $suffix = 0;

        while (User::query()
            ->where('username', $candidate)
            ->where('id', '!=', $currentUserId)
            ->exists()) {
            $suffix++;
            $suffixText = (string) $suffix;

            $candidate = Str::limit($baseUsername, 30 - strlen($suffixText), '').$suffixText;
        }

        return $candidate;
    }
}
