<?php

namespace Database\Seeders;

use App\Enums\DiscountType;
use App\Enums\UserRole;
use App\Models\Product;
use App\Models\Provider;
use App\Models\ProviderProduct;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ProviderProductCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $providersCreated = 0;
        $productsCreated = 0;
        $assignmentsCreated = 0;

        foreach ($this->catalogRows() as $row) {
            $provider = $this->resolveProvider($row['provider']);

            if ($provider->wasRecentlyCreated) {
                $providersCreated++;
            }

            $product = Product::query()->updateOrCreate(
                ['code' => $row['code']],
                [
                    'barcode' => $row['barcode'],
                    'name' => $row['product'],
                    'description' => null,
                    'original_price' => $row['price'],
                    'is_active' => true,
                ],
            );

            if ($product->wasRecentlyCreated) {
                $productsCreated++;
            }

            $providerProduct = ProviderProduct::query()->updateOrCreate(
                [
                    'provider_id' => $provider->id,
                    'product_id' => $product->id,
                ],
                [
                    'discount_type' => DiscountType::PERCENT->value,
                    'discount_value' => 0,
                    'special_price' => $row['price'],
                    'is_active' => true,
                ],
            );

            if ($providerProduct->wasRecentlyCreated) {
                $assignmentsCreated++;
            }
        }

        $this->command?->info('ProviderProductCatalogSeeder completado.');
        $this->command?->line('Proveedores creados: '.$providersCreated);
        $this->command?->line('Productos creados: '.$productsCreated);
        $this->command?->line('Asignaciones creadas: '.$assignmentsCreated);
    }

    private function resolveProvider(string $companyName): Provider
    {
        $provider = Provider::query()
            ->where('company_name', $companyName)
            ->first();

        if ($provider instanceof Provider) {
            if (! $provider->is_active) {
                $provider->forceFill(['is_active' => true])->save();
            }

            return $provider;
        }

        $email = $this->buildProviderEmail($companyName);
        $username = $this->buildProviderUsername($companyName);

        $user = User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => $companyName,
                'username' => $username,
                'password' => Hash::make(Str::random(40)),
                'role' => UserRole::PROVIDER->value,
                'email_verified_at' => now(),
            ],
        );

        if ($user->role !== UserRole::PROVIDER->value || blank($user->username)) {
            $user->forceFill([
                'role' => UserRole::PROVIDER->value,
                'username' => blank($user->username) ? $username : $user->username,
            ])->save();
        }

        return Provider::query()->create([
            'user_id' => $user->id,
            'company_name' => $companyName,
            'stand_label' => $companyName,
            'is_active' => true,
        ]);
    }

    private function buildProviderEmail(string $companyName): string
    {
        $slug = Str::slug(Str::lower($companyName), '.');

        if ($slug === '') {
            $slug = 'proveedor';
        }

        $localPart = Str::limit($slug, 40, '');
        $hash = substr(md5($companyName), 0, 8);

        return $localPart.'.'.$hash.'@proveedores.unidos.local';
    }

    private function buildProviderUsername(string $companyName): string
    {
        $slug = Str::slug(Str::lower($companyName), '_');

        if ($slug === '') {
            $slug = 'proveedor';
        }

        $base = Str::limit($slug, 30, '');
        $hash = substr(md5($companyName), 0, 6);

        return $base.'_'.$hash;
    }

    /**
     * @return array<int, array{provider: string, product: string, barcode: string, code: string, price: string}>
     */
    private function catalogRows(): array
    {
        $table = <<<'TABLE'
ABSORBENTES DE COLOMBIA SA|PROTECTORES DIARIOS UNIDOS X15UND CX72|7709036009928|599|1.452,00
ABSORBENTES DE COLOMBIA SA|TOALLA HIGIENICA DELGADA UNIDOS X10UND CX72|7709371361576|598|2.371,00
ABSORBENTES DE COLOMBIA SA|TOALLA HIGIENICA NOCTURNA UNIDOS X8UND CX24|7707324640396|864|3.520,00
AGROAL DEL CAMPO ZONA FRANCA S.A.S|HARINA DE MAIZ AMARILLA UNIDOS X500GR PX24|7709167659078|369|1.398,00
AGROINDUSTRIAL MOLINO SONORA AP SAS|ARROZ PAHORRAR X450GR PX25|7709103676909|2307|1.322,00
AGROINDUSTRIAL MOLINO SONORA AP SAS|ARROZ PREMIUM UNIDOS X1000GR PX15|7709958277962|545|4.784,00
ALIANZA LATINOAMERICANA DE PRODUCTOS SAS|LAVALOZA CREMA LIMON PAHORRAR REPUESTO X3000GR CX6|7709144769837|2629|10.368,00
ALIANZA LATINOAMERICANA DE PRODUCTOS SAS|LAVALOZA CREMA LIMON PAHORRAR X3000GR CX6|7709144769882|4046|12.401,00
ALIANZA LATINOAMERICANA DE PRODUCTOS SAS|LAVALOZA LIQUIDO VALVULA UNIDOS X 1000+SOPORTE+ESPONJA CX12|7708245682731|2776|6.599,00
ALIMENTOS PRECOCIDOS DE COLOMBIA S.A.S|7 GRANOS PRECOL X 200GR CX36|7707194750409|2675|3.645,00
ALIMENTOS PRECOCIDOS DE COLOMBIA S.A.S|AVENA HOJUELAS UNIDOS X250GR PX48|7708267515796|040|2.484,00
ALIMENTOS PRECOCIDOS DE COLOMBIA S.A.S|AVENA INSTANTANEA FRESA UNIDOS X200GR CX36|7708267515789|041|4.982,00
ALIMENTOS PRECOCIDOS DE COLOMBIA S.A.S|AVENA INSTANTANEA VAINILLA UNIDOS X200GR CX36|7708696356687|042|4.982,00
ALIMENTOS PRECOCIDOS DE COLOMBIA S.A.S|AVENA MOLIDA UNIDOS X250GR PX48|7708696356809|044|2.484,00
ALIMENTOS Y VINOS DE ESPAÑA SAS|ACEITE DE OLIVA 100% PURO UNIDOS X1000ML CX15|7708267515260|973|33.361,00
ALIMENTOS Y VINOS DE ESPAÑA SAS|ACEITE DE OLIVA 100% PURO UNIDOS X500ML CX24|7709144769899|894|20.736,00
BERHLAN DE COLOMBIA SAS|DETERGENTE LIQUIDO FLORAL SUPER B X3000GR PX4|7707426915712|2872|12.359,00
BERHLAN DE COLOMBIA SAS|DETERGENTE LIQUIDO FLORAL UNIDOS X4000ML CX4|7709651609015|3008|18.161,00
BERHLAN DE COLOMBIA SAS|JABON CORPORAL FRUTAL AMATIC X750ML CX12|7707291393769|2642|10.651,00
BERHLAN DE COLOMBIA SAS|JABON LIQ ANTIBACTERIAL ESPUMOSO VIOLET GARDEN AMATIC X270ML CX12|7707426917976|2647|6.269,00
BERHLAN DE COLOMBIA SAS|LAVALOZA CREMA LIMON UNIDOS X3000GR CX4|7708258290596|207|16.688,00
BERHLAN DE COLOMBIA SAS|LAVALOZA CREMA LIMON UNIDOS X500GR CX24|7708258290138|357|3.335,00
BERHLAN DE COLOMBIA SAS|LAVALOZA LIQUIDO LIMON VALVULA UNIDOS X3080ML CX4|7709144769875|2418|14.896,00
BERHLAN DE COLOMBIA SAS|LIMPIAPISOS BICARBONATO UNIDOS X2000ML CX6|7708258290305|1446|5.411,00
C Y P DEL RISARALDA SA|PAPEL HIGIENICO UNIDOS TRIPLE HOJA X12UND PX4|7708258290268|2350|13.909,00
C Y P DEL RISARALDA SA|PAPEL HIGIENICO UNIDOS TRIPLE HOJA X6UND PX8|7707306925961|2461|7.383,00
CAFE Y COMPAÑIA SAS CAFE&CO SAS EN REESTRUCTURACION|CAFE UNIDOS X125GR PX20|7708696356076|063|5.329,00
CAFE Y COMPAÑIA SAS CAFE&CO SAS EN REESTRUCTURACION|CAFE UNIDOS X250GR PX25|7708267515413|064|10.283,00
CAFE Y COMPAÑIA SAS CAFE&CO SAS EN REESTRUCTURACION|CAFE UNIDOS X500GR PX25|7708696356854|065|20.018,00
CARLOS ALBERTO GALLON MARIN Y/O MULTINALPLAST|BOLSA CASERA NEGRA UNIDOS ROLLO X10UND CX60|7709080702769|2931|2.736,00
CARLOS ALBERTO GALLON MARIN Y/O MULTINALPLAST|BOLSA INDUSTRIAL NEGRA UNIDOS ROLLO X10UND CX40|7709080702783|2945|4.142,00
CARLOS ALBERTO GALLON MARIN Y/O MULTINALPLAST|BOLSA KIT RECICLAJE APARTAMENTO UNIDOS ROLLO CX15|7709080702738|2947|3.598,00
CARLOS ALBERTO GALLON MARIN Y/O MULTINALPLAST|BOLSA PAPELERA BLANCA UNIDOS ROLLO X10UND CX40|7709080702721|2946|1.468,00
CARLOS ALBERTO GALLON MARIN Y/O MULTINALPLAST||||
TABLE;

        $rows = [];

        foreach (preg_split('/\r\n|\r|\n/', trim($table)) as $line) {
            $columns = array_map('trim', explode('|', $line));

            if (count($columns) < 5) {
                continue;
            }

            [$provider, $product, $barcode, $code, $price] = array_pad($columns, 5, '');

            if ($provider === '' || $product === '' || $barcode === '' || $code === '' || $price === '') {
                continue;
            }

            $rows[] = [
                'provider' => $provider,
                'product' => $product,
                'barcode' => $barcode,
                'code' => $code,
                'price' => $this->parsePrice($price),
            ];
        }

        return $rows;
    }

    private function parsePrice(string $value): string
    {
        $normalized = str_replace('.', '', trim($value));
        $normalized = str_replace(',', '.', $normalized);

        return number_format((float) $normalized, 2, '.', '');
    }
}
