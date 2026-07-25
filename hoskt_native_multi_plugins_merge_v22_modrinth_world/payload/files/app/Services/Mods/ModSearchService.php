<?php

namespace Pterodactyl\Services\Mods;

use GuzzleHttp\Client;
use Illuminate\Support\Arr;
use Pterodactyl\Models\ThemeSettings;

/**
 * Native backend for the HOSKT Minecraft Mod Manager screen.
 *
 * Modrinth works without an API key. CurseForge is enabled only when a key is
 * configured in HOSKT Theme Settings. The response shape intentionally matches
 * the HOSKT frontend's ModController contract.
 */
class ModSearchService
{
    private Client $modrinth;
    private Client $curseforge;

    public function __construct()
    {
        $this->modrinth = new Client([
            'base_uri' => 'https://api.modrinth.com/v2/',
            'timeout' => 20,
            'headers' => [
                'Accept' => 'application/json',
                'User-Agent' => $this->userAgent('HOSKT-ModManager'),
            ],
        ]);

        $this->curseforge = new Client([
            'base_uri' => 'https://api.curseforge.com/v1/',
            'timeout' => 20,
            'headers' => array_filter([
                'Accept' => 'application/json',
                'User-Agent' => $this->userAgent('HOSKT-ModManager'),
                'X-API-Key' => $this->curseForgeApiKey(),
            ], static fn ($value) => $value !== null && $value !== ''),
        ]);
    }

    /**
     * @return array{mods: array<int,array<string,mixed>>, totalCount:int, page:int, pageSize:int}
     */
    public function search(array $params): array
    {
        $page = max(1, (int) ($params['page'] ?? 1));
        $pageSize = min(50, max(1, (int) ($params['pageSize'] ?? 20)));
        $query = trim((string) ($params['query'] ?? ''));
        $gameVersion = trim((string) ($params['gameVersion'] ?? '')) ?: null;
        $loader = trim((string) ($params['loader'] ?? '')) ?: null;

        $platforms = $params['platforms'] ?? ['modrinth', 'curseforge'];
        if (!is_array($platforms)) {
            $platforms = [$platforms];
        }

        $platforms = array_values(array_intersect(
            array_map(static fn ($value) => strtolower((string) $value), $platforms),
            $this->allowedPlatforms()
        ));

        if ($platforms === []) {
            $platforms = ['modrinth'];
        }

        $mods = [];
        $totalCount = 0;

        foreach ($platforms as $platform) {
            try {
                $result = match ($platform) {
                    'modrinth' => $this->searchModrinth($query, $gameVersion, $loader, $page, $pageSize),
                    'curseforge' => $this->searchCurseForge($query, $gameVersion, $loader, $page, $pageSize),
                    default => ['mods' => [], 'totalCount' => 0],
                };

                $mods = array_merge($mods, $result['mods']);
                $totalCount += (int) $result['totalCount'];
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        usort($mods, static function (array $left, array $right): int {
            $downloads = ((int) ($right['downloads'] ?? 0)) <=> ((int) ($left['downloads'] ?? 0));
            return $downloads !== 0 ? $downloads : strcasecmp((string) ($left['name'] ?? ''), (string) ($right['name'] ?? ''));
        });

        $mods = array_slice($mods, 0, $pageSize);

        return [
            'mods' => $mods,
            'totalCount' => max($totalCount, count($mods)),
            'page' => $page,
            'pageSize' => $pageSize,
        ];
    }

    /** @return array<int,array<string,mixed>> */
    public function getVersions(string $platform, string $modId, ?string $gameVersion = null, ?string $loader = null): array
    {
        try {
            return match (strtolower($platform)) {
                'modrinth' => $this->getModrinthVersions($modId, $gameVersion, $loader),
                'curseforge' => $this->getCurseForgeVersions($modId, $gameVersion, $loader),
                default => [],
            };
        } catch (\Throwable $exception) {
            report($exception);
            return [];
        }
    }

    /** @return string[] */
    public function getMinecraftVersions(): array
    {
        try {
            $response = $this->modrinth->get('tag/game_version');
            $data = json_decode((string) $response->getBody(), true) ?: [];

            return array_values(array_map(
                static fn (array $item): string => (string) ($item['version'] ?? ''),
                array_filter($data, static fn (array $item): bool =>
                    ($item['version_type'] ?? null) === 'release' && !empty($item['version'])
                )
            ));
        } catch (\Throwable $exception) {
            report($exception);
            return [];
        }
    }

    /** @return array{mods:array<int,array<string,mixed>>,totalCount:int} */
    private function searchModrinth(string $query, ?string $gameVersion, ?string $loader, int $page, int $pageSize): array
    {
        $facets = [
            ['project_type:mod'],
        ];

        if ($loader !== null) {
            $facets[] = ['categories:' . strtolower($loader)];
        }
        if ($gameVersion !== null) {
            $facets[] = ['versions:' . $gameVersion];
        }

        $response = $this->modrinth->get('search', [
            'query' => [
                'query' => $query,
                'limit' => $pageSize,
                'offset' => ($page - 1) * $pageSize,
                'index' => 'downloads',
                'facets' => json_encode($facets, JSON_UNESCAPED_SLASHES),
            ],
        ]);
        $data = json_decode((string) $response->getBody(), true) ?: [];

        $mods = array_map(static fn (array $item): array => [
            'id' => (string) ($item['project_id'] ?? $item['slug'] ?? ''),
            'platform' => 'modrinth',
            'name' => (string) ($item['title'] ?? 'Unknown'),
            'description' => (string) ($item['description'] ?? ''),
            'author' => (string) ($item['author'] ?? 'Modrinth'),
            'iconUrl' => $item['icon_url'] ?? null,
            'externalUrl' => 'https://modrinth.com/mod/' . ($item['slug'] ?? $item['project_id'] ?? ''),
            'downloads' => (int) ($item['downloads'] ?? 0),
            'lastUpdated' => $item['date_modified'] ?? null,
        ], $data['hits'] ?? []);

        return [
            'mods' => $mods,
            'totalCount' => (int) ($data['total_hits'] ?? count($mods)),
        ];
    }

    /** @return array{mods:array<int,array<string,mixed>>,totalCount:int} */
    private function searchCurseForge(string $query, ?string $gameVersion, ?string $loader, int $page, int $pageSize): array
    {
        if ($this->curseForgeApiKey() === '') {
            return ['mods' => [], 'totalCount' => 0];
        }

        $response = $this->curseforge->get('mods/search', [
            'query' => array_filter([
                'gameId' => 432,
                'classId' => 6,
                'pageSize' => $pageSize,
                'index' => ($page - 1) * $pageSize,
                'searchFilter' => $query,
                'gameVersion' => $gameVersion,
                'sortField' => 6,
                'sortOrder' => 'desc',
            ], static fn ($value) => $value !== null && $value !== ''),
        ]);
        $data = json_decode((string) $response->getBody(), true) ?: [];

        $mods = array_map(static fn (array $item): array => [
            'id' => (string) ($item['id'] ?? ''),
            'platform' => 'curseforge',
            'name' => (string) ($item['name'] ?? 'Unknown'),
            'description' => (string) ($item['summary'] ?? ''),
            'author' => (string) Arr::get($item, 'authors.0.name', 'CurseForge'),
            'iconUrl' => Arr::get($item, 'logo.url'),
            'externalUrl' => $item['links']['websiteUrl'] ?? null,
            'downloads' => (int) ($item['downloadCount'] ?? 0),
            'lastUpdated' => $item['dateModified'] ?? null,
        ], $data['data'] ?? []);

        return [
            'mods' => $mods,
            'totalCount' => (int) Arr::get($data, 'pagination.totalCount', count($mods)),
        ];
    }

    /** @return array<int,array<string,mixed>> */
    private function getModrinthVersions(string $modId, ?string $gameVersion, ?string $loader): array
    {
        $query = [];
        if ($gameVersion) {
            $query['game_versions'] = json_encode([$gameVersion]);
        }
        if ($loader) {
            $query['loaders'] = json_encode([strtolower($loader)]);
        }

        $response = $this->modrinth->get('project/' . rawurlencode($modId) . '/version', ['query' => $query]);
        $data = json_decode((string) $response->getBody(), true) ?: [];

        return array_values(array_filter(array_map(function (array $version): ?array {
            $file = $this->chooseJarFile($version['files'] ?? []);
            if (!$file || empty($file['url'])) {
                return null;
            }

            return [
                'id' => (string) ($version['id'] ?? ''),
                'name' => (string) ($version['name'] ?? $version['version_number'] ?? 'Unknown'),
                'gameVersions' => array_values($version['game_versions'] ?? []),
                'downloadUrl' => (string) $file['url'],
                'fileName' => (string) ($file['filename'] ?? 'mod.jar'),
                'releaseDate' => $version['date_published'] ?? null,
                'downloads' => (int) ($version['downloads'] ?? 0),
            ];
        }, $data)));
    }

    /** @return array<int,array<string,mixed>> */
    private function getCurseForgeVersions(string $modId, ?string $gameVersion, ?string $loader): array
    {
        if ($this->curseForgeApiKey() === '') {
            return [];
        }

        $response = $this->curseforge->get('mods/' . rawurlencode($modId) . '/files', [
            'query' => array_filter(['gameVersion' => $gameVersion], static fn ($value) => $value !== null && $value !== ''),
        ]);
        $data = json_decode((string) $response->getBody(), true) ?: [];
        $wantedLoader = strtolower((string) $loader);

        return array_values(array_filter(array_map(static function (array $file) use ($wantedLoader): ?array {
            $gameVersions = array_values($file['gameVersions'] ?? []);
            if ($wantedLoader !== '') {
                $normalized = array_map(static fn ($value) => strtolower((string) $value), $gameVersions);
                if (!in_array($wantedLoader, $normalized, true)) {
                    return null;
                }
            }

            $downloadUrl = $file['downloadUrl'] ?? null;
            if (!$downloadUrl) {
                return null;
            }

            return [
                'id' => (string) ($file['id'] ?? ''),
                'name' => (string) ($file['displayName'] ?? $file['fileName'] ?? 'Unknown'),
                'gameVersions' => $gameVersions,
                'downloadUrl' => (string) str_replace('edge', 'mediafiles', $downloadUrl),
                'fileName' => (string) ($file['fileName'] ?? 'mod.jar'),
                'releaseDate' => $file['fileDate'] ?? null,
                'downloads' => (int) ($file['downloadCount'] ?? 0),
            ];
        }, $data['data'] ?? [])));
    }

    private function chooseJarFile(array $files): ?array
    {
        foreach ($files as $file) {
            if (!empty($file['primary']) && str_ends_with(strtolower((string) ($file['filename'] ?? '')), '.jar')) {
                return $file;
            }
        }
        foreach ($files as $file) {
            if (str_ends_with(strtolower((string) ($file['filename'] ?? '')), '.jar')) {
                return $file;
            }
        }

        return $files[0] ?? null;
    }

    /** @return string[] */
    private function allowedPlatforms(): array
    {
        $platforms = $this->setting('addons.minecraft_mod_installer.settings.platforms', [
            'modrinth' => true,
            'curseforge' => true,
        ]);
        if (!is_array($platforms)) {
            return ['modrinth', 'curseforge'];
        }

        // HOSKT stores platform toggles as an associative map, while some older
        // installs store a simple list. Accept both shapes without changing UI.
        if (!array_is_list($platforms)) {
            $platforms = array_keys(array_filter($platforms, static fn ($enabled) => (bool) $enabled));
        }

        $allowed = array_values(array_intersect(
            array_map(static fn ($value) => strtolower((string) $value), $platforms),
            ['modrinth', 'curseforge']
        ));

        return $allowed !== [] ? $allowed : ['modrinth'];
    }

    private function curseForgeApiKey(): string
    {
        foreach ([
            'addons.minecraft_mod_installer.settings.curseforge_api_key',
            'addons.minecraft_modpack_installer.settings.curseforge_api_key',
            'addons.minecraft_plugin_installer.settings.curseforge_api_key',
        ] as $key) {
            $value = trim((string) $this->setting($key, ''));
            if ($value !== '') {
                return $value;
            }
        }

        return trim((string) (config('services.curseforge.api_key')
            ?? config('services.curseforge_api_key')
            ?? env('CURSEFORGE_API_KEY', '')));
    }

    private function setting(string $key, mixed $default = null): mixed
    {
        try {
            if (class_exists(ThemeSettings::class)) {
                return ThemeSettings::getValue($key, $default);
            }
        } catch (\Throwable) {
        }

        return $default;
    }

    private function userAgent(string $product): string
    {
        $contact = trim((string) config('app.url', '')) ?: 'https://pterodactyl.io';
        return $product . '/18 (' . $contact . ')';
    }
}
