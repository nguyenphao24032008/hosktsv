<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const IMAGE = 'ghcr.io/pterodactyl/yolks:java_25';
    private const LABEL = 'Java 25';

    public function up(): void
    {
        if (!Schema::hasTable('eggs') || !Schema::hasColumn('eggs', 'docker_images')) {
            return;
        }

        DB::table('eggs')->select(['id', 'docker_images'])->orderBy('id')->cursor()->each(function ($egg): void {
            $images = json_decode((string) ($egg->docker_images ?? '{}'), true);
            if (!is_array($images) || $images === []) {
                return;
            }

            $usesPterodactylJava = false;
            foreach ($images as $image) {
                if (str_contains((string) $image, 'ghcr.io/pterodactyl/yolks:java_')) {
                    $usesPterodactylJava = true;
                    break;
                }
            }

            if (!$usesPterodactylJava || in_array(self::IMAGE, array_values($images), true)) {
                return;
            }

            $label = self::LABEL;
            $suffix = 2;
            while (array_key_exists($label, $images)) {
                $label = self::LABEL . ' (' . $suffix++ . ')';
            }
            $images[$label] = self::IMAGE;

            DB::table('eggs')->where('id', $egg->id)->update([
                'docker_images' => json_encode($images, JSON_UNESCAPED_SLASHES),
            ]);
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('eggs') || !Schema::hasColumn('eggs', 'docker_images')) {
            return;
        }

        DB::table('eggs')->select(['id', 'docker_images'])->orderBy('id')->cursor()->each(function ($egg): void {
            $images = json_decode((string) ($egg->docker_images ?? '{}'), true);
            if (!is_array($images) || $images === []) {
                return;
            }

            $changed = false;
            foreach ($images as $label => $image) {
                if ((string) $image === self::IMAGE && str_starts_with((string) $label, self::LABEL)) {
                    unset($images[$label]);
                    $changed = true;
                }
            }

            if ($changed) {
                DB::table('eggs')->where('id', $egg->id)->update([
                    'docker_images' => json_encode($images, JSON_UNESCAPED_SLASHES),
                ]);
            }
        });
    }
};
