<?php

namespace Pterodactyl\Services\Minecraft;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * License-free Minecraft Java version catalogue used by the HOSKT Version
 * Manager. V20 keeps the V18/V19 UI contract while replacing the old Bagou
 * catalogue and CDN with public upstream metadata.
 */
class NativeVersionCatalogService
{
    public const SOURCE = 'hoskt-native-v18';
    private const PAGE_SIZE = 16;

    /** @return string[] */
    public function supportedTypes(): array
    {
        return [
            'vanilla',
            'snapshot',
            'spigot',
            'paper',
            'purpur',
            'sponge',
            'bungeecord',
            'waterfall',
            'velocity',
            'forge',
            'fabric',
            'mohist',
            'magma',
            'catserver',
        ];
    }

    public function supports(string $type): bool
    {
        return in_array(strtolower($type), $this->supportedTypes(), true);
    }

    /**
     * @return array{message:string,data:array<int,array<string,mixed>>,page:int,native:bool}
     */
    public function list(string $type, int $page = 1): array
    {
        $type = strtolower(trim($type));
        $page = max(1, $page);

        $items = Cache::remember('hoskt:version-manager:v20:' . $type, now()->addMinutes(10), function () use ($type): array {
            return match ($type) {
                'vanilla' => $this->mojangVersions('release'),
                'snapshot' => $this->mojangVersions('snapshot'),
                'spigot' => $this->spigotVersions(),
                'paper' => $this->paperProjectVersions('paper'),
                'purpur' => $this->purpurVersions(),
                'sponge' => $this->spongeVersions(),
                'bungeecord' => [[
                    'version' => 'latest',
                    'source' => self::SOURCE,
                    'provider' => 'bungeecord-jenkins',
                    'java' => 17,
                ]],
                'waterfall' => $this->paperProjectVersions('waterfall'),
                'velocity' => $this->paperProjectVersions('velocity'),
                'forge' => $this->forgeVersions(),
                'fabric' => $this->fabricGameVersions(),
                'mohist' => $this->mohistVersions(),
                'magma' => $this->githubReleaseJars([
                    'magmafoundation/Magma-Forge',
                    'magmafoundation/Magma-Neo',
                    'magmafoundation/Magma',
                ], 'magma'),
                'catserver' => $this->githubReleaseJars(['Luohuayu/CatServer'], 'catserver'),
                default => [],
            };
        });

        return $this->paginate($items, $page);
    }

    /**
     * @param array<string,mixed> $item
     * @return array{url:string,filename:string,size:int,archive:bool,java:int,install_mode?:string}
     */
    public function resolveDownload(string $type, array $item): array
    {
        $type = strtolower(trim($type));

        return match ($type) {
            'vanilla', 'snapshot' => $this->resolveMojang($item),
            'spigot' => $this->resolveSpigot($item),
            'paper' => $this->resolvePaperProject('paper', $item),
            'purpur' => $this->resolvePurpur($item),
            'sponge' => $this->resolveSponge($item),
            'bungeecord' => $this->resolveBungeeCord(),
            'waterfall' => $this->resolvePaperProject('waterfall', $item),
            'velocity' => $this->resolvePaperProject('velocity', $item),
            'forge' => $this->resolveForge($item),
            'fabric' => $this->resolveFabric($item),
            'mohist' => $this->resolveMohist($item),
            'magma', 'catserver' => $this->resolveGithubAsset($item),
            default => throw new RuntimeException('This version type is not supported by the native V20 catalogue.'),
        };
    }

    /** @return array<int,array<string,mixed>> */
    private function mojangVersions(string $wantedType): array
    {
        $manifest = $this->http()->get('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')->throw()->json();
        $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];

        $result = [];
        foreach ($versions as $version) {
            if (($version['type'] ?? null) !== $wantedType || empty($version['id']) || empty($version['url'])) {
                continue;
            }

            $id = (string) $version['id'];
            $result[] = [
                'version' => $id,
                'source' => self::SOURCE,
                'provider' => 'mojang',
                'manifest_url' => (string) $version['url'],
                'release_time' => $version['releaseTime'] ?? null,
                'java' => $this->javaForMinecraftVersion($id),
            ];
        }

        return $result;
    }

    /** @return array<int,array<string,mixed>> */
    private function spigotVersions(): array
    {
        $versions = [];
        foreach ($this->mojangVersions('release') as $item) {
            $version = (string) ($item['version'] ?? '');
            if (!$this->isAtLeastMinecraft($version, '1.8')) {
                continue;
            }

            $versions[] = [
                'version' => $version,
                'source' => self::SOURCE,
                'provider' => 'spigot-buildtools',
                'java' => $this->javaForMinecraftVersion($version),
                'bootstrap' => true,
            ];
        }

        return $versions;
    }

    /** @return array<int,array<string,mixed>> */
    private function paperProjectVersions(string $project): array
    {
        try {
            $response = $this->paperHttp()->get("https://fill.papermc.io/v3/projects/{$project}")->throw()->json();
            $groups = is_array($response['versions'] ?? null) ? $response['versions'] : [];
            $versions = [];

            foreach ($groups as $group) {
                if (!is_array($group)) {
                    continue;
                }
                foreach ($group as $version) {
                    $version = (string) $version;
                    if ($version === '' || preg_match('/(?:pre|rc|snapshot)/i', $version)) {
                        continue;
                    }
                    $versions[] = $version;
                }
            }

            if ($versions !== []) {
                return $this->paperVersionRows($project, $versions, 'papermc-fill');
            }
        } catch (\Throwable $exception) {
            logger()->notice('PaperMC Fill catalogue unavailable; trying the archived v2 catalogue.', [
                'project' => $project,
                'message' => $exception->getMessage(),
            ]);
        }

        return $this->legacyPaperProjectVersions($project);
    }

    /** @return array<int,array<string,mixed>> */
    private function legacyPaperProjectVersions(string $project): array
    {
        $response = $this->paperHttp()->get("https://api.papermc.io/v2/projects/{$project}")->throw()->json();
        $versions = is_array($response['versions'] ?? null) ? $response['versions'] : [];

        return $this->paperVersionRows($project, array_map('strval', $versions), 'papermc-v2-archive');
    }

    /**
     * @param string[] $versions
     * @return array<int,array<string,mixed>>
     */
    private function paperVersionRows(string $project, array $versions, string $provider): array
    {
        $versions = array_values(array_filter(array_unique($versions), static function (string $version): bool {
            return $version !== '' && !preg_match('/(?:pre|rc|snapshot)/i', $version);
        }));
        usort($versions, static fn (string $left, string $right): int => version_compare($right, $left));

        return array_map(function (string $version) use ($project, $provider): array {
            return [
                'version' => $version,
                'source' => self::SOURCE,
                'provider' => $provider,
                'project' => $project,
                'legacy_paper_api' => $provider === 'papermc-v2-archive',
                'java' => $project === 'velocity' ? 21 : $this->javaForMinecraftVersion($version),
            ];
        }, $versions);
    }

    /** @return array<int,array<string,mixed>> */
    private function purpurVersions(): array
    {
        $response = $this->http()->get('https://api.purpurmc.org/v2/purpur/')->throw()->json();
        $versions = is_array($response['versions'] ?? null) ? $response['versions'] : [];
        $versions = array_values(array_unique(array_map('strval', $versions)));
        usort($versions, static fn (string $left, string $right): int => version_compare($right, $left));

        return array_map(fn (string $version): array => [
            'version' => $version,
            'source' => self::SOURCE,
            'provider' => 'purpur',
            'java' => $this->javaForMinecraftVersion($version),
        ], $versions);
    }

    /** @return array<int,array<string,mixed>> */
    private function spongeVersions(): array
    {
        $versions = [];

        try {
            $response = $this->fastHttp()
                ->get('https://dl-api.spongepowered.org/v1/org.spongepowered/spongevanilla')
                ->throw()
                ->json();
            $versions = $this->collectStrings($response, static function (string $value): bool {
                return (bool) preg_match('/^\d+\.\d+(?:\.\d+)?-\d+(?:\.\d+){1,3}(?:[-+._A-Za-z0-9]*)$/', $value);
            });
        } catch (\Throwable $exception) {
            logger()->notice('Sponge catalogue API unavailable; using safe fallback list.', [
                'message' => $exception->getMessage(),
            ]);
        }

        if ($versions === []) {
            try {
                $recommended = $this->fastHttp()
                    ->get('https://dl-api.spongepowered.org/v1/org.spongepowered/spongevanilla/downloads/recommended')
                    ->throw()
                    ->json();
                if (!empty($recommended['version'])) {
                    $versions[] = (string) $recommended['version'];
                }
            } catch (\Throwable) {
            }
        }

        // Keeps Version Manager usable even when Sponge's catalogue endpoint is slow or offline.
        if ($versions === []) {
            $versions = [
                '1.21.1-12.0.2',
                '1.20.6-11.0.0',
                '1.20.4-11.0.0',
                '1.20.1-11.0.0',
                '1.19.4-10.0.0',
                '1.19.2-10.0.0',
            ];
        }

        $versions = array_values(array_unique($versions));
        usort($versions, function (string $left, string $right): int {
            $leftMc = $this->minecraftVersionFromText($left) ?? '0';
            $rightMc = $this->minecraftVersionFromText($right) ?? '0';
            $compare = version_compare($rightMc, $leftMc);
            return $compare !== 0 ? $compare : strnatcasecmp($right, $left);
        });

        return array_map(fn (string $version): array => [
            'version' => $version,
            'source' => self::SOURCE,
            'provider' => 'sponge-download-api',
            'java' => $this->javaForMinecraftVersion($this->minecraftVersionFromText($version) ?? $version),
        ], $versions);
    }

    /** @return array<int,array<string,mixed>> */
    private function forgeVersions(): array
    {
        $xml = $this->http()
            ->withHeaders(['Accept' => 'application/xml,text/xml;q=0.9,*/*;q=0.8'])
            ->get('https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml')
            ->throw()
            ->body();

        preg_match_all('/<version>([^<]+)<\/version>/i', $xml, $matches);
        $latestByMinecraft = [];

        foreach ($matches[1] ?? [] as $fullVersion) {
            $fullVersion = trim(html_entity_decode((string) $fullVersion, ENT_QUOTES | ENT_XML1));
            if (!preg_match('/^(\d+\.\d+(?:\.\d+)?)-(.+)$/', $fullVersion, $match)) {
                continue;
            }
            if (preg_match('/(?:snapshot|beta|alpha)/i', $fullVersion)) {
                continue;
            }

            $minecraft = $match[1];
            if (!isset($latestByMinecraft[$minecraft]) || version_compare($fullVersion, $latestByMinecraft[$minecraft], '>')) {
                $latestByMinecraft[$minecraft] = $fullVersion;
            }
        }

        uksort($latestByMinecraft, static fn (string $left, string $right): int => version_compare($right, $left));

        $result = [];
        foreach ($latestByMinecraft as $minecraft => $fullVersion) {
            $result[] = [
                'version' => $fullVersion,
                'minecraft_version' => $minecraft,
                'source' => self::SOURCE,
                'provider' => 'forge-maven',
                'java' => $this->javaForMinecraftVersion($minecraft),
                'bootstrap' => true,
            ];
        }

        return $result;
    }

    /** @return array<int,array<string,mixed>> */
    private function fabricGameVersions(): array
    {
        $response = $this->http()->get('https://meta.fabricmc.net/v2/versions/game')->throw()->json();
        $versions = [];

        foreach (is_array($response) ? $response : [] as $entry) {
            if (empty($entry['version']) || empty($entry['stable'])) {
                continue;
            }
            $version = (string) $entry['version'];
            $versions[] = [
                'version' => $version,
                'source' => self::SOURCE,
                'provider' => 'fabric',
                'java' => $this->javaForMinecraftVersion($version),
            ];
        }

        return $versions;
    }

    /** @return array<int,array<string,mixed>> */
    private function mohistVersions(): array
    {
        $versions = [];
        try {
            $response = $this->http()->get('https://mohistmc.com/api/v2/projects/mohist')->throw()->json();
            $versions = $this->collectStrings($response, static function (string $value): bool {
                return (bool) preg_match('/^1\.\d+(?:\.\d+)?$/', $value);
            });
        } catch (\Throwable) {
        }

        if ($versions === []) {
            $versions = ['1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.7.10'];
        }

        $versions = array_values(array_unique($versions));
        usort($versions, static fn (string $left, string $right): int => version_compare($right, $left));

        return array_map(fn (string $version): array => [
            'version' => $version,
            'source' => self::SOURCE,
            'provider' => 'mohist-api',
            'java' => $this->javaForMinecraftVersion($version),
        ], $versions);
    }

    /**
     * @param string[] $repositories
     * @return array<int,array<string,mixed>>
     */
    private function githubReleaseJars(array $repositories, string $provider): array
    {
        $items = [];
        foreach ($repositories as $repository) {
            try {
                $releases = $this->http()
                    ->get('https://api.github.com/repos/' . $repository . '/releases', ['per_page' => 50])
                    ->throw()
                    ->json();
            } catch (\Throwable) {
                continue;
            }

            foreach (is_array($releases) ? $releases : [] as $release) {
                if (!is_array($release) || !empty($release['draft'])) {
                    continue;
                }
                foreach (is_array($release['assets'] ?? null) ? $release['assets'] : [] as $asset) {
                    if (!is_array($asset)) {
                        continue;
                    }
                    $filename = (string) ($asset['name'] ?? '');
                    $url = (string) ($asset['browser_download_url'] ?? '');
                    if ($filename === '' || $url === '' || !preg_match('/\.jar$/i', $filename)) {
                        continue;
                    }
                    if (preg_match('/(?:sources|javadoc).*\.jar$/i', $filename)) {
                        continue;
                    }
                    if ($provider !== 'magma' && preg_match('/(?:installer|universal).*\.jar$/i', $filename)) {
                        continue;
                    }
                    if ($provider === 'magma' && !preg_match('/(?:magma|server).*\.jar$/i', $filename)) {
                        continue;
                    }

                    $labelText = implode(' ', [
                        (string) ($release['name'] ?? ''),
                        (string) ($release['tag_name'] ?? ''),
                        $filename,
                    ]);
                    $minecraft = $this->minecraftVersionFromText($labelText);
                    $version = trim(($minecraft ? $minecraft . ' · ' : '') . ((string) ($release['tag_name'] ?? $release['name'] ?? $filename)));

                    $items[$url] = [
                        'version' => $version !== '' ? $version : $filename,
                        'minecraft_version' => $minecraft,
                        'source' => self::SOURCE,
                        'provider' => $provider . '-github',
                        'download_url' => $url,
                        'filename' => $filename,
                        'size' => (int) ($asset['size'] ?? 0),
                        'published_at' => (string) ($release['published_at'] ?? ''),
                        'java' => $this->javaForMinecraftVersion($minecraft ?? '1.16.5'),
                    ];
                }
            }
        }

        $items = array_values($items);
        usort($items, static fn (array $left, array $right): int => strcmp((string) ($right['published_at'] ?? ''), (string) ($left['published_at'] ?? '')));

        return $items;
    }

    /** @param array<string,mixed> $item */
    private function resolveMojang(array $item): array
    {
        $manifestUrl = trim((string) ($item['manifest_url'] ?? ''));
        if ($manifestUrl === '') {
            throw new RuntimeException('Mojang version metadata URL is missing. Refresh the version list and try again.');
        }

        $metadata = $this->http()->get($manifestUrl)->throw()->json();
        $server = $metadata['downloads']['server'] ?? null;
        if (!is_array($server) || empty($server['url'])) {
            throw new RuntimeException('This Mojang version does not publish a dedicated server JAR.');
        }

        $version = $this->safeFilename((string) ($item['version'] ?? $metadata['id'] ?? 'minecraft'));

        return [
            'url' => (string) $server['url'],
            'filename' => "minecraft-server-{$version}.jar",
            'size' => (int) ($server['size'] ?? 0),
            'archive' => false,
            'java' => (int) ($metadata['javaVersion']['majorVersion'] ?? $item['java'] ?? $this->javaForMinecraftVersion($version)),
        ];
    }

    /** @param array<string,mixed> $item */
    private function resolveSpigot(array $item): array
    {
        $version = trim((string) ($item['version'] ?? ''));
        if ($version === '') {
            throw new RuntimeException('Spigot version is missing.');
        }

        $url = 'https://hub.spigotmc.org/jenkins/job/BuildTools/lastSuccessfulBuild/artifact/target/BuildTools.jar';

        return [
            'url' => $url,
            'filename' => 'BuildTools.jar',
            'size' => $this->contentLength($url),
            'archive' => false,
            'java' => (int) ($item['java'] ?? $this->javaForMinecraftVersion($version)),
            'install_mode' => 'spigot-buildtools',
        ];
    }

    /** @param array<string,mixed> $item */
    private function resolvePaperProject(string $project, array $item): array
    {
        $version = trim((string) ($item['version'] ?? ''));
        if ($version === '') {
            throw new RuntimeException('PaperMC version is missing.');
        }

        if (empty($item['legacy_paper_api'])) {
            try {
                $builds = $this->paperHttp()
                    ->get("https://fill.papermc.io/v3/projects/{$project}/versions/" . rawurlencode($version) . '/builds')
                    ->throw()
                    ->json();

                if (is_array($builds) && $builds !== []) {
                    $build = null;
                    foreach ($builds as $candidate) {
                        if (($candidate['channel'] ?? null) === 'STABLE') {
                            $build = $candidate;
                            break;
                        }
                    }
                    $build ??= $builds[0] ?? null;

                    if (is_array($build)) {
                        $downloads = is_array($build['downloads'] ?? null) ? $build['downloads'] : [];
                        $download = $downloads['server:default'] ?? reset($downloads);
                        if (is_array($download) && !empty($download['url'])) {
                            return [
                                'url' => (string) $download['url'],
                                'filename' => $this->safeFilename((string) ($download['name'] ?? "{$project}-{$version}.jar")),
                                'size' => (int) ($download['size'] ?? 0),
                                'archive' => false,
                                'java' => (int) ($item['java'] ?? ($project === 'velocity' ? 21 : $this->javaForMinecraftVersion($version))),
                            ];
                        }
                    }
                }
            } catch (\Throwable $exception) {
                logger()->notice('PaperMC Fill download lookup unavailable; trying the archived v2 API.', [
                    'project' => $project,
                    'version' => $version,
                    'message' => $exception->getMessage(),
                ]);
            }
        }

        return $this->resolveLegacyPaperProject($project, $version, $item);
    }

    /** @param array<string,mixed> $item */
    private function resolveLegacyPaperProject(string $project, string $version, array $item): array
    {
        $response = $this->paperHttp()
            ->get("https://api.papermc.io/v2/projects/{$project}/versions/" . rawurlencode($version) . '/builds')
            ->throw()
            ->json();
        $builds = is_array($response['builds'] ?? null) ? $response['builds'] : [];
        $build = $builds !== [] ? end($builds) : null;
        if (!is_array($build) || empty($build['build'])) {
            throw new RuntimeException('No archived PaperMC build is available for this version.');
        }

        $downloads = is_array($build['downloads'] ?? null) ? $build['downloads'] : [];
        $download = $downloads['application'] ?? reset($downloads);
        if (!is_array($download) || empty($download['name'])) {
            throw new RuntimeException('The archived PaperMC API did not return a server download.');
        }

        $filename = $this->safeFilename((string) $download['name']);
        $buildNumber = (int) $build['build'];
        $url = "https://api.papermc.io/v2/projects/{$project}/versions/"
            . rawurlencode($version) . '/builds/' . $buildNumber . '/downloads/' . rawurlencode($filename);

        return [
            'url' => $url,
            'filename' => $filename,
            'size' => $this->contentLength($url),
            'archive' => false,
            'java' => (int) ($item['java'] ?? ($project === 'velocity' ? 21 : $this->javaForMinecraftVersion($version))),
        ];
    }

    /** @param array<string,mixed> $item */
    private function resolvePurpur(array $item): array
    {
        $version = trim((string) ($item['version'] ?? ''));
        if ($version === '') {
            throw new RuntimeException('Purpur version is missing.');
        }

        $url = 'https://api.purpurmc.org/v2/purpur/' . rawurlencode($version) . '/latest/download';

        return [
            'url' => $url,
            'filename' => 'purpur-' . $this->safeFilename($version) . '-latest.jar',
            'size' => $this->contentLength($url),
            'archive' => false,
            'java' => (int) ($item['java'] ?? $this->javaForMinecraftVersion($version)),
        ];
    }

    /** @param array<string,mixed> $item */
    private function resolveSponge(array $item): array
    {
        $version = trim((string) ($item['version'] ?? ''));
        if ($version === '') {
            throw new RuntimeException('SpongeVanilla version is missing.');
        }

        $metadata = $this->http()
            ->get('https://dl-api.spongepowered.org/v1/org.spongepowered/spongevanilla/downloads/' . rawurlencode($version))
            ->throw()
            ->json();
        $artifacts = is_array($metadata['artifacts'] ?? null) ? $metadata['artifacts'] : [];
        $artifact = $artifacts[''] ?? reset($artifacts);
        if (!is_array($artifact) || empty($artifact['url'])) {
            throw new RuntimeException('Sponge did not return a downloadable server artifact for this version.');
        }

        return [
            'url' => (string) $artifact['url'],
            'filename' => 'spongevanilla-' . $this->safeFilename($version) . '.jar',
            'size' => (int) ($artifact['size'] ?? $this->contentLength((string) $artifact['url'])),
            'archive' => false,
            'java' => (int) ($item['java'] ?? $this->javaForMinecraftVersion($this->minecraftVersionFromText($version) ?? $version)),
        ];
    }

    /** @param array<string,mixed> $item */
    private function resolveForge(array $item): array
    {
        $version = trim((string) ($item['version'] ?? ''));
        if ($version === '' || !preg_match('/^\d+\.\d+(?:\.\d+)?-.+$/', $version)) {
            throw new RuntimeException('Forge version is missing or invalid.');
        }

        $safe = rawurlencode($version);
        $url = "https://maven.minecraftforge.net/net/minecraftforge/forge/{$safe}/forge-{$safe}-installer.jar";

        return [
            'url' => $url,
            'filename' => 'forge-installer.jar',
            'size' => $this->contentLength($url),
            'archive' => false,
            'java' => (int) ($item['java'] ?? $this->javaForMinecraftVersion($this->minecraftVersionFromText($version) ?? $version)),
            'install_mode' => 'forge-installer',
        ];
    }

    /** @param array<string,mixed> $item */
    private function resolveFabric(array $item): array
    {
        $game = trim((string) ($item['version'] ?? ''));
        if ($game === '') {
            throw new RuntimeException('Fabric Minecraft version is missing.');
        }

        $loaders = $this->http()->get('https://meta.fabricmc.net/v2/versions/loader')->throw()->json();
        $installers = $this->http()->get('https://meta.fabricmc.net/v2/versions/installer')->throw()->json();
        $loader = $this->firstStableVersion($loaders);
        $installer = $this->firstStableVersion($installers);

        if ($loader === null || $installer === null) {
            throw new RuntimeException('Fabric loader or installer metadata is unavailable.');
        }

        $url = 'https://meta.fabricmc.net/v2/versions/loader/'
            . rawurlencode($game) . '/'
            . rawurlencode($loader) . '/'
            . rawurlencode($installer) . '/server/jar';

        return [
            'url' => $url,
            'filename' => 'fabric-server-' . $this->safeFilename($game) . '-' . $this->safeFilename($loader) . '.jar',
            'size' => $this->contentLength($url),
            'archive' => false,
            'java' => (int) ($item['java'] ?? $this->javaForMinecraftVersion($game)),
        ];
    }

    /** @param array<string,mixed> $item */
    private function resolveMohist(array $item): array
    {
        $version = trim((string) ($item['version'] ?? ''));
        if ($version === '') {
            throw new RuntimeException('Mohist Minecraft version is missing.');
        }

        $url = 'https://mohistmc.com/api/v2/projects/mohist/' . rawurlencode($version) . '/builds/latest/download';

        return [
            'url' => $url,
            'filename' => 'mohist-' . $this->safeFilename($version) . '-latest.jar',
            'size' => $this->contentLength($url),
            'archive' => false,
            'java' => (int) ($item['java'] ?? $this->javaForMinecraftVersion($version)),
        ];
    }

    /** @param array<string,mixed> $item */
    private function resolveGithubAsset(array $item): array
    {
        $url = trim((string) ($item['download_url'] ?? ''));
        $filename = basename((string) ($item['filename'] ?? 'server.jar'));
        if ($url === '' || $filename === '' || !preg_match('/^https:\/\/github\.com\//i', $url)) {
            throw new RuntimeException('The selected GitHub release does not contain a valid downloadable JAR.');
        }

        return [
            'url' => $url,
            'filename' => $this->safeFilename($filename),
            'size' => (int) ($item['size'] ?? $this->contentLength($url)),
            'archive' => false,
            'java' => (int) ($item['java'] ?? 17),
        ];
    }

    private function resolveBungeeCord(): array
    {
        $url = 'https://ci.md-5.net/job/BungeeCord/lastSuccessfulBuild/artifact/bootstrap/target/BungeeCord.jar';

        return [
            'url' => $url,
            'filename' => 'BungeeCord.jar',
            'size' => $this->contentLength($url),
            'archive' => false,
            'java' => 17,
        ];
    }

    /** @param array<int,array<string,mixed>> $items */
    private function paginate(array $items, int $page): array
    {
        $totalPages = max(1, (int) ceil(count($items) / self::PAGE_SIZE));
        if ($page > $totalPages) {
            $page = $totalPages;
        }

        return [
            'message' => 'Good',
            'data' => array_values(array_slice($items, ($page - 1) * self::PAGE_SIZE, self::PAGE_SIZE)),
            'page' => $totalPages,
            'native' => true,
        ];
    }

    private function firstStableVersion(mixed $entries): ?string
    {
        if (!is_array($entries)) {
            return null;
        }

        foreach ($entries as $entry) {
            if (is_array($entry) && !empty($entry['version']) && !empty($entry['stable'])) {
                return (string) $entry['version'];
            }
        }
        foreach ($entries as $entry) {
            if (is_array($entry) && !empty($entry['version'])) {
                return (string) $entry['version'];
            }
        }

        return null;
    }

    /**
     * @param callable(string):bool $accept
     * @return string[]
     */
    private function collectStrings(mixed $value, callable $accept): array
    {
        $result = [];
        $walk = function (mixed $entry) use (&$walk, &$result, $accept): void {
            if (is_string($entry)) {
                $entry = trim($entry);
                if ($entry !== '' && $accept($entry)) {
                    $result[] = $entry;
                }
                return;
            }
            if (!is_array($entry)) {
                return;
            }
            foreach ($entry as $child) {
                $walk($child);
            }
        };
        $walk($value);

        return array_values(array_unique($result));
    }

    private function contentLength(string $url): int
    {
        try {
            $response = $this->http()->head($url);
            return max(0, (int) $response->header('Content-Length', 0));
        } catch (\Throwable) {
            return 0;
        }
    }

    private function minecraftVersionFromText(string $value): ?string
    {
        if (preg_match('/(?<!\d)(1\.\d+(?:\.\d+)?)(?!\d)/', $value, $match)) {
            return $match[1];
        }

        return null;
    }

    private function isAtLeastMinecraft(string $version, string $minimum): bool
    {
        $normalized = $this->minecraftVersionFromText($version) ?? $version;
        return version_compare($normalized, $minimum, '>=');
    }

    private function javaForMinecraftVersion(string $version): int
    {
        if (!preg_match('/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/', $version, $match)) {
            // Mojang metadata overrides this value at download time for snapshots.
            return 21;
        }

        $major = (int) ($match[1] ?? 0);
        $minor = (int) ($match[2] ?? 0);
        $patch = (int) ($match[3] ?? 0);

        if ($major >= 26 || $major > 1) {
            return 25;
        }
        if ($minor >= 21 || ($minor === 20 && $patch >= 5)) {
            return 21;
        }
        if ($minor >= 18) {
            return 17;
        }
        if ($minor === 17) {
            return 16;
        }

        return 8;
    }

    private function safeFilename(string $value): string
    {
        $value = preg_replace('/[^a-zA-Z0-9._-]+/', '-', $value) ?: 'download';
        return trim($value, '.-') ?: 'download';
    }

    private function http(): PendingRequest
    {
        return Http::acceptJson()
            ->connectTimeout(8)
            ->timeout(30)
            ->withHeaders(['User-Agent' => $this->userAgent()]);
    }

    private function fastHttp(): PendingRequest
    {
        return Http::acceptJson()
            ->connectTimeout(4)
            ->timeout(10)
            ->retry(1, 250, throw: false)
            ->withHeaders(['User-Agent' => $this->userAgent()]);
    }

    private function paperHttp(): PendingRequest
    {
        return $this->http();
    }

    private function userAgent(): string
    {
        $contact = trim((string) config('app.url', '')) ?: 'https://pterodactyl.io';
        return 'HOSKT-Pterodactyl-VersionManager/20 (' . $contact . ')';
    }
}
