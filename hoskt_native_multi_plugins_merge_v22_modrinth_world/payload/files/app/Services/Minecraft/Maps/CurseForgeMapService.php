<?php

namespace Pterodactyl\Services\Minecraft\Maps;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\BadResponseException;
use GuzzleHttp\Exception\TransferException;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\ThemeSettings;
use RuntimeException;

enum CurseForgeSortField: int
{
    case Featured = 1;
    case Popularity = 2;
    case LastUpdated = 3;
    case Name = 4;
    case Author = 5;
    case TotalDownloads = 6;
    case Category = 7;
    case GameVersion = 8;
    case EarlyAccess = 9;
    case FeaturedReleased = 10;
    case ReleasedDate = 11;
    case Rating = 12;
}

class CurseForgeMapService extends AbstractMapService
{
    public const CURSEFORGE_MINECRAFT_GAME_ID = 432;
    public const CURSEFORGE_MINECRAFT_MAPS_CLASS_ID = 17;

    protected Client $client;
    private string $apiKey;

    public function __construct(private WorldArchiveInstaller $worldArchiveInstaller)
    {
        parent::__construct();

        $this->apiKey = $this->resolveApiKey();
        $this->client = new Client([
            'headers' => array_filter([
                'Accept' => 'application/json',
                'User-Agent' => preg_replace('/[^a-zA-Z0-9()._ \/:\-]/', '', $this->userAgent),
                'X-API-Key' => $this->apiKey,
            ], static fn ($value) => $value !== null && $value !== ''),
            'base_uri' => 'https://api.curseforge.com/v1/',
            'connect_timeout' => 8,
            'timeout' => 20,
        ]);
    }

    public function hasApiKey(): bool
    {
        return $this->apiKey !== '';
    }

    public function search(string $query, int $pageSize, int $page): array
    {
        if (!$this->hasApiKey()) {
            throw new RuntimeException(
                'CurseForge API key is missing. Add it in HOSKT Theme Settings > Addons > Minecraft Mod/Modpack/Plugin Installer, or set CURSEFORGE_API_KEY in the panel .env file.'
            );
        }

        try {
            $response = json_decode((string) $this->client->get('mods/search', [
                'query' => [
                    'index' => ($page - 1) * $pageSize,
                    'pageSize' => $pageSize,
                    'gameId' => self::CURSEFORGE_MINECRAFT_GAME_ID,
                    'classId' => self::CURSEFORGE_MINECRAFT_MAPS_CLASS_ID,
                    'searchFilter' => $query,
                    'sortField' => CurseForgeSortField::Popularity->value,
                    'sortOrder' => 'desc',
                ],
            ])->getBody(), true);
        } catch (TransferException $exception) {
            if ($exception instanceof BadResponseException && $exception->getResponse()) {
                logger()->error('Received bad response when fetching CurseForge maps.', [
                    'status' => $exception->getResponse()->getStatusCode(),
                    'response' => \GuzzleHttp\Psr7\Message::toString($exception->getResponse()),
                ]);
            } else {
                logger()->error('Unable to connect to CurseForge map API.', ['exception' => $exception->getMessage()]);
            }

            throw new RuntimeException('CurseForge map search failed. Check the API key and outbound HTTPS/DNS connectivity.');
        }

        if (!is_array($response) || !isset($response['data']) || !is_array($response['data'])) {
            throw new RuntimeException('CurseForge returned an invalid map-search response.');
        }

        $maps = [];
        foreach ($response['data'] as $curseforgeMap) {
            $mapId = (string) ($curseforgeMap['id'] ?? '');
            if ($mapId === '') {
                continue;
            }

            $maps[] = [
                'id' => $mapId,
                'name' => (string) ($curseforgeMap['name'] ?? 'Unknown map'),
                'url' => (string) ($curseforgeMap['links']['websiteUrl'] ?? '#'),
                'icon_url' => $curseforgeMap['logo']['thumbnailUrl'] ?? $curseforgeMap['logo']['url'] ?? null,
            ];
        }

        $maximumPage = (10000 - $pageSize) / $pageSize + 1;
        $total = (int) ($response['pagination']['totalCount'] ?? count($maps));

        return [
            'data' => $maps,
            'total' => min((int) ($maximumPage * $pageSize), $total),
        ];
    }

    public function install(Server $server, string $mapId): void
    {
        if (!$this->hasApiKey()) {
            throw new RuntimeException('CurseForge API key is missing.');
        }

        try {
            $response = json_decode((string) $this->client->get('mods/' . rawurlencode($mapId) . '/files')->getBody(), true);
        } catch (TransferException $exception) {
            if ($exception instanceof BadResponseException && $exception->getResponse()) {
                logger()->error('Received bad response when fetching CurseForge map files.', [
                    'response' => \GuzzleHttp\Psr7\Message::toString($exception->getResponse()),
                ]);
            }

            throw new RuntimeException('Unable to fetch the selected map file from CurseForge.');
        }

        $files = is_array($response['data'] ?? null) ? $response['data'] : [];
        $file = $this->selectArchiveFile($files);
        if ($file === null) {
            throw new RuntimeException('CurseForge did not return a supported downloadable map archive.');
        }

        $fileId = (string) ($file['id'] ?? '');
        $filename = (string) ($file['fileName'] ?? '');
        $downloadUrl = (string) ($file['downloadUrl'] ?? '');
        if ($downloadUrl !== '') {
            $downloadUrl = str_replace('edge', 'mediafiles', $downloadUrl);
        } elseif ($fileId !== '' && $filename !== '') {
            $downloadUrl = $this->guessDownloadUrl($fileId, $filename);
        }

        if ($downloadUrl === '' || $filename === '') {
            throw new RuntimeException('CurseForge returned incomplete file information for this map.');
        }

        // WorldArchiveInstaller downloads synchronously using 'foreground' => true.
        $this->worldArchiveInstaller->installFromUrl(
            $server,
            $downloadUrl,
            $filename,
            'curseforge-' . $mapId
        );
    }

    /**
     * @param array<int, array<string, mixed>> $files
     * @return array<string, mixed>|null
     */
    private function selectArchiveFile(array $files): ?array
    {
        $candidates = [];
        foreach ($files as $file) {
            $filename = (string) ($file['fileName'] ?? '');
            if ($filename === '' || !$this->isSupportedArchive($filename)) {
                continue;
            }

            $lower = strtolower($filename);
            $score = preg_match('/(?:map|world|save)/i', $lower) ? 100 : 0;
            $score += str_ends_with($lower, '.zip') ? 30 : 20;
            $score += ((int) ($file['releaseType'] ?? 3)) === 1 ? 50 : 0;
            $publishedAt = strtotime((string) ($file['fileDate'] ?? '')) ?: 0;

            $candidates[] = ['file' => $file, 'score' => $score, 'published_at' => $publishedAt];
        }

        if ($candidates === []) {
            return null;
        }

        usort($candidates, static function (array $a, array $b): int {
            if ($a['score'] !== $b['score']) {
                return $b['score'] <=> $a['score'];
            }

            return $b['published_at'] <=> $a['published_at'];
        });

        return $candidates[0]['file'];
    }

    private function isSupportedArchive(string $filename): bool
    {
        $lower = strtolower($filename);

        return str_ends_with($lower, '.zip')
            || str_ends_with($lower, '.mrpack')
            || str_ends_with($lower, '.tar')
            || str_ends_with($lower, '.tar.gz')
            || str_ends_with($lower, '.tgz');
    }

    protected function guessDownloadUrl(string $fileId, string $fileName): string
    {
        $firstFourDigits = substr($fileId, 0, 4);
        $rest = substr($fileId, 4);

        return 'https://mediafilez.forgecdn.net/files/' . $firstFourDigits . '/' . $rest . '/' . rawurlencode($fileName);
    }

    private function resolveApiKey(): string
    {
        $values = [
            config('services.curseforge.api_key'),
            config('services.curseforge_api_key'),
            env('CURSEFORGE_API_KEY', ''),
        ];

        try {
            if (class_exists(ThemeSettings::class)) {
                $values[] = ThemeSettings::getValue('addons.minecraft_mod_installer.settings.curseforge_api_key', '');
                $values[] = ThemeSettings::getValue('addons.minecraft_modpack_installer.settings.curseforge_api_key', '');
                $values[] = ThemeSettings::getValue('addons.minecraft_plugin_installer.settings.curseforge_api_key', '');
            }
        } catch (\Throwable) {
        }

        foreach ($values as $value) {
            $value = trim((string) $value);
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }
}
