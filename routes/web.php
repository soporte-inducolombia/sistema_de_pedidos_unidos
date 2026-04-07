<?php

use App\Http\Controllers\Admin\ProductManagementController;
use App\Http\Controllers\Admin\ProviderProductManagementController;
use App\Http\Controllers\Admin\RecycleBinManagementController;
use App\Http\Controllers\Admin\RoleManagementController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Orders\OrderController;
use App\Http\Controllers\Orders\OrderOtpVerificationController;
use App\Http\Controllers\Orders\ProviderOrderManagementController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::prefix('provider')->name('provider.')->group(function () {
        Route::get('orders', [ProviderOrderManagementController::class, 'index'])->name('orders.index');
        Route::get('orders/create', [OrderController::class, 'create'])->name('orders.create');
        Route::post('orders', [OrderController::class, 'store'])->name('orders.store');
        Route::patch('orders/{order}', [ProviderOrderManagementController::class, 'update'])->name('orders.update');
        Route::delete('orders/{order}', [ProviderOrderManagementController::class, 'destroy'])->name('orders.destroy');
        Route::get('orders/{order}/signature', [ProviderOrderManagementController::class, 'signature'])->name('orders.signature');
        Route::post('orders/{order}/verify-otp', [OrderOtpVerificationController::class, 'store'])->name('orders.verify-otp');
        Route::post('orders/{order}/resend-otp', [OrderOtpVerificationController::class, 'resend'])->name('orders.resend-otp');
    });

    Route::middleware('admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('products', [ProductManagementController::class, 'index'])->name('products.index');
        Route::post('products', [ProductManagementController::class, 'store'])->name('products.store');
        Route::patch('products/{product}', [ProductManagementController::class, 'update'])->name('products.update');
        Route::delete('products/{product}', [ProductManagementController::class, 'destroy'])->name('products.destroy');

        Route::get('provider-products', [ProviderProductManagementController::class, 'index'])->name('provider-products.index');
        Route::post('provider-products', [ProviderProductManagementController::class, 'store'])->name('provider-products.store');
        Route::patch('provider-products/{providerProduct}', [ProviderProductManagementController::class, 'update'])->name('provider-products.update');
        Route::delete('provider-products/{providerProduct}', [ProviderProductManagementController::class, 'destroy'])->name('provider-products.destroy');

        Route::get('users', [UserManagementController::class, 'index'])->name('users.index');
        Route::post('users', [UserManagementController::class, 'store'])->name('users.store');
        Route::patch('users/{user}', [UserManagementController::class, 'update'])->name('users.update');
        Route::delete('users/{user}', [UserManagementController::class, 'destroy'])->name('users.destroy');

        Route::get('recycle-bin', [RecycleBinManagementController::class, 'index'])->name('recycle-bin.index');
        Route::post('recycle-bin/{entity}/{id}/restore', [RecycleBinManagementController::class, 'restore'])->name('recycle-bin.restore');

        Route::get('roles', [RoleManagementController::class, 'index'])->name('roles.index');
        Route::post('roles', [RoleManagementController::class, 'store'])->name('roles.store');
        Route::patch('roles/{role}', [RoleManagementController::class, 'update'])->name('roles.update');
        Route::delete('roles/{role}', [RoleManagementController::class, 'destroy'])->name('roles.destroy');
    });
});

require __DIR__.'/settings.php';
