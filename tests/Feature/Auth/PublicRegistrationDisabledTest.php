<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Fortify\Features;
use Tests\TestCase;

class PublicRegistrationDisabledTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_is_unavailable_when_registration_feature_is_disabled()
    {
        if (Features::enabled(Features::registration())) {
            $this->markTestSkipped('Registration feature is enabled.');
        }

        $response = $this->get('/register');

        $response->assertNotFound();
    }

    public function test_registration_submit_is_unavailable_when_registration_feature_is_disabled()
    {
        if (Features::enabled(Features::registration())) {
            $this->markTestSkipped('Registration feature is enabled.');
        }

        $response = $this->post('/register', [
            'name' => 'No Permitido',
            'username' => 'no_permitido',
            'email' => 'no.permitido@example.com',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ]);

        $response->assertNotFound();
    }
}
