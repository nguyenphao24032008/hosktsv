<?php

namespace Pterodactyl\Services\Minecraft\Maps;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\BadResponseException;
use GuzzleHttp\Exception\TransferException;
use Pterodactyl\Models\Server;
use RuntimeException;

final class ModrinthMapService extends AbstractMapService
{
    protected Client $client;

    public function __construct(private WorldArchiveInstaller $worldArchiveInstaller)
    {
        parent::__construct();

        $this->client = new Client([
            'headers' => [
                'Accept' => 'application/json',
                'User-Agent' => preg_replace('/[^a-zA-Z0-9()._ \/:\-]/', '', $this->userAgent),
            ],
            'base_uri' => 'https://api.modrinth.com/v2/',
            'connect_timeout' => 8,
            'timeout' => 25,
        ]);
    }

    public function search(string $query, int $pageSize, int $page): array
    {
        // Modrinth does not expose a dedicated map/world project type. Search
        // server-capable modpacks and verify the downloaded archive at install time.
        $effectiveQuery = trim($query) !== '' ? trim($query) : 'world';

        try {
            $response = json_decode((string) $this->client->get('search', [
                'query' => [
                    'query' => $effectiveQuery,
                    'facets' => json_encode([
                        ['project_type:modpack'],
                        ['server_side!=unsupported'],
                    ], JSON_THROW_ON_ERROR),
                    'index' => trim($query) === '' ? 'downloads' : 'relevance',
                    'offset' => ($page - 1) * $pageSize,
                    'limit' => $pageSize,
                ],
            ])->getBody(), true, 512, JSON_THROW_ON_ERROR);
        } catch (TransferException $exception) {
            $this->logTransferException('searching Modrinth worlds', $exception);
            throw new RuntimeException('Modrinth map search failed. Check outbound HTTPS and DNS connectivity.');
        } catch (\JsonException $exception) {
            throw new RuntimeException('Modrinth returned an invalid map-search response.', 0, $exception);
        }

        if (!is_array($response) || !is_array($response['hits'] ?? null)) {
            throw new RuntimeException('Modrinth returned an invalid map-search response.');
        }

        $maps = [];
        foreach ($response['hits'] as $project) {
            $projectId = (string) ($project['project_id'] ?? '');
            if ($projectId === '') {
                continue;
            }

            $slug = (string) ($project['slug'] ?? $projectId);
            $maps[] = [
                'id' => $projectId,
                'name' => (string) ($project['title'] ?? 'Unknown Modrinth project'),
                'url' => 'https://modrinth.com/modpack/' . rawurlencode($slug),
                'icon_url' => empty($project['icon_url']) ? null : (string) $project['icon_url'],
            ];
        }

        return [
            'data' => $maps,
            'total' => (int) ($response['total_hits'] ?? count($maps)),
        ];
    }

    public function install(Server $server, string $mapId): void
    {
        try {
            $project = json_decode((string) $this->client->get('project/' . rawurlencode($mapId))->getBody(), true, 512, JSON_THROW_ON_ERROR);
            $versions = json_decode((string) $this->client->get('project/' . rawurlencode($mapId) . '/version')->getBody(), true, 512, JSON_THROW_ON_ERROR);
        } catch (TransferException $exception) {
            $this->logTransferException('fetching a Modrinth world version', $exception);
            throw new RuntimeException('Unable to fetch the selected project versions from Modrinth.');
        } catch (\JsonException $exception) {
            throw new RuntimeException('Modrinth returned invalid project or version data.', 0, $exception);
        }

        if (!is_array($versions) || $versions === []) {
            throw new RuntimeException('Modrinth did not return any downloadable versions for this project.');
        }

        usort($versions, static function (array $a, array $b): int {
            $aRelease = ($a['version_type'] ?? '') === 'release' ? 1 : 0;
            $bRelease = ($b['version_type'] ?? '') === 'release' ? 1 : 0;
            if ($aRelease !== $bRelease) {
                return $bRelease <=> $aRelease;
            }

            return strcmp((string) ($b['date_published'] ?? ''), (string) ($a['date_published'] ?? ''));
        });

        $selectedFile = null;
        foreach ($versions as $version) {
            $selectedFile = $this->selectArchiveFile(is_array($version['files'] ?? null) ? $version['files'] : []);
            if ($selectedFile !== null) {
                break;
            }
        }

        if ($selectedFile === null) {
            throw new RuntimeException('No supported ZIP, TAR, TGZ, or MRPACK file was found for this Modrinth project.');
        }

        $fallbackName = (string) ($project['slug'] ?? $project['title'] ?? ('modrinth-' . $mapId));
        $this->worldArchiveInstaller->installFromUrl(
            $server,
            (string) $selectedFile['url'],
            (string) $selectedFile['filename'],
            $fallbackName
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
            $filename = (string) ($file['filename'] ?? '');
            $url = (string) ($file['url'] ?? '');
            if ($filename === '' || $url === '' || !$this->isSupportedArchive($filename)) {
                continue;
            }

            $lower = strtolower($filename);
            $score = !empty($file['primary']) ? 100 : 0;
            $score += preg_match('/(?:map|world|save)/i', $lower) ? 90 : 0;
            $score += str_ends_with($lower, '.zip') ? 35 : 0;
            $score += str_ends_with($lower, '.tar') || str_ends_with($lower, '.tar.gz') || str_ends_with($lower, '.tgz') ? 30 : 0;
            $score += str_ends_with($lower, '.mrpack') ? 20 : 0;

            $candidates[] = ['file' => $file, 'score' => $score];
        }

        if ($candidates === []) {
            return null;
        }

        usort($candidates, static fn (array $a, array $b): int => $b['score'] <=> $a['score']);

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

    private function logTransferException(string $operation, TransferException $exception): void
    {
        $context = ['operation' => $operation, 'exception' => $exception->getMessage()];
        if ($exception instanceof BadResponseException && $exception->getResponse()) {
            $context['status'] = $exception->getResponse()->getStatusCode();
            $context['response'] = \GuzzleHttp\Psr7\Message::toString($exception->getResponse());
        }

        logger()->error('Modrinth world provider request failed.', $context);
    }
}
