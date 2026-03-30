<?php

namespace Tests\Feature\Admin;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryManagementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Ensure admins can access categories administration.
     */
    public function test_admin_can_view_categories_management_page(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $category = Category::factory()->create([
            'name' => 'Escolar',
            'slug' => 'escolar',
        ]);

        $response = $this->actingAs($admin)->get(route('admin.categories.index'));

        $response->assertOk();
        $response->assertSee($category->name);
    }

    public function test_non_admin_users_cannot_access_categories_management_page(): void
    {
        $provider = User::factory()->create([
            'role' => 'provider',
        ]);

        $response = $this->actingAs($provider)->get(route('admin.categories.index'));

        $response->assertForbidden();
    }

    public function test_admin_can_create_and_update_a_category(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $createResponse = $this->actingAs($admin)->post(route('admin.categories.store'), [
            'name' => 'Institucional',
            'slug' => 'institucional',
            'is_active' => true,
        ]);

        $createResponse->assertRedirect(route('admin.categories.index'));

        $category = Category::query()->where('slug', 'institucional')->firstOrFail();

        $updateResponse = $this->actingAs($admin)->patch(route('admin.categories.update', $category), [
            'name' => 'Institucional Premium',
            'slug' => 'institucional-premium',
            'is_active' => false,
        ]);

        $updateResponse->assertRedirect(route('admin.categories.index'));

        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'name' => 'Institucional Premium',
            'slug' => 'institucional-premium',
            'is_active' => false,
        ]);
    }

    public function test_admin_can_delete_empty_category_but_not_one_with_products(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $emptyCategory = Category::factory()->create();
        $categoryWithProducts = Category::factory()->create();

        Product::factory()->create([
            'category_id' => $categoryWithProducts->id,
        ]);

        $deleteEmptyResponse = $this->actingAs($admin)->delete(route('admin.categories.destroy', $emptyCategory));
        $deleteEmptyResponse->assertRedirect(route('admin.categories.index'));

        $this->assertDatabaseMissing('categories', [
            'id' => $emptyCategory->id,
        ]);

        $deleteBlockedResponse = $this->actingAs($admin)->delete(route('admin.categories.destroy', $categoryWithProducts));
        $deleteBlockedResponse->assertSessionHasErrors('deleteCategory');

        $this->assertDatabaseHas('categories', [
            'id' => $categoryWithProducts->id,
        ]);
    }
}
