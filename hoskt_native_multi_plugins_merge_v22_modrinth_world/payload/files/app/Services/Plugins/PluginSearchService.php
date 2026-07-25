<?php

namespace Pterodactyl\Services\Plugins;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Pterodactyl\Models\ThemeSettings;

/**
 * HOSKT-native Minecraft Plugin Installer backend.
 *
 * This service ports the provider/search behavior from the user's Blueprint
 * MC Plugins addon into the HOSKT v10 native plugin tab. It intentionally
 * does not install or require Blueprint, avoiding Blueprint overwriting the
 * HOSKT frontend/theme files.
 */
class PluginSearchService
{
    private Client $modrinth;
    private Client $curseforge;
    private Client $hangar;
    private Client $spigot;

    public function __construct()
    {
        $this->modrinth = new Client([
            'base_uri' => 'https://api.modrinth.com/v2/',
            'timeout' => 20,
            'headers' => ['User-Agent' => 'HOSKT-Pterodactyl-MCPlugins/1.0'],
        ]);

        $this->curseforge = new Client([
            'base_uri' => 'https://api.curseforge.com/v1/',
            'timeout' => 20,
            'headers' => [
                'Accept' => 'application/json',
                'X-API-Key' => (string) $this->setting('addons.minecraft_plugin_installer.settings.curseforge_api_key', ''),
            ],
        ]);

        $this->hangar = new Client([
            'base_uri' => 'https://hangar.papermc.io/api/v1/',
            'timeout' => 20,
            'headers' => ['User-Agent' => 'HOSKT-Pterodactyl-MCPlugins/1.0'],
        ]);

        $this->spigot = new Client([
            'base_uri' => 'https://api.spiget.org/v2/',
            'timeout' => 20,
            'headers' => ['User-Agent' => 'HOSKT-Pterodactyl-MCPlugins/1.0'],
        ]);
    }

    /**
     * Search plugins for the HOSKT frontend.
     * Expected return shape:
     * [plugins => [], totalCount => int, page => int, pageSize => int]
     */
    public function search(array $params): array
    {
        $page = max(1, (int) ($params['page'] ?? 1));
        $pageSize = min(50, max(1, (int) ($params['pageSize'] ?? 20)));
        $query = trim((string) ($params['query'] ?? ''));
        $gameVersion = trim((string) ($params['gameVersion'] ?? '')) ?: null;
        $loader = trim((string) ($params['loader'] ?? '')) ?: null;

        $platforms = $params['platforms'] ?? ['modrinth', 'hangar', 'spigot'];
        if (!is_array($platforms)) {
            $platforms = [$platforms];
        }

        $allowedPlatforms = $this->allowedPlatforms();
        $platforms = array_values(array_intersect($platforms, $allowedPlatforms));
        if (empty($platforms)) {
            $platforms = array_values(array_intersect(['modrinth', 'hangar', 'spigot'], $allowedPlatforms));
        }

        $allPlugins = [];
        $total = 0;

        foreach ($platforms as $platform) {
            try {
                $result = match ($platform) {
                    'modrinth' => $this->searchModrinth($query, $gameVersion, $loader, $page, $pageSize),
                    'curseforge' => $this->searchCurseForge($query, $gameVersion, $page, $pageSize),
                    'hangar' => $this->searchHangar($query, $gameVersion, $loader, $page, $pageSize),
                    'spigot' => $this->searchSpigot($query, $page, $pageSize),
                    default => ['plugins' => [], 'totalCount' => 0],
                };

                $allPlugins = array_merge($allPlugins, $result['plugins']);
                $total += (int) $result['totalCount'];
            } catch (\Throwable $e) {
                // Keep the UI usable even if one provider is down or missing an API key.
                report($e);
            }
        }

        // Stable order: most downloaded first, then name.
        usort($allPlugins, function (array $a, array $b): int {
            $downloadCompare = ($b['downloads'] ?? 0) <=> ($a['downloads'] ?? 0);
            return $downloadCompare !== 0 ? $downloadCompare : strcmp($a['name'] ?? '', $b['name'] ?? '');
        });

        // When multiple platforms are selected, each provider already paged its own result.
        // Limit the combined output to avoid very large grids on mobile.
        $allPlugins = array_slice($allPlugins, 0, $pageSize * max(1, count($platforms)));

        return [
            'plugins' => $allPlugins,
            'totalCount' => max($total, count($allPlugins)),
            'page' => $page,
            'pageSize' => $pageSize,
        ];
    }

    /**
     * Get versions for a plugin. The HOSKT frontend installs using Wings pullFile
     * with the downloadUrl and fileName returned here.
     */
    public function getVersions(string $platform, string $pluginId, ?string $gameVersion = null, ?string $loader = null): array
    {
        $platform = strtolower($platform);

        try {
            return match ($platform) {
                'modrinth' => $this->getModrinthVersions($pluginId, $gameVersion, $loader),
                'curseforge' => $this->getCurseForgeVersions($pluginId, $gameVersion),
                'hangar' => $this->getHangarVersions($pluginId, $loader),
                'spigot' => $this->getSpigotVersions($pluginId),
                default => [],
            };
        } catch (\Throwable $e) {
            report($e);
            return [];
        }
    }

    private function searchModrinth(string $query, ?string $gameVersion, ?string $loader, int $page, int $pageSize): array
    {
        $facets = [['project_type:plugin'], ['server_side!=unsupported']];
        if ($loader) {
            $facets[] = ['categories:' . $loader];
        }
        if ($gameVersion) {
            $facets[] = ['versions:' . $gameVersion];
        }

        $response = $this->modrinth->get('search', [
            'query' => [
                'limit' => $pageSize,
                'offset' => ($page - 1) * $pageSize,
                'query' => $query,
                'index' => 'downloads',
                'facets' => json_encode($facets),
            ],
        ]);

        $data = json_decode((string) $response->getBody(), true) ?: [];
        $plugins = array_map(fn (array $item): array => [
            'id' => (string) ($item['project_id'] ?? $item['slug'] ?? ''),
            'platform' => 'modrinth',
            'name' => (string) ($item['title'] ?? 'Unknown'),
            'description' => (string) ($item['description'] ?? ''),
            'author' => 'Modrinth',
            'iconUrl' => $item['icon_url'] ?? null,
            'externalUrl' => 'https://modrinth.com/plugin/' . ($item['slug'] ?? $item['project_id'] ?? ''),
            'downloads' => (int) ($item['downloads'] ?? 0),
            'lastUpdated' => $item['date_modified'] ?? null,
        ], $data['hits'] ?? []);

        return ['plugins' => $plugins, 'totalCount' => (int) ($data['total_hits'] ?? count($plugins))];
    }

    private function searchCurseForge(string $query, ?string $gameVersion, int $page, int $pageSize): array
    {
        if (trim((string) $this->setting('addons.minecraft_plugin_installer.settings.curseforge_api_key', '')) === '') {
            return ['plugins' => [], 'totalCount' => 0];
        }

        $response = $this->curseforge->get('mods/search', [
            'query' => array_filter([
                'gameId' => 432,
                'classId' => 5,
                'pageSize' => $pageSize,
                'index' => ($page - 1) * $pageSize,
                'searchFilter' => $query,
                'gameVersion' => $gameVersion,
                'sortField' => 6, // popularity / downloads in CurseForge API enum.
                'sortOrder' => 'desc',
            ], fn ($value) => $value !== null && $value !== ''),
        ]);

        $data = json_decode((string) $response->getBody(), true) ?: [];
        $plugins = array_map(fn (array $item): array => [
            'id' => (string) ($item['id'] ?? ''),
            'platform' => 'curseforge',
            'name' => (string) ($item['name'] ?? 'Unknown'),
            'description' => (string) ($item['summary'] ?? ''),
            'author' => Arr::get($item, 'authors.0.name', 'CurseForge'),
            'iconUrl' => Arr::get($item, 'logo.url'),
            'externalUrl' => $item['links']['websiteUrl'] ?? ('https://www.curseforge.com/minecraft/bukkit-plugins/' . ($item['slug'] ?? $item['id'] ?? '')),
            'downloads' => (int) ($item['downloadCount'] ?? 0),
            'lastUpdated' => $item['dateModified'] ?? null,
        ], $data['data'] ?? []);

        return ['plugins' => $plugins, 'totalCount' => (int) Arr::get($data, 'pagination.totalCount', count($plugins))];
    }

    private function searchHangar(string $query, ?string $gameVersion, ?string $loader, int $page, int $pageSize): array
    {
        $response = $this->hangar->get('projects', [
            'query' => array_filter([
                'limit' => $pageSize,
                'offset' => ($page - 1) * $pageSize,
                'query' => $query,
                'version' => $gameVersion,
                'platform' => $this->hangarPlatform($loader),
                'sort' => '-downloads',
            ], fn ($value) => $value !== null && $value !== ''),
        ]);

        $data = json_decode((string) $response->getBody(), true) ?: [];
        $plugins = array_map(fn (array $item): array => [
            'id' => (string) ($item['name'] ?? ''),
            'platform' => 'hangar',
            'name' => (string) ($item['name'] ?? 'Unknown'),
            'description' => (string) ($item['description'] ?? ''),
            'author' => Arr::get($item, 'namespace.owner', 'Hangar'),
            'iconUrl' => $item['avatarUrl'] ?? null,
            'externalUrl' => 'https://hangar.papermc.io/' . Arr::get($item, 'namespace.owner', '') . '/' . ($item['name'] ?? ''),
            'downloads' => (int) Arr::get($item, 'stats.downloads', 0),
            'lastUpdated' => $item['lastUpdated'] ?? null,
        ], $data['result'] ?? []);

        return ['plugins' => $plugins, 'totalCount' => (int) Arr::get($data, 'pagination.count', count($plugins))];
    }

    private function searchSpigot(string $query, int $page, int $pageSize): array
    {
        $endpoint = $query !== '' ? 'search/resources/' . rawurlencode($query) : 'resources';
        $response = $this->spigot->get($endpoint, [
            'query' => [
                'size' => $pageSize,
                'page' => $page,
                'sort' => '-downloads',
            ],
        ]);

        $data = json_decode((string) $response->getBody(), true) ?: [];
        $plugins = array_map(function (array $item): array {
            $id = (string) ($item['id'] ?? '');
            return [
                'id' => $id,
                'platform' => 'spigot',
                'name' => html_entity_decode((string) ($item['name'] ?? 'Unknown')),
                'description' => html_entity_decode((string) ($item['tag'] ?? '')),
                'author' => Arr::get($item, 'author.name', 'SpigotMC'),
                'iconUrl' => isset($item['icon']['url']) ? 'https://www.spigotmc.org/' . ltrim($item['icon']['url'], '/') : null,
                'externalUrl' => 'https://www.spigotmc.org/resources/' . $id,
                'downloads' => (int) ($item['downloads'] ?? 0),
                'lastUpdated' => isset($item['updateDate']) ? date('c', (int) $item['updateDate']) : null,
            ];
        }, is_array($data) ? $data : []);

        return ['plugins' => $plugins, 'totalCount' => count($plugins) < $pageSize ? count($plugins) : max($page * $pageSize + 1, 300)];
    }

    private function getModrinthVersions(string $pluginId, ?string $gameVersion, ?string $loader): array
    {
        $query = [];
        if ($gameVersion) {
            $query['game_versions'] = json_encode([$gameVersion]);
        }
        if ($loader) {
            $query['loaders'] = json_encode([$loader]);
        }

        $response = $this->modrinth->get('project/' . rawurlencode($pluginId) . '/version', ['query' => $query]);
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
                'fileName' => (string) ($file['filename'] ?? (($version['name'] ?? 'plugin') . '.jar')),
                'releaseDate' => $version['date_published'] ?? null,
                'downloads' => (int) ($version['downloads'] ?? 0),
            ];
        }, $data)));
    }

    private function getCurseForgeVersions(string $pluginId, ?string $gameVersion): array
    {
        if (trim((string) $this->setting('addons.minecraft_plugin_installer.settings.curseforge_api_key', '')) === '') {
            return [];
        }

        $response = $this->curseforge->get('mods/' . rawurlencode($pluginId) . '/files', [
            'query' => array_filter(['gameVersion' => $gameVersion], fn ($value) => $value !== null && $value !== ''),
        ]);
        $data = json_decode((string) $response->getBody(), true) ?: [];

        return array_values(array_filter(array_map(function (array $file): ?array {
            $downloadUrl = $file['downloadUrl'] ?? null;
            if (!$downloadUrl) {
                return null;
            }

            return [
                'id' => (string) ($file['id'] ?? ''),
                'name' => (string) ($file['displayName'] ?? $file['fileName'] ?? 'Unknown'),
                'gameVersions' => array_values($file['gameVersions'] ?? []),
                'downloadUrl' => (string) str_replace('edge', 'mediafiles', $downloadUrl),
                'fileName' => (string) ($file['fileName'] ?? 'plugin.jar'),
                'releaseDate' => $file['fileDate'] ?? null,
                'downloads' => (int) ($file['downloadCount'] ?? 0),
            ];
        }, $data['data'] ?? [])));
    }

    private function getHangarVersions(string $pluginId, ?string $loader): array
    {
        $response = $this->hangar->get('projects/' . rawurlencode($pluginId) . '/versions');
        $data = json_decode((string) $response->getBody(), true) ?: [];
        $platform = $this->hangarPlatform($loader) ?: 'PAPER';
        $versions = [];

        foreach (($data['result'] ?? []) as $version) {
            $downloads = $version['downloads'] ?? [];
            $download = $downloads[$platform] ?? Arr::first($downloads);
            if (!$download) {
                continue;
            }

            $url = $download['downloadUrl'] ?? $download['externalUrl'] ?? null;
            if (!$url) {
                continue;
            }

            $versions[] = [
                'id' => (string) ($version['name'] ?? ''),
                'name' => (string) ($version['name'] ?? 'Unknown'),
                'gameVersions' => array_values($version['platformDependencies'][$platform] ?? []),
                'downloadUrl' => (string) $url,
                'fileName' => (string) Arr::get($download, 'fileInfo.name', Str::slug($pluginId) . '.jar'),
                'releaseDate' => $version['createdAt'] ?? null,
                'downloads' => (int) Arr::get($version, 'stats.downloads', 0),
            ];
        }

        return $versions;
    }

    private function getSpigotVersions(string $pluginId): array
    {
        $response = $this->spigot->get('resources/' . rawurlencode($pluginId) . '/versions', [
            'query' => ['sort' => '-releaseDate'],
        ]);
        $data = json_decode((string) $response->getBody(), true) ?: [];

        return array_map(function (array $version) use ($pluginId): array {
            $id = (string) ($version['id'] ?? $pluginId);
            $name = html_entity_decode((string) ($version['name'] ?? $id));

            return [
                'id' => $id,
                'name' => $name,
                'gameVersions' => [],
                'downloadUrl' => 'https://api.spiget.org/v2/resources/' . rawurlencode($pluginId) . '/versions/' . rawurlencode($id) . '/download',
                'fileName' => Str::slug($name ?: $pluginId) . '.jar',
                'releaseDate' => isset($version['releaseDate']) ? date('c', (int) $version['releaseDate']) : null,
                'downloads' => (int) ($version['downloads'] ?? 0),
            ];
        }, is_array($data) ? $data : []);
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

    private function hangarPlatform(?string $loader): ?string
    {
        return match (strtolower((string) $loader)) {
            'velocity' => 'VELOCITY',
            'waterfall' => 'WATERFALL',
            default => 'PAPER',
        };
    }

    private function allowedPlatforms(): array
    {
        $platforms = $this->setting('addons.minecraft_plugin_installer.settings.platforms', ['modrinth', 'curseforge', 'hangar', 'spigot']);
        if (!is_array($platforms)) {
            return ['modrinth', 'curseforge', 'hangar', 'spigot'];
        }
        return array_values(array_intersect($platforms, ['modrinth', 'curseforge', 'hangar', 'spigot']));
    }

    private function setting(string $key, mixed $default = null): mixed
    {
        try {
            if (class_exists(ThemeSettings::class)) {
                return ThemeSettings::getValue($key, $default);
            }
        } catch (\Throwable) {
            // Ignore and fall back.
        }

        return $default;
    }
}
