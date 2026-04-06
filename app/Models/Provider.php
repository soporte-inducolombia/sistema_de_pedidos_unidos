<?php

namespace App\Models;

use Database\Factories\ProviderFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Provider extends Model
{
    /** @use HasFactory<ProviderFactory> */
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'provider_products')
            ->withPivot(['id', 'discount_type', 'discount_value', 'special_price', 'is_active'])
            ->withTimestamps();
    }

    public function providerProducts(): HasMany
    {
        return $this->hasMany(ProviderProduct::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
